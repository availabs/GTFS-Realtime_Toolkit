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


    toolkitEventEmitter = require('./events/ToolkitEventEmitter') ,
    eventCreator = require('./events/ToolkitEventCreator') ,

    timeUtils = require('./TimeUtils') ;




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
        var configError = new Error(
               "A WrapperStream constructor requires a configuration object with the following parameters:\n" +
               "\t* feedURL (should include key, if required)\n" +
               "\t* readInterval (in seconds)\n" +
               "\t* protofilePath (absolute path)\n" +
               "Optional config parameters are:" +
               "\t* MaxNumRetries\n" +
               "\t* retryInterval (in seconds)\n" 
            );

        eventCreator.emitFeedUpdateStatus({ 
            error: 'Invalid configuration for the GTFS-Realtime FeedReader.', 
            debug: configError.stack ,
            timestamp: Date.now() ,
        });

        eventCreator.emitError({ error: configError, timestamp: Date.now() });

        throw configError ;
    }

    // Since semantic sugar is so sweet.
    this.config  = buildConfig(config);
    this.control = {};

    try {
        this.feedMessageDecoder =  ProtoBuf.protoFromFile(this.config.protofilePath)
                                           .build('transit_realtime')
                                           .FeedMessage.decode ;
    } catch (err) {

        eventCreator.emitFeedUpdateStatus({ 
            error: 'Invalid GTFS-Realtime .proto file. Cannot parse the GTFS-Realtime feed.', 
            debug: err.stack ,
            timestamp: Date.now() ,
        });

        eventCreator.emitError({ error: err, timestamp: Date.now() });

        throw err;
    }

    // Init the controls.
    this.control.feedReaderIntervalObj = null;
    this.control.retryReadIntervalObj  = null;
    this.control.retryCounter          = 0;
    this.control.timestampOfLastSuccessfulRead     = null;

    this.control.previousTimestamp = Number.NEGATIVE_INFINITY;
    
    this.control.resuscitatorTimeoutIntervalObject = null;

    // Init the registered listeners array.
    this.listeners = [];

    this.toolkitEventEmitter = toolkitEventEmitter ;

    eventCreator.emitFeedUpdateStatus({ 
        debug: 'GTFS-Realtime FeedReader object construction complete.' ,
        timestamp: Date.now() ,
    });
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
    eventCreator.emitError({ 
        error: new Error('Must resuscitate the Feed reader.') ,
        timestamp: Date.now() ,
    });

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
    this.control.resuscitatorTimeoutIntervalObject = setTimeout(resuscitator.bind(this), 2000 * this.config.readInterval);
}



FeedReader.prototype.getState = function () {
    /*jshint validthis:true*/
    return {
        config  : this.config  ,
        control : this.control ,
    };
};



FeedReader.prototype.getTimestampOfLastSuccessfulRead = function () {
    /*jshint validthis:true*/
    return this.control.timestampOfLastSuccessfulRead;
};


// Probably could use a confirmation callback.
FeedReader.prototype.updateConfig = function (newConfig, callback) {

    eventCreator.emitFeedUpdateStatus({ debug: 'GTFS-Realtime FeedReader config update started.', timestamp: Date.now() });

    try {
        this.config = buildConfig(newConfig);

        /** 
         * @throws Will throw an error if the path or protofile aren't legit. 
         * Won't break the reader because assignment never happens.
         */

            try {
                this.feedMessageDecoder =  ProtoBuf.protoFromFile(this.config.protofilePath)
                                                   .build('transit_realtime')
                                                   .FeedMessage.decode ;
            } catch (err) {

                eventCreator.emitFeedUpdateStatus({ 
                    error: 'Invalid GTFS-Realtime .proto file. Cannot parse the GTFS-Realtime feed.', 
                    debug: err.stack ,
                    timestamp: Date.now() ,
                });

                eventCreator.emitError({ error: err, timestamp: Date.now() });

                return callback(err);
            }

        eventCreator.emitFeedUpdateStatus({ 
            info: 'Restarting the FeedReader.', 
            timestamp: Date.now() ,
        });

        restart.call(this);

        eventCreator.emitFeedUpdateStatus({ 
            info: 'GTFS-Realtime FeedReader.updateConfig done.', 
            timestamp: Date.now() ,
        });

        return callback(null);

    } catch (err) {
        eventCreator.emitFeedUpdateStatus({ 
            error : 'Error occurred while updating the GTFS-Realtime config. (Further information at debug level.)' ,
            debug : (err.stack || err) ,
            timestamp : Date.now() ,
        });
        eventCreator.emitError({ error: err, timestamp: Date.now() }) ;
        return callback(err);
    }
};


