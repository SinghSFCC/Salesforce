/* global dw, empty, session */
'use strict';

var Logger = require('dw/system/Logger');

/**
* Convert YYYY-MM-DD date string to SFCC date
* @param {string} dateString - Date string
* @return {date} - Converted date
*/
function convertDate(dateString) {
    var dateSlice = dateString.match('[0-9]{4}-[0-9]{2}-[0-9]{2}');
    var dateArray = dateSlice[0].split('-');
    return new Date(dateArray[0], parseInt(dateArray[1], 10) - 1, dateArray[2]);
}

/**
* Convert YYYY-MM-DD HH:MM:SS date string to SFCC date and time
* @param {string} dateString - Input daet string
* @return {date} - Converted time
*/
function convertTime(dateString) {
    var date = convertDate(dateString);
    var timeSlice = dateString.match('[0-9]{2}:[0-9]{2}:[0-9]{2}');
    var timeArray = timeSlice[0].split(':');
    date.setHours(timeArray[0]);
    date.setMinutes(timeArray[1]);
    date.setSeconds(timeArray[2]);
    return date;
}

/**
* Returns the higher lead time of the current basket
* @return {integer} leadTime
*/
var getLeadTime = function filterleadTime() {
    var Site = require('dw/system/Site');
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    var leadTime = Site.getCurrent().getCustomPreferenceValue('companyWideLeadTime');
    if (!currentBasket) {
        return leadTime;
    }
    var productCategoryTime = 0;
    var productLineItemsArray = currentBasket.getProductLineItems().toArray();
    if (!empty(productLineItemsArray)) {
        productLineItemsArray.forEach(function (productLineItem) {
            var category = productLineItem.getCategory();
            var product = productLineItem.getProduct();
            if (product.isVariant()) {
                product = product.getMasterProduct();
            }
            if (category && category.getCustom().leadTime && !empty(category.getCustom().leadTime) && category.getCustom().leadTime > leadTime) {
                productCategoryTime = category.getCustom().leadTime;
            }
            if (product && product.getCustom().leadTime && !empty(product.getCustom().leadTime) && product.getCustom().leadTime > leadTime) {
                productCategoryTime = product.getCustom().leadTime;
            }
        });
    }
    if (productCategoryTime > 0) {
        leadTime += productCategoryTime;
    }
    return leadTime;
};

var getFormatedDay = function (day) {
    var lastDigit = day % 10;
    var firstDigit = parseInt(day.toString().charAt(0), 10);
    if (firstDigit === 1 && day.toString().length === 2) {
        return day + 'th';
    }
    if (lastDigit === 1) {
        return day + 'st';
    }
    if (lastDigit === 2) {
        return day + 'nd';
    }
    if (lastDigit === 3) {
        return day + 'rd';
    }
    return day + 'th';
};

/**
* Returns a date/time string formatted for the public tracking page
*
* @param {Date} date date/time to format
* @return {string} Formatted date/time
*/
var getFormattedDateTime = function formatDateTime(date) {
    var thisDate = date;
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    // eslint-disable-next-line no-unused-vars, max-len
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var thisTomorrow = new Date();
    // eslint-disable-next-line max-len
    var formattedDate = days[thisDate.getDay()] + ' ' + getFormatedDay(thisDate.getDate()) + ' ' + months[thisDate.getMonth()];
    thisTomorrow.setDate(thisTomorrow.getDate() + 1);

    // return Tomorrow if date is tomorrow
    if (thisDate.getDate() === thisTomorrow.getDate()) {
        formattedDate = 'Tomorrow ' + getFormatedDay(thisDate.getDate()) + ' ' + months[thisDate.getMonth()];
    }

    return formattedDate;
};

