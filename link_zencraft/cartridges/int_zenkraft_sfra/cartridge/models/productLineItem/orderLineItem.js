// order.js model extension
'use strict';
var baseOrderLineItemModel = module.superModule;

/**
 * Decorate product with product line item information from within an order
 * @param {Object} product - Product Model to be decorated
 * @param {dw.catalog.Product} apiProduct - Product information returned by the script API
 * @param {Object} options - Options passed in from the factory
 * @property {dw.catalog.ProductVarationModel} options.variationModel - Variation model returned by the API
 * @property {Object} options.lineItemOptions - Options provided on the query string
 * @property {dw.catalog.ProductOptionModel} options.currentOptionModel - Options model returned by the API
 * @property {dw.util.Collection} options.promotions - Active promotions for a given product
 * @property {number} options.quantity - Current selected quantity
 * @property {Object} options.variables - Variables passed in on the query string
 *
 * @returns {Object} - Decorated product model
 */
module.exports = function orderLineItem(product, apiProduct, options) {
    var DefaultPrice = require('*/cartridge/models/price/default');

    baseOrderLineItemModel.call(this, product, apiProduct, options);

    Object.defineProperty(product, 'orderItemID', {
        enumerable: true,
        value: options.lineItem.orderItem.itemID
    });

    Object.defineProperty(product, 'price', {
        enumerable: true,
        overwrite: true,
        value: new DefaultPrice(options.lineItem.basePrice)
    });

    return product;
};
