'use strict';


// NOTE: Currently, the feedReader is currently designed to be a singleton with listeners.
//       newFeedReaders should be created ONLY for different feed sources.
//       This is to minimize calls to the feed source.
//       Only admin should call stop, not listeners.
//          Clients should simply remove their listener.
//


var ProtoBuf = require('protobufjs'),
    http     = require("http"),
    _        = require('lodash');


function newFeedReader (config) {
    
    // Module scope variables.
    //============================================================

    var feedUrl,
        feedMessageDecoder;


    var feedReaderIntervalObj = null,
        retryReadIntervalObj  = null,
        retryCounter          = 0,
        MAX_RETRIES           = 3;


    var listeners = [];

    //============================================================




    // The external interface
    //============================================================

    // Must configure before using.
    // Should this stuff fail gracefully, or bring everything down if exceptions not caught?
    function configure (config) {
        if ( !config ) {
           throw "Configure requires a configuration object with the following parameters:\n" +
                 "\t* feedUrl\n"        +
                 "\t* protofilePath\n"  ;
        }

        if (config.feedUrl) {
            feedUrl =  config.feedUrl;
        }

        if (config.protofilePath) {
            feedMessageDecoder = ProtoBuf.protoFromFile(config.protofilePath)
                                     .build('transit_realtime')
                                     .FeedMessage.decode ;
        }
    }


    function registerListener (listener) {
        if ( ! _.isFunction(listener) ) {
            throw "Listeners must be functions.";
        }

        listeners.push(listener);

        if ( ! feedReaderIntervalObj ) { start(); }
    }


    function removeListener (listener) {
        _.pull(listeners, listener);

        if (listeners.length === 0) { // Only makes sense.
            stop();
        }
    }


    function start () {
        if (! isConfigured() ) {
            throw "The FeedReader must be configured before started.";
        }

        if ( ! feedReaderIntervalObj ) { // Make idempotent, unless stopped.
            readFeed();
            feedReaderIntervalObj = setInterval(intervaledFeedReader, 30000);
        }
    }


    function stop () {
        clearInterval(retryReadIntervalObj);
        clearInterval(feedReaderIntervalObj);
    }

    //============================================================




    // Read (or retry reading) the feed on an interval.
    //============================================================

    function intervaledFeedReader () {
        clearInterval(retryReadIntervalObj);
        readFeed();
    }


    function retry () {
        retryCounter = 0;
        retryReadIntervalObj = setInterval(intervaledRetry, 1500);
    }


    function intervaledRetry () {
        if (retryCounter++ > MAX_RETRIES) {
            clearInterval(retryReadIntervalObj);
        } else {
            console.log('Retry number', retryCounter);
            readFeed();
        }
    }

    //============================================================



    // Helpers
    //============================================================

    function isConfigured() {
        var configured = true;

        if ( ! feedUrl ) {
            console.log('Please send a feedUrl via the configure method.');
            configured = false;
        }

        if ( ! feedMessageDecoder ) {
            console.log('Please send an protofilePath via the configure method.');
            configured = false;
        }

        return configured;
    }



    // Get and parse the GTFS-Realtime messages
    //============================================================

    function readFeed() {
        try {
            http.get(feedUrl, parse)
                .on("error", function (e) { 
                    console.log(e.stack);
                });
        } catch (e) {
            console.log(e.stack);
            if ( ! retryReadIntervalObj ) { // Prevent cascading
                retry();
            }
        }
    }

    function parse (res) {
        var data = [];

        res.on("data", function(chunk) {
            data.push(chunk);
        });

        res.on("end", function() {
            try {
                data = Buffer.concat(data);
                
                var msg = feedMessageDecoder(data);
                
                _.forEach(listeners, function (listener) { 
                    try {
                        listener(msg); 
                    } catch (e) {
                        console.log(e.stack); 
                    }
                });

            } catch (e) {
                console.log(e.stack);
                if ( ! retryReadIntervalObj ) { // Prevent cascading
                    retry();
                }
            }
        }); 
    }
    
    //============================================================


    if (config) { configure(config); } // if a configuration was sent to newFeedReader.

    return {
        registerListener : registerListener ,
        removeListener   : removeListener   ,
        configure        : configure        ,
        stop             : stop             ,
    };
}


module.exports = {
    newFeedReader : newFeedReader ,
};



