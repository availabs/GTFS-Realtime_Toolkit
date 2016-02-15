'use strict';

var _ = require('lodash') ,

    timeUtils = require('./TimeUtils') ;


function indexAlert (theIndices, alertMessage) {
    _.forEach(_.values(alertMessage.informed_entity), function (informedEntity) {
        var tripID = informedEntity.trip.trip_id,
            routeID = informedEntity.trip.route_id;

        if ( ! theIndices.tripsIndex[tripID] ) {
            theIndices.tripsIndex[tripID] = newTripIndexNode();
        }

        theIndices.tripsIndex[tripID].alerts.push(informedEntity);
        
        // Record the association between route and trip;
        if ( ! theIndices.routesIndex[routeID] ) {
            theIndices.routesIndex[routeID] = {};
        }
        theIndices.routesIndex[routeID][tripID] = 1; 
    });
}


function indexTripUpdate (theIndices, tripUpdateMessage, GTFS) {
    var tripDescriptor  = tripUpdateMessage && tripUpdateMessage.trip ,
        stopTimeUpdates = tripUpdateMessage && tripUpdateMessage.stop_time_update ,
        tripLevelDelay  = tripUpdateMessage && tripUpdateMessage.delay ,
        tripID ,
        routeID ,
        startDate ;


    if (! tripDescriptor ) { return; }


    tripID    = tripDescriptor.trip_id ;
    routeID   = tripDescriptor.route_id ;
    startDate = tripDescriptor.start_date;

    if ( ! theIndices.tripsIndex[tripID] ) {
        theIndices.tripsIndex[tripID] = newTripIndexNode();
    } 

    theIndices.tripsIndex[tripID].TripUpdate = tripUpdateMessage;


    if ( ! theIndices.routesIndex[routeID] ) {
        theIndices.routesIndex[routeID] = {} ;
    }

    theIndices.routesIndex[routeID][tripID] = 1;

    // FIXME: Need to include date in the info.
    handleStopTimeUpdatesForTrip(GTFS, theIndices, stopTimeUpdates, tripID, tripLevelDelay, startDate);
}


function indexVehiclePostion (theIndices, vehiclePositionMessage) {
    var tripID  = vehiclePositionMessage.trip && vehiclePositionMessage.trip.trip_id ,
        routeID = vehiclePositionMessage.trip && vehiclePositionMessage.trip.route_id;

    if ( ! theIndices.tripsIndex[tripID] ) {
        theIndices.tripsIndex[tripID] = newTripIndexNode();
    }

    if ( ! theIndices.routesIndex[routeID] ) {
        theIndices.routesIndex[routeID] = {} ;
    }

    theIndices.routesIndex[routeID][tripID] = 1;

    
    theIndices.tripsIndex[tripID].VehiclePosition = vehiclePositionMessage;
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


// We first try to get an expected arrival time for a stop.
// Arrival time is prefered because departure time will include dwell time.
// If we cannot get expected arrival time, we return expected departure time.
//
// NOTE: This function mutates the StopTimeEvent objects, adding 
//
//          _arrival   : { time : timestamp }
//          _departure : { time : timestamp }
//
//       to each StopTimeEvent if a time is either stated directly, or can be inferred.
//
function handleStopTimeUpdatesForTrip (GTFS, theIndices, stopTimeUpdates, tripKey, tripLevelDelay, startDate) {
    var update ,

        timeTypes = ['arrival', 'departure'] ,
        timeType ,

        stop_id ,
        stop_sequence ,

        delay ,
        timestamp ,
        scheduledTime ,
        scheduledTimestamp ,

        timeFormatString ,
        //isoTimeString , //Should we add that here.

        i, j ;


    tripLevelDelay = parseInt(tripLevelDelay);
    
    if ( ! (Array.isArray(stopTimeUpdates) && stopTimeUpdates.length) )  { return; }

    
    for ( i = 0; i < stopTimeUpdates.length; ++i ) {
    
        update = stopTimeUpdates[i];


        for ( j = 0; j < timeTypes.length; ++j ) {
            timeType = timeTypes[j];


            if ( (update === null) || (typeof update !== 'object')) { continue; }


            stop_id = update.stop_id;

            theIndices.tripsIndex[tripKey].stops[stop_id] = i;  // The stopSequence 


            if ( ! theIndices.stopsIndex[stop_id] ) {
                theIndices.stopsIndex[stop_id] = {};
            }

            stop_sequence = (update.stop_sequence !== null) ? update.stop_sequence : null;


            // Try to get a directly stated expected time:
            timestamp = (update[timeType] && update[timeType].time);
            timestamp = (timestamp !== null) && ((!isNaN(timestamp) && timestamp) ||timestamp.low||timestamp.high);


            if (timestamp) { 

                update['_' + timeType] = { time : timestamp };
                    
                // First try to use arrival timestamp, if not available then use departure timestamp.
                if (!theIndices.stopsIndex[stop_id][tripKey]) {
                    // NOTE: This may will break if a trip visits a stop multiple times 
                    //       and past stop events are not removed from the StopTimeUpdates.
                    theIndices.stopsIndex[stop_id][tripKey] = timestamp;
                }

                continue;
            } 


            if (timeType === 'arrival') {
                scheduledTime = GTFS && GTFS.getScheduledArrivalTimeForStopForTrip(tripKey, stop_id, stop_sequence);
            } else {
                scheduledTime = GTFS && GTFS.getScheduledDepartureTimeForStopForTrip(tripKey, stop_id, stop_sequence);
            }


            if (!scheduledTime) { continue; }

            delay = parseInt(update[timeType] && update[timeType].delay);

            if (isNaN(delay)) { delay = tripLevelDelay; } 
            else              { tripLevelDelay = delay; }


            if ((!isNaN(delay)) && (scheduledTime !== null)) {
                
                // 'X' is the output format for Unix Timestamps.
                if (startDate) {
                    timeFormatString = "YYYYMMDD_HH:mm:ss" ;
                    scheduledTime = startDate + '_' + scheduledTime;
                } else {
                    timeFormatString = "HH:mm:ss";
                }

                scheduledTimestamp = timeUtils.getTimestamp(scheduledTime, timeFormatString, 'X');

                if ((scheduledTimestamp !== null) && (scheduledTimestamp = parseInt(scheduledTimestamp)) ) {

                    timestamp = scheduledTimestamp + delay;

                    if (!isNaN(timestamp)) {

                        // Default input and output formats will work.
                        //isoTimeString = timeUtils.getTimestamp(timestamp);

                        update['_' + timeType] = { time : timestamp };

                        // First try to use arrival timestamp, if not available then use departure timestamp.
                        if (!theIndices.stopsIndex[stop_id][tripKey]) {
                            // NOTE: This may will break if a trip visits a stop multiple times 
                            //       and past stop events are not removed from the StopTimeUpdates.
                            theIndices.stopsIndex[stop_id][tripKey] = timestamp;
                        }
                    }
                }
            }
        }
    }
}




module.exports = {
    indexAlert          : indexAlert          ,
    indexTripUpdate     : indexTripUpdate     ,
    indexVehiclePostion : indexVehiclePostion ,
    finishRoutesIndex   : finishRoutesIndex   ,
};
