#!/usr/bin/env node

'use strict';


var fs         = require('fs')                                ,
    feedReader = require('../lib/FeedReader').newFeedReader() ,
    wrapper    = require('../lib/Wrapper')                    ,
    config     = require('./config')                          ;


feedReader.configure(config);
feedReader.registerListener(listener);


function listener (msg) {
    var obj;
    
    feedReader.stop();

    obj = wrapper.newGTFSRealtimeObject(msg);

    fs.writeFile('Wrapped_GTFS-Realtime_Sample.json', JSON.stringify(obj, null, '    '));
}