var filterShippingMethodsForEstimatedDate = function formatShipMethods(method, objdates) {
    var thisMethod = method;
    var thisDates = objdates;
    var RealTimeRates = require('*/cartridge/scripts/realTimeRates');
    var Site = require('dw/system/Site');
    var Money = require('dw/value/Money');
    var formatCurrency = require('*/cartridge/scripts/util/formatting').formatCurrency;
    var methodCost;
    var methodCostMoney;

    var filteredmethod = thisDates.filter(function filterMethod(thisDate) {
        return thisDate.service_type === thisMethod.zenkraftID;
    });

    var thisEstimateobj = filteredmethod[0];

    if (!empty(thisEstimateobj) && !empty(thisEstimateobj.estimated_date)) {
        var parts = thisEstimateobj.estimated_date.split('-'); // eslint-disable-line vars-on-top
        var thisDateraw = new Date(parts[0], parts[1] - 1, parts[2]); // eslint-disable-line vars-on-top

        thisMethod.carrier = thisEstimateobj.carrier;
        thisMethod.estimated_date = thisEstimateobj.estimated_date;
        thisMethod.totalCost = thisEstimateobj.total_cost;
        thisMethod.currency = thisEstimateobj.currency;
        thisMethod.estimatedArrivalTime = getFormattedDateTime(thisDateraw);
    }

    // if real time rates are enabled for the site, replace the SFCC cost with
    // the rate from the Zenkraft API
    if (!empty(thisEstimateobj) && !empty(thisEstimateobj.cost) && Site.getCurrent().getCustomPreferenceValue('enableZenkraftShippingRates')) {
        // add markup to real time rates
        // add any markups
        var markupType = thisMethod.zenkraftRateMarkupType.value;
        var markup = thisMethod.zenkraftRateMarkup;

        methodCostMoney = new Money(thisEstimateobj.cost, session.currency.currencyCode);

        methodCost = RealTimeRates.getMarkupCost(markupType, markup, methodCostMoney);
        methodCost = formatCurrency(methodCost.value, session.currency.currencyCode);
        thisMethod.shippingCost = methodCost;
    }

    return thisMethod;
};

/**
 * Get return config
 * @param {*} json - input json
 * @param {*} products - products list
 * @returns {Object} - Response object
 */
function getReturnConfig(json, products) {
    if (!products) return null;
    var ProductMgr = require('dw/catalog/ProductMgr');
    var result = null;
    Object.keys(products).forEach(function (key) {
        var product = ProductMgr.getProduct(key);
        if (product) {
            var advancedConfigs = [];
            Object.keys(json).forEach(function (i) {
                if (json[i].advanced) {
                    advancedConfigs.push(json[i]);
                }
            });
            if (advancedConfigs && advancedConfigs.length) {
                advancedConfigs.forEach(function (advConfig) {
                    var valid = false;
                    Object.keys(advConfig.rules).forEach(function (ruleKey) {
                        if (ruleKey.indexOf('custom.') > -1) {
                            var rKey = ruleKey.replace('custom.', '');
                            valid = product.custom[rKey] === advConfig.rules[ruleKey];
                        } else {
                            valid = product[ruleKey] === advConfig.rules[ruleKey];
                        }
                    });
                    if (valid) {
                        result = advConfig;
                    }
                });
            }
        }
        return result;
    });
    return result;
}

