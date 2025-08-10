
'use strict';

/**
* Generate the parameters needed for the redirect to the Adyen Hosted Payment Page.
* A signature is calculated based on the configured HMAC code
*
* @input Order : dw.order.Order
* @input OrderNo : String The order no
* @input CurrentSession : dw.system.Session
* @input CurrentUser : dw.customer.Customer
* @input PaymentInstrument : dw.order.PaymentInstrument
* @input brandCode : String
* @input issuerId : String
* @input dob : String
* @input gender : String
* @input telephoneNumber : String
* @input houseNumber : String
* @input houseExtension : String
* @input socialSecurityNumber : String
*
* @output merchantSig : String;
* @output Amount100 : String;
* @output shopperEmail : String;
* @output shopperReference : String;
* @output paramsMap : dw.util.SortedMap;
* @output sessionValidity : String;
*
*/
require('dw/crypto');

require('dw/system');

require('dw/order');

require('dw/util');

require('dw/value');

require('dw/net');

require('dw/web');

var AdyenHelper = require('*/cartridge/scripts/util/adyenHelper');

var LineItemHelper = require('*/cartridge/scripts/util/lineItemHelper');

function getVatAmount(lineItem) {
  if(lineItem instanceof dw.order.ProductLineItem || lineItem instanceof dw.order.ShippingLineItem) {
    return lineItem.getAdjustedTax();
  }
  else if (lineItem instanceof dw.order.PriceAdjustment) {
    return lineItem.tax;
  }
  return null;
}

function getVatPercentage(lineItem) {
  var vatPercentage = 0;
  if (getVatAmount(lineItem) != 0 ) {
    vatPercentage = lineItem.getTaxRate();
  }
  return vatPercentage;
}

function getLineItems(_ref) {
  var {
    Order: order,
  } = _ref;
  if (!order) return null; // Add all product and shipping line items to request

  var allLineItems = order.getAllLineItems();
  var shopperReference = getShopperReference(order);
  var enhancedSchemeData = [];
  for each (var lineItem in allLineItems)	{

    if ((lineItem instanceof dw.order.ProductLineItem && !lineItem.bonusProductLineItem)
    || lineItem instanceof dw.order.ShippingLineItem
    || (lineItem instanceof dw.order.PriceAdjustment && lineItem.promotion.promotionClass == dw.campaign.Promotion.PROMOTION_CLASS_ORDER)
    ) {
      var lineItemObject = {};
      const description = LineItemHelper.getDescription(lineItem);
      const id = LineItemHelper.getId(lineItem);
      const quantity = LineItemHelper.getQuantity(lineItem);
      const itemAmount = LineItemHelper.getItemAmount(lineItem) / quantity;
      const vatAmount = LineItemHelper.getVatAmount(lineItem) / quantity;
      const commodityCode = AdyenHelper.getAdyenLevel23CommodityCode();
      const vatPercentage = getVatPercentage(lineItem);

      lineItemObject["unitPrice"] = itemAmount.toFixed();
      lineItemObject["totalAmount"] = parseFloat(itemAmount.toFixed()) + parseFloat(vatAmount.toFixed());
      lineItemObject["totalTaxAmount"] = vatAmount.toFixed();
      lineItemObject["description"] = description;
      lineItemObject["productCode"] = id.substring(0,12);
      lineItemObject["quantity"] = quantity;
      lineItemObject["unitOfMeasure"] = "EAC";
      lineItemObject["commodityCode"] = commodityCode;

      lineItemObject["taxPercentage"] = (new Number(vatPercentage) * 10000).toFixed();
      lineItemObject["customerReference"] = shopperReference;

      enhancedSchemeData.push(lineItemObject);
    }
  }

  return enhancedSchemeData;
}

function getShopperReference(order) {
  var customer = order.getCustomer();
  var isRegistered = customer && customer.registered;
  var profile = isRegistered && customer.getProfile();
  var profileCustomerNo = profile && profile.getCustomerNo();
  var orderNo = profileCustomerNo || order.getCustomerNo();
  return orderNo || customer.getID() || 'no-unique-ref';
}

module.exports.getLineItems = getLineItems;
