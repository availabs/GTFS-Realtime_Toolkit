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


function indexTripUpdate (theIndices, tripUpdateMessage, GTFS, feedMessageTimestamp) {
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

    //Idempotent
    theIndices.routesIndex[routeID][tripID] = 1;


    handleStopTimeUpdatesForTrip(GTFS, theIndices, stopTimeUpdates, 
                                 tripID, tripLevelDelay, startDate,
                                 feedMessageTimestamp);
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


// 
//
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
function handleStopTimeUpdatesForTrip (GTFS, theIndices, stopTimeUpdates, 
                                       tripKey, tripLevelDelay, startDate,
                                       feedMessageTimestamp) {
    var update ,

        timeTypes = ['arrival', 'departure'] ,
        timeType ,

        stop_id ,
        stop_sequence ,

        splitScheduledTimeString ,

        hour ,
        minutes ,
        seconds,

        daysPastStartDate ,

        delay ,
        timestamp ,
        scheduledTime ,
        scheduledTimestamp ,

        timeFormatString ,

        i, j ;


    tripLevelDelay = parseInt(tripLevelDelay);
    
    if ( ! (Array.isArray(stopTimeUpdates) && stopTimeUpdates.length) )  { return; }

    // Mutates stopTimesUpdates via splice.
    removeHistoricalStopTimeUpdates (theIndices, stopTimeUpdates, tripKey, feedMessageTimestamp) ;
    
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
            timestamp = ((timestamp !== undefined) && (timestamp !== null)) ?
                            (parseInt(timestamp)||parseInt(timestamp.low)||parseInt(timestamp.high)) : null;
            

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


            if (!scheduledTime || !scheduledTime.split) { continue; }

            splitScheduledTimeString = scheduledTime.split(':');

            hour    = +(splitScheduledTimeString[0]);
            minutes = +(splitScheduledTimeString[1]);
            seconds = +(splitScheduledTimeString[2]);


            // Can't proceed if the time string was poorly formatted.
            if (isNaN(hour) || isNaN(minutes) || isNaN(seconds)) { continue; }

            if ((hour > 24) || ((hour === 24) && ((minutes > 0) || (seconds > 0)))) {
                daysPastStartDate = Math.floor(hour / 24);
                hour = hour % 24;

                startDate = parseInt(startDate) + daysPastStartDate;
            }

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


function removeHistoricalStopTimeUpdates (theIndices, stopTimeUpdates, tripKey, feedMessageTimestamp) {

    var tripsIndexNode ,

        tripUpdate ,
        cutOffTimestamp = null ,

        vehiclePositionUpdate ,

        stu ,
        stuTimestamp ,

        i ;


    if (!Array.isArray(stopTimeUpdates)) { return; }

    tripsIndexNode = (theIndices.tripsIndex && theIndices.tripsIndex[tripKey]) ;

    if (!tripsIndexNode) { return; }


    vehiclePositionUpdate = tripsIndexNode.VehiclePosition ;

    if (vehiclePositionUpdate) {
        cutOffTimestamp = (vehiclePositionUpdate.timestamp || null) ;
        cutOffTimestamp = ((cutOffTimestamp&& (cutOffTimestamp.low|| cutOffTimestamp.high))|| cutOffTimestamp) ;
        cutOffTimestamp = (parseInt(cutOffTimestamp) || null) ;
    }

    if (!cutOffTimestamp) {
        tripUpdate = tripsIndexNode.TripsUpdate;

        if (tripUpdate) {
            cutOffTimestamp = tripUpdate.timestamp;
            cutOffTimestamp = ((cutOffTimestamp&& (cutOffTimestamp.low|| cutOffTimestamp.high))|| cutOffTimestamp) ;
            cutOffTimestamp = (parseInt(cutOffTimestamp) || null) ;
        }
     }

    cutOffTimestamp = cutOffTimestamp || parseInt(feedMessageTimestamp) ;

    if (!cutOffTimestamp) { return; }

//if (feedMessageTimestamp >= 1457262839) {
//debugger; 
//}

    // Iterate to get the splice start index.
    for ( i = 0; i < stopTimeUpdates.length; ++i ) {
        stu = stopTimeUpdates[i] ;
        if (!stu) { continue; }

        stuTimestamp = stu && stu.departure && stu.departure.time;
        stuTimestamp = parseInt((stuTimestamp && (stuTimestamp.low || stuTimestamp.high)) || stuTimestamp);

        if (stuTimestamp) {
            if (stuTimestamp >= cutOffTimestamp) { break; }
        } else {
            stuTimestamp = stu && stu.arrival && stu.arrival.time;
            stuTimestamp = parseInt((stuTimestamp && (stuTimestamp.low || stuTimestamp.high)) || stuTimestamp);

            if (stuTimestamp >= cutOffTimestamp) { break; }
        }
 
//console.log('stuTimestamp:', stuTimestamp, ':', 'cutOffTimestamp:', cutOffTimestamp);
//console.log('__+--->', stuTimestamp - cutOffTimestamp);

    }

    if (i && --i) { 
        //if(i === (stopTimeUpdates.length-1)) { --i; }
        stopTimeUpdates.splice(0, i); 
        //}
    } 
}


module.exports = {
    indexAlert          : indexAlert          ,
    indexTripUpdate     : indexTripUpdate     ,
    indexVehiclePostion : indexVehiclePostion ,
    finishRoutesIndex   : finishRoutesIndex   ,
};
