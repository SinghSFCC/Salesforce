// order.js model extension
'use strict';
var baseShippingMethodModel = module.superModule;

var ShippingHelpers = require('*/cartridge/scripts/checkout/shippingHelpers');

/**
 * Order class that represents the current order
 * @param {dw.order.LineItemCtnr} lineItemContainer - Current users's basket/order
 * @param {Object} options - The current order's line items
 * @param {Object} options.config - Object to help configure the orderModel
 * @param {string} options.config.numberOfLineItems - helps determine the number of lineitems needed
 * @param {string} options.countryCode - the current request country code
 * @constructor
 */
function OrderModel(lineItemContainer, options) {
    var safeOptions = options || {};
    var customer = safeOptions.customer || lineItemContainer.customer;
    var shippingModels = ShippingHelpers.getShippingModels(lineItemContainer, customer, options.containerView);

    if (shippingModels[0].selectedShippingMethod) {
        this.firstShipmentTrackNo = shippingModels[0].selectedShippingMethod.trackingNumber || 'Pending';
        this.firstShipmentCarrier = shippingModels[0].selectedShippingMethod.zenkraftCarrier || 'Pending';
    }
    baseShippingMethodModel.call(this, lineItemContainer, options);
}

module.exports = OrderModel;
