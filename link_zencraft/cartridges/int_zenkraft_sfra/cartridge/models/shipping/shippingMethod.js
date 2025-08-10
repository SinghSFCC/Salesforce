// ShippingMethod.js model extension
'use strict';
var baseShippingMethodModel = module.superModule;
var URLUtils = require('dw/web/URLUtils');

/**
* Extend ShippingMethodModel to include the zenkraft ID custom attribute
*
* @param {Object} shippingMethod sfcc shipping method object
* @param {Object} shipment sfcc shipment object
*/
function ShippingMethodModel(shippingMethod, shipment) {
    baseShippingMethodModel.call(this, shippingMethod, shipment);

    this.zenkraftID = shippingMethod.custom.zenkraftID;
    if ('dropOffMethod' in shippingMethod.custom) {
        this.dropOffMethod = shippingMethod.custom.dropOffMethod;
        this.dropOffURL = URLUtils.https('Zenkraft-GetDropoffLocation').toString();
    }
    this.dropOffLocations = [];

    if ('zenkraftRateMarkupType' in shippingMethod.custom) {
        this.zenkraftRateMarkupType = shippingMethod.custom.zenkraftRateMarkupType;
    } else {
        this.zenkraftRateMarkupType = '';
    }

    if ('zenkraftRateMarkup' in shippingMethod.custom) {
        this.zenkraftRateMarkup = shippingMethod.custom.zenkraftRateMarkup;
    } else {
        this.zenkraftRateMarkup = false;
    }
    if ('futureDateDelivery' in shippingMethod.custom) {
        this.futureDateDelivery = shippingMethod.custom.futureDateDelivery;
    }
    if ('shippingMethodAccountID' in shippingMethod.custom) {
        this.shippingMethodAccountID = shippingMethod.custom.shippingMethodAccountID;
    }

    if (shipment) {
        this.shipStatus = shipment.shippingStatus.displayValue;
        this.trackingNumber = shipment.trackingNumber;
        this.zenkraftCarrier = shipment.custom.zenkraftCarrier;
        var realTimeRates = require('~/cartridge/scripts/realTimeRates');
        realTimeRates.calculateShippingCost(shipment, JSON.parse(session.privacy.zenkraftCosts), this);
    }
}

module.exports = ShippingMethodModel;
