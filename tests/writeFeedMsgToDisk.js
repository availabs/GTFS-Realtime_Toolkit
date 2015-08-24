#!/usr/bin/env node

'use strict';


// This script's purpose is to help in debugging.

var fs         = require('fs'),
    FeedReader = require('../lib/FeedReader'),
    config     = require('./config'),

    feedReader = new FeedReader(config);


feedReader.registerListener(listener);


function listener (msg) {
    feedReader.stop();

    // If you change this file name, make sure to make the same change in .gitignore.
    fs.writeFile('GTFS-Realtime_Sample.json', JSON.stringify(msg, null, '    '));
}

