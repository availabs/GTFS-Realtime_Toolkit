#!/usr/bin/env node

'use strict';


var feedReader = require('../lib/GTFS-Realtime_FeedReader').newFeedReader(),
    wrapper    = require('../lib/GTFS-Realtime_Wrapper'),
    config     = require('./config');


feedReader.configure(config);
feedReader.registerListener(listener);


function listener (msg) {
    var obj = wrapper.newGTFSRealtimeObject(msg);

    console.log(JSON.stringify(obj, null, '    '));
}

