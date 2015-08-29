#!/usr/bin/env node

'use strict';


var FeedReader = require('../lib/FeedReader'),
    Wrapper    = require('../lib/Wrapper'),
    config     = require('./.feedReaderConfig.js'),

    feedReader = new FeedReader(config);

feedReader.registerListener(listener);
feedReader.start();

function listener (msg) {
    var obj = new Wrapper(msg);

    console.log(JSON.stringify(obj, null, '    '));
}

