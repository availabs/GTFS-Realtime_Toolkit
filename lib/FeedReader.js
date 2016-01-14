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

var http = require("http"),
    url  = require('url');

var ProtoBuf = require('protobufjs'),
    _        = require('lodash'),

    timeUtils = require('./TimeUtils');



var RETRY_DEFAULTS = {
    retryInterval : 1,
    MaxNumRetries : 7,
};



/** 
 * @constructor
 * @param {object} config - required members: feedURL, readInterval, protofilePath 
 * Required Configuration Parameter Members:
 *      feedURL       - feed source. Should include any keys or parameters.
 *      readInterval  - on what interval (in seconds) should we request a feed update.
 *      protofilePath - path to the .proto file that defines the feed's protobuf output
 * Optional Configuration Parameter Members:
 *      MaxNumRetries - number of retries to attempt before simply waiting for the next regular readInterval.
 *      retryInterval - how long to wait (in seconds) between retrying the feed.
 */
function FeedReader (config) {

    if ( ! (config && config.feedURL && config.readInterval && config.protofilePath) ) {
       throw new Error(
               "A WrapperStream constructor requires a configuration object with the following parameters:\n" +
               "\t* feedURL (should include key, if required)\n" +
               "\t* readInterval (in seconds)\n"                 +
               "\t* protofilePath (absolute path)\n"             +
               "Optional config parameters are:"                 +
               "\t* MaxNumRetries\n"                             +
               "\t* retryInterval (in seconds)\n"                );
    }

    // Since semantic sugar is so sweet.
    this.config  = buildConfig(config);
    this.control = {};

    /** 
     * Init the protobuf to JSON converter.
     * @throws Will throw an error if the path or protofile aren't legit.
     */
    this.feedMessageDecoder =  ProtoBuf.protoFromFile(this.config.protofilePath)
                                       .build('transit_realtime')
                                       .FeedMessage.decode ;

    // Init the controls.
    this.control.feedReaderIntervalObj = null;
    this.control.retryReadIntervalObj  = null;
    this.control.retryCounter          = 0;
    this.control.timestampOfLastSuccessfulRead     = null;

    this.control.previousTimestamp = Number.NEGATIVE_INFINITY;
    
    this.control.resuscitatorTimeoutIntervalObject = null;

    // Init the registered listeners array.
    this.listeners = [];


    this.logger = (config.logFeedReader && config.winston) ? 
                    config.winston.loggers.get('gtfsrt_feed_reader') : null;
    this.logger && this.logger.info('Created a feed reader with the following state.', 
                                    { config: this.config, control: this.control }); /* jshint ignore: line */
}


function buildConfig (newConfig) {
    var config = {};

    config.protofilePath = newConfig.protofilePath;

    config.MaxNumRetries = newConfig.MaxNumRetries || RETRY_DEFAULTS.MaxNumRetries;

    config.retryInterval = (newConfig.retryInterval && !isNaN(newConfig.retryInterval)) || 
                            RETRY_DEFAULTS.retryInterval;

    config.getOptions = url.parse(newConfig.feedURL);

    config.getOptions.headers = { 'Connection':'close' };
    config.getOptions.timeout = (+config.retryInterval * 1000);
    
    //https://nodejs.org/api/http.html#http_class_http_agent
    //https://nodejs.org/api/http.html#http_agent_destroy
    //may need to create and destroy an agent as well.
    config.getOptions.agent = new http.Agent({ keepAlive: false });
    
    _.merge(config, _.omit(newConfig, 'winston'));

    return config;
}

function resuscitator () {
    /* jshint validthis:true */
    console.warn('#####################################################');
    console.warn('WARN: The FeedReader resuscitator was called!');
    console.warn('#####################################################');
    console.warn();

    this.logger && this.logger.warn('WARN: Must resuscitate the Feed reader.', { _this: this }); /* jshint ignore: line */

    if (this.config.getOptions.agent.destroy) {
        this.config.getOptions.agent.destroy();
    } 

    //FIXME: Potential memory leak. How to kill old agent before 0.12?
    this.config.getOptions.agent = new http.Agent({ keepAlive: false }); 

    restart.call(this);
}

function resetResusitatorTimeout () {
    /* jshint validthis:true */
    clearTimeout(this.control.resuscitatorTimeoutIntervalObject);
    this.logger && this.logger.silly('resetResuscitatorTimeout: called.'); /* jshint ignore: line */
    this.control.resuscitatorTimeoutIntervalObject = setTimeout(resuscitator.bind(this), 2000 * this.config.readInterval);
}



FeedReader.prototype.getState = function () {
    /*jshint validthis:true*/
    this.logger && this.logger.silly('getState: called'); /* jshint ignore: line */
    return {
        config  : this.config  ,
        control : this.control ,
    };
};



