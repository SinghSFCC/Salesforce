"use strict";

var server = require('server');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

var adyenGetOriginKey = require('*/cartridge/scripts/adyenGetOriginKey');

var AdyenHelper = require('*/cartridge/scripts/util/adyenHelper');

server.extend(module.superModule);
server.prepend('Begin', server.middleware.https, consentTracking.consent, csrfProtection.generateToken, function (req, res, next) {
  if (req.currentCustomer.raw.isAuthenticated()) {
    require('*/cartridge/scripts/updateSavedCards').updateSavedCards({
      CurrentCustomer: req.currentCustomer.raw
    });
  }

  var protocol = req.https ? 'https' : 'http';
  var originKey = adyenGetOriginKey.getOriginKeyFromRequest(protocol, req.host);
  var environment = AdyenHelper.getAdyenEnvironment().toLowerCase();
  var installments = AdyenHelper.getCreditCardInstallments();
  var paypalMerchantID = AdyenHelper.getPaypalMerchantID();
  var googleMerchantID = AdyenHelper.getGoogleMerchantID();
  var merchantAccount = AdyenHelper.getAdyenMerchantAccount();
  var viewData = res.getViewData();
  viewData.adyen = {
    originKey: originKey,
    environment: environment,
    installments: installments,
    paypalMerchantID: paypalMerchantID,
    googleMerchantID: googleMerchantID,
    merchantAccount: merchantAccount
  };
  res.setViewData(viewData);
  next();
});
module.exports = server.exports();