"use strict";

var processInclude = require('base/util');

var adyenCheckout = require('./adyenCheckout');

$(document).ready(function () {
  // eslint-disable-line
  var name = 'paymentError';
  var error = new RegExp("[?&]".concat(encodeURIComponent(name), "=([^&]*)")).exec(location.search // eslint-disable-line no-restricted-globals
  );
  var paymentStage = new RegExp('[?&]stage=payment([^&]*)').exec(location.search // eslint-disable-line no-restricted-globals
  );

  if (error || paymentStage) {
    if (error) {
      $('.error-message').show();
      $('.error-message-text').text(decodeURIComponent(error[1]));
    }
  if(adyenCheckout){
    adyenCheckout.methods.renderGenericComponent();
  }
}

  processInclude(require('base/checkout/checkout'));
  processInclude(require('./checkout/billing'));
  processInclude(require('./checkout/checkout'));
  $('#selectedPaymentOption').val($('.payment-options .nav-item .active').parent().attr('data-method-id'));
});
$('.payment-options .nav-link').click(function () {
  $('#selectedPaymentOption').val($(this).parent().attr('data-method-id'));
});