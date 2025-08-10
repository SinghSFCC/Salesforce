/* global empty */
'use strict';

/**
* Returns a friendly string representation of the shipment status
* enum object value on an Order
*
* @param {number} statusCode shipping status code of the order
*   0: Not Shipped
*   1: Partially Shipped
*   2: Shipped
*
* @return {string} Display name for the order shipping status code
*/
var getShippingStatusDisplayName = function getShipStatusDisplayName(statusCode) {
    var Resource = require('dw/web/Resource');
    var code = statusCode;
    var shipDisplayName;

    switch (code) {
        case 2:
            shipDisplayName = Resource.msg('tracking.status.shipped', 'tracking', null);
            break;
        case 1:
            shipDisplayName = Resource.msg('tracking.status.partial', 'tracking', null);
            break;
        default:
            shipDisplayName = Resource.msg('tracking.status.notshipped', 'tracking', null);
            break;
    }

    return shipDisplayName;
};

exports.getShippingStatusDisplayName = getShippingStatusDisplayName;
