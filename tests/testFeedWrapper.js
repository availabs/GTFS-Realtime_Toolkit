#!/usr/bin/env node

'use strict';


var FeedReader = require('../lib/FeedReader'),
    Wrapper    = require('../lib/Wrapper'),
    config     = require('./config'),

    feedReader = new FeedReader(config);

feedReader.registerListener(listener);

function listener (msg) {
    var obj = new Wrapper(msg);

    console.log(JSON.stringify(obj, null, '    '));
}

