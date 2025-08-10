'use strict';

var productTileBase = module.superModule;
var decorators = require('*/cartridge/models/product/decorators/index');
var Logger = require('dw/system/Logger');


function productTile(product, apiProduct, productType) {
    productTileBase.call(this, product, apiProduct, productType);
    decorators.description(product, apiProduct);
    return product;
}


    module.exports = productTile;