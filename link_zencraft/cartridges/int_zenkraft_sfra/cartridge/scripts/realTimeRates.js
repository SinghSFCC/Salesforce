/* global dw, empty, session */

'use strict';
/**
* Get any markup costs associated with real time rates
* that are configured on the shipping method in Business Manager
*
* @param {String} markupType Type of markup 'Amount' or 'Percentage'
* @param {number} markup amount to mark up
* @param {Money} updatedCost new cost with markup
*/

var getMarkupCost = function getMarkupCost(markupType, markup, shippingCost) {
    var Money = require('dw/value/Money');
    var updatedCost = shippingCost;

    if (!empty(markupType) && !empty(markup)) {
        if (markupType === 'Amount') {
            var amt = new Money(markup, session.currency.currencyCode);
            updatedCost = shippingCost.add(amt);
        } else if (markupType === 'Percent') {
            updatedCost = shippingCost.addPercent(markup);
        }
    }

    return updatedCost;
};

/**
 * Formats shipping rate based on the provided currency.
 *
 * @param {number} value Numeric value to format.
 * @param {string} currencyCode Currency code corresponding to the value.
 * @returns {string} Formatted shipping rate. *
 */
function formatShippingCost(value, currencyCode) {
    var formatCurrency = require('*/cartridge/scripts/util/formatting').formatCurrency;

    return formatCurrency(value, currencyCode);
}


/**
* Calculate Shipping Costs Using Zenkraft Real-Time Rates instead
* of default SFCC rates
*
* @param {Object} basket Current basket for the session
* @param {Hashmap} shippingCostMap Hashmap of current rates in the user's session
*/
function calculateShippingCost(lineItemCtnr, shippingCostMap, shippingModel, shippingMtd) {
    var Transaction = require('dw/system/Transaction');
    var Money = require('dw/value/Money');
    var Site = require('dw/system/Site');
    var Shipment = require('dw/order/Shipment');
    var shippingMethod;
    var shippingLineItems;

    // re-apply shipping cost for shipping methods with Zenkraft rates
    var shipment = lineItemCtnr instanceof Shipment ? lineItemCtnr : lineItemCtnr.defaultShipment;
    shippingMethod = shipment.shippingMethod;
    shippingLineItems = shipment.shippingLineItems.iterator();
    var shippingCost;
    var markupType;
    var markup;
    // Match SFCC Shipping Method with Zenkraft ID in rates map, then use the rates in the map
    // in place of the SFCC rates in the basket
    if (shippingMethod != null && shippingCostMap && shippingCostMap[shippingMethod.custom.zenkraftID] != null && shippingCostMap[shippingMethod.custom.zenkraftID] !== 0) {
        while (shippingLineItems.hasNext()) {
            var shippingLineItem = shippingLineItems.next();
            shippingCost = new Money(shippingCostMap[shippingMethod.custom.zenkraftID], Site.current.currencyCode);

            // add any markups
            markupType = shippingMethod.custom.zenkraftRateMarkupType.value;
            markup = shippingMethod.custom.zenkraftRateMarkup;

            shippingCost = this.getMarkupCost(markupType, markup, shippingCost);
            // eslint-disable-next-line no-loop-func
            Transaction.wrap(function () {
                shippingLineItem.setPriceValue(shippingCost.value);
            });
        }
    }
    if (shippingModel && shippingCostMap && shippingCostMap[shippingModel.zenkraftID]) {
        shippingCost = new Money(shippingCostMap[shippingModel.zenkraftID], Site.current.currencyCode);
        // add any markups
        markupType = shippingMethod.custom.zenkraftRateMarkupType.value;
        markup = shippingMethod.custom.zenkraftRateMarkup;

        shippingCost = this.getMarkupCost(markupType, markup, shippingCost);
        var zenkraftShippingModel = shippingModel;
        zenkraftShippingModel.shippingCost = formatShippingCost(shippingCost.value, shippingCost.currencyCode);
    }
}

/**
* Add new rates to session and update previous rates
*
* @param {Object} rates Object of Shipping Methods and Rates. If empty, clear session variable
*/
var updateSessionShippingRates = function updateSessionRates(rates) {
    var sessionRates = JSON.parse(session.privacy.zenkraftCosts);
    var ratesObject = {};
    if (rates) {
        ratesObject = JSON.parse(rates);
    }

    if (!sessionRates) {
        sessionRates = {};
    }

    var ratesObjectKeys = Object.keys(ratesObject);
    ratesObjectKeys.forEach(function (key) {
        sessionRates[key] = ratesObject[key];
    });

    session.privacy.zenkraftCosts = JSON.stringify(sessionRates);

    return;
};

/* Exports of the module */
exports.calculateShippingCost = calculateShippingCost;
exports.updateSessionShippingRates = updateSessionShippingRates;
exports.getMarkupCost = getMarkupCost;
