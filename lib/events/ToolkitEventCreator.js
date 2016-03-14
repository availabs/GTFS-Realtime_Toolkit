'use strict';


var eventEmitter = require('./ToolkitEventEmitter') ;



module.exports = {
    emitFeedReaderStartedEvent : function (payload) {
        eventEmitter.emit(eventEmitter.eventTypes.FEED_READER_STARTED, payload) ;
    } ,

    emitFeedReaderStoppedEvent : function (payload) {
        eventEmitter.emit(eventEmitter.eventTypes.FEED_READER_STOPPED, payload) ;
    } ,

    emitFeedUpdateStatus : function (payload) {
        eventEmitter.emit(eventEmitter.eventTypes.FEED_UPDATE_STATUS, payload) ;
    } ,

    emitError : function (payload) {
        eventEmitter.emit(eventEmitter.eventTypes.ERROR, payload) ;
    } ,

    emitDataAnomaly : function (payload) {
        eventEmitter.emit(eventEmitter.eventTypes.DATA_ANOMALY, payload) ;
    } ,
} ;