/**
* Retrieves object with preferences for Zenkraft. The data is retrieved from the
* Advanced JSON Configuration Object or Zenkraft Default preferences group
*
* @param {string} type of preference: SHIP/RETURN
* @param {string} key Code for 'Ship to' Address
*
* @return {Object} JSON Object of Site Preference Values
*/
var prepareZenkraftDataConfiguration = function getConfigurationFromPreferences(type, key, products) {
    var Site = require('dw/system/Site');
    var advJson = {};
    var advJsonSpec = {};
    var iszenkraftAdvancedJSONOn = Site.getCurrent().getCustomPreferenceValue('zenkraftAdvancedJSON');
    var isSetUp = (iszenkraftAdvancedJSONOn && !empty(type) && !empty(key));
    if (isSetUp) {
        try {
            advJson = JSON.parse(Site.getCurrent().getCustomPreferenceValue('zenkraftAdvancedJSONObject'));
            advJsonSpec = getReturnConfig(advJson[type], products);
            if (advJsonSpec === null) {
                advJsonSpec = advJson[type][key] ? advJson[type][key] : {};
            }
        } catch (e) {
            Logger.error('Invalid Zenkraft Advanced JSON object.' + e.message + e.stack);
            return {};
        }
    }

    var data = {
        /*eslint-disable */
        IS_TEST: !(Site.getCurrent().getCustomPreferenceValue('zenkraftProdMode')),
        IS_DEBUG: Site.getCurrent().getCustomPreferenceValue('zenkraftDebugLog'),
        CARRIER: advJsonSpec.hasOwnProperty('CARRIER_ID') ? advJsonSpec['CARRIER_ID'] : Site.getCurrent().getCustomPreferenceValue('zenkraftCarrier'),
        SHIPPING_SERVICE: advJsonSpec.hasOwnProperty("SERVICE_TYPE") ? advJsonSpec['SERVICE_TYPE'] : Site.getCurrent().getCustomPreferenceValue('zenkraftShippingService'),
        PACKAGING: advJsonSpec.hasOwnProperty("PACKAGING") ? advJsonSpec['PACKAGING'] : Site.getCurrent().getCustomPreferenceValue('zenkraftPackagingType'),
        DIM_UNITS: advJsonSpec.hasOwnProperty("DIM_UNITS") ? advJsonSpec['DIM_UNITS'] : Site.getCurrent().getCustomPreferenceValue('zenkraftDimensionUnits').value,
        WEIGHT_UNITS: advJsonSpec.hasOwnProperty("WEIGHT_UNITS") ? advJsonSpec['WEIGHT_UNITS'] : Site.getCurrent().getCustomPreferenceValue('zenkraftWeightUnits').value,
        DEFAULT_WEIGHT: Site.getCurrent().getCustomPreferenceValue('zenkraftDefaultProductWeight'),
        CURRENCY: advJsonSpec.hasOwnProperty("CURRENCYCODE") ? advJsonSpec['CURRENCYCODE'] : Site.getCurrent().getCustomPreferenceValue('zenkraftCurrencyCode'),
        SHIP_ACCOUNT: advJsonSpec.hasOwnProperty("ACCOUNT_ID") ? advJsonSpec['ACCOUNT_ID'] : Site.getCurrent().getCustomPreferenceValue('zenkraftShippingAccount'),
        SENDER_EMAIL: advJsonSpec.hasOwnProperty("ADDRESS") ? advJsonSpec['ADDRESS']['EMAIL'] : Site.getCurrent().getCustomPreferenceValue('zenkraftSenderEmail'),
        SENDER_NAME: advJsonSpec.hasOwnProperty("ADDRESS") ? advJsonSpec['ADDRESS']['NAME'] : Site.getCurrent().getCustomPreferenceValue('zenkraftSenderName'),
        SENDER_COMPANY: advJsonSpec.hasOwnProperty("ADDRESS") ? advJsonSpec['ADDRESS']['COMPANY'] : Site.getCurrent().getCustomPreferenceValue('zenkraftSenderCompany'),
        SENDER_STREET: advJsonSpec.hasOwnProperty("ADDRESS") ? advJsonSpec['ADDRESS']['STREET'] : Site.getCurrent().getCustomPreferenceValue('zenkraftSenderStreet'),
        SENDER_CITY: advJsonSpec.hasOwnProperty("ADDRESS") ? advJsonSpec['ADDRESS']['CITY'] : Site.getCurrent().getCustomPreferenceValue('zenkraftSenderCity'),
        SENDER_STATE: advJsonSpec.hasOwnProperty("ADDRESS") ? advJsonSpec['ADDRESS']['STATECODE'] : Site.getCurrent().getCustomPreferenceValue('zenkraftSenderStateCode'),
        // eslint-disable-next-line max-len
        SENDER_POSTAL: advJsonSpec.hasOwnProperty("ADDRESS") ? advJsonSpec['ADDRESS']['POSTALCODE'].replace(/\s+/g, '') : Site.getCurrent().getCustomPreferenceValue('zenkraftSenderPostalCode').replace(/\s+/g, ''),
        SENDER_COUNTRY: advJsonSpec.hasOwnProperty("ADDRESS") ? advJsonSpec['ADDRESS']['COUNTRYCODE'] : Site.getCurrent().getCustomPreferenceValue('zenkraftSenderCountryCode'),
        SENDER_PHONE: advJsonSpec.hasOwnProperty("ADDRESS") ? advJsonSpec['ADDRESS']['PHONE'] : Site.getCurrent().getCustomPreferenceValue('zenkraftSenderPhone'),
        LABEL_TYPE: advJsonSpec.hasOwnProperty("FILETYPE") ? advJsonSpec['FILETYPE'] : Site.getCurrent().getCustomPreferenceValue('zenkraftShipLabelFileType')
        /*eslint-enable */
    };
    return data;
};

