"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 *
 */
var Resource = require('dw/web/Resource');

var Transaction = require('dw/system/Transaction');

var Logger = require('dw/system/Logger');

var AdyenHelper = require('*/cartridge/scripts/util/adyenHelper');

var collections = require('*/cartridge/scripts/util/collections');

var constants = require('*/cartridge/adyenConstants/constants');

function Handle(basket, paymentInformation) {
  var currentBasket = basket;
  var cardErrors = {};
  var serverErrors = [];
  Transaction.wrap(function () {
    collections.forEach(currentBasket.getPaymentInstruments(), function (item) {
      currentBasket.removePaymentInstrument(item);
    });
    var paymentInstrument = currentBasket.createPaymentInstrument(constants.METHOD_ADYEN_COMPONENT, currentBasket.totalGrossPrice);
    paymentInstrument.custom.adyenPaymentData = paymentInformation.stateData;
    paymentInstrument.custom.adyenPaymentMethod = paymentInformation.adyenPaymentMethod;

    if (paymentInformation.isCreditCard) {
      var sfccCardType = AdyenHelper.getSFCCCardType(paymentInformation.cardType);
      var tokenID = AdyenHelper.getCardToken(paymentInformation.storedPaymentUUID, customer);
      paymentInstrument.setCreditCardNumber(paymentInformation.cardNumber);
      paymentInstrument.setCreditCardType(sfccCardType);

      if (tokenID) {
        paymentInstrument.setCreditCardExpirationMonth(paymentInformation.expirationMonth.value);
        paymentInstrument.setCreditCardExpirationYear(paymentInformation.expirationYear.value);
        paymentInstrument.setCreditCardToken(tokenID);
      }
    } else {
      // Local payment data
      paymentInstrument.custom.adyenIssuerName = paymentInformation.adyenIssuerName ? paymentInformation.adyenIssuerName : null;
    }
  });
  return {
    fieldErrors: cardErrors,
    serverErrors: serverErrors,
    error: false
  };
}
/**
 * Authorizes a payment using a credit card. Customizations may use other processors and custom
 *      logic to authorize credit card payment.
 * @param {dw.order.PaymentInstrument} paymentInstrument -  The payment instrument to authorize
 * @param {dw.order.PaymentProcessor} paymentProcessor -  The payment processor of the current
 *      payment method
 * @return {Object} returns an error object
 */


function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
  var Transaction = require('dw/system/Transaction');

  var OrderMgr = require('dw/order/OrderMgr');

  var order = OrderMgr.getOrder(orderNumber);

  var adyenCheckout = require('*/cartridge/scripts/adyenCheckout');

  var errors = [];
  var errorObj = {
    authorized: false,
    fieldErrors: [],
    serverErrors: errors,
    error: true
  };
  Transaction.begin();
  paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
  var orderCustomer = order.getCustomer();
  var sessionCustomer = session.getCustomer();

  if (orderCustomer.authenticated && orderCustomer.ID !== sessionCustomer.ID) {
    Logger.getLogger('Adyen').error('orderCustomer is not the same as the sessionCustomer');
    Transaction.wrap(function () {
      OrderMgr.failOrder(order, true);
    });
    errors.push(Resource.msg('error.technical', 'checkout', null));
    return _objectSpread({}, errorObj);
  }

  var result = adyenCheckout.createPaymentRequest({
    Order: order,
    PaymentInstrument: paymentInstrument
  });

  if (result.error) {
    errors.push(Resource.msg('error.payment.processor.not.supported', 'checkout', null));
    return _objectSpread({}, errorObj);
  } // Trigger 3DS2 flow


  if (result.threeDS2 || result.resultCode === 'RedirectShopper') {
    paymentInstrument.custom.adyenPaymentData = result.paymentData;
    Transaction.commit();

    if (result.threeDS2) {
      return {
        threeDS2: result.threeDS2,
        resultCode: result.resultCode,
        token3ds2: result.token3ds2,
        action: result.action,
        merchantReference: order.orderNo
      };
    }

    var signature = null;
    var authorized3d = false; // If the response has MD, then it is a 3DS transaction

    if (result.redirectObject && result.redirectObject.data && result.redirectObject.data.MD) {
      authorized3d = true;
      signature = AdyenHelper.getAdyenHash(result.redirectObject.url.substr(result.redirectObject.url.length - 25), result.redirectObject.data.MD.substr(1, 25));
    } else {
      // Signature only needed for redirect methods
      signature = AdyenHelper.getAdyenHash(result.redirectObject.url.substr(result.redirectObject.url.length - 25), result.paymentData.substr(1, 25));
    }

    return {
      authorized: true,
      authorized3d: authorized3d,
      orderNo: orderNumber,
      paymentInstrument: paymentInstrument,
      redirectObject: result.redirectObject,
      signature: signature
    };
  }

  if (result.decision !== 'ACCEPT') {
    Logger.getLogger('Adyen').error("Payment failed, result: ".concat(JSON.stringify(result)));
    Transaction.rollback();
    return {
      error: true
    };
  }

  AdyenHelper.savePaymentDetails(paymentInstrument, order, result.fullResponse);
  Transaction.commit();
  return {
    authorized: true,
    error: false
  };
}

exports.Handle = Handle;
exports.Authorize = Authorize;