#!/usr/bin/env node

'use strict';


var fs         = require('fs')                ,
    FeedReader = require('../lib/FeedReader') ,
    Wrapper    = require('../lib/Wrapper')    ,
    config     = require('./config')          ,

    feedReader = new FeedReader(config)       ;


feedReader.registerListener(listener);


function listener (msg) {
    var obj;
    
    feedReader.stop();

    obj = new Wrapper(msg);

    fs.writeFile('Wrapped_GTFS-Realtime_Sample.json', JSON.stringify(obj, null, '    '));
}
