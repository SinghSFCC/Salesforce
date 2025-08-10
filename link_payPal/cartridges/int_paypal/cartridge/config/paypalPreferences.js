'use strict';

const allowedProcessorsIds = 'PAYPAL';
const PaymentMgr = require('dw/order/PaymentMgr');
const prefsCache = require('dw/system/CacheMgr').getCache('paypalPreferences');
const Site = require('dw/system/Site');

const {
    paypalCartButtonConfig,
    paypalBillingButtonConfig,
    paypalPdpButtonConfig,
    paypalMinicartButtonConfig,
    staticImageLink
} = require('./sdkConfig');

/**
 * Returns paypal payment method ID
 * @returns {string} active paypal payment method id
 */
function getPaypalPaymentMethodId() {
    var activePaymentMethods = PaymentMgr.getActivePaymentMethods();
    var paypalPaymentMethodID;

    Array.some(activePaymentMethods, function (paymentMethod) {
        if (paymentMethod.paymentProcessor.ID === allowedProcessorsIds) {
            paypalPaymentMethodID = paymentMethod.ID;
            return true;
        }
        return false;
    });
    return paypalPaymentMethodID;
}

/**
 *  Returns PayPal custom and hardcoded preferences
 *
 * @returns {Object} statis preferences
 */
function getPreferences() {
    var prefs = prefsCache.get('preferences');
    if (prefs) {
        return prefs;
    }

    var site = Site.current;

    prefs = {
        isCapture: site.getCustomPreferenceValue('PP_API_PaymentAction'),
        paypalPaymentMethodId: getPaypalPaymentMethodId(),
        billingAgreementEnabled: site.getCustomPreferenceValue('PP_API_BA_Enabled'),
        billingAgreementDescription: site.getCustomPreferenceValue('PP_API_BA_Description'),
        enabledLPMs: site.getCustomPreferenceValue('PP_API_APM_methods'),
        paypalButtonLocation: site.getCustomPreferenceValue('PP_API_Button_Location').getValue(),
        paypalCartButtonConfig: paypalCartButtonConfig,
        paypalBillingButtonConfig: paypalBillingButtonConfig,
        paypalPdpButtonConfig: paypalPdpButtonConfig,
        paypalMinicartButtonConfig: paypalMinicartButtonConfig,
        paypalProcessorId: allowedProcessorsIds,
        staticImageLink: staticImageLink,
        partnerAttributionId: 'SFCC_EC_B2C_2021_1_1'
    };
    prefsCache.put('preferences', prefs);

    return prefs;
}

module.exports = getPreferences();
