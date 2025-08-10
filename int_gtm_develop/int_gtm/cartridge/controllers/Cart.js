'use strict';

var ProductMgr = require('dw/catalog/ProductMgr');
var gtmHelper = require('~/cartridge/scripts/util/gtmHelper');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

/**
 * @module controllers/item
 */

var server = require('server');
server.extend(module.superModule);

/**
 * Extends item-Show controller to include additional data
 */
server.append('MiniCartShow', function (req, res, next) {
    var viewData = res.getViewData();
    var gtmBasketData = viewData;
    var itemList = [];
    var currencyCode = req.session.currency.currencyCode;

    var itemList = gtmHelper.getProductAddToCart(gtmBasketData);


    viewData.gtm = {
        itemList: itemList ? itemList : 'Product Added to Cart',
        currencyCode: currencyCode
    };

    next();
});

module.exports = server.exports();