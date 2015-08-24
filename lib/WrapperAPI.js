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
// Note: The purpose for the heavy use of this is to define all these once
//          and reuse them for all GTFS-Realtime.Wrapper instantiations.
//
var theAPI = {


    getTimestamp : function () {
        return _.get(this.GTFSrt_JSON, ['header', 'timestamp', 'low'], null);
    },


    getAllMonitoredTrips : function () {
        return _.keys(this.tripsIndex);
    },


    getTripUpdateForTrip : function (tripID) {
        return _.get(this.tripsIndex, [tripID, 'tripUpdate'], null); 
    },


    getVehiclePositionUpdateForTrip : function (tripID) {
        return _.get(this.tripsIndex, [tripID, 'vehiclePosition'], null);
    },


    getAlertsForTrip : function (tripID) {
        // TODO Implement Alert indexing.
    },


    getStartDateForTrip : function (tripID) {
        var dateStr = this.getTripForTrip(tripID).start_date;

        return (dateStr) ? timeUtils.getDateFromDateString(dateStr) : null;
    },


    getTripUpdatesForRoute : function (routeID) {
        return _.get(this.routesIndex, 'tripUpdates', null);
    },


    getVehiclePositionUpdatesForRoute : function (routeID) {
        return _.get(this.routesIndex, 'vehiclePositions', null);
    },


    getAlertsForRoute : function (routeID) {
        return _.get(this.routesIndex, 'alerts', null);
    },


    getStopTimeUpdatesForTrip : function (tripID) {
        return _.get(this.tripsIndex, [tripID, 'tripUpdate', 'stop_time_update'], null);
    },

    
    getGTFSrtTripForTripID : function (tripID) {
        return _.get(this.tripsIndex, [tripID, 'tripUpdate', 'trip'], null);
    },

    
    getGTFSrtTripIDForTripID : function (tripID) {
        return _.get(this.getGTFSrtTripForTripID(tripID), 'trip_id', null);
    },

    
    getRouteIDForTrip : function (tripID) {
        return _.get(this.getGTFSrtTripForTripID(tripID), 'route_id', null);
    },
    
    
    // FIXME: Use GTFS terminology, not SIRI.
    // How many stops away from the specified stopID
    //      Note: the stops object for each tripsIndex[tripID] gives the 
    //            index of that stop in the stop_time_update. Therefore,
    //            the current or immediate next stop will have an index of 0.
    getStopsFromCallForTrip : function (tripID, stopID) {
        return _.get(this.tripsIndex, [tripID, 'stops', stopID], null);
    },

    
    getOnwardStopIDsForTrip : function (tripID) {
        return _.pluck(this.getStopTimeUpdatesForTrip(tripID), 'stop_id') || null;
    },


    //getNextStopTimeUpdateForTrip : function (tripID) {
    getNextStopTimeUpdateForTrip : function (tripID) {
        return _.first(this.getStopTimeUpdatesForTrip(tripID)) || null;
    },


    getIDOfNextStopForTrip : function (tripID) {
        return _.get(this.getNextStopTimeUpdateForTrip(tripID), 'stop_id', null);
    },


    getFirstNOnwardCallsForTrip : function (tripID, n) {
        return _.take(this.getStopTimeUpdatesForTrip(tripID), n) || null;
    },


    getFirstNOnwardStopIDsForTrip : function (tripID, n) {
        return _.pluck(this.getFirstNOnwardCallsForTrip(tripID), 'stop_id') || null;
    },


    getNthOnwardStopTimeUpdateForTrip : function (tripID, n) {
        return _.get(this.getStopTimeUpdatesForTrip(tripID), n, null);
    },


    getNthOnwardStopIDForTrip : function (tripID, n) {
        return _.get(this.getStopTimeUpdatesForTrip(tripID), [n, 'stop_id'], null);
    },


    getStopTimeUpdateForStopForTrip : function (stopID, tripID) {
        var tripUpdate = _.get(this.tripsIndex, [tripID, 'tripUpdate', null]),
            stopIndex;
        
        stopIndex = _.get(this.tripsIndex, [tripID, 'stop', stopID], null);

        return _.get(tripUpdate, ['stop_time_update', stopIndex], null);
    },

    
    getDestinationStopTimeUpdateForTrip : function (tripID) {
        return _.last(this.getStopTimeUpdatesForTrip(tripID)) || null;
    },

    
    getDestinationIDForTrip : function (tripID) {
        return _.get(this.getDestinationStopTimeUpdateForTrip(tripID), 'stop_id', null);
    },


    getGTFSRouteShortNameForTrip : function (tripID) {
        return _.get(this.tripsIndex, [tripID, 'tripUpdate', 'trip', 'route_id'], null);
    },


    // Lazily generated sorted list of the trips servicing a stop.
    getTripsServicingStop : function (stopID) {
        if ( ! Array.isArray(this.stopsIndex[stopID]) ) {
            this.stopsIndex[stopID] = this.convertStopIndexNodeObjectToSortedArray(stopID);
        }

        return this.stopsIndex[stopID] || null;
    },

    
    // Lazily convert object to array. 
    // Indexing initially uses an Object to ensure uniqueness of tripIDs.
    getTripsServicingRoute : function (routeID) {
        if ( ! this.routesIndex[routeID] ) {
            return null;
        }

        if ( ! Array.isArray(this.routesIndex[routeID]) ) {
            this.routesIndex[routeID] = _.keys(this.routesIndex[routeID]);
        }

        return this.routesIndex[routeID];
    },

    
    getTripsServicingStopForRoute : function (stopID, routeID) {
        return _.intersection(this.getTripsServicingStop(stopID), this.getTripsServicingRoute(routeID));
    },

    
    // For lazily converting associative array of tripID to trip arrival time at stop
    // to a array of trips servicing the stop, sorted by the trips arrival time at the stop.
    convertStopIndexNodeObjectToSortedArray : function (stopID) {
        var tripArrivalTimePairs;
        
        if ( ! this.stopsIndex[stopID] ) { return null; }

        // Assumes that this is the only place where 
        // the associative array of tripIDs to arrivalTimes
        // is converted to an array. In other words, assumes no need to sort.
        if ( Array.isArray(this.stopsIndex[stopID]) ) { return this.stopsIndex[stopID]; }
        
        tripArrivalTimePairs = _.pairs(this.stopsIndex[stopID]);

        tripArrivalTimePairs.sort(function (pair) { return pair[1]; });

        return _.pluck(tripArrivalTimePairs, 0) || null;
    },


    getTripArrivalTimeForStop : function (tripID, stopID) {
        //FIXME: Keep same ordering.
        var stopTimeUpdate = this.getStopTimeUpdateForStopForTrip(stopID, tripID), 
            arrivalTimeUpdate;

        if ( ! stopTimeUpdate ) { return; }

        arrivalTimeUpdate = stopTimeUpdate.arrival;

        return _.get(arrivalTimeUpdate, ['time', 'low'], null);
    },


    getTripDepartureTimeForStop : function (tripID, stopID) {
        //FIXME: Keep same ordering.
        var stopTimeUpdate = this.getStopTimeUpdateForStopForTrip(stopID, tripID), 
            departureTimeUpdate;

        if ( ! stopTimeUpdate ) { return; }

        departureTimeUpdate = stopTimeUpdate.departure;

        return _.get(departureTimeUpdate, ['time', 'low'], null);
    },
};
//
//*********************************************************************************************


module.exports = theAPI;