FeedReader.prototype.getTimestampOfLastSuccessfulRead = function () {
    /*jshint validthis:true*/
    this.logger && this.logger.silly('getTimestampOfLastSuccessfulRead: called'); /* jshint ignore: line */
    return this.control.timestampOfLastSuccessfulRead;
};


// Probably could use a confirmation callback.
FeedReader.prototype.updateConfig = function (newConfig, callback) {
    try {
        this.config = buildConfig(newConfig);

        this.logger = (newConfig.logFeedReader && newConfig.winston) ? 
                        newConfig.winston.loggers.get('gtfsrt_feed_reader') : null;

        this.logger && this.logger.silly('updateConfig: called. calling restart', 
                                         { config: this.config, control: this.control }); /* jshint ignore: line */

        /** 
         * @throws Will throw an error if the path or protofile aren't legit. 
         * Won't break the reader because assignment never happens.
         */
        this.feedMessageDecoder =  ProtoBuf.protoFromFile(this.config.protofilePath)
                                           .build('transit_realtime')
                                           .FeedMessage.decode ;
        restart.call(this);

        callback(null);

    } catch (e) {
        callback(e);
    }
};


/**
 * Register a listener.
 * @param {function} listener - callback that will be called for each feed message, with the message JSON as the parameter.
 */
FeedReader.prototype.registerListener = function (listener) {
    this.logger && this.logger.silly('registerListener: called'); /* jshint ignore: line */

    if ( ! _.isFunction(listener) ) {
        this.logger && this.logger.silly('registerListener: called with bad argument: not a function.'); /* jshint ignore: line */
        throw new Error("Listeners must be functions.");
    }

    this.listeners.push(listener);
    this.logger && this.logger.silly('registerListener: listener added.'); /* jshint ignore: line */

    start.call(this);
};


/**
 * Remove a listener.
 * @param {function} listener - listener to deregister.
 */
FeedReader.prototype.removeListener = function (listener) {
    this.logger && this.logger.silly('removeListener: called');/* jshint ignore: line */

    _.pull(this.listeners, listener);

    if (this.listeners.length === 0) { // If a tree falls in a forest...
        this.logger && this.logger.debug('removeListener: all listeners removed.'); /* jshint ignore: line */
        stop.call(this);
    }
};




//===================== Internal Functions =====================

/**
 * Start the feed reader reading.
 */
function start () {
    /*jshint validthis:true*/
    this.logger && this.logger.silly('start: called.'); /* jshint ignore: line */

    if ( ! this.control.feedReaderIntervalObj ) { // Only have one intervaledFeedReader running at a time.
        intervaledFeedReader.call(this);
        this.control.feedReaderIntervalObj = setInterval(intervaledFeedReader.bind(this), 
                                                         (this.config.readInterval * 1000));
        this.logger && this.logger.silly('start: interval started'); /* jshint ignore: line */
        this.logger && this.logger.silly('start: calling resetResusitatorTimeout'); /* jshint ignore: line */
        resetResusitatorTimeout.call(this);
    }
}


/**
 * Stop the feed reader.
 */
function stop () {
    /*jshint validthis:true*/
    this.logger && this.logger.debug('start: called.'); /* jshint ignore: line */

    clearInterval(this.control.retryReadIntervalObj);
    clearInterval(this.control.feedReaderIntervalObj);
    clearTimeout(this.control.resuscitatorTimeoutIntervalObject);

    //https://nodejs.org/api/http.html#http_class_http_agent
    //https://nodejs.org/api/http.html#http_agent_destroy
    //may need to create and destroy an agent as well.

    this.control.retryReadIntervalObj  = null;
    this.control.feedReaderIntervalObj = null;
    this.control.resuscitatorTimeoutIntervalObject = null;

    this.control.retryCounter = 0;
}

function restart () {
    /*jshint validthis:true*/
    this.logger && this.logger.debug('restart: called.'); /* jshint ignore: line */
    stop.call(this);
    start.call(this);
}




// Read (or retry reading) the feed on an interval.
//============================================================

/**
 * Called internally on the regular config.readInterval to trigger a feed read.
 * @private
 */
function intervaledFeedReader () {
    /*jshint validthis:true */

    this.logger && this.logger.silly('intervaledFeedReader: intervaledFeedReader called.'); /* jshint ignore: line */
    clearInterval(this.control.retryReadIntervalObj);

    // INVARIANT: Only the regular interval read can reset the retry control.
    this.control.retryReadIntervalObj = null;
    this.control.retryCounter = 0;

    this.logger && this.logger.silly('intervaledFeedReader: after clearing retryReadIntervalObj.'); /* jshint ignore: line */
    
    readFeed.call(this);
}

/**
 * Called internally after an error when reading the feed. 
 * @private
 */