/**
* Retrieves object with shipping accounts by carrier.
*
* @param {string} carrier (ups, fedex, usps, etc)
*
* @return {Object} JSON Object of shipment account settings
*/
var getTrackingJSONPreferences = function trackingJsonPrefs(carrier) {
    var Site = require('dw/system/Site');
    // eslint-disable-next-line max-len
    var advJsonRaw = Site.getCurrent().getCustomPreferenceValue('zenkraftTrackingAccountSettingsJSON');
    var advJson;
    var returnObj = {};
    var advJsonSpec = {};

    try {
        // parse our object
        advJson = JSON.parse(advJsonRaw);

        // get the data for the carrier
        advJsonSpec = advJson[carrier];

        // set our return object
        // eslint-disable-next-line no-prototype-builtins
        returnObj.IS_TEST = advJsonSpec.hasOwnProperty('TEST') ? advJsonSpec.TEST : !(Site.getCurrent().getCustomPreferenceValue('zenkraftProdMode'));
        // eslint-disable-next-line no-prototype-builtins
        returnObj.IS_DEBUG = advJsonSpec.hasOwnProperty('DEBUG') ? advJsonSpec.DEBUG : Site.getCurrent().getCustomPreferenceValue('zenkraftDebugLog');
        // eslint-disable-next-line dot-notation, no-prototype-builtins, max-len
        returnObj.SHIPPING_ACCOUNT = advJsonSpec.hasOwnProperty('SHIPPING_ACCOUNT') ? advJsonSpec['SHIPPING_ACCOUNT'] : '';
    } catch (e) {
        Logger.error('Invalid Zenkraft Advanced JSON object');
        return {};
    }

    return returnObj;
};

/**
* Returns a date/time string formatted for the public tracking page
* from an ISO String
*
* @param {string} s ISO String
*
* @return {string} Formatted date/time
*/
var parseISOString = function parseISOString(s) {
    var b = s.split(/\D+/);
    var thisdate;
    var formattedDate;
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    thisdate = new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5]));

    formattedDate = days[thisdate.getDay()] + ', ' + months[thisdate.getMonth()] + ' ' + thisdate.getDate() + ' ' + thisdate.getYear();

    return formattedDate;
};

/**
* Stores the label as a custom object
*
* @param {string} orderNo Order number
* @param {Object} label label info
* @param {Object} items return items
* @return {boolean} true if object was saved, false on any error
*/
var saveReturnLabel = function saveReturn(orderNo, label, items) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');

    var shipment = label.shipment;
    var trackingNumber = shipment.tracking_number;
    var date = new Date();
    var returnID = date.getTime().toString();

    var returnLineItemsIDs = [];
    // TODO - fix zenkraftReturn and zenkraftReturnLineItem as in SiteGen
    Transaction.wrap(function createCOForLabel() {
        var zenkraftReturn = CustomObjectMgr.createCustomObject('zenkraftReturn', returnID);
        zenkraftReturn.custom.orderNumber = orderNo;
        zenkraftReturn.custom.labelType = shipment.label_type;
        // Record all labels
        zenkraftReturn.custom.allLabels = shipment.packages.map(function (packageItem) { return packageItem.label; }).join(',');
        items.forEach(function (item) {
            var returnLineItemID = item.productID + '-' + trackingNumber;
            var returnLineItem = CustomObjectMgr.createCustomObject('zenkraftReturnLineItem', returnLineItemID);
            returnLineItem.custom.productID = item.productID;
            returnLineItem.custom.carrier = shipment.carrier;
            returnLineItem.custom.label = item.label;
            returnLineItem.custom.reasonCode = item.reasonCode;
            returnLineItem.custom.subReasonCode = item.subReasonCode;
            returnLineItem.custom.quantity = item.quantity;
            returnLineItem.custom.productID = returnID;
            returnLineItem.custom.trackingNumber = trackingNumber;
            returnLineItem.custom.pliUUID = item.UUID;
            returnLineItemsIDs.push(returnLineItemID);
        });
        zenkraftReturn.custom.returnLineItems = returnLineItemsIDs.toString();
    });
    return returnID;
};

var generateZenkraftExportData = function generateData(unExportedReturnCases) {
    var exportZenkraftObjects = [];
    for (var i = 0; i < unExportedReturnCases.length; i++) {
        var val = unExportedReturnCases[i].custom;
        exportZenkraftObjects.push({
            carrier: val.carrier,
            /* labelURL: val.labelURL, */
            orderNumber: val.orderNumber,
            trackingNo: val.trackingNo,
            product: {
                /* todo */
            }
        });
    }
    return exportZenkraftObjects;
};

