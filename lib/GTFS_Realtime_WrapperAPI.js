'use strict';


/* jshint unused:false */


var _          = require('lodash'),

    timeUtils  = require('./utils/timeUtils');


// Requires being merged into object with the GTFSrt_JSON and the indices.
// `this` in the functions then has 
//      * the GTFSrt_JSON, 
//      * the indices, 
//      * the functions in the API.
//
// Note: The purpose for the heavy use of this
//          is to define all these once
//          and reuse them for the various 
var theAPI = {


    getTimestamp : function () {
        return this.GTFSrt_JSON.header.timestamp.low;
    },


    getAllMonitoredTrains : function () {
        return _.keys(this.trainsIndex);
    },


    getTripUpdateForTrain : function (trainID) {
        return this.trainsIndex[trainID].tripUpdate; 
    },


    getVehiclePositionUpdateForTrain : function (trainID) {
        return this.trainsIndex[trainID].vehiclePosition;
    },


    getAlertsForTrain : function (trainID) {
        // TODO Implement Alert indexing.
    },


    getStartDateForTrain : function (trainID) {
        var dateStr = this.getTripForTrain(trainID).start_date;

        return timeUtils.getDateFromDateString(dateStr);
    },


    getTripScheduleDateForTrain : function (trainID) {
        var startDate  = this.getStartDateForTrain(trainID),
            originTime = this.getOriginTimeForTrain(trainID),
        
            scheduleDate  = new Date(startDate);

        if      ( originTime < 0 )      { scheduleDate.setDate(scheduleDate.getDate() + 1); }
        else if ( originTime > 144000 ) { scheduleDate.setDate(scheduleDate.getDate() - 1); }

        return scheduleDate;
    },


    getGTFSTripKeyForTrain : function (trainID) {
        var tripDate     = this.getTripScheduleDateForTrain(trainID),
            tripID       = this.getGTFSrTripIDForTrain(trainID),
            day          = tripDate.getDay(),
            serviceCode,
            coreTripID;

        
        if      (day === 0) { serviceCode = 'SUN'; } 
        else if (day === 6) { serviceCode = 'SAT'; }
        else                { serviceCode = 'WKD'; }

        coreTripID = tripID.substring(0, tripID.lastIndexOf('.') + 2);

        return serviceCode + '_' + coreTripID;
    },


    getTripUpdatesForRoute : function (routeID) {
        return this.routesIndex.tripUpdates;
    },


    getVehiclePositionUpdatesForRoute : function (routeID) {
        return this.routesIndex.vehiclePositions;
    },


    getAlertsForRoute : function (routeID) {
        return this.routesIndex.alerts;
    },


    getStopTimeUpdatesForTrain : function (trainID) {
        return this.trainsIndex[trainID].tripUpdate.stop_time_update;
    },

    
    getTripForTrain : function (trainID) {
        return this.trainsIndex[trainID].tripUpdate.trip;
    },

    
    getGTFSrTripIDForTrain : function (trainID) {
        return this.getTripForTrain(trainID).trip_id;
    },

    
    getRouteIDForTrain : function (trainID) {
        return this.getTripForTrain(trainID).route_id;
    },

    
    getOriginTimeForTrain : function (trainID) {
        var tripID = this.getGTFSrTripIDForTrain(trainID);

        return parseInt(tripID.substring(0, tripID.indexOf('_')));
    },

    
    getStopsFromCallForTrain : function (trainID, stopID) {
        return this.trainsIndex[trainID].stops[stopID];
    },

    
    getOnwardCallsForTrain : function (trainID) {
        return this.trainsIndex[trainID].tripUpdate.stop_time_update;
    },

    
    getOnwardStopIDsForTrain : function (trainID) {
        return _.pluck(this.getOnwardCallsForTrain(trainID), 'stop_id');
    },


    getFirstOnwardCallForTrain : function (trainID) {
        return _.first(this.getOnwardCallsForTrain(trainID));
    },


    getIDOfNextStopForTrain : function (trainID) {
        return this.getFirstOnwardCallForTrain(trainID).stop_id;
    },


    getFirstNOnwardCallsForTrain : function (trainID, n) {
        return _.take(this.getOnwardCallsForTrain(trainID), n);
    },


    getFirstNOnwardStopIDsForTrain : function (trainID, n) {
        return _.pluck(this.getFirstNOnwardCallsForTrain(trainID), 'stop_id');
    },


    getNthOnwardCallForTrain : function (trainID, n) {
        return this.getOnwardCallsForTrain(trainID)[n];
    },


    getNthOnwardStopIDForTrain : function (trainID, n) {
        return this.getOnwardCallsForTrain(trainID)[n].stop_id;
    },


    getStopTimeUpdateForStopForTrain : function (stopID, trainID) {
        var tripUpdate = this.trainsIndex[trainID].tripUpdate,
            stopIndex;
        
        if ( ! tripUpdate) { return; }

        stopIndex = this.trainsIndex[trainID].stops[stopID];

        return tripUpdate.stop_time_update[stopIndex];
    },

    
    getDestinationStopTimeUpdateForTrain : function (trainID) {
        return _.last(this.getOnwardCallsForTrain(trainID));
    },

    
    getDestinationIDForTrain : function (trainID) { //FIXME: Mess. At least make more defensively coded.
        return this.getDestinationStopTimeUpdateForTrain(trainID).stop_id;
    },


    getGTFSRouteShortNameForTrain : function (trainID) {
        return this.trainsIndex[trainID].tripUpdate.trip.route_id;
    },


    getTrainsServicingStop : function (stopID) {
        if ( ! Array.isArray(this.stopsIndex[stopID]) ) {
            this.stopsIndex[stopID] = this.convertStopIndexNodeObjectToSortedArray(stopID);
        }

        return this.stopsIndex[stopID];
    },

    
    getTrainsServicingRoute : function (routeID) {
        if ( ! Array.isArray(this.routesIndex[routeID]) ) {
            this.routesIndex[routeID] = Object.keys(this.routesIndex[routeID]);
        }

        return this.routesIndex[routeID];
    },

    
    getTrainsServicingStopForRoute : function (stopID, routeID) {
        return _.intersection(this.getTrainsServicingStop(stopID), this.getTrainsServicingRoute(routeID));
    },

    
    convertStopIndexNodeObjectToSortedArray : function (stopID) {
        var trainArrivalTimePairs = _.pairs(this.stopsIndex[stopID]);

        trainArrivalTimePairs.sort(function (pair) { return pair[1]; });

        return _.pluck(trainArrivalTimePairs, 0);
    },


    getTrainArrivalTimeForStop : function (trainID, stopID) {
        //FIXME: Keep same ordering.
        var stopTimeUpdate = this.getStopTimeUpdateForStopForTrain(stopID, trainID), 
            arrivalTimeUpdate;

        if ( ! stopTimeUpdate ) { return; }

        arrivalTimeUpdate = stopTimeUpdate.arrival;

        return (arrivalTimeUpdate && arrivalTimeUpdate.time.low) || null;
    },


    getTrainDepartureTimeForStop : function (trainID, stopID) {
        //FIXME: Keep same ordering.
        var stopTimeUpdate = this.getStopTimeUpdateForStopForTrain(stopID, trainID), 
            departureTimeUpdate;

        if ( ! stopTimeUpdate ) { return; }

        departureTimeUpdate = stopTimeUpdate.departure;

        return (departureTimeUpdate && departureTimeUpdate.time.low) || null;
    },



    // TODO: Move these to the Converter ****************************
    //       Keep this module purely GTFS-Realtime
    //
    getDistanceInMilesToNextStop : function (GTFS, trainID) {
        if ( ! GTFS ) { return null; }

        return 'TODO: Implement this';
    },

    
    getDistanceInStopsToNextStop : function (GTFS, trainID) {
        if ( ! GTFS ) { return null; }

        return 'TODO: Implement this';
    },

    
    getDistanceInMilesToCurrStop : function (GTFS, trainID, stopID) {
        if ( ! GTFS ) { return null; }

        return 'TODO: Implement this';
    },

    
    getDistanceInStopsToCurrStop : function (GTFS, trainID, stopID) {
        if ( ! GTFS ) { return null; }

        return 'TODO: Implement this';
    },

};
//
//*************************************************************

