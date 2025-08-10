/* global describe, it */
var assert = require('chai').assert;
var request = require('request-promise');
var config = require('../it.config');

describe('Add Notification CO', function () {
    this.timeout(10000);

    it('should create notification custom object', function () {
        var myRequest = {
            method: 'POST',
            uri: config.baseUrl + '/Zenkraft-AddNotification',
            resolveWithFullResponse: true,
            body: {
                type: 'test-type',
                contact: 'test-contact',
                tracknumber: 'test-tracking-number',
                carrier: 'test-carrier',
                status: 'test-status'
            },
            json: true
        };
        request(myRequest, function (error, response) {
            assert.equal(response.statusCode, 200, 'Expected request statusCode to be 200');
        });
    });
});
