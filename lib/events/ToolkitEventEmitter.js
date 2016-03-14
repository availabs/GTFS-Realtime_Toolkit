'use strict';


var EventEmitter = require('events') ,
    util = require('util') ;



function ToolkitEventEmitter () {
    EventEmitter.call(this) ;
}

util.inherits(ToolkitEventEmitter, EventEmitter) ;


ToolkitEventEmitter.prototype.eventTypes = {
    FEED_READER_STARTED : 'FEED_READER_STARTED' ,
    FEED_READER_STOPPED : 'FEED_READER_STOPPED' ,
    FEED_UPDATE_STATUS  : 'FEED_UPDATE_STATUS' ,
    DATA_ANOMALY        : 'DATA_ANOMALY' ,
    ERROR               : 'ERROR' ,
};


module.exports = new ToolkitEventEmitter() ;
