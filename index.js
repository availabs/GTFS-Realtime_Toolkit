/**
 * @module "GTFS-Realtime_Toolkit"
 * @summary  "Reads a GTFS-Realtime feed, converting the protobuf message to JSON. 
 *            Offers a layer of abtraction through an indexed JS object 
 *            with accessor functions for message data."
 */

module.exports = {
    GTFS_Realtime_Wrapper             : require('./lib/GTFS-Realtime_Wrapper')             ,
    GTFS_Realtime_FeedReader          : require('./lib/GTFS-Realtime_FeedReader')          ,
    GTFS_Realtime_ObjectStreamFactory : require('./lib/GTFS-Realtime_ObjectStreamFactory') ,
};