module.exports = theAPI;







////========================= Export the API =========================\\

//return { 
    //GTFS_Realtime_JSON                   : GTFSrt_JSON                          ,

    //trainsIndex                          : trainsIndex                          ,
    //routesIndex                          : routesIndex                          ,
    //stopsIndex                           : stopsIndex                           ,

    //getTimestamp                         : getTimestamp                         ,

    //getAllMonitoredTrains                : getAllMonitoredTrains                ,
    //getTrainsServicingRoute              : getTrainsServicingRoute              ,

    //getTripUpdateForTrain                : getTripUpdateForTrain                ,
    //getVehiclePositionUpdateForTrain     : getVehiclePositionUpdateForTrain     ,
    //getAlertsForTrain                    : getAlertsForTrain                    ,

//getStartDateForTrain        : getStartDateForTrain        ,
//getTripScheduleDateForTrain : getTripScheduleDateForTrain ,
//getGTFSTripKeyForTrain      : getGTFSTripKeyForTrain      ,

    //getTripUpdatesForRoute               : getTripUpdatesForRoute               ,
    //getVehiclePositionUpdatesForRoute    : getVehiclePositionUpdatesForRoute    ,
    //getAlertsForRoute                    : getAlertsForRoute                    ,

    //getStopTimeUpdatesForTrain           : getStopTimeUpdatesForTrain           ,
    //getTripForTrain                      : getTripForTrain                      ,

    //getGTFSrTripIDForTrain               : getGTFSrTripIDForTrain               ,
    //getRouteIDForTrain                   : getRouteIDForTrain                   ,

    //getOriginTimeForTrain                : getOriginTimeForTrain                ,

    //getStopsFromCallForTrain             : getStopsFromCallForTrain             ,

    //getOnwardCallsForTrain               : getOnwardCallsForTrain               ,
    //getFirstOnwardCallForTrain           : getFirstOnwardCallForTrain           ,
    //getFirstNOnwardCallsForTrain         : getFirstNOnwardCallsForTrain         ,
    //getNthOnwardCallForTrain             : getNthOnwardCallForTrain             ,

    //getOnwardStopIDsForTrain             : getOnwardStopIDsForTrain             ,
    //getIDOfNextStopForTrain              : getIDOfNextStopForTrain              ,
    //getFirstNOnwardStopIDsForTrain       : getFirstNOnwardStopIDsForTrain       ,
    //getNthOnwardStopIDForTrain           : getNthOnwardStopIDForTrain           ,

    //getStopTimeUpdateForStopForTrain     : getStopTimeUpdateForStopForTrain     ,
    //getDestinationStopTimeUpdateForTrain : getDestinationStopTimeUpdateForTrain ,

    //getDestinationIDForTrain             : getDestinationIDForTrain             ,



    //getGTFSRouteShortNameForTrain        : getGTFSRouteShortNameForTrain        ,

    //getTrainsServicingStop               : getTrainsServicingStop               ,
    //getTrainsServicingStopForRoute       : getTrainsServicingStopForRoute       ,

    //getTrainArrivalTimeForStop           : getTrainArrivalTimeForStop           ,
    //getTrainDepartureTimeForStop         : getTrainDepartureTimeForStop         ,

    //// NOT IMPLEMENTED
    //getDistanceInMilesToNextStop : getDistanceInMilesToNextStop ,
    //getDistanceInStopsToNextStop : getDistanceInStopsToNextStop ,
    //getDistanceInMilesToCurrStop : getDistanceInMilesToCurrStop ,
    //getDistanceInStopsToCurrStop : getDistanceInStopsToCurrStop ,
//};

