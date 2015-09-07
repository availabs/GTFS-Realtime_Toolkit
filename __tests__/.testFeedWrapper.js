#!/usr/bin/env node

'use strict';


var FeedReader = require('../lib/FeedReader'),
    Wrapper    = require('../lib/Wrapper'),
    config     = require('./.feedReaderConfig.js'),

    feedReader = new FeedReader(config);

feedReader.registerListener(listener);

function listener (msg) {
    var obj = new Wrapper(msg);

    feedReader.removeListener(listener);

    console.log(JSON.stringify(obj, null, '    '));
}

