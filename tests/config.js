'use strict';

var key           = require('./apiKey'),

    url           = "http://datamine.mta.info/mta_esi.php?key=" + key,
    protofilePath = __dirname + '/' + './proto_files/nyct-subway.proto';


module.exports = {
    feedUrl       : url           ,
    protofilePath : protofilePath ,
};
