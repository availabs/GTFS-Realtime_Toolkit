/**
 * @module "GTFS-Realtime_Toolkit"
 * @summary  "Reads a GTFS-Realtime feed, converting the protobuf message to JSON. 
 *            Offers a layer of abtraction through an indexed JS object 
 *            with accessor functions for message data."
 */

module.exports = {
    Wrapper             : require('./lib/Wrapper')             ,
    WrapperStream       : require('./lib/WrapperStream')       ,
    FeedReader          : require('./lib/FeedReader')          ,
};
