"use strict";

var cardNode = document.getElementById('card');
var maskedCardNumber;
var isValid = false;
var componentState;
var MASKED_CC_PREFIX = '************';
var checkoutConfiguration = window.Configuration;
checkoutConfiguration.amount = {
  value: 0,
  currency: 'EUR'
};
checkoutConfiguration.paymentMethodsConfiguration = {
  card: {
    enableStoreDetails: false,
    hasHolderName: true,
    installments: [],
    onBrand: function onBrand(brandObject) {
      $('#cardType').val(brandObject.brand);
    },
    onFieldValid: function onFieldValid(data) {
      if (data.endDigits) {
        maskedCardNumber = MASKED_CC_PREFIX + data.endDigits;
        $('#cardNumber').val(maskedCardNumber);
      }
    },
    onChange: function onChange(state) {
      isValid = state.isValid;
      componentState = state;
    }
  }
};
var checkout = new AdyenCheckout(checkoutConfiguration);
var card = checkout.create('card').mount(cardNode);
$('button[value="add-new-payment"]').on('click', function () {
  if (isValid) {
    document.querySelector('#adyenStateData').value = JSON.stringify(componentState.data);
    return true;
  }

  card.showValidation();
  return false;
});