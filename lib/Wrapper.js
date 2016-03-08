/**
 * @module "GTFS-Realtime_Toolkit.Wrapper"
 * @summary  Creates a wrapper object for the GTFS-Realtime feed message.
 */

'use strict';

/* jshint unused:false */


var _        = require('lodash'),
    indexers = require('./MessageIndexers'),
    theAPI   = require('./WrapperAPI');
    


/** 
 * @constructor
 * @param {object} The GTFS-Realtime feed in JSOn format
 * @param {object} [optional] The GTFS feed wrapper.
 */
function GTFSRealtimeObject (GTFSrt_JSON, GTFS) {

    var theIndices,

        tripUpdateFilterMap = {} ,

        trip_id, 
        
        stopTimeUpdate_A ,
        stopTimeUpdate_B ,

        stopTimeZero_A ,
        stopTimeZero_B ,

        feedMessageTimestamp ;



    this.GTFSrt_JSON = GTFSrt_JSON ;
    this.tripsIndex  = {} ;
    this.routesIndex = {} ;
    this.stopsIndex  = {} ;

    theIndices = {
        GTFSrt_JSON : GTFSrt_JSON ,
        tripsIndex  : this.tripsIndex  ,
        routesIndex : this.routesIndex ,
        stopsIndex  : this.stopsIndex ,
    };


    /* Handling xtra TripUpdate messages:
     *
     *      Build a map: tripKey -> TripUpdate
     *
     *         In the map, filter out the garbage updates.
     */

    //TODO: When we move to the tripKey support for GTFS <--> GTFSrt mapping, 
    //      we will need to have way of linking the three indices. 
    _.forEach(_.values(GTFSrt_JSON.entity), function (entity) { 

        switch (determineEntityType(entity)) {

            case 'Alert' :
                indexers.indexAlert(theIndices, entity.alert);
                break;

            case 'TripUpdate' :
                // Insert the updates into the filterMap.
                // After the forEach completes, iterate over the Updates and index them.
                
                if (!entity.trip_update.trip) { 
                    break ; 
                }

                trip_id = entity.trip_update.trip.trip_id ;

                if (!tripUpdateFilterMap[trip_id]) {

                    tripUpdateFilterMap[trip_id] = entity.trip_update;    

                } else { // Handle duplicate TripUpdates for a trip.
                    
                    // In essence, take the trip_update whose first stop_time_update occurs latest.

//console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');

                    stopTimeUpdate_A = tripUpdateFilterMap[trip_id].stop_time_update;
                    stopTimeUpdate_B = entity.trip_update.stop_time_update;

//console.log(!!stopTimeUpdate_A);

                    stopTimeUpdate_A = (Array.isArray(stopTimeUpdate_A) && stopTimeUpdate_A[0]) ;
                    stopTimeUpdate_B = (Array.isArray(stopTimeUpdate_B) && stopTimeUpdate_B[0]) ;

//console.log(!!stopTimeUpdate_A);

                    stopTimeZero_A = 
                        (stopTimeUpdate_A && 
                        ((stopTimeUpdate_A.arrival && stopTimeUpdate_A.arrival.time) || 
                         (stopTimeUpdate_A.departure && stopTimeUpdate_A.departure.time))) || 
                        null;

//console.log(!!stopTimeZero_A);

                    stopTimeZero_B = 
                        (stopTimeUpdate_B && 
                        ( (stopTimeUpdate_B.arrival && stopTimeUpdate_B.arrival.time) || 
                          (stopTimeUpdate_B.departure && stopTimeUpdate_B.departure.time) ) ) || 
                        null;

                    stopTimeZero_A = stopTimeZero_A && (parseInt(stopTimeZero_A) || parseInt(stopTimeZero_A.low));
                    stopTimeZero_B = stopTimeZero_B && (parseInt(stopTimeZero_B) || parseInt(stopTimeZero_B.low));

//console.log(!!stopTimeZero_A);

                    if (stopTimeZero_B && !stopTimeZero_A) {
                        tripUpdateFilterMap[trip_id] = entity.trip_update;
                    } else if (stopTimeZero_A && stopTimeZero_B) {
                        tripUpdateFilterMap[trip_id] = 
                            (stopTimeZero_B > stopTimeZero_A) ? entity.trip_update : tripUpdateFilterMap[trip_id];
                    } // else already have the right one in the filterMap

//console.log('( ' + stopTimeZero_B + ' > ' + stopTimeZero_A + ' ) = ' + (stopTimeZero_B > stopTimeZero_A));
//console.log(JSON.stringify(tripUpdateFilterMap[trip_id].stop_time_update[0], null, 4));

                }

                break;

            case 'VehiclePosition' :
                indexers.indexVehiclePostion(theIndices, entity.vehicle);
                break;

            default :
                console.warn('WARNING: Unrecognized message type.');
        }
    });



    feedMessageTimestamp = _.get(GTFSrt_JSON, ['header', 'timestamp'], null);
    feedMessageTimestamp = parseInt((feedMessageTimestamp&& feedMessageTimestamp.low)|| feedMessageTimestamp)|| null;
    
    // NOTE: Message indexing code depends on TripUpdates being processed after VehicleUpdates.
    _.forEach(Object.keys(tripUpdateFilterMap),function (trip_id) {
        indexers.indexTripUpdate(theIndices, tripUpdateFilterMap[trip_id], GTFS, feedMessageTimestamp);
    });

    indexers.finishRoutesIndex(theIndices);
}

GTFSRealtimeObject.prototype = Object.create(theAPI);


function determineEntityType (entity) {
    if      ( entity.trip_update ) { return 'TripUpdate'      ; }
    else if ( entity.vehicle     ) { return 'VehiclePosition' ; }
    else if ( entity.alert       ) { return 'Alert'           ; }
}


module.exports = GTFSRealtimeObject ;
