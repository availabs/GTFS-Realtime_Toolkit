'use strict';

var _ = require('lodash');


function indexAlert (theIndices, alertMessage) {
    _.forEach(_.values(alertMessage.informed_entity), function (informedEntity) {
        var tripID = informedEntity.trip.trip_id,
            routeID = informedEntity.trip.route_id;

        if ( ! theIndices.tripsIndex[tripID] ) {
            theIndices.tripsIndex[tripID] = newTripIndexNode();
        }

        theIndices.tripsIndex[tripID].alerts.push(alertMessage);
        
        // Record the association between route and trip;
        if ( ! theIndices.routesIndex[routeID] ) {
            theIndices.routesIndex[routeID] = {};
        }
        
        theIndices.routesIndex[routeID][tripID] = 1; 
    });
}


function indexTripUpdate (theIndices, tripUpdateMessage) {
    var tripID  = tripUpdateMessage.trip.trip_id,
        routeID = tripUpdateMessage.trip.route_id;


    if ( ! theIndices.tripsIndex[tripID] ) {
        theIndices.tripsIndex[tripID] = newTripIndexNode();
    } 

    theIndices.tripsIndex[tripID].TripUpdate = tripUpdateMessage;


    if ( ! theIndices.routesIndex[routeID] ) {
        theIndices.routesIndex[routeID] = {} ;
    }

    theIndices.routesIndex[routeID][tripID] = 1;

    indexStopTimeUpdates(theIndices, tripID, tripUpdateMessage.stop_time_update);
}


function indexVehiclePostion (theIndices, vehiclePositionMessage) {
    var tripID = vehiclePositionMessage.trip.trip_id;

    if ( ! theIndices.tripsIndex[tripID] ) {
        theIndices.tripsIndex[tripID] = newTripIndexNode();
    }
    
    theIndices.tripsIndex[tripID].VehiclePosition = vehiclePositionMessage;
}


// Helper for indexTripUpdate
function indexStopTimeUpdates (theIndices, tripID, stopTimeUpdatesArray) {
    _.forEach(_.values(stopTimeUpdatesArray), function (stopTimeUpdate, index) {
        var stopID     = stopTimeUpdate.stop_id,

            timeAtStop = _.get(stopTimeUpdate, ['arrival', 'time', 'low']   ) ||
                         _.get(stopTimeUpdate, ['arrival', 'time', 'high']  ) ||
                         _.get(stopTimeUpdate, ['departure', 'time', 'low'] ) ||
                         _.get(stopTimeUpdate, ['departure', 'time', 'high'], null);
                        
        // O(1) hop to stop's place in the updates array.
        theIndices.tripsIndex[tripID].stops[stopID] = index; 


        if ( ! theIndices.stopsIndex[stopID] ) {
            theIndices.stopsIndex[stopID] = {};
        }

        // Record all timeAtStops for trips servicing the stop.
        theIndices.stopsIndex[stopID][tripID] = timeAtStop;
    });
}


function finishRoutesIndex (theIndices) {
    _.forOwn(theIndices.routesIndex, function (tripsSet, routeID, index) {
        index[routeID] = _.keys(tripsSet);
    });
}

function newTripIndexNode () {
    return {
        TripUpdate      : null,
        VehiclePosition : null,
        alerts          : [],
        stops           : {},
    };
}


module.exports = {
    indexAlert          : indexAlert          ,
    indexTripUpdate     : indexTripUpdate     ,
    indexVehiclePostion : indexVehiclePostion ,
    finishRoutesIndex   : finishRoutesIndex   ,
};

