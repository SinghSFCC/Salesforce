'use strict';

/**
 * @module models/product/fullProduct
 */

var decorators = require('./decorators/index');
var fullProductBase = module.superModule;

/**
 * Decorate product with default and selected colors, and group
 * @param {Object} product Product Model to be decorated
 * @param {dw.catalog.Product} apiProduct Product information returned by the
 *  script API
 * @param {Object} options Options passed in from the factory
 * @returns {Object} Decorated product model
 */
function fullProduct(product, apiProduct, options) {
    fullProductBase.call(this, product, apiProduct, options);

    var category = apiProduct.getPrimaryCategory();

    if (!category && (options.productType === 'variant' || options.productType === 'variationGroup')) {
        category = apiProduct.getMasterProduct().getPrimaryCategory();
    }
    decorators.category(product, category.ID);

    return product;
}

module.exports = fullProduct;
