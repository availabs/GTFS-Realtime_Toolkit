/**
 * @module "GTFS-Realtime_Toolkit.WrapperAPI"
 * @abstract
 * @summary Used as the prototype for the GTFS-Realtime_Toolkit.Wrapper.
 */

'use strict';


var _          = require('lodash'),
    timeUtils  = require('./TimeUtils');


var theAPI = {


    /**
     *  "This timestamp identifies the moment when the content of this feed has been created (in server time). 
     *   In POSIX time (i.e., number of seconds since January 1st 1970 00:00:00 UTC)."
     *  @returns {number}
     */
    getTimestamp : function () {
        var timestamp = +(_.get(this, ['GTFSrt_JSON', 'header', 'timestamp', 'low'], NaN));

        return (!isNaN(timestamp)) ? timestamp : null;
    },


    /**
     *  Get the set of all trips that appear in the GTFS-Realtime message.
     *  @returns {Array}
     */
    getAllMonitoredTrips : function () {
        return _.keys(this.tripsIndex);
    },


    /** 
     * Get the GTFS-Realtime TripUpdate for the specified trip. 
     * "Real-time update on the progress of a vehicle along a trip."
     * see https://developers.google.com/transit/gtfs-realtime/reference#TripUpdate
     * @param {string|number} trip_id
     * @returns {object}
     */
    getTripUpdateForTrip : function (trip_id) {
        return _.get(this, ['tripsIndex', trip_id, 'TripUpdate'], null); 
    },



    /**
     * Get the GTFS-Realtime VehiclePosition for the trip.
     * "Realtime positioning information for a given vehicle."
     * "The motivation to include VehiclePosition is to provide the timestamp field.
     *  This is the time of the last detected movement of the train.
     *  This allows feed consumers to detect the situation when a train stops moving (aka stalled)."
     * @see @link{https://developers.google.com/transit/gtfs-realtime/reference#VehiclePosition}
     * @see @link{http://datamine.mta.info/sites/all/files/pdfs/GTFS-Realtime-NYC-Subway%20version%201%20dated%207%20Sep.pdf}
     * @param {string|number} trip_id
     * @returns {object}
     */
    getVehiclePositionUpdateForTrip : function (trip_id) {
        return _.get(this, ['tripsIndex', trip_id, 'VehiclePosition'], null);
    },


    /** 
     * Get the scheduled start date of this trip instance from the trip's GTFS-Realtime time update.
     * @param {string|number} trip_id
     * @returns {date}
     * */
    getStartDateForTrip : function (trip_id) {
        var dateStr = _.get(this.getTripUpdateForTrip(trip_id), ['trip', 'start_date'], null);

        // Per the gtfs-realtime-proto spec, start_date format is "YYYYMMDD"
        return (dateStr) ? timeUtils.getDateObject(dateStr, 'YYYYMMDD') : null;
    },



    /**
     * Get the GTFS-Realtime StopTimeUpdate for the trip.
     * "This includes all future StopTimes for the trip but StopTimes from the past
     *  are omitted. The first StopTime in the sequence is the stop the train is
     *  currently approaching, stopped at or about to leave. A stop is dropped from
     *  the sequence when the train departs the station."
     * @param {string|number} trip_id
     * @returns {object}
     */
    getStopTimeUpdatesForTrip : function (trip_id) {
        return _.get(this, ['tripsIndex', trip_id, 'TripUpdate', 'stop_time_update'], null);
    },

    
    /**
     * "A descriptor that identifies an instance of a GTFS trip, or all instances of a trip along a route."
     * @param {string|number} trip_id
     * @returns {object}
     */
    getTripDescriptorForTrip : function (trip_id) {
        return _.get(this, ['tripsIndex', trip_id, 'TripUpdate', 'trip'], null);
    },

    
    /**
     * "The route_id from the GTFS that this selector refers to."
     * @param {string|number} trip_id
     * @returns {string|number|null} route_id
     */
    getRouteIDForTrip : function (trip_id) {
        var route_id = _.get(this.getTripDescriptorForTrip(trip_id), 'route_id', null);

        return (route_id && route_id.toString) ? route_id.toString() : route_id;
    },
    
   
    /**
     *  Each tripsIndex node's `stops` member maps a stop_id to the index of that stop's StopTimeUpdate in the stop_time_update array.
     *  Therefore, the current or immediate next stop will have an index of 0.
     *  Regarding the MTA_GTFS-Realtime_to_SIRI converter, this index will give
     *      "The number of stops on the vehicle's current trip until the stop in question, starting from 0."
     *  @param {string|number} trip_id - GTFS-Realtime trip_id
     *  @returns {number}
     */
    getIndexOfStopInStopTimeUpdatesForTrip : function (trip_id, stop_id) {

        return _.get(this, ['tripsIndex', trip_id, 'stops', stop_id], null);
    },

    
    /**
     *  The sequence of stop_ids for the stops that a trip is going to make, in sorted order by time.
     *  Includes the current stop, if the train is still at the terminal. //TODO: Check this.
     *  @param {string|number} trip_id
     *  @return {Array}
     */
    getStopIDsForAllOnwardStopsForTrip : function (trip_id) {
        return _.map(this.getStopTimeUpdatesForTrip(trip_id), 'stop_id', null);
    },


    /**
     *  Get the StopTimeUpdate for the trip's next stop.
     *  @param {string|number} trip_id
     *  @return {object}
     */
    getStopTimeUpdateForNextStopForTrip : function (trip_id) {
        return _.first(this.getStopTimeUpdatesForTrip(trip_id)) || null;
    },


    /**
     * Get the stop_id of a trip's next stop.
     *  @param {string|number} trip_id
     *  @return {number}
     */
    getIDOfNextOnwardStopForTrip : function (trip_id) {
        return _.get(this.getStopTimeUpdateForNextStopForTrip(trip_id), 'stop_id', null);
    },



    /**
     * Get the all onward StopTimeUpdates for the trip.
     *  @param {string|number} trip_id
     *  @return {array}
     */
    getOnwardStopTimeUpdatesForTrip : function (trip_id) {
        return this.getStopTimeUpdatesForTrip(trip_id);
    },



    /**
     * Get the stop_ids for all onward stops for the trip.
     *  @param {string|number} trip_id
     *  @return {array}
     */
    getOnwardStopIDsForTrip : function (trip_id) {
        return _.map(this.getOnwardStopTimeUpdatesForTrip(trip_id), 'stop_id');
    },



    /**
     * Get the next N onward StopTimeUpdates for the trip.
     *  @param {string|number} trip_id
     *  @param {number} n 
     *  @return {array}
     */
    getNextNOnwardStopTimeUpdatesForTrip : function (trip_id, n) {
        return _.take(this.getStopTimeUpdatesForTrip(trip_id), n) || null;
    },


    /**
     * Get the stop_ids for the next N stops for the trip.
     *  @param {string|number} trip_id
     *  @param {number} n 
     *  @return {array}
     */
    getNextNOnwardStopIDsForTrip : function (trip_id, n) {
        return _.take(_.map(this.getNextNOnwardStopTimeUpdatesForTrip(trip_id), 'stop_id'), n);
    },


    /**
     * Get the StopTimeUpdate for the Nth onward stop for the trip.
     *  @param {string|number} trip_id
     *  @param {number} n 
     *  @return {object}
     */
    getNthOnwardStopTimeUpdateForTrip : function (trip_id, n) {
        return _.get(this.getStopTimeUpdatesForTrip(trip_id), n, null);
    },


    /**
     * Get the stop_id for the Nth onward stop for the trip.
     *  @param {string|number} trip_id
     *  @param {number} n 
     *  @return {object}
     */
    getNthOnwardStopIDForTrip : function (trip_id, n) {
        return _.get(this.getStopTimeUpdatesForTrip(trip_id), [n, 'stop_id'], null);
    },


    /**
     * Get the StopTimeUpdate for the given stop_id for the given trip.
     *  @param {string|number} trip_id
     *  @param {string|number} stop_id
     *  @return {object}
     */
    getStopTimeUpdateForStopForTrip : function (trip_id, stop_id) {
        var indexOfStop = this.getIndexOfStopInStopTimeUpdatesForTrip(trip_id, stop_id);


        return _.get(this, ['tripsIndex', trip_id, 'TripUpdate', 'stop_time_update', indexOfStop], null);
    },

    
    /**
     * Get the StopTimeUpdate for the given trip's destination.
     *  @param {string|number} trip_id
     *  @return {object}
     */
    getDestinationStopTimeUpdateForTrip : function (trip_id) {
        return _.last(this.getStopTimeUpdatesForTrip(trip_id)) || null;
    },


    /**
     * Get the id for the given trip's destination.
     *  @param {string|number} trip_id
     *  @return {object}
     */
    getDestinationIDForTrip : function (trip_id) {
        return _.get(this.getDestinationStopTimeUpdateForTrip(trip_id), 'stop_id', null);
    },


    /**
     * Get the list of trips servicing a stop.
     * Note: this list is sorted in ascending order by time.
     * @param {string|number} stop_id
     * @return {object}
     *
     * TODO: This will break under the following conditions:
     *          1) A trip visits the stop multiple times.
     *          2) StopTimeUpdates for past events are not dropped.
     *
     *       For case 1, a solution would be to keep an array of stop times in the stopsIndex for each trip.
     *       For case 2, a solution would be to first filter out expired stop time updates.
     *
     *       Neither case applies for MTA, therefore implementation is postponed... YAGNI.
     */
    getTripsServicingStop : function (stop_id) {
        // Lazy conversion of the set of trips to a sorted list.
        if ( ! Array.isArray(this.stopsIndex[stop_id]) ) {
            this.stopsIndex[stop_id] = convertStopIndexNodeObjectToSortedArray.call(this, stop_id);
        }

        return _.get(this, ['stopsIndex', stop_id], null);
    },

    
    /**
     * Get the list of trips servicing a route.
     * @param {string|number} stop_id
     * @returns {object}
     */
    getTripsServicingRoute : function (route_id) {
        return _.get(this, ['routesIndex', route_id], null);
    },

    
    /**
     * Get the list of trips servicing a stop for a route.
     * @param {string|number} stop_id
     * @returns {object}
     */
    getTripsServicingStopForRoute : function (stop_id, route_id) {
        return _.intersection(this.getTripsServicingStop(stop_id), this.getTripsServicingRoute(route_id));
    },
    

    tripDoesHaveAlert : function (trip_id) {
        return !! _.get(this, ['tripsIndex', trip_id, 'alerts', 'length'], null);
    },

    getAllTripsWithAlert : function () {
        var that = this,
            allTrips = this.getAllMonitoredTrips() || [];

        return allTrips.filter(function (trip_id) {
            return that.tripDoesHaveAlert(trip_id);
        });
    },

    getRoutesWithAlertFilterObject : function (allTripsWithAlert) {
        var allTripsWithAlert = allTripsWithAlert || this.getAllTripsWithAlert() || [], //jshint ignore:line
            routesWithAlerts = {},
            routeForTrip,
            i;

        for ( i = 0; i < allTripsWithAlert.length; ++i) {
            routeForTrip = this.getRouteIDForTrip(allTripsWithAlert[i]);
             
            if (routeForTrip !== null) {
                routesWithAlerts[routeForTrip] = 1;
            }
        }
        
        return routesWithAlerts;
    },

     getStopsWithAlertFilterObject : function (allTripsWithAlert) {
        var that = this,
            allTripsWithAlert = allTripsWithAlert || this.getAllTripsWithAlert() || [], //jshint ignore:line
            stopsWithAlerts = {},
            trip_id,
            onwardStopIDsForTrip,
            i, ii;

        for ( i = 0; i < allTripsWithAlert.length; ++i ) {
            trip_id = allTripsWithAlert[i];

            onwardStopIDsForTrip = that.getOnwardStopIDsForTrip(trip_id);

            if (Array.isArray(onwardStopIDsForTrip) && onwardStopIDsForTrip.length) {
                for ( ii = 0; ii < onwardStopIDsForTrip.length; ++ii ) {
                    if (onwardStopIDsForTrip[ii]) {
                        stopsWithAlerts[onwardStopIDsForTrip[ii]] = 1;
                    }
                }
            }
        }
        
        return stopsWithAlerts;
    },

   
    /**
     *  "Predicted arrival time when there is a scheduled arrival time, predicted
     *   transit time if there is a scheduled transit time, not used otherwise."
     *  @param {string|number} trip_id
     *  @param {string|number} stop_id
     *  @returns {number}
     */
    getExpectedArrivalTimeAtStopForTrip : function (trip_id, stop_id) {
        return _.get(this.getStopTimeUpdateForStopForTrip(trip_id, stop_id), ['_arrival', 'time'], null);    
    },


    /**
     *  "Predicted departure time when there is a scheduled departure time,
     *  predicted transit time if there is a scheduled transit time, not used
     *  otherwise."
     *  @param {string|number} trip_id
     *  @param {string|number} stop_id
     *  @returns {number}
     */
    getExpectedDepartureTimeAtStopForTrip : function (trip_id, stop_id) {
        return _.get(this.getStopTimeUpdateForStopForTrip(trip_id, stop_id), ['_departure', 'time'], null);
   },
 
    getVehiclePositionCurrentStatusForTrip : function (trip_id) {
        /* jslint validthis:true */
        var statusStrings = [
            'INCOMING_AT',
            'STOPPED_AT',
            'IN_TRANSIT_TO',
        ],

        curStatusCode = _.get(this, ['tripsIndex', trip_id, 'VehiclePosition', 'current_status'], null);

        return _.get(statusStrings, curStatusCode, null);
    },


    getVehiclePositionCurrentStopSequenceForTrip : function (trip_id) {
        /* jslint validthis:true */
        return _.get(this, ['tripsIndex', trip_id, 'VehiclePosition', 'current_stop_sequence'], null);
    },

};
//
//*********************************************************************************************


