#!/usr/bin/env node

'use strict';


var FeedReader = require('../lib/FeedReader'),
    _          = require('lodash'),

    config     = require('./.feedReaderConfig'),

    feedReader = new FeedReader(config);


feedReader.registerListener(listener);


function listener (msg) {
    feedReader.removeListener(listener);
    console.log(_.filter(_.pluck(msg.entity, 'trip_update.trip.trip_id')));
}

