"use strict";

/**
 *
 */
var server = require('server');

var Resource = require('dw/web/Resource');

var Transaction = require('dw/system/Transaction');

var Logger = require('dw/system/Logger');

var collections = require('*/cartridge/scripts/util/collections');

var constants = require('*/cartridge/adyenConstants/constants');

function Handle(basket
/* , paymentInformation */
) {
  Transaction.wrap(function () {
    collections.forEach(basket.getPaymentInstruments(), function (item) {
      basket.removePaymentInstrument(item);
    });
    var paymentInstrument = basket.createPaymentInstrument(constants.METHOD_ADYEN_POS, basket.totalGrossPrice);
    paymentInstrument.custom.adyenPaymentMethod = 'POS Terminal';
  });
  return {
    error: false
  };
}
/**
 * Authorize
 */


function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
  var errors;

  var adyenTerminalApi = require('*/cartridge/scripts/adyenTerminalApi');

  Transaction.wrap(function () {
    paymentInstrument.paymentTransaction.transactionID = orderNumber;
    paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
  });
  var adyenPaymentForm = server.forms.getForm('billing').adyenPaymentFields;

  var OrderMgr = require('dw/order/OrderMgr');

  var order = OrderMgr.getOrder(orderNumber);
  var terminalId = adyenPaymentForm.terminalId.value;

  if (!terminalId) {
    Logger.getLogger('Adyen').error('No terminal selected');
    errors = [];
    errors.push(Resource.msg('error.payment.processor.not.supported', 'checkout', null));
    return {
      authorized: false,
      fieldErrors: [],
      serverErrors: errors,
      error: true
    };
  }

  var result = adyenTerminalApi.createTerminalPayment(order, paymentInstrument, terminalId);

  if (result.error) {
    Logger.getLogger('Adyen').error("POS Authorise error, result: ".concat(result.response));
    errors = [];
    errors.push(Resource.msg('error.payment.processor.not.supported', 'checkout', null));
    return {
      authorized: false,
      fieldErrors: [],
      serverErrors: errors,
      error: true
    };
  }

  return result;
}

exports.Handle = Handle;
exports.Authorize = Authorize;