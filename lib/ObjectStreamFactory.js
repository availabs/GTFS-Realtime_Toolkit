'use strict';


var feedReader = require('./FeedReader'),
    wrapper    = require('./Wrapper');


function GTFSRealtimeObjectStream (config, callback) {
    function wrapAndSend (msg) { 
        var obj = wrapper.newGTFSRealtimeObject(msg);

        callback(obj);
    } 

    function configure (config) {
        feedReader.configure(config);  
    }

    function startStream () {
        feedReader.registerListener(wrapAndSend);
    }

    function stopStream () {
        feedReader.removeListener(wrapAndSend);
    }

    if (config) { configure (config); }


    this.start = startStream ;
    this.stop  = stopStream  ;
}

module.exports = GTFSRealtimeObjectStream ;