function retry () {
    /*jshint validthis:true */
    this.logger && this.logger.silly('retry: retry called.'); /* jshint ignore: line */
    
    if ( ! this.control.retryReadIntervalObj ) {
        this.control.retryReadIntervalObj = setInterval(intervaledRetry.bind(this), 
                                                        (this.config.retryInterval * 1000));
        this.logger && this.logger.silly('retry: called setIntervalForRetry.'); /* jshint ignore: line */
    
    }
}

/**
 * Called internally on the config.retryInterval after an error when reading the feed. 
 * @private
 */
function intervaledRetry () {
    /*jshint validthis:true */
    this.logger && this.logger.silly('intervaledRetry: intervaledRetry called.'); /* jshint ignore: line */
    if (++this.control.retryCounter > this.config.MaxNumRetries) {
        this.logger && this.logger.silly('intervaledRetry: num of retries exceeded.'); /* jshint ignore: line */
        clearInterval(this.control.retryReadIntervalObj);
    } else {
        this.logger && this.logger.silly('intervaledRetry: calling read feed.'); /* jshint ignore: line */
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

    this.logger && this.logger.silly('readFeed: called.'); /* jshint ignore: line */

    http.get(this.config.getOptions, parse.bind(this))
        .on("error", function (e) { 
            resetResusitatorTimeout.call(that);
            this.logger && this.logger.silly('readFeed: reset the resusitator.'); /* jshint ignore: line */

            this.logger && this.logger.debug('parse: http get error.', { e : e }); /* jshint ignore: line */
            retry.call(that);
        }).setTimeout(5000);
}

/**
 * Parse the feed message, and send the JSON representation to all listeners.
 * @private
 */
function parse (res) {
    /*jshint validthis:true */
    var that = this,
        data = [];

    that.logger && that.logger.silly('parse: called.'); /* jshint ignore: line */

    resetResusitatorTimeout.call(this);
    this.logger && this.logger.silly('parse: reset the resusitator.'); /* jshint ignore: line */

    res.on("data", function(chunk) {
        data.push(chunk);
        //that.logger && that.logger.silly('parse: data chunk.'); /* jshint ignore: line */
    });

    res.on("end", function() {
        try {
            that.logger && that.logger.silly('parse: data end.'); /* jshint ignore: line */
            data = Buffer.concat(data);
            
            var msg = that.feedMessageDecoder(data),
                timestamp = _.get(msg, ['header', 'timestamp'], null); 

            that.logger && that.logger.silly('parse: data parsed.'); /* jshint ignore: line */

            if (timestamp <= that.control.previousTimestamp) {
                that.logger && that.logger.silly('parse: timestamp is not newer.'); /* jshint ignore: line */
                throw new Error(
                        'ERROR: GTFS-Realtime Message not later than '                    + 
                        'the previously obtained GTFS-Realtime message.' + '\n'           +
                        '\tprevious timestamp : ' + that.control.previousTimestamp + '\n' +
                        '\tcurrent timestamp  : ' + timestamp + '\n'                      ); 
            } else {
                that.control.previousTimestamp = timestamp;
                that.logger && that.logger.silly('parse: updated timestamp.'); /* jshint ignore: line */
            }

            that.control.timestampOfLastSuccessfulRead = timeUtils.getTimestamp();
            that.logger && this.logger.silly('readFeed: set timestampOfLastSuccessfulRead.'); /* jshint ignore: line */

            clearInterval(that.control.retryReadIntervalObj);
            that.logger && that.logger.silly('parse: cleared retryReadIntervalObj.'); /* jshint ignore: line */
            
            _.forEach(that.listeners, function (listener, i) { 
                try {
                    that.logger && that.logger.silly('parse: calling listener #' + i); /* jshint ignore: line */
                    listener(msg); 
                    that.logger && that.logger.silly('parse: listener #' + i + ' returned.'); /* jshint ignore: line */
                } catch (e) {
                    that.logger && that.logger.error('parse: Uncaught error in a feed listener', { e: e }); /* jshint ignore: line */
                }
            });

        } catch (e) {
            console.log("ERROR: retry#", that.control.retryCounter, ": parsing GTFS-Realtime:\n", e.message, '\n');

            that.logger && that.logger.error('parse: error in parsing.', { e : e , retry: that.control.retryCounter } ); /* jshint ignore: line */

            that.logger && that.logger.silly('parse: calling retry.'); /* jshint ignore: line */
            retry.call(that);
        } 
    }); 

    res.on("error", function(e) {
        that.logger && that.logger.error("parse: ERROR: Assumed we wouldn't reach that. Calling retry.", 
                                         { e : e} ); /* jshint ignore: line */

        retry.call(that);
    });
}


module.exports = FeedReader ;
