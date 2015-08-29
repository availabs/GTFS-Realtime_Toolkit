#The GTFS-Realtime Indices

The GTFS-Realtime_Toolkit creates three indices on the GTFS-Realtime Message JSON object. 
These indices provide O(1) lookup times for the Wrapper accessor methods.
The following describes their structures:


##The `tripsIndex`
This is the main index built on the GTFS-Realtime Message. 
The GTFS-Realtime_Toolkit.Wrapperi, like the GTFS-Realtime feed, is trip-based.
The `routesIndex` and `stopsIndex` simply provide access into this index for routes and stops, respectively.
The following is an example tripsIndex node. It contains all the data from the feed message, indexed by trip_id.
Note that transit agency of this sameple is the NYC MTA, and their GTFS-Realtime messages have `.nyct_*` extensions.
The Wrapper should support any GTFS-Realtime feed in compliance with the standard, even if extensions are made.
To handle those extensions, extend the Wrapper.
For an example, see [MTA_Subway_GTFS-Realtime_Wrapper](https://github.com/availabs/MTA_Subway_GTFS-Realtime_Toolkit).
```
    "095950_2..S01R": {
        "TripUpdate": {
            "trip": {
                "trip_id": "095950_2..S01R",
                "route_id": "2",
                "start_time": null,
                "start_date": "20150825",
                "schedule_relationship": null,
                ".nyct_trip_descriptor": {
                    "train_id": "02 1559+ 241/FLA",
                    "is_assigned": true,
                    "direction": 3
                }
            },
            "vehicle": null,
            "stop_time_update": [
                {
                    "stop_sequence": null,
                    "stop_id": "246S",
                    "arrival": {
                        "delay": null,
                        "time": {
                            "low": 1440539109,
                            "high": 0,
                            "unsigned": false
                        },
                        "uncertainty": null
                    },
                    "departure": {
                        "delay": null,
                        "time": {
                            "low": 1440539109,
                            "high": 0,
                            "unsigned": false
                        },
                        "uncertainty": null
                    },
                    "schedule_relationship": 0,
                    ".nyct_stop_time_update": {
                        "scheduled_track": "2",
                        "actual_track": "2"
                    }
                },
                {
                    "stop_sequence": null,
                    "stop_id": "247S",
                    "arrival": {
                        "delay": null,
                        "time": {
                            "low": 1440539259,
                            "high": 0,
                            "unsigned": false
                        },
                        "uncertainty": null
                    },
                    "departure": null,
                    "schedule_relationship": 0,
                    ".nyct_stop_time_update": {
                        "scheduled_track": "2",
                        "actual_track": null
                    }
                }
            ],
            "timestamp": null
        },
        "VehiclePosition": {
            "trip": {
                "trip_id": "095950_2..S01R",
                "route_id": "2",
                "start_time": null,
                "start_date": "20150825",
                "schedule_relationship": null,
                ".nyct_trip_descriptor": {
                    "train_id": "02 1559+ 241/FLA",
                    "is_assigned": true,
                    "direction": 3
                }
            },
            "vehicle": null,
            "position": null,
            "current_stop_sequence": 48,
            "stop_id": "246S",
            "current_status": 1,
            "timestamp": {
                "low": 1440539079,
                "high": 0,
                "unsigned": true
            },
            "congestion_level": null
        },
        "alerts": [],
        "stops": {
            "246S": 0,
            "247S": 1
        }
    },

```

##The routesIndex
The purpose of the routesIndex is to provide fast lookup of the trip_ids 
for the trips servicing a route.  The following is an example of a routesIndex node. 
where in this case the route_id is 1.
```
    "1": [
        "107100_1..N02R",
        "107500_1..N02R",
        "107550_1..S02R",
        "107850_1..S02R",
        "107900_1..N02R",
        "108300_1..N02R",
        "108550_1..S02R",
        "108800_1..N02R",
        "109050_1..S02R",
        "109200_1..N02R",
        "109550_1..S02R",
        "109600_1..N02R",
        "110000_1..N02R",
        "110050_1..S02R",
        "110400_1..N02R",
        "110550_1..S02R",
        "110900_1..N02R",
        "111050_1..S02R",
        "111400_1..N02R",
        "111550_1..S02R",
        "111900_1..N02R",
        "111950_1..S02R",
        "112400_1..N02R",
        "112550_1..S02R",
        "112900_1..N02R",
        "113050_1..S02R",
        "113400_1..N02R",
        "113550_1..S02R",
        "113900_1..N02R",
        "114050_1..S02R",
        "114400_1..N02R",
        "114550_1..S02R",
        "114900_1..N02R",
        "115050_1..S02R",
        "115400_1..N02R",
        "115550_1..S02R",
        "115900_1..N02R",
        "116050_1..S02R",
        "116400_1..N02R",
        "116550_1..S02R",
        "116900_1..N02R",
        "107750_1..N02R"
    ],
```

##The stopsIndex
The purpose of the stopsIndex is to provide fast lookup of the trip_ids
for all trips servicing a stop. Note that the set of trip_ids is first stored as
an object. This object is then, lazily, converted into a sorted array in ascending
order by arrival or departure time at the stop. The reason for this strategy is
to defer the costs until we know that we actually need the sorted list.
In its final form, a stopsIndex node for stop `101N` would look like:
```
    "101N": {
        "056050_1..N02R": 1440771639,
        "056400_1..N02R": 1440771957,
        "056800_1..N02R": 1440772071,
        "057150_1..N02R": 1440772501,
        "057500_1..N02R": 1440772672,
        "058300_1..N02R": 1440773078,
        "058750_1..N02R": 1440773316,
        "059200_1..N02R": 1440773617,
        "059600_1..N02R": 1440773934,
        "060100_1..N02R": 1440774208,
        "060550_1..N02R": 1440774454,
        "061050_1..N02R": 1440774751,
        "061600_1..N02R": 1440774961,
        "062150_1..N02R": 1440775260,
        "062700_1..N02R": 1440775620,
        "063250_1..N02R": 1440775830,
        "063850_1..N02R": 1440776190,
        "064350_1..N02R": 1440776490,
        "064850_1..N02R": 1440776790
    },
```
Where the key:value pairs represent trip_id:arrival_time. After conversion to the sequence:
```
    "101N": [
        "056050_1..N02R",
        "056400_1..N02R",
        "056800_1..N02R",
        "057150_1..N02R",
        "057500_1..N02R",
        "058300_1..N02R",
        "058750_1..N02R",
        "059200_1..N02R",
        "059600_1..N02R",
        "060100_1..N02R",
        "060550_1..N02R",
        "061050_1..N02R",
        "061600_1..N02R",
        "062150_1..N02R",
        "062700_1..N02R",
        "063250_1..N02R",
        "063850_1..N02R",
        "064350_1..N02R",
        "064850_1..N02R"
    ],

```
