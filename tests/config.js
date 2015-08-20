'use strict';

var key           = require('./apiKey'),

    //url           = "http://datamine.mta.info/mta_esi.php?key=" + key,
    //protofilePath = __dirname + '/' + './proto_files/nyct-subway.proto';

    url           = "http://api.bart.gov/gtfsrt/tripupdate.aspx",
    protofilePath = __dirname + '/' + './proto_files/gtfs-realtime.proto';


module.exports = {
    feedUrl       : url           ,
    protofilePath : protofilePath ,
};
