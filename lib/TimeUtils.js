'use strict';


var moment = require('moment-timezone');


// expects string such as 'America/New_York'
var agency_timezone;


function setAgencyTimezone (ag_tz) {
    agency_timezone = ag_tz;
}

function getAgencyTimezone () {
    return agency_timezone;
}


/** TODO: Document
 *  Wrapper around moment.js
 *  params: either a posix timestamp in seconds since Epoch, 
 *
 *  Output formats: http://momentjs.com/docs/#/displaying/format/
 */
function getTimestamp (time, parseFormat, outputFormat) {
    
    // Were we given a posix timestamp for the time parameter?
    var posixTimestamp = ( typeof time === 'number' ) ? (time * 1000) : null,
        t;
    
    if (posixTimestamp !== null) { 
        //t = (agency_timezone) ? moment.tz(posixTimestamp, agency_timezone) : moment(posixTimestamp) ;
        t =  moment(posixTimestamp) ;
    } else if (time && parseFormat) { 
        //t = (agency_timezone) ? moment.tz(time, parseFormat, agency_timezone) : moment(time, parseFormat) ; 
        t =  moment(time, parseFormat) ; 
    } else if (time) { 
        //t = (agency_timezone) ? moment.tz(time, agency_timezone) : moment(time);
        t =  moment(time);
    } else { 
        //t = (agency_timezone) ? moment.tz() : moment();
        t =  moment();
    }

    if (agency_timezone) {
        return (outputFormat) ? t.tz(agency_timezone).format(outputFormat) : t.tz(agency_timezone).format();
    } else {
        return (outputFormat) ? t.utc().format(outputFormat) : t.utc().format();
    }
}


function getDateObject (time, formatString) {
    if ( !time ) {
        return new Date();
    } else if (formatString) {
        return moment(time, formatString).toDate();
    } else {
        return moment(time).toDate();
    }
}


//TODO: Move this to the MTA_Extensions module.
function getTimeStampForHundredthsOfMinutePastMidnight (scheduleDate, hundredthsOfMinutePastMidnight) {
    var millisecsPastMidnight,
        scheduleDateMilliseconds;

    if ( ! (scheduleDate && hundredthsOfMinutePastMidnight) ) { return null; }

    millisecsPastMidnight = hundredthsOfMinutePastMidnight * 600;

    scheduleDateMilliseconds = scheduleDate.getMilliseconds();

    //TODO: Do we need a defensive copy here?
    scheduleDate.setMilliseconds(scheduleDateMilliseconds + millisecsPastMidnight);

    return getTimestamp(scheduleDate);
}


module.exports = {
    setAgencyTimezone                             : setAgencyTimezone                             ,
    getAgencyTimezone                             : getAgencyTimezone                             ,
    getTimestamp                                  : getTimestamp                                  ,
    getDateObject                                 : getDateObject                                 ,
    getTimeStampForHundredthsOfMinutePastMidnight : getTimeStampForHundredthsOfMinutePastMidnight ,
};
