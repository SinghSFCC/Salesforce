/* global empty, session */
'use strict';

/*
* Hook extension for dw.order.calculateShipping
* This is used to allow Zenkraft Real Time Shipping Rates to
* be used in place of standard SFCC rates
*/

exports.calculateShipping = function (lineItemContainer) {
    var ShippingMgr = require('dw/order/ShippingMgr');
    var Status = require('dw/system/Status');
    var realTimeRates = require('*/cartridge/scripts/realTimeRates');

    ShippingMgr.applyShippingCost(lineItemContainer);
    if (!empty(session.privacy.zenkraftCosts)) {
        realTimeRates.calculateShippingCost(lineItemContainer, JSON.parse(session.privacy.zenkraftCosts));
    }
    return new Status(Status.OK);
};