var createUnapprovedZenkraftReturn = function createZenkraftReturn(orderNo, items) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');

    var date = new Date();
    var returnID = date.getTime().toString();

    var returnLineItemsIDs = [];

    Transaction.wrap(function createCOForLabel() {
        var zenkraftReturn = CustomObjectMgr.createCustomObject('zenkraftReturn', returnID);
        zenkraftReturn.custom.orderNumber = orderNo;
        items.forEach(function (item) {
            var returnLineItemID = item.productID + '-' + returnID;
            var returnLineItem = CustomObjectMgr.createCustomObject('zenkraftReturnLineItem', returnLineItemID);
            returnLineItem.custom.quantity = item.quantity;
            returnLineItem.custom.productID = item.productID;
            returnLineItem.custom.returnID = returnID;
            returnLineItem.custom.reasonCode = item.reasonCode;
            returnLineItem.custom.subReasonCode = item.subReasonCode;
            returnLineItemsIDs.push(returnLineItemID);
        });
        zenkraftReturn.custom.returnLineItems = returnLineItemsIDs.toString();
    });
    return returnID;
};

/**
 * Get future date from delivery dates
 * @param {array} array - Input array
 * @param {*} length - Length of the future dates array
 * @param {*} i - index
 * @param {*} firstDate - First available date
 * @returns {array} - Filtered array
 */
function getFutureDateDeliveryDates(array, length, i, firstDate) {
    for (var j = i; j < length; j++) {
        var futureDateDelivery = firstDate.getTime();
        futureDateDelivery = new Date(futureDateDelivery + (j * 86400000));
        var formatedDate = getFormattedDateTime(futureDateDelivery);
        if (formatedDate.toLowerCase().indexOf('saturday') > -1) {
            j += 2;
            // eslint-disable-next-line no-param-reassign
            length += 2;
            return getFutureDateDeliveryDates(array, length, j, firstDate);
        }
        array.push({
            formatedDate: formatedDate,
            date: futureDateDelivery.getTime().toString()
        });
    }
    return array;
}

/**
 * Check method for instructions
 * @param {string} method - Method ID
 * @param {array} instructions - Array of instructions
 * @returns {array} - Instructions array
 */
function checkMethodForInstructions(method, instructions) {
    var methInstructions = [];
    instructions.forEach(function (instruction) {
        if (instruction.shippingMethods.indexOf(method.ID) > -1) {
            methInstructions.push(instruction);
        }
    });
    return methInstructions;
}

/**
 * Handle shipping methods
 * @param {*} viewData - Input view data
 * @returns {Object} - Updated view data
 */
var handleShippingMethods = function (viewData) {
    var Site = require('dw/system/Site');
    var zenkraft = require('*/cartridge/scripts/zenkraft');
    var ZenkraftEDDHelper = require('*/cartridge/scripts/helpers/zenkraftEDDHelper');
    var thisViewData = viewData; // eslint-disable-line vars-on-top
    var thisAddress = thisViewData.order.shipping[0].shippingAddress; // eslint-disable-line vars-on-top, max-len
    var thisMethods = thisViewData.order.shipping[0].applicableShippingMethods; // eslint-disable-line vars-on-top, max-len
    // var selectedMethod = thisViewData.order.shipping[0].selectedShippingMethod;
    var thisItems = thisViewData.order.items; // eslint-disable-line vars-on-top
    var thisDates = []; // eslint-disable-line vars-on-top
    var thisMethWithDates = []; // eslint-disable-line vars-on-top
    var date = new Date();
    var deliveryInstructions = Site.getCurrent().getCustomPreferenceValue('zenkraftDeliveryInstructionsConfig');
    var fallbackToNative = Site.getCurrent().getCustomPreferenceValue('zenkraftNativeMethodsFallback');
    // if cutoffTime is set via site preference, check to see if current time is after cutoff. If so, add a day
    if (ZenkraftEDDHelper.isAfterCutoffDate()) {
        date.setDate(date.getDate() + 1);
    }
    var leadDate = getLeadTime();
    if (!empty(leadDate)) {
        date.setDate(date.getDate() + leadDate);
    }
    var day = date.getDate().toString();
    var month = (date.getMonth() + 1).toString();
    if (month.length === 1) {
        month = '0' + month;
    }
    var year = date.getFullYear().toString();

    var leadDateFormated = year + '-' + month + '-' + day;

    thisDates = zenkraft.getShippingData(thisAddress, thisItems, thisMethods, leadDateFormated);

    // if we get dates back
    if (!empty(thisDates) && !empty(thisAddress)) {
        thisMethods.forEach(function filterMethods(method) {
            var key = method.shippingMethodAccountID ? 'id_' + method.shippingMethodAccountID : false;
            if (key && thisDates[key].rates) {
                var thisMethod = filterShippingMethodsForEstimatedDate(method, thisDates[key].rates);
                if (thisMethod.dropOffMethod) {
                    thisMethWithDates.push(thisMethod);
                } else if (thisMethod.futureDateDelivery && thisMethod.futureDateDelivery > 0 && !thisMethod.dropOffMethod && thisMethod.estimated_date && !empty(thisMethod.estimated_date)) {
                    var parts = thisMethod.estimated_date.split('-');
                    var firstDate = new Date(parts[0], parts[1] - 1, parts[2]);
                    thisMethod.futureDeliveryDates = getFutureDateDeliveryDates([{
                        formatedDate: getFormattedDateTime(firstDate),
                        date: firstDate.getTime().toString()
                    }], thisMethod.futureDateDelivery, 1, firstDate);
                    thisMethWithDates.push(thisMethod);
                } else {
                    thisMethWithDates.push(thisMethod);
                }
                if (!thisMethod.dropOffMethod && deliveryInstructions && deliveryInstructions.length > 0) {
                    var instructions = JSON.parse(deliveryInstructions);
                    thisMethod.instructions = checkMethodForInstructions(thisMethod, instructions);
                }
                // check if this method is selected on replace selectedShippingMethod
            }
            if (method.selected) {
                thisViewData.order.shipping[0].selectedShippingMethod = method;
            }
        });
        if (thisMethWithDates.length > 0 || (thisMethWithDates.length === 0 && !fallbackToNative)) {
            thisViewData.order.shipping[0].applicableShippingMethods = thisMethWithDates;
        }
    }
    return thisViewData;
};

