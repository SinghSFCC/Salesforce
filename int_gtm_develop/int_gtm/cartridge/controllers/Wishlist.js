'use strict';

/**
* @module controllers/Wishlist
*/

var server = require('server');
var gtmHelper = require('~/cartridge/scripts/util/gtmHelper');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

server.extend(module.superModule);
/**
* Extends Product-Show controller to include additional data
*/
server.append('Show', consentTracking.consent, server.middleware.https, csrfProtection.generateToken, function (req, res, next) {
    var viewData = res.getViewData();
    var gtmBasketData = viewData;
    var itemList = [];

    itemList = gtmHelper.getProductAddToWishList(gtmBasketData);


    viewData.gtm = {
        WishlistItemList: itemList ? itemList : 'Product Added to Wishlist'
    };

    next();
});

module.exports = server.exports();
