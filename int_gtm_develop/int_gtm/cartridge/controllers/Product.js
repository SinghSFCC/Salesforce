'use strict';

/**
* @module controllers/Product
*/

var server = require('server');
server.extend(module.superModule);
var gtmHelper = require('~/cartridge/scripts/util/gtmHelper');

/**
* Extends Product-Show controller to include additional data
*/
server.append('Show', function (req, res, next) {
    var eventType = 'Product clicked, Product viewed';
    var viewData = res.getViewData();
    var gtmProduct = viewData.product;
    var gtmBasketData = viewData;
    var productInfo = gtmHelper.getProductDetail(gtmProduct, gtmBasketData, eventType);

    viewData.gtm = {
        productInfo: productInfo ? productInfo : 'PDP'
    };

    next();
});

module.exports = server.exports();
