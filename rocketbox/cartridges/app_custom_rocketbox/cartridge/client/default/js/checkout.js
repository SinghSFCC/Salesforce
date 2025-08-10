'use strict';

var processInclude = require('base/util');
// var adyenCheckout = require('adyen/adyenCheckout');

$(document).ready(function () {
    // Apple pay
    if (window.dw &&
        window.dw.applepay &&
        window.ApplePaySession &&
        window.ApplePaySession.canMakePayments()) {
        $('body').addClass('apple-pay-enabled');
    }
    if ($('#checkout-main').hasClass('commercepayments')) {
        // Commerce Payments
        try {
            // processInclude(require('commercepayments/checkout/checkout'));
            // processInclude(require('commercepayments/checkout/payments'));
        } catch (ex) {
            // plugin not in use
        }
    } else {
        // Instore pickup
        try {
            //  processInclude(require('base/checkout/checkout'));
            processInclude(require('instorepickup/checkout/checkout'));
            processInclude(require('instorepickup/checkout/instore'));
        } catch (ex) {
            // plugin not in use
        }
    }


        // eslint-disable-line
    var name = 'paymentError';
    var error = new RegExp('[?&]'.concat(encodeURIComponent(name), '=([^&]*)')).exec(location.search // eslint-disable-line no-restricted-globals
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

    // processInclude(require('base/checkout/checkout'));
    // processInclude(require('adyen/checkout/billing'));
    processInclude(require('adyen/checkout/checkout'));
    $('#selectedPaymentOption').val($('.payment-options .nav-item .active').parent().attr('data-method-id'));

    $('.payment-options .nav-link').on('click', function () {
        $('#selectedPaymentOption').val($(this).parent().attr('data-method-id'));
    });

    $('#paymentOptions .nav-item a').on('click', function (e) {
        e.preventDefault()
        $(this).tab('show')
    });

    $('body').on('click', '#multiShipCheck', function() {
        if($(this).is( ":checked" )){
            $('.multi-shipping .shipping-content, .multi-shipping .multi-ship-action-buttons').css('display','block');
        }
    });

    $('body').on('click', '.btn-edit-multi-ship', function(){
        $('.shipment-selector-block').css('display','block');
    });

});