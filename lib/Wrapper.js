'use strict';

/* jshint unused:false */


var _        = require('lodash'),
    indexers = require('./MessageIndexers'),
    theAPI   = require('./WrapperAPI');
    


function newGTFSRealtimeObject (GTFSrt_JSON) {

    var theData = {
            GTFSrt_JSON : GTFSrt_JSON,
            tripsIndex  : {} ,
            routesIndex : {} ,
            stopsIndex  : {} ,
    };

    _.forEach(_.values(GTFSrt_JSON.entity), function (entity) { 

            switch (determineEntityType(entity)) {

                case 'Alert' :
                    indexers.indexAlert(theData, entity.alert);
                    break;

                case 'TripUpdate' :
                    indexers.indexTripUpdate(theData, entity.trip_update);
                    break;

                case 'VehiclePosition' :
                    indexers.indexVehiclePostion(theData, entity.vehicle);
                    break;

                default :
                    console.log('WARNING: Unrecognized message type.');
            }
    });

    // Return an object X containing 
    //      * the GTFSrt_JSON
    //      * the indices
    //      * and the API functions with their `this` bound to X 
    return _.merge(theData, theAPI);
}


function determineEntityType (entity) {
    if      ( entity.trip_update ) { return 'TripUpdate'      ; }
    else if ( entity.vehicle     ) { return 'VehiclePosition' ; }
    else if ( entity.alert       ) { return 'Alert'           ; }
}


module.exports = {
    newGTFSRealtimeObject : newGTFSRealtimeObject,
};
