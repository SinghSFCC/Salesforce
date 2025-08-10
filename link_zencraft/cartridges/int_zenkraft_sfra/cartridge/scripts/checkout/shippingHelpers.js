'use strict';

var base = module.superModule;
var collections = require('*/cartridge/scripts/util/collections');
var ShippingMgr = require('dw/order/ShippingMgr');
var ShippingMethodModel = require('*/cartridge/models/shipping/shippingMethod');

/** Zenkraft START */
var zenkraftHelper = require('*/cartridge/scripts/helpers/zenkraftHelper'); // eslint-disable-line vars-on-top, max-len
/** Zenkraft END */

/**
 * Plain JS object that represents a DW Script API dw.order.ShippingMethod object
 * @param {dw.order.Shipment} shipment - the target Shipment
 * @param {Object} [address] - optional address object
 * @returns {dw.util.Collection} an array of ShippingModels
 */
function getApplicableShippingMethods(shipment, address) {
    if (!shipment) return null;

    var shipmentShippingModel = ShippingMgr.getShipmentShippingModel(shipment);

    var shippingMethods;
    if (address) {
        shippingMethods = shipmentShippingModel.getApplicableShippingMethods(address);
    } else {
        shippingMethods = shipmentShippingModel.getApplicableShippingMethods();
    }

    // Filter out whatever the method associated with in store pickup
    var filteredMethods = [];
    collections.forEach(shippingMethods, function (shippingMethod) {
        /** Zenkraft Edit START */
        if (shippingMethod.custom.zenkraftID && !shippingMethod.custom.storePickupEnabled) {
            filteredMethods.push(new ShippingMethodModel(shippingMethod, shipment));
        }
        /** Zenkraft Edit END */
    });

    return filteredMethods;
}

/**
 * Mark a shipment to be picked up instore
 * @param {dw.order.Shipment} shipment - line item container to be marked for pickup instore
 * @param {string} storeId - Id of the store for shipment to be picked up from.
 */
 function markShipmentForPickup(shipment, storeId) {
    var StoreMgr = require('dw/catalog/StoreMgr');
    var ProductInventoryMgr = require('dw/catalog/ProductInventoryMgr');
    var Transaction = require('dw/system/Transaction');

    var store = StoreMgr.getStore(storeId);
    var storeInventory = ProductInventoryMgr.getInventoryList(
        store.custom.inventoryListId
    );
    Transaction.wrap(function () {
        collections.forEach(shipment.productLineItems, function (lineItem) {
            lineItem.custom.fromStoreId = storeId; // eslint-disable-line no-param-reassign
            lineItem.setProductInventoryList(storeInventory);
        });
        shipment.custom.fromStoreId = storeId; // eslint-disable-line no-param-reassign
    });
}

/**
 * Remove pickup instore indicators from the shipment
 * @param {dw.order.Shipment} shipment - Shipment to be marked
 */
function markShipmentForShipping(shipment) {
    var Transaction = require('dw/system/Transaction');

    Transaction.wrap(function () {
        collections.forEach(shipment.productLineItems, function (lineItem) {
            lineItem.custom.fromStoreId = null; // eslint-disable-line no-param-reassign
            lineItem.setProductInventoryList(null);
        });
        shipment.custom.fromStoreId = null; // eslint-disable-line no-param-reassign
    });
}


Object.keys(base).forEach(function (prop) {
    // eslint-disable-next-line no-prototype-builtins
    if (!module.exports.hasOwnProperty(prop)) {
        module.exports[prop] = base[prop];
    }
});

module.exports = {
    getShippingModels: base.getShippingModels,
    selectShippingMethod: base.selectShippingMethod,
    ensureShipmentHasMethod: base.ensureShipmentHasMethod,
    getShipmentByUUID: base.getShipmentByUUID,
    markShipmentForPickup: markShipmentForPickup,
    markShipmentForShipping: markShipmentForShipping,
    getAddressFromRequest: base.getAddressFromRequest,
    getApplicableShippingMethods: getApplicableShippingMethods
};
