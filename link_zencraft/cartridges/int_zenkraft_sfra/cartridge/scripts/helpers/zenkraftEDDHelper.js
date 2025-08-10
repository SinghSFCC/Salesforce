/* global dw, empty */
'use strict';

/**
* Checks to see if current time is after the configured
* cutoff time.
*
* @return {boolean} true/false to indicate if current time is after cutoff time
*/
var checkCutoffDate = function formatDateTime() {
    var Site = require('dw/system/Site');
    var cutoffDatePref = Site.getCurrent().getCustomPreferenceValue('zenkraftEDDCutoffTime');
    var isAfterCutoff = false;
    var today;
    var todayTime;
    var cutoffTime;
    var timeZone;

  // if the cutoff date is set, check it
    if (!empty(cutoffDatePref)) {
    // get today's date/time
        today = new Date();
        timeZone = Site.getCurrent().getTimezone();
        timeZone = Site.getCurrent().getTimezoneOffset();

    // adjust for configured time zone
        today.setTime(today.getTime() + timeZone);
        todayTime = today.getTime();

    // for cutoff time, set current day, but use hours/minutes from pref
        cutoffDatePref.setDate(today.getDate());
        cutoffDatePref.setMonth(today.getMonth());
        cutoffDatePref.setYear(today.getYear());
        cutoffDatePref.setTime(cutoffDatePref.getTime() + timeZone);
        cutoffTime = cutoffDatePref.getTime();

    // check if current time is after the cutoff
        if (todayTime > cutoffTime) {
            isAfterCutoff = true;
        }
    }

    return isAfterCutoff;
};

exports.isAfterCutoffDate = checkCutoffDate;
