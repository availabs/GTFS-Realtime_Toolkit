jest.autoMockOff();


describe('Simple GTFS-Realtime Wrapper Tests.', function() {
    it('Build a wrapper from the sample message.', function() {
        var FeedReader = require('../lib/FeedReader.js'),
            config     = require('./.config.js'),
            feedreader = new FeedReader(config);
        
        function listener (msg) {
            feedreader.removeListener(listener);
            console.log(_.filter(_.pluck(msg.entity, 'trip_update.trip.trip_id')));
        }

        feedreader.registerListener(listener);

        console.log(JSON.stringify(feedreader));
    });

    //it('Build a wrapper from the sample message.', function() {
        //var FeedReader = require('../lib/FeedReader.js'),
            //config     = require('./.config.js'),
            //feedreader = new FeedReader(config);

        //expect(FeedReader).toBeCalledWith(config);
    //});
});


        //feedReader.registerListener(listener);

        //function listener (msg) {
            //feedreader.removeListener(listener);

            //console.log(_.filter(_.pluck(msg.entity, 'trip_update.trip.trip_id')));
        //}


