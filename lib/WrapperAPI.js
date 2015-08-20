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


    getAllMonitoredTrips : function () {
        return _.keys(this.tripsIndex);
    },


    getTripUpdateForTripID : function (tripID) {
        return this.tripsIndex[tripID].tripUpdate; 
    },


    getVehiclePositionUpdateForTripID : function (tripID) {
        return this.tripsIndex[tripID].vehiclePosition;
    },


    getAlertsForTripID : function (tripID) {
        // TODO Implement Alert indexing.
    },


    getStartDateForTripID : function (tripID) {
        var dateStr = this.getTripForTripID(tripID).start_date;

        return timeUtils.getDateFromDateString(dateStr);
    },


    //getTripScheduleDateForTripID : function (tripID) {
        //var startDate  = this.getStartDateForTripID(tripID),
            //originTime = this.getOriginTimeForTripID(tripID),
        
            //scheduleDate  = new Date(startDate);

        //if      ( originTime < 0 )      { scheduleDate.setDate(scheduleDate.getDate() + 1); }
        //else if ( originTime > 144000 ) { scheduleDate.setDate(scheduleDate.getDate() - 1); }

        //return scheduleDate;
    //},


    //getGTFSTripKeyForTripID : function (tripID) {
        //var tripDate     = this.getTripScheduleDateForTripID(tripID),
            //day          = tripDate.getDay(),
            //serviceCode,
            //coreTripID;

        
        //if      (day === 0) { serviceCode = 'SUN'; } 
        //else if (day === 6) { serviceCode = 'SAT'; }
        //else                { serviceCode = 'WKD'; }

        //coreTripID = tripID.substring(0, tripID.lastIndexOf('.') + 2);

        //return serviceCode + '_' + coreTripID;
    //},

    //getOriginTimeForTripID : function (tripID) {
        //return parseInt(tripID.substring(0, tripID.indexOf('_'))); // FIXME FIXME FIXME
    //},


    getTripUpdatesForRouteID : function (routeID) {
        return this.routesIndex.tripUpdates;
    },


    getVehiclePositionUpdatesForRouteID : function (routeID) {
        return this.routesIndex.vehiclePositions;
    },


    getAlertsForRouteID : function (routeID) {
        return this.routesIndex.alerts;
    },


    getStopTimeUpdatesForTripID : function (tripID) {
        return this.tripsIndex[tripID].tripUpdate.stop_time_update;
    },

    
    getTripForTripID : function (tripID) {
        return this.tripsIndex[tripID].tripUpdate.trip;
    },

    
    getGTFSrTripIDForTripID : function (tripID) {
        return this.getTripForTripID(tripID).trip_id;
    },

    
    getRouteIDForTripID : function (tripID) {
        return this.getTripForTripID(tripID).route_id;
    },
    
    
    getStopsFromCallForTripID : function (tripID, stopID) {
        return this.tripsIndex[tripID].stops[stopID];
    },

    
    getOnwardCallsForTripID : function (tripID) {
        return this.tripsIndex[tripID].tripUpdate.stop_time_update;
    },

    
    getOnwardStopIDsForTripID : function (tripID) {
        return _.pluck(this.getOnwardCallsForTripID(tripID), 'stop_id');
    },


    getFirstOnwardCallForTripID : function (tripID) {
        return _.first(this.getOnwardCallsForTripID(tripID));
    },


    getIDOfNextStopForTripID : function (tripID) {
        return this.getFirstOnwardCallForTripID(tripID).stop_id;
    },


    getFirstNOnwardCallsForTripID : function (tripID, n) {
        return _.take(this.getOnwardCallsForTripID(tripID), n);
    },


    getFirstNOnwardStopIDsForTripID : function (tripID, n) {
        return _.pluck(this.getFirstNOnwardCallsForTripID(tripID), 'stop_id');
    },


    getNthOnwardCallForTripID : function (tripID, n) {
        return this.getOnwardCallsForTripID(tripID)[n];
    },


    getNthOnwardStopIDForTripID : function (tripID, n) {
        return this.getOnwardCallsForTripID(tripID)[n].stop_id;
    },


    getStopTimeUpdateForStopIDForTripID : function (stopID, tripID) {
        var tripUpdate = this.tripsIndex[tripID].tripUpdate,
            stopIndex;
        
        if ( ! tripUpdate) { return null; }

        stopIndex = this.tripsIndex[tripID].stops[stopID];

        return tripUpdate.stop_time_update[stopIndex];
    },

    
    getDestinationStopTimeUpdateForTripID : function (tripID) {
        return _.last(this.getOnwardCallsForTripID(tripID));
    },

    
    getDestinationIDForTripID : function (tripID) { //FIXME: Mess. At least make more defensively coded.
        return this.getDestinationStopTimeUpdateForTripID(tripID).stop_id;
    },


    getGTFSRouteShortNameForTripID : function (tripID) {
        return this.tripsIndex[tripID].tripUpdate.trip.route_id;
    },


    getTripsServicingStop : function (stopID) {
        if ( ! Array.isArray(this.stopsIndex[stopID]) ) {
            this.stopsIndex[stopID] = this.convertStopIndexNodeObjectToSortedArray(stopID);
        }

        return this.stopsIndex[stopID];
    },

    
    getTripsServicingRoute : function (routeID) {
        if ( ! Array.isArray(this.routesIndex[routeID]) ) {
            this.routesIndex[routeID] = Object.keys(this.routesIndex[routeID]);
        }

        return this.routesIndex[routeID];
    },

    
    getTripsServicingStopForRouteID : function (stopID, routeID) {
        return _.intersection(this.getTripsServicingStop(stopID), this.getTripsServicingRoute(routeID));
    },

    
    convertStopIndexNodeObjectToSortedArray : function (stopID) {
        var tripArrivalTimePairs = _.pairs(this.stopsIndex[stopID]);

        tripArrivalTimePairs.sort(function (pair) { return pair[1]; });

        return _.pluck(tripArrivalTimePairs, 0);
    },


    getTripArrivalTimeForStopID : function (tripID, stopID) {
        //FIXME: Keep same ordering.
        var stopTimeUpdate = this.getStopTimeUpdateForStopIDForTripID(stopID, tripID), 
            arrivalTimeUpdate;

        if ( ! stopTimeUpdate ) { return; }

        arrivalTimeUpdate = stopTimeUpdate.arrival;

        return (arrivalTimeUpdate && arrivalTimeUpdate.time.low) || null;
    },


    getTripDepartureTimeForStopID : function (tripID, stopID) {
        //FIXME: Keep same ordering.
        var stopTimeUpdate = this.getStopTimeUpdateForStopIDForTripID(stopID, tripID), 
            departureTimeUpdate;

        if ( ! stopTimeUpdate ) { return; }

        departureTimeUpdate = stopTimeUpdate.departure;

        return (departureTimeUpdate && departureTimeUpdate.time.low) || null;
    },



    // TODO: Move these to the Converter ****************************
    //       Keep this module purely GTFS-Realtime
    //
    getDistanceInMilesToNextStop : function (GTFS, tripID) {
        if ( ! GTFS ) { return null; }

        return 'TODO: Implement this';
    },

    
    getDistanceInStopsToNextStop : function (GTFS, tripID) {
        if ( ! GTFS ) { return null; }

        return 'TODO: Implement this';
    },

    
    getDistanceInMilesToCurrStop : function (GTFS, tripID, stopID) {
        if ( ! GTFS ) { return null; }

        return 'TODO: Implement this';
    },

    
    getDistanceInStopsToCurrStop : function (GTFS, tripID, stopID) {
        if ( ! GTFS ) { return null; }

        return 'TODO: Implement this';
    },

};
//
//*************************************************************

module.exports = theAPI;