/**
 * For lazily converting associative array of trip_id to trip arrival time at stop
 *      to a array of trips servicing the stop, sorted by the trips arrival time at the stop.
 * This shouldn't be part of the external API.
 * Must bind `this` to the Wrapper instance's `this`.
 * @param {string|number} stop_id
 * @returns {Array}
 *
 */
function convertStopIndexNodeObjectToSortedArray (stop_id) {
    /* jslint validthis:true */
    var stopsIndexNode = _.get(this, ['stopsIndex', stop_id], null);
    
    // If stopsIndexNode is already an array, then this work has already been done.
    if ( !stopsIndexNode || Array.isArray(stopsIndexNode)) { return stopsIndexNode; }
    
    return _.pluck(_.sortBy(_.pairs(stopsIndexNode), 1), 0);
}




module.exports = theAPI;




/*
getAllMonitoredTrips
getDestinationIDForTrip
getDestinationStopTimeUpdateForTrip
getExpectedArrivalTimeAtStopForTrip
getExpectedDepartureTimeAtStopForTrip
getIDOfNextOnwardStopForTrip
getIndexOfStopInStopTimeUpdatesForTrip
getNextNOnwardStopIDsForTrip
getNextNOnwardStopTimeUpdatesForTrip
getNthOnwardStopIDForTrip
getNthOnwardStopTimeUpdateForTrip
getOnwardStopIDsForTrip
getOnwardStopTimeUpdatesForTrip
getRouteIDForTrip
getStartDateForTrip
getStopIDsForAllOnwardStopsForTrip
getStopTimeUpdateForNextStopForTrip
getStopTimeUpdateForStopForTrip
getStopTimeUpdatesForTrip
getTimestamp
getTripDescriptorForTrip
getTripUpdateForTrip
getTripsServicingRoute
getTripsServicingStop
getTripsServicingStopForRoute
getVehiclePositionUpdateForTrip
*/
