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

    var theIndices;

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


    //TODO: When we move to the tripKey support for GTFS <--> GTFSrt mapping, 
    //      we will need to have way of linking the three indices. 
    _.forEach(_.values(GTFSrt_JSON.entity), function (entity) { 

            switch (determineEntityType(entity)) {

                case 'Alert' :
                    indexers.indexAlert(theIndices, entity.alert);
                    break;

                case 'TripUpdate' :
                    indexers.indexTripUpdate(theIndices, entity.trip_update, GTFS);
                    break;

                case 'VehiclePosition' :
                    indexers.indexVehiclePostion(theIndices, entity.vehicle);
                    break;

                default :
                    console.warn('WARNING: Unrecognized message type.');
            }
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
