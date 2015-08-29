#!/usr/bin/env node

'use strict';


var fs         = require('fs')                     ,
    FeedReader = require('../lib/FeedReader')      ,
    Wrapper    = require('../lib/Wrapper')         ,
    config     = require('./.feedReaderConfig.js') ,

    feedReader = new FeedReader(config)            ;


feedReader.registerListener(listener);
feedReader.start();


function listener (msg) {
    var obj;
    
    feedReader.stop();

    obj = new Wrapper(msg);

    fs.writeFile('Wrapped_GTFS-Realtime_Sample.before.json', JSON.stringify(obj, null, '    '));

    obj.getTripsServicingStop('101N');

    fs.writeFile('Wrapped_GTFS-Realtime_Sample.after.json', JSON.stringify(obj, null, '    '));
}
