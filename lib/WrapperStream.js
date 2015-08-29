'use strict';

var Wrapper    = require('./Wrapper');


function WrapperStream (feedReader, callback) {

    this.start = function () {
        feedReader.registerListener(wrapAndSend);
    };

    this.stop = function () {
        feedReader.removeListener(wrapAndSend);
    };

    function wrapAndSend (msg) { 
        callback(new Wrapper(msg));
    } 
}

module.exports = WrapperStream ;

