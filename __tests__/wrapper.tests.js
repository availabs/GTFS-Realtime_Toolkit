// __tests__/wrapper.js

jest.autoMockOff();

var fs = require('fs'),

    sampleMessage = JSON.parse(fs.readFileSync(__dirname + '/GTFS-Realtime_Sample.json')),

    Wrapper = require('../lib/Wrapper'),

    wrapped = new Wrapper(sampleMessage);


describe('Simple GTFS-Realtime Wrapper Tests.', function() {
    it('Build a wrapper from the sample message.', function() {
        expect(wrapped).toBeTruthy();
    });

    it('Make sure the raw GTFS-Realtime JSON object is exposed.', function () {
        expect(wrapped.GTFSrt_JSON).toBeTruthy();
    });

    it('Check the tripsIndex length.', function() {
        expect(Object.keys(wrapped.tripsIndex).length).toEqual(216);
    });

    it('Check the routesIndex length.', function() {
        expect(Object.keys(wrapped.routesIndex).length).toEqual(9);
    });

    it('Check the stopsIndex length.', function() {
        expect(Object.keys(wrapped.stopsIndex).length).toEqual(312);
    });
});

describe('Test the GTFS-Realtime Wrapper\'s simple getters.', function() {
    it('Build a wrapper from the sample message.', function() {
        expect(wrapped).toBeTruthy();
    });

    it('Make sure the raw GTFS-Realtime JSON object is exposed.', function () {
        expect(wrapped.GTFSrt_JSON).toBeTruthy();
    });

    it('Check the tripsIndex length.', function() {
        expect(Object.keys(wrapped.tripsIndex).length).toEqual(216);
    });

    it('Check the routesIndex length.', function() {
        expect(Object.keys(wrapped.routesIndex).length).toEqual(9);
    });

    it('Check the stopsIndex length.', function() {
        expect(Object.keys(wrapped.stopsIndex).length).toEqual(312);
    });
});

//GTFSrt_JSON
//tripsIndex
//routesIndex
//stopsIndex

//getTimestamp : function () {
//getAllMonitoredTrips : function () {
//getTripUpdateForTrip : function (tripID) {
//getVehiclePositionUpdateForTrip : function (tripID) {
//getAlertsForTrip : function (tripID) {
//getStartDateForTrip : function (tripID) {
//getTripUpdatesForRoute : function (routeID) {
//getVehiclePositionUpdatesForRoute : function (routeID) {
//getAlertsForRoute : function (routeID) {
//getStopTimeUpdatesForTrip : function (tripID) {
//getGTFSrtTripForTripID : function (tripID) {
//getGTFSrtTripIDForTripID : function (tripID) {
//getRouteIDForTrip : function (tripID) {
//getStopsFromCallForTrip : function (tripID, stopID) {
//getOnwardStopIDsForTrip : function (tripID) {
//getNextStopTimeUpdateForTrip : function (tripID) {
//getIDOfNextStopForTrip : function (tripID) {
//getFirstNOnwardCallsForTrip : function (tripID, n) {
//getFirstNOnwardStopIDsForTrip : function (tripID, n) {
//getNthOnwardStopTimeUpdateForTrip : function (tripID, n) {
//getNthOnwardStopIDForTrip : function (tripID, n) {
//getStopTimeUpdateForStopForTrip : function (stopID, tripID) {
//getDestinationStopTimeUpdateForTrip : function (tripID) {
//getDestinationIDForTrip : function (tripID) {
//getGTFSRouteShortNameForTrip : function (tripID) {
//getTripsServicingStop : function (stopID) {
//getTripsServicingRoute : function (routeID) {
//getTripsServicingStopForRoute : function (stopID, routeID) {
//getTripArrivalTimeForStop : function (tripID, stopID) {
//getTripDepartureTimeForStop : function (tripID, stopID) {
