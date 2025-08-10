/* global describe, it */
var assert = require('chai').assert;
var request = require('request-promise');
var config = require('../it.config');

describe('Send Shipping Label', function () {
    this.timeout(10000);

    it('should attempt to send label', function () {
        var myRequest = {
            method: 'POST',
            uri: config.baseUrl + '/Zenkraft-SendShippingLabel',
            resolveWithFullResponse: true,
            body: {
                products: {
                    productid: '701644257958M'
                },
                orderID: '123456789',
                emailaddress: 'demo@zenkraft.com'
            },
            json: true
        };
        request(myRequest, function (error, response) {
            assert.equal(response.statusCode, 200, 'Expected request statusCode to be 200');
            var bodyAsJson = response.body;

            assert.isObject(bodyAsJson);
        });
    });
});
