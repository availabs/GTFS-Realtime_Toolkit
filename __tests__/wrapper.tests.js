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
        expect(Object.keys(wrapped.tripsIndex).length).toEqual(250);
    });

    it('Check the routesIndex length.', function() {
        expect(Object.keys(wrapped.routesIndex).length).toEqual(8);
    });

    it('Check the stopsIndex length.', function() {
        expect(Object.keys(wrapped.stopsIndex).length).toEqual(312);
    });
});
