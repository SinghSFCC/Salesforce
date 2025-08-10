"use strict";

/**
 *
 */
require('dw/order');

var AdyenHelper = require('*/cartridge/scripts/util/adyenHelper');

var lineItemHelperObj = {
  getDescription: function getDescription(lineItem) {
    if (lineItem instanceof dw.order.ShippingLineItem) {
      return lineItem.getID();
    }

    if (lineItem instanceof dw.order.ProductLineItem) {
      return lineItem.productName;
    }

    if (lineItem instanceof dw.order.PriceAdjustment) {
      return 'Discount';
    }

    return null;
  },
  getId: function getId(lineItem) {
    if (lineItem instanceof dw.order.ShippingLineItem || lineItem instanceof dw.order.PriceAdjustment) {
      return lineItem.UUID;
    }

    if (lineItem instanceof dw.order.ProductLineItem) {
      return lineItem.productID;
    }

    return null;
  },
  getQuantity: function getQuantity(lineItem) {
    if (lineItem instanceof dw.order.ShippingLineItem) {
      return '1';
    }

    if (lineItem instanceof dw.order.ProductLineItem) {
      return lineItem.quantityValue.toFixed();
    }

    if (lineItem instanceof dw.order.PriceAdjustment) {
      return lineItem.quantity.toFixed();
    }

    return null;
  },
  getVatPercentage: function getVatPercentage(lineItem) {
    var vatPercentage = 0;

    if (lineItemHelperObj.getVatAmount(lineItem) !== 0) {
      vatPercentage = lineItem.getTaxRate();
    }

    return vatPercentage;
  },
  getVatAmount: function getVatAmount(lineItem) {
    if (lineItem instanceof dw.order.ProductLineItem || lineItem instanceof dw.order.ShippingLineItem) {
      return AdyenHelper.getCurrencyValueForApi(lineItem.getAdjustedTax());
    }

    if (lineItem instanceof dw.order.PriceAdjustment && lineItem.getPromotion().getPromotionClass() !== 'ORDER') {
      return AdyenHelper.getCurrencyValueForApi(lineItem.tax);
    }

    return null;
  },
  getItemAmount: function getItemAmount(lineItem) {
    if (lineItem instanceof dw.order.ProductLineItem || lineItem instanceof dw.order.ShippingLineItem) {
      return AdyenHelper.getCurrencyValueForApi(lineItem.adjustedNetPrice);
    }

    if (lineItem instanceof dw.order.PriceAdjustment) {
      return AdyenHelper.getCurrencyValueForApi(lineItem.netPrice);
    }

    return null;
  }
};
module.exports = lineItemHelperObj;