/**
 * Register a listener.
 * @param {function} listener - callback that will be called for each feed message, with the message JSON as the parameter.
 */
FeedReader.prototype.registerListener = function (listener) {
    if ( ! _.isFunction(listener) ) {
        throw new Error("Listeners must be functions.");
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

        eventCreator.emitFeedReaderStartedEvent({ 
            info : 'Starting the GTFS-RealtimeFeed.' ,
            timestamp : Date.now() ,
        });

        intervaledFeedReader.call(this);
        this.control.feedReaderIntervalObj = setInterval(intervaledFeedReader.bind(this), 
                                                         (this.config.readInterval * 1000));
        resetResusitatorTimeout.call(this);
    }
}


/**
 * Stop the feed reader.
 */
function stop () {
    /*jshint validthis:true*/

    eventCreator.emitFeedReaderStoppedEvent({ 
        info      : 'Stopping the GTFS-RealtimeFeed.' ,
        timestamp : Date.now() ,
    });


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

    clearInterval(this.control.retryReadIntervalObj);

    // INVARIANT: Only the regular interval read can reset the retry control.
    this.control.retryReadIntervalObj = null;
    this.control.retryCounter = 0;

    
    readFeed.call(this);
}

/**
 * Called internally after an error when reading the feed. 
 * @private
 */
function retry () {
    /*jshint validthis:true */
    
    if ( ! this.control.retryReadIntervalObj ) {
        this.control.retryReadIntervalObj = setInterval(intervaledRetry.bind(this), 
                                                        (this.config.retryInterval * 1000));
    
    }
}

/**
 * Called internally on the config.retryInterval after an error when reading the feed. 
 * @private
 */
function intervaledRetry () {
    /*jshint validthis:true */
    if (++this.control.retryCounter > this.config.MaxNumRetries) {
        clearInterval(this.control.retryReadIntervalObj);
    } else {
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


    http.get(this.config.getOptions, parse.bind(this))
        .on("error", function (err) { 
            eventCreator.emitError({ error: err, timestamp: Date.now() });
            resetResusitatorTimeout.call(that);

            retry.call(that);
        }).setTimeout(5000);
}

/**
 * Parse the feed message, and send the JSON representation to all listeners.
 * @private
 */
function parse (res) {
    /*jshint validthis:true */
    var that = this ,
        data = [] ,

        messageSequenceErrorMessage ;



    resetResusitatorTimeout.call(this);

    res.on("data", function(chunk) {
        data.push(chunk);
    });

    res.on("end", function() {
        try {
            data = Buffer.concat(data);
            
            var msg = that.feedMessageDecoder(data),
                timestamp = _.get(msg, ['header', 'timestamp'], null) ;


            if (timestamp <= that.control.previousTimestamp) {
                messageSequenceErrorMessage = 'ERROR: GTFS-Realtime Message not later than ' + 
                                              'the previously obtained GTFS-Realtime message.' + '\n' +
                                              '\tprevious timestamp : ' + that.control.previousTimestamp + '\n' +
                                              '\tcurrent timestamp  : ' + timestamp + '\n' ; 

                throw new Error(messageSequenceErrorMessage); 

            } else {
                that.control.previousTimestamp = timestamp;
            }

            that.control.timestampOfLastSuccessfulRead = timeUtils.getTimestamp();

            eventCreator.emitFeedReaderSuccessfulReadEvent({ 
                info: 'Successful GTFS-Realtime message read.' ,
                timestamp: Date.now() ,
            });

            clearInterval(that.control.retryReadIntervalObj);
            
            _.forEach(that.listeners, function (listener) { 
                try {
                    listener(msg); 
                } catch (err) {
                    eventCreator.emitError({ error: err, timestamp: Date.now() });
                }
            });

        } catch (err) {

            if ((err.message !== messageSequenceErrorMessage) || (that.control.retryCounter === that.config.MaxNumRetries)) {
                eventCreator.emitError({ 
                    error: err , 
                    retryNumber: that.control.retryCounter ,
                    timestamp: Date.now() ,
                    first50CharsOfGTFSrtMessage: (data && data.toString && data.toString().substring(0,50)) ,
                });
            }

            retry.call(that);
        } 
    }); 

    res.on("error", function(err) {
        eventCreator.emitError({ error: err, timestamp: Date.now() });
        retry.call(that);
    });
}


module.exports = FeedReader ;
