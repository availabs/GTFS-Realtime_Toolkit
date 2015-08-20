#!/usr/bin/env node

'use strict';


var fs         = require('fs'),
    feedReader = require('../lib/FeedReader').newFeedReader(),
    config     = require('./config');


feedReader.configure(config);
feedReader.registerListener(listener);


function listener (msg) {
    feedReader.stop();

    // If you change this file name, make sure to make the same change in .gitignore.
    fs.writeFile('GTFS-Realtime_Sample.json', JSON.stringify(msg, null, '    '));
}

