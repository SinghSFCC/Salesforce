/* eslint-disable vars-on-top */
'use strict';

var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');
var OrderModelBase = module.superModule;
var PaymentModel = require('*/cartridge/models/payment');

/**
* Order class that represents the current order
* @param {dw.order.LineItemCtnr} lineItemContainer - Current users's basket/order
* @param {Object} options - The current order's line items
* @param {Object} options.config - Object to help configure the orderModel
* @param {string} options.config.numberOfLineItems - helps determine the number of lineitems needed
* @param {string} options.countryCode - the current request country code
* @constructor
*/
function OrderModel(lineItemContainer, options) {
  OrderModelBase.call(this, lineItemContainer, options);
  var safeOptions = options || {};
  var customer = safeOptions.customer || lineItemContainer.customer;
  var countryCode = safeOptions.countryCode || null;
  var paymentModel = new PaymentModel(lineItemContainer, customer, countryCode);

  if ('selectedPaymentInstruments' in paymentModel && paymentModel.selectedPaymentInstruments[0] != null) {
    if (paymentModel.selectedPaymentInstruments[0].paymentMethod === 'PayPal') {
      this.paymentMethod = 'PayPal';
    } else if (paymentModel.selectedPaymentInstruments[0].paymentMethod === 'DW_APPLE_PAY') {
      this.paymentMethod = 'ApplePay';
    } else {
      this.paymentMethod = paymentModel.selectedPaymentInstruments[0].selectedAdyenPM;
    }

    this.creationDate = Object.hasOwnProperty.call(lineItemContainer, 'creationDate')
      ? StringUtils.formatCalendar(new Calendar(new Date(lineItemContainer.creationDate)), 'MM/dd/yy')
      : null;
  }
}
module.exports = OrderModel;
