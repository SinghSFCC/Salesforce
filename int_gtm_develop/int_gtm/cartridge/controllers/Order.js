'use strict';

/**
* @module controllers/item
*/

var server = require('server');
server.extend(module.superModule);


/**
* Extends item-Show controller to include additional data
*/
server.append('Confirm', function (req, res, next) {

    var viewData = res.getViewData();
    var gtmOrderData = viewData.order;

    // trx number
    var trxNumber = gtmOrderData.orderNumber;
    // trx total
    var trxTotal = gtmOrderData.totals.grandTotal.replace(/\$/g,'');

    // trx tax
    // tax amount - Note: only show this field if taxation policy is net
    var trxTax = gtmOrderData.totals.totalTax.replace(/\$/g,'');

    var trxShipping = gtmOrderData.totals.totalShippingCost.replace(/\$/g,'');

    var trxShippingAdjustments = gtmOrderData.totals.shippingLevelDiscountTotal.formatted.replace(/\$/g,'');
    var trxPriceAdjustments = gtmOrderData.totals.orderLevelDiscountTotal.formatted.replace(/\$/g,'');

    // trx campaigns
    var trxCampaigns = trxShippingAdjustments + trxPriceAdjustments;
    // trx products
    var plis = gtmOrderData.items.items;

    if (!empty(plis)) {
        var trxProducts: Array = [];
        var etmcProducts: Array = [];
        for each(var item in plis) {

            var price = item.priceTotal.price.replace(/\$/g,'');
            var category = 'category' in item ? item.category : 'SFRA';

            trxProducts.push({
                'id': item.id,
                'name': item.productName,
                'category': category,
                'price': price,
                'quantity': item.quantity
            });

            etmcProducts.push({
                'item': item.id,
                'unique_id': item.id,
                'price': price,
                'quantity': item.quantity,
                'name': item.productName,
                'order_number': trxNumber
            });
        }
    }
    viewData.gtm = {
        trxProducts: trxProducts ? trxProducts : 'Order Confirm',
        etmcProducts: etmcProducts ? etmcProducts : 'Order Confirm Enhanced',
        trxNumber: trxNumber,
        trxTotal: trxTotal,
        trxShipping: trxShipping,
        trxTax: trxTax,
        trxCampaigns: trxCampaigns,
    };
    next();
});

module.exports = server.exports();
