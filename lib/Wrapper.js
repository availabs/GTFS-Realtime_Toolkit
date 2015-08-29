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
 * @param {object} The GTFS
 */
function GTFSRealtimeObject (GTFSrt_JSON) {

    var theIndices;

    this.GTFSrt_JSON = GTFSrt_JSON ;
    this.tripsIndex  = {} ;
    this.routesIndex = {} ;
    this.stopsIndex  = {} ;

    theIndices = {
        GTFSrt_JSON : GTFSrt_JSON ,
        tripsIndex  : this.tripsIndex  ,
        routesIndex : this.routesIndex ,
        stopsIndex  : this.stopsIndex  ,
    };

    _.forEach(_.values(GTFSrt_JSON.entity), function (entity) { 

            switch (determineEntityType(entity)) {

                case 'Alert' :
                    indexers.indexAlert(theIndices, entity.alert);
                    break;

                case 'TripUpdate' :
                    indexers.indexTripUpdate(theIndices, entity.trip_update);
                    break;

                case 'VehiclePosition' :
                    indexers.indexVehiclePostion(theIndices, entity.vehicle);
                    break;

                default :
                    console.log('WARNING: Unrecognized message type.');
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
