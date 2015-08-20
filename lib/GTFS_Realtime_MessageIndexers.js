'use strict';

var _ = require('lodash');


function indexAlert (theIndices, alertMessage) {
    _.forEach(_.values(alertMessage.informed_entity), function (informedEntity) {
        var trainID = informedEntity.trip['.nyct_trip_descriptor'].train_id,
            routeID = informedEntity.trip.route_id;

        if ( ! theIndices.trainsIndex[trainID] ) {
            theIndices.trainsIndex[trainID] = newTrainIndexNode();
        }

        theIndices.trainsIndex[trainID].alerts.push(alertMessage);
        
        // Record the association between route and trip;
        if ( ! theIndices.routesIndex[routeID] ) {
            theIndices.routesIndex[routeID] = {};
        }
        
        theIndices.routesIndex[routeID][trainID] = 1; 
    });
}


function indexTripUpdate (theIndices, tripUpdateMessage) {
    var trainID = tripUpdateMessage.trip['.nyct_trip_descriptor'].train_id,
        routeID = tripUpdateMessage.trip.route_id;


    if ( ! theIndices.trainsIndex[trainID] ) {
        theIndices.trainsIndex[trainID] = newTrainIndexNode();
    } 

    theIndices.trainsIndex[trainID].tripUpdate = tripUpdateMessage;


    if ( ! theIndices.routesIndex[routeID] ) {
        theIndices.routesIndex[routeID] = {} ;
    }

    theIndices.routesIndex[routeID][trainID] = 1;

    indexStopTimeUpdates(theIndices, trainID, tripUpdateMessage.stop_time_update);
}


function indexVehiclePostion (theIndices, vehiclePositionMessage) {
    var trainID = vehiclePositionMessage.trip['.nyct_trip_descriptor'].train_id;

    if ( ! theIndices.trainsIndex[trainID] ) {
        theIndices.trainsIndex[trainID] = newTrainIndexNode();
    }
    
    theIndices.trainsIndex[trainID].vehiclePosition = vehiclePositionMessage;
}


// Helper for indexTripUpdate
function indexStopTimeUpdates (theIndices, trainID, stopTimeUpdatesArray) {
    _.forEach(_.values(stopTimeUpdatesArray), function (stopTimeUpdate, index) {
        var stopID     = stopTimeUpdate.stop_id,

            timeAtStop = (stopTimeUpdate.arrival   && stopTimeUpdate.arrival.time.low)   ||
                         (stopTimeUpdate.departure && stopTimeUpdate.departure.time.low) ||
                         null;
                        
        // O(1) hop to stop's place in the updates array.
        theIndices.trainsIndex[trainID].stops[stopID] = index; 


        if ( ! theIndices.stopsIndex[stopID] ) {
            theIndices.stopsIndex[stopID] = {};
        }

        // Record all timeAtStops for trains servicing the stop.
        theIndices.stopsIndex[stopID][trainID] = timeAtStop;
    });
}


function newTrainIndexNode () {
    return {
        tripUpdate      : null,
        vehiclePosition : null,
        alerts          : [],
        stops           : {},
    };
}


module.exports = {
    indexAlert          : indexAlert          ,
    indexTripUpdate     : indexTripUpdate     ,
    indexVehiclePostion : indexVehiclePostion ,
};