var checkOrderReturnApproval = function (order) {
    var Site = require('dw/system/Site');
    var customerGroups = order.getCustomer().getCustomerGroups().toArray();
    var productLineItems = order.getProductLineItems().toArray();
    var zenkraftReturnApprovalCatalogCategories = Site.getCurrent().getCustomPreferenceValue('zenkraftReturnApprovalCatalogCategories');
    var zenkraftReturnApprovalCustomerGroups = Site.getCurrent().getCustomPreferenceValue('zenkraftReturnApprovalCustomerGroups');
    var isReturnApprovalRequired = false;
    // check all customer groups that client belongs to
    if (customerGroups.length > 0 && !empty(zenkraftReturnApprovalCustomerGroups)) {
        zenkraftReturnApprovalCustomerGroups = zenkraftReturnApprovalCustomerGroups.split(',');
        customerGroups.forEach(function (customerGroup) {
            var customerGroupID = customerGroup.getID();
            zenkraftReturnApprovalCustomerGroups.forEach(function (preferenceCustomerGroup) {
                if (customerGroupID.toLowerCase() === preferenceCustomerGroup.toLowerCase()) {
                    isReturnApprovalRequired = true;
                    return isReturnApprovalRequired;
                }
                return false;
            });
        });
    }
    if (productLineItems.length > 0 && !empty(zenkraftReturnApprovalCatalogCategories) && !isReturnApprovalRequired) {
        zenkraftReturnApprovalCatalogCategories = zenkraftReturnApprovalCatalogCategories.split(',');
        productLineItems.forEach(function (productLineItem) {
            var product = productLineItem.getProduct();
            if (product.isVariant()) {
                product = product.getMasterProduct();
            }
            var catalogCategories = product.getCategories().toArray();
            catalogCategories.forEach(function (catalogCategorie) {
                zenkraftReturnApprovalCatalogCategories.forEach(function (preferenceCatalogCategorie) {
                    if (catalogCategorie.getID().toLowerCase() === preferenceCatalogCategorie.toLowerCase()) {
                        isReturnApprovalRequired = true;
                        return isReturnApprovalRequired;
                    }
                    return false;
                });
            });
        });
    }
    return isReturnApprovalRequired;
};

exports.filterShippingMethodsForEstimatedDate = filterShippingMethodsForEstimatedDate;
exports.getFormattedDateTime = getFormattedDateTime;
exports.prepareZenkraftDataConfiguration = prepareZenkraftDataConfiguration;
exports.getTrackingJSONPreferences = getTrackingJSONPreferences;
exports.parseISOString = parseISOString;
exports.saveReturnLabel = saveReturnLabel;
exports.generateZenkraftExportData = generateZenkraftExportData;
exports.createUnapprovedZenkraftReturn = createUnapprovedZenkraftReturn;
exports.handleShippingMethods = handleShippingMethods;
exports.checkOrderReturnApproval = checkOrderReturnApproval;
exports.convertDate = convertDate;
exports.convertTime = convertTime;
