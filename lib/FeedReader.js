'use strict';


/**
 * USAGE: The feedReader is designed to be a singleton with listeners.
 *        Primary purpose is to absract away handling the feed.
 *        New FeedReaders should be created ONLY for different feed sources.
 *        This is to minimize calls to the feed source.
 *
 *        Calling `stop` will stop all calls to the feed source.
 *           Clients should simply remove their listener if they want to stop listening.
 *
 * @module GTFS-Realtime_Toolkit.FeedReader
 * @summary Reads a GTFS-Realtime feed on an interval and converts the protobuf message into JSON.
 *
 *
 * Usage: 
 *          Create a new FeedReader.
 *          Add a listener to begin listening.
 *          To stop listening, remove your listener.
 *
 *          Module automatically starts reading from feed when there are listeners,
 *              stops reading when there are none.
 */


var ProtoBuf = require('protobufjs'),
    http     = require("http"),
    _        = require('lodash');



var RETRY_DEFAULTS = {
    retryInterval : 1500,
    maxRetries    : 5,
};




/** 
 * @constructor
 * @param {object} config - required members: feedURL, readInterval, protofilePath 
 * Required Configuration Parameter Members:
 *      feedURL       - feed source. Should include any keys or parameters.
 *      readInterval  - on what interval (in seconds) should we request a feed update.
 *      protofilePath - path to the .proto file that defines the feed's protobuf output
 * Optional Configuration Parameter Members:
 *      maxRetries    - number of retries to attempt before simply waiting for the next regular readInterval.
 *      retryInterval - how long to wait (in seconds) between retrying the feed.
 */
function FeedReader (config) {

    if ( ! (config && config.feedURL && config.readInterval && config.protofilePath) ) {
       throw "A WrapperStream constructor requires a configuration object with the following parameters:\n" +
             "\t* feedURL (should include key, if required)\n" +
             "\t* readInterval (in seconds)\n"                 +
             "\t* protofilePath (absolute path)\n"             +
             "Optional config parameters are:"                 +
             "\t* maxRetries\n"                                +
             "\t* retryInterval (in seconds)\n"                ;
    }

    // Since semantic sugar is so sweet.
    this.config  = {};
    this.control = {};

    // Init the configuration.
    this.config.feedURL       = config.feedURL;
    this.config.readInterval  = config.readInterval * 1000;

    this.config.maxRetries    = config.maxRetries || RETRY_DEFAULTS.maxRetries;

    this.config.retryInterval = (config.retryInterval && (config.retryInterval * 1000)) || RETRY_DEFAULTS.retryInterval;


    /** 
     * Init the protobuf to JSON converter.
     * @throws Will throw an error if the path or protofile aren't legit.
     */
    this.feedMessageDecoder =  ProtoBuf.protoFromFile(config.protofilePath)
                                       .build('transit_realtime')
                                       .FeedMessage.decode ;


    // Init the controls.
    this.control.feedReaderIntervalObj = null;
    this.control.retryReadIntervalObj  = null;
    this.control.retryCounter          = 0;

    
    // Init the registered listeners array.
    this.listeners = [];
}


/**
 * Register a listener.
 * @param {function} listener - callback that will be called for each feed message, with the message JSON as the parameter.
 */
FeedReader.prototype.registerListener = function (listener) {
    if ( ! _.isFunction(listener) ) {
        throw "Listeners must be functions.";
    }

    this.listeners.push(listener);

    start.call(this);
};


/**
 * Remove a listener.
 * @param {function} listener - listener to deregister.
 */
FeedReader.prototype.removeListener = function (listener) {
    _.pull(this.listeners, listener);

    if (this.listeners.length === 0) { // If a tree falls in a forest...
        stop.call(this);
    }
};




//===================== Internal Functions =====================

/**
 * Start the feed reader reading.
 */
function start () {
    /*jshint validthis:true*/
    if ( ! this.control.feedReaderIntervalObj ) { // Only have one intervaledFeedReader running at a time.
        readFeed.call(this);
        this.control.feedReaderIntervalObj = setInterval(intervaledFeedReader.bind(this), this.config.readInterval);
    }
}


/**
 * Stop the feed reader.
 */
function stop () {
    /*jshint validthis:true*/
    clearInterval(this.control.retryReadIntervalObj);
    this.control.retryReadIntervalObj = null;
    clearInterval(this.control.feedReaderIntervalObj);
    this.control.feedReaderIntervalObj = null;
}





// Read (or retry reading) the feed on an interval.
//============================================================

/**
 * Called internally on the regular config.readInterval to trigger a feed read.
 * @private
 */
function intervaledFeedReader () {
    /*jshint validthis:true */
    clearInterval(this.control.retryReadIntervalObj);
    this.control.retryReadIntervalObj = null;

    readFeed.call(this);
}

/**
 * Called internally after an error when reading the feed. 
 * @private
 */
function retry () {
    /*jshint validthis:true */
    this.control.retryCounter = 0;
    this.control.retryReadIntervalObj = setInterval(intervaledRetry.bind(this), this.config.retryInterval);
}

/**
 * Called internally on the config.retryInterval after an error when reading the feed. 
 * @private
 */
function intervaledRetry () {
    /*jshint validthis:true */
    if (++this.control.retryCounter > this.config.maxRetries) {
        clearInterval(this.control.retryReadIntervalObj);
        this.control.retryReadIntervalObj = null;
    } else {
        console.log('WARNING: FeedReader retry number', this.control.retryCounter, '.');
        readFeed.call(this);
    }
}




// Get and parse the GTFS-Realtime messages
//============================================================



/**
 * Request an update from the feed message source.
 * @private
 */
function readFeed () {
    /*jshint validthis:true */
    var that = this;
    http.get(this.config.feedURL, parse.bind(this))
        .on("error", function () { 
            //console.log(e.stack);
            if ( ! that.control.retryReadIntervalObj ) { // Prevent cascading
                retry.call(that);
            }
        });
}

/**
 * Parse the feed message, and send the JSON representation to all listeners.
 * @private
 */
function parse (res) {
    /*jshint validthis:true */
    var that = this,
        data = [];

    res.on("data", function(chunk) {
        data.push(chunk);
    });

    res.on("end", function() {
        try {
            data = Buffer.concat(data);
            
            var msg = that.feedMessageDecoder(data);

            // Reset the retry controls.
            that.control.retryCounter = 0;
            if (that.control.retryReadIntervalObj) {
                clearInterval(that.control.retryReadIntervalObj);
                that.control.retryReadIntervalObj = null;
            }
            
            _.forEach(that.listeners, function (listener) { 
                try {
                    listener(msg); 
                } catch (e) {
                    // Ignore. We don't want buggy listeners bringing down the reader.
                }
            });

        } catch (e) {
            //console.log('ERROR: In the FeedReader while parsing the GTFS-Realtime message.');
            //console.log(e.stack);
            if ( ! that.control.retryReadIntervalObj ) { // Prevent cascading
                retry.call(that);
            }
        }
    }); 
}


module.exports = FeedReader ;
