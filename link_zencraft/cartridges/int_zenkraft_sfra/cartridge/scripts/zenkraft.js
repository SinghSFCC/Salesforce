/* global dw, empty, session */
/**
* Model for working with the Zenkraft API
*
* @module cartridge/scripts/zenkraft
*/

'use strict';

var dwsvc = require('dw/svc');
var Site = require('dw/system/Site');

var configureZenkraftService = function configureService(serviceID, serviceRequest) {
    var service = dwsvc.LocalServiceRegistry.createService(serviceID, {
        createRequest: function (svc, request) {
            // Get API key from site preference in the Zenkraft custom site preference group
            var zenkraftkey = Site.getCurrent().getCustomPreferenceValue('zenkraftMasterAPIKey');

            svc.addHeader('zkkey', zenkraftkey);
            svc.addHeader('Accept', 'application/json');
            svc.setRequestMethod('POST');
            svc.addHeader('Content-Type', 'application/json');

            return !empty(request) ? request : {};
        },

        parseResponse: function (svc, client) {
            var data = client.text;

            data = JSON.parse(data);

            return data;
        }
    });
    return service.call(serviceRequest);
};

/**
* Create the object that will be passed in the /rates API call
* @param {strint|number} accountID - Account ID
* @param {Object} address recipient
* @param {Object} items items being shipped
* @return {Object} JSON Object of Request Data
*/
var getShippingRateRequest = function getRateRequestData(accountID, address, items) {
    var req = {};
    var sender = {};
    var recipient = {};
    var packages = [];
    var ZenkraftHelper = require('*/cartridge/scripts/helpers/zenkraftHelper');
    // eslint-disable-next-line max-len
    var prefs = ZenkraftHelper.prepareZenkraftDataConfiguration('EDD', accountID);
    var productLineItems;
    // build shipment
    req.shipment = {};
    req.shipment.test = prefs.IS_TEST;
    req.shipment.debug = prefs.IS_DEBUG;
    req.shipment.carrier = prefs.CARRIER;
    req.shipment.type = 'outbound';
    req.shipment.dim_units = prefs.DIM_UNITS;
    req.shipment.weight_units = prefs.WEIGHT_UNITS;
    req.shipment.currency = prefs.CURRENCY;
    req.shipment.packaging = prefs.PACKAGING;
    req.shipment.shipping_account = prefs.SHIP_ACCOUNT;

    // build sender data
    sender.street1 = prefs.SENDER_STREET;
    sender.city = prefs.SENDER_CITY;
    sender.state = prefs.SENDER_STATE;
    sender.postal_code = prefs.SENDER_POSTAL;
    sender.country = prefs.SENDER_COUNTRY;
    req.shipment.sender = sender;

    // build recipient data from user address
    recipient.street1 = !empty(address.address1) ? address.address1 : '';
    // eslint-disable-next-line max-len
    recipient.city = !empty(address.city) ? address.city : '';
    // eslint-disable-next-line max-len
    recipient.state = !empty(address.stateCode) && address.stateCode !== 'undefined' ? address.stateCode : '';
    recipient.postal_code = !empty(address.postalCode) ? address.postalCode : '';
    recipient.country = !empty(address.countryCode) ? address.countryCode.value.toUpperCase() : '';
    req.shipment.recipient = recipient;

    // build packages using current cart
    productLineItems = items.items;

    productLineItems.forEach(function addProductLines(item) {
        var productLineItem = item;

        var singlepackage = {
            weight: !empty(productLineItem.dimWeight) ? productLineItem.dimWeight : 1,
            value: 1,
            length: !empty(productLineItem.length) ? productLineItem.length : 1,
            width: !empty(productLineItem.dimWidth) ? productLineItem.dimWidth : 1,
            height: !empty(productLineItem.dimHeight) ? productLineItem.dimHeight : 1
        };

        packages.push(singlepackage);
    });

    req.shipment.packages = packages;

    return req;
};

/**
* Create the object that will be passed in the /rates API call
* for the PDP estimated date
* @param {Object} address Address for the lookup
* @return {Object} JSON Object of Request Data
*/
var getShippingRatePDPRequest = function (address) {
    var req = {};
    var sender = {};
    var recipient = {};
    var packages = [];
    var ZenkraftHelper = require('*/cartridge/scripts/helpers/zenkraftHelper');
    var prefs = ZenkraftHelper.prepareZenkraftDataConfiguration('SHIP', address.countryCode.toUpperCase());

    // build shipment
    req.shipment = {};
    req.shipment.test = prefs.IS_TEST;
    req.shipment.debug = prefs.IS_DEBUG;
    req.shipment.carrier = prefs.CARRIER;
    req.shipment.type = 'outbound';
    req.shipment.dim_units = prefs.DIM_UNITS;
    req.shipment.weight_units = prefs.WEIGHT_UNITS;
    req.shipment.currency = prefs.CURRENCY;
    req.shipment.packaging = prefs.PACKAGING;
    req.shipment.shipping_account = prefs.SHIP_ACCOUNT;

    // build sender data
    sender.street1 = prefs.SENDER_STREET;
    sender.city = prefs.SENDER_CITY;
    sender.state = prefs.SENDER_STATE;
    sender.postal_code = prefs.SENDER_POSTAL;
    sender.country = prefs.SENDER_COUNTRY;
    req.shipment.sender = sender;

    // build recipient data from user address
    recipient.street1 = !empty(address.address1) ? address.address1 : '';
    recipient.city = !empty(address.city) ? address.city : '';
    recipient.state = !empty(address.stateCode) && address.stateCode !== 'undefined' ? address.stateCode : '';
    recipient.postal_code = !empty(address.postalCode) ? address.postalCode : '';
    recipient.country = !empty(address.countryCode) ? address.countryCode.toUpperCase() : '';
    req.shipment.recipient = recipient;

    // build packages using current cart
    var pack = {
        weight: 1,
        value: 1,
        length: 1,
        width: 1,
        height: 1
    };

    packages.push(pack);

    req.shipment.packages = packages;

    return req;
};

/**
* Create the object that will be passed in the /ship API call
* @param {Object} order sfcc order
* @param {string} type type of request, ex: outbound
* @param {Object} products products being shipped
* @return {Object} JSON Object of Request Data
*/
var getShippingLabelRequest = function getLabelRequestData(order, type, products) {
    var req = {};
    var sender = {};
    var recipient = {};
    var packages = [];
    var customsItems = [];
    var references = [];
    var prefs;
    var shipservice;
    var defShipment = order.getDefaultShipment();
    var address = defShipment.shippingAddress;
    var ZenkraftHelper = require('*/cartridge/scripts/helpers/zenkraftHelper');
    var date = new Date();
    var d = date.getDate();
    var m = date.getMonth() + 1;
    var y = date.getFullYear();
    var productLineItems;
    var pli;
    var pliItem;
    var quantity;
    var reference;
    var i;
    var singlepackage = {};

    var dateString = y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);

    // Get appropriate preferences and shipping service for the situation
    if (type === 'outbound') {
        // eslint-disable-next-line max-len
        prefs = ZenkraftHelper.prepareZenkraftDataConfiguration('SHIP', address.countryCode.toUpperCase());
        shipservice = defShipment.shippingMethod.custom.zenkraftID;
    } else {
        // eslint-disable-next-line max-len=
        prefs = ZenkraftHelper.prepareZenkraftDataConfiguration('RETURN', address.countryCode.value.toUpperCase(), products);
        shipservice = prefs.SHIPPING_SERVICE;
    }

    // build shipment
    req.shipment = {};
    req.shipment.test = prefs.IS_TEST;
    req.shipment.debug = prefs.IS_DEBUG;
    req.shipment.carrier = prefs.CARRIER;
    req.shipment.service = shipservice;
    req.shipment.ship_date = dateString;
    req.shipment.type = !empty(type) ? type : 'return';
    req.shipment.packaging = prefs.PACKAGING;
    req.shipment.dim_units = prefs.DIM_UNITS;
    req.shipment.weight_units = prefs.WEIGHT_UNITS;
    req.shipment.currency = prefs.CURRENCY;
    req.shipment.shipping_account = prefs.SHIP_ACCOUNT;
    req.shipment.label_type = prefs.LABEL_TYPE;
    req.shipment.include_base64_label = true;

    // build recipient data
    recipient.email = prefs.SENDER_EMAIL;
    recipient.street1 = prefs.SENDER_STREET;
    recipient.company = !empty(prefs.SENDER_COMPANY) ? prefs.SENDER_COMPANY : '';
    recipient.phone = !empty(prefs.SENDER_PHONE) ? prefs.SENDER_PHONE : '1234567890';
    recipient.city = prefs.SENDER_CITY;
    recipient.state = prefs.SENDER_STATE;
    recipient.postal_code = prefs.SENDER_POSTAL;
    recipient.country = !empty(prefs.SENDER_COUNTRY) ? prefs.SENDER_COUNTRY.toUpperCase() : 'US';
    recipient.name = !empty(prefs.SENDER_NAME) ? prefs.SENDER_NAME : '';

    // build sender data from order address
    sender.street1 = !empty(address.address1) ? address.address1 : '';
    sender.city = !empty(address.city) ? address.city : '';
    sender.state = !empty(address.stateCode) ? address.stateCode : '';
    sender.postal_code = !empty(address.postalCode) ? address.postalCode.replace(/\s+/g, '') : '';
    sender.country = !empty(address.countryCode) ? address.countryCode.value.toUpperCase() : '';
    sender.company = 'Zenkraft User';
    sender.name = !empty(address.fullName) ? address.fullName : '';
    sender.phone = !empty(address.phone) ? address.phone : '1234567890';
    sender.email = !empty(order.customerEmail) ? order.customerEmail : '';

    // If the type is a new outbound shipment,
    // then the recipient is the customer and the sender is the site
    // However, if it's a return, then we are the recipient and the customer is the sender
    if (type === 'outbound') {
        req.shipment.recipient = sender;
        req.shipment.sender = recipient;
    } else {
        req.shipment.recipient = recipient;
        req.shipment.sender = sender;
    }

    // build packages using current cart
    productLineItems = order.getAllProductLineItems().iterator();

    // If the type of request is a return, then use specific products.
    // If it's an outbound request, use all of the products on the order
    if (type === 'return') {
        while (productLineItems.hasNext()) {
            pli = productLineItems.next();
            pliItem = pli.product;

            // only use the products that the user selected
            if (!empty(pliItem)) {
                // eslint-disable-next-line no-prototype-builtins
                if (products.hasOwnProperty(pliItem.ID)) {
                    quantity = products[pliItem.ID];

                    for (i = 0; i < quantity; i++) {
                        singlepackage = {
                            weight: !empty(pliItem.custom.dimWeight) ? pliItem.custom.dimWeight : 1,
                            value: 1,
                            length: !empty(pliItem.custom.length) ? pliItem.custom.length : 1,
                            width: !empty(pliItem.custom.dimWidth) ? pliItem.custom.dimWidth : 1,
                            height: !empty(pliItem.custom.dimHeight) ? pliItem.custom.dimHeight : 1
                        };

                        packages.push(singlepackage);
                    }
                }
                if (recipient.country !== sender.country) {
                    customsItems.push({
                        harmonized_code: pliItem.getCustom().harmonized_code ? pliItem.getCustom().harmonized_code : '',
                        description: pliItem.getName(),
                        manufacture_country_code: 'GB', // pliItem.getCustom().manufacture_country_code ? pliItem.getCustom().manufacture_country_code : '',
                        quantity: parseInt(products[pliItem.ID], 10),
                        quantity_unit: 'ea',
                        value: pliItem.getPriceModel().getPrice().getValue(),
                        currency: pliItem.getPriceModel().getPrice().getCurrencyCode(),
                        weight: pliItem.getCustom().dimWeight ? pliItem.getCustom().dimWeight : 1,
                        weight_unit: 'kilograms'
                    });
                }
            }
        }
        if (recipient.country !== sender.country) {
            req.shipment.customs_items = customsItems;
        }
        req.shipment.packages = packages;
    } else {
        while (productLineItems.hasNext()) {
            pli = productLineItems.next();
            pliItem = pli.product;
            quantity = pli.quantityValue;

            for (i = 0; i < quantity; i++) {
                singlepackage = {
                    weight: !empty(pliItem.custom.dimWeight) ? pliItem.custom.dimWeight : 1,
                    value: 1,
                    length: !empty(pliItem.custom.length) ? pliItem.custom.length : 1,
                    width: !empty(pliItem.custom.dimWidth) ? pliItem.custom.dimWidth : 1,
                    height: !empty(pliItem.custom.dimHeight) ? pliItem.custom.dimHeight : 1
                };

                packages.push(singlepackage);
            }
        }

        req.shipment.packages = packages;
    }

    if (prefs.CARRIER === 'dhl') {
        reference = {
            type: 'ref',
            value: order.orderNo
        };
    } else {
        reference = {
            type: 'invoice_number',
            value: order.orderNo
        };
    }

    references.push(reference);

    req.shipment.references = references;

    return req;
};

/**
* Cleans up Zenkraft shipping rates response
* to make it easier to compare with SFCC Shipping Methods.
* Also sets session variable for shipping costs to be used during cart calculation.
*
* @param {Object} data shipping data object
* @return {HashMap} JSON Object of Sanitized Shipping Method Data
*/
var sanitizeShippingData = function cleanShippingData(data) {
    var cleanMethods = [];
    var zenkraftCosts = {};

    // Create a new object with all of the Zenkraft carrier data
    data.forEach(function updateMethodsWithDate(meth) {
        var cleanmethod = {};
        var realTimeRates = require('*/cartridge/scripts/realTimeRates');

        cleanmethod.carrier = meth.carrier && !empty(meth.carrier) ? meth.carrier : false;
        cleanmethod.cost = !empty(meth.total_cost) && Site.getCurrent().getCustomPreferenceValue('enableZenkraftShippingRates') ? meth.total_cost : null;
        cleanmethod.estimated_date = !empty(meth.estimated_date) ? meth.estimated_date : '';
        cleanmethod.service_type = meth.service_type;

        cleanMethods.push(cleanmethod);
        zenkraftCosts[meth.service_type] = cleanmethod.cost;

        // set the session variable for later use in cart calculation
        if (!empty(zenkraftCosts)) {
            realTimeRates.updateSessionShippingRates(JSON.stringify(zenkraftCosts));
        } else if (!empty(session.privacy.zenkraftCosts)) {
            realTimeRates.updateSessionShippingRates();
        }
    });

    return cleanMethods;
};

/**
* Get Shipping Data From Zenkraft Web Service
*
* @param {Object} address shipping address
* @param {Object} cart sfcc basket object
* @param {Object} methods available shipping methods
* @param {Object} date - Date
* @return {HashMap} JSON Object of Available Shipping Method Data
*/
var getShippingData = function getShipData(address, cart, methods, date) {
    // eslint-disable-next-line no-unused-vars
    var realTimeRates = require('*/cartridge/scripts/realTimeRates');
    var data = {};

    if (!empty(address) && !empty(address.postalCode)) {
        methods.forEach(function (method) {
            var id = 'id_' + method.shippingMethodAccountID;
            if (method.shippingMethodAccountID && !empty(method.shippingMethodAccountID && !data[id])) {
                data[id] = getShippingRateRequest(id, address, cart);
                if (data[id] && data[id].shipment && !empty(data[id].shipment) && !empty(date)) {
                    data[id].shipment.ship_date = date;
                }
                var cacheHelper = require('*/cartridge/scripts/helpers/cacheHelpers');
                data[id].resp = cacheHelper.getCache(data[id], 'ZenKraftRates', function () {
                    var response = configureZenkraftService('http.zenkraft.rate', JSON.stringify(data[id]));
                    return response.object;
                });
                if (method.shippingMethodAccountID && !empty(data[id].resp) &&
                    !empty(data[id].resp) && !empty(data[id].resp.rates)) {
                    data[id].rates = sanitizeShippingData(data[id].resp.rates);
                    delete data[id].resp;
                }
            }
        });
    } else {
        realTimeRates.updateSessionShippingRates();
    }
    return data;
};

/**
* Get Shipping Label From Zenkraft Web Service
*
* @param {Object} order sfcc order object
* @param {Object} products products in shipment
* @param {string} emailaddress optional; email address to send label to
* @return {HashMap} JSON Object of Available Shipping Method Data
*/
var getShippingLabel = function getShipLabel(order, products, emailaddress) {
    var resp;
    var req = {};
    var emailHelper = require('*/cartridge/scripts/helpers/emailHelpers');
    var Resource = require('dw/web/Resource');

    req = getShippingLabelRequest(order, 'return', products);
    resp = configureZenkraftService('http.zenkraft.ship', JSON.stringify(req));

    // Send the email if applicable
    if (!empty(emailaddress)) {
        if (!empty(resp.object)) {
            if (empty(resp.object.error)) {
                var emailObj = {
                    to: emailaddress,
                    subject: Resource.msg('labelemail.arrived', 'order', null),
                    from: Site.current.getCustomPreferenceValue('customerServiceEmail') || 'no-reply@salesforce.com'
                };

                var labelObj = {
                    LabelURL: resp.object.shipment.packages[0].label
                };

                emailHelper.sendEmail(emailObj, 'mail/printLabelEmail', labelObj);
            }
        }
    }

    return resp.object;
};

/**
* Get Tracking Information For a Shipment
*
* @param {string} trackingNo tracking number for shipment
* @param {string} carrier carrier ID
* @return {HashMap} JSON Object with the shipping information including tracking number and label URL
*/
var getTrackingInfo = function getTracking(trackingNo, carrier) {
    var resp;
    var req;
    var ZenkraftHelper = require('*/cartridge/scripts/helpers/zenkraftHelper');
    var prefs = ZenkraftHelper.getTrackingJSONPreferences(carrier);
    var retObject = {};

    req = {
        track: {
            debug: prefs.IS_DEBUG === 'true',
            test: prefs.IS_TEST === 'true',
            shipping_account: prefs.SHIPPING_ACCOUNT,
            carrier: carrier,
            tracking_number: trackingNo
        }
    };

    resp = configureZenkraftService('http.zenkraft.track', JSON.stringify(req));

    if (!empty(resp.object)) {
        if (empty(resp.object.error)) {
            retObject = resp.object;
        } else {
            retObject = resp.object;
        }
    } else {
        return {
            error: 'Error Getting Tracking Information'
        };
    }

    return retObject;
};

/**
* Get Drop Off Locations using the Zenkraft Web Service
*
* @param {Object} shipaddress shipping address
* @param {Object} accountID - Account ID
* @return {HashMap} JSON Object with the location information
*/
var getDropOffLocations = function getDPLocations(shipaddress, accountID) {
    var ZenkraftHelper = require('*/cartridge/scripts/helpers/zenkraftHelper');
    var type = accountID ? 'EDD' : 'RETURN';
    var key = accountID || shipaddress.countryCode.value.toUpperCase();
    var prefs = ZenkraftHelper.prepareZenkraftDataConfiguration(type, key);
    var resp;
    var req;
    var thisaddress = shipaddress;

    if (!empty(thisaddress) && !empty(thisaddress.postalCode)) {
        req = {
            dopu:
            {
                carrier: prefs.CARRIER,
                location: {
                    city: !empty(thisaddress.city) ? thisaddress.city : '',
                    country: !empty(thisaddress.countryCode) ? thisaddress.countryCode.value.toUpperCase() : '',
                    postal_code: !empty(thisaddress.postalCode) ? thisaddress.postalCode.toString() : '',
                    state: !empty(thisaddress.stateCode) && thisaddress.stateCode !== 'undefined' ? thisaddress.stateCode : '',
                    street1: !empty(thisaddress.address1) ? thisaddress.address1 : thisaddress.street1 ? thisaddress.street1 : ''
                },
                packaging: prefs.PACKAGING,
                shipping_account: prefs.SHIP_ACCOUNT,
                test: prefs.IS_TEST,
                debug: prefs.IS_DEBUG
            }
        };
        resp = configureZenkraftService('http.zenkraft.dopu', JSON.stringify(req));

        if (!empty(resp.object)) {
            if (empty(resp.object.error)) {
                return resp.object;
            }
            return resp.object;
        }
        return {
            error: 'No Locations Available'
        };
    }

    return {};
};

/**
* Get Earliest Delivery Date for a given address
*
* @param {Object} address Address to be used
* @return {HashMap} JSON Object with the location information
*/
var getEstimatedDeliveryDates = function (address) {
    var resp = {};

    if (!empty(address) && !empty(address.postalCode)) {
        var reqdata = getShippingRatePDPRequest(address);
        resp = configureZenkraftService('http.zenkraft.rate', JSON.stringify(reqdata));
    }
    return resp.object;
};

/**
* Filter categories
*
* @param {Product} product class
* @return {string} comma separated categories of product
*/
function getProductCategories(product) {
    var thisProduct = null;
    if (product.isCategorized()) {
        thisProduct = product;
    } else {
        thisProduct = product.getMasterProduct();
    }
    var categories = thisProduct.getAllCategories().toArray();
    var categoryIDs = [];
    categories.forEach(function (category) {
        categoryIDs.push(category.ID);
    });
    var uniqueCategories = categoryIDs.filter(function (value, index, self) {
        return self.indexOf(value) === index;
    });
    return uniqueCategories.join(', ');
}

/**
* Prepare return lines for Zenkraft Return Sync
* @param {dw.order.Order} order Order object
* @param {string} returnID return ID
* @param {boolean} returnsRequireApproval returns Require Approval
* @return {Array} objects
*/
function getReturnLines(order, returnID, returnsRequireApproval) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var orderLineItems = order.getProductLineItems().toArray();
    var returnLines = [];
    var zenkraftReturn = CustomObjectMgr.getCustomObject('zenkraftReturn', returnID);
    var zenkraftReturnLineItems = zenkraftReturn.custom.returnLineItems;
    zenkraftReturnLineItems = zenkraftReturnLineItems.split(',');
    for (var i = 0; i < zenkraftReturnLineItems.length; i++) {
        zenkraftReturnLineItems[i] = CustomObjectMgr.getCustomObject('zenkraftReturnLineItem', zenkraftReturnLineItems[i]);
    }
    orderLineItems.forEach(function (lineItem) {
        zenkraftReturnLineItems.forEach(function (zenkraftReturnLineItem) {
            if (lineItem.product.getID() === zenkraftReturnLineItem.custom.productID) {
                var product = lineItem.getProduct();
                var imageURL = product.getImage('medium').getURL().abs().toString();
                var reasonObject = JSON.parse(zenkraftReturnLineItem.custom.reasonCode);
                var subReasonObject = JSON.parse(zenkraftReturnLineItem.custom.subReasonCode);
                returnLines.push({
                    line_id: zenkraftReturnLineItem.custom.id,
                    quantity: parseInt(zenkraftReturnLineItem.custom.quantity, 10),
                    unit_price: lineItem.getPriceValue(),
                    currency: lineItem.getAdjustedGrossPrice().getCurrencyCode(),
                    reason: {
                        level1_code: reasonObject.id,
                        level1_text: reasonObject.value,
                        level2_code: subReasonObject.id,
                        level2_text: subReasonObject.value
                    },
                    product: {
                        product_id: product.getMasterProduct().getID(),
                        product_name: product.getMasterProduct().getName(),
                        product_category: getProductCategories(product),
                        description: product.getPageDescription(),
                        variant_id: product.getID(),
                        variant_name: product.getName(),
                        image_url: imageURL.indexOf('http') !== -1 ? imageURL : ''
                    },
                    approval_required: returnsRequireApproval
                });
            }
        });
    });
    return returnLines;
}

/**
* Send request to Zenraft Return Sync service
*
* @param {Object} req Zenkraft sync object request
* @return {Object} resp Zenkraft sync object response
*/
function sendSyncReturnWithZenkraft(req) {
    var Logger = require('dw/system/Logger');
    var resp = {};

    resp = configureZenkraftService('http.zenkraft.return', JSON.stringify(req));
    if (!empty(resp.object) && empty(resp.object.error)) {
        return resp;
    }

    return Logger.error('Zenkraft Error: Response: ' + resp.object.error.message);
}

/**
* Prepare Zenraft Return Sync request
* @param {dw.order.Order} Order - Order object
* @param {string} returnID - Return ID
* @param {boolean} returnsRequireApproval - Does return require approval
* @return {void}
*/
function getSyncReturnRequest(order, returnID, returnsRequireApproval) {
    var sender = order.getShipments().toArray()[0].getShippingAddress();
    var Logger = require('dw/system/Logger');
    var zenkraftSender = {
        city: sender.city ? sender.city : '',
        company: sender.companyName ? sender.companyName : '',
        country: sender.countryCode.value,
        email: order.getCustomerEmail(),
        name: sender.fullName ? sender.fullName : '',
        phone: sender.phone ? sender.phone : '',
        postal_code: sender.postalCode ? sender.postalCode : '',
        state: sender.stateCode ? sender.stateCode : '',
        street1: sender.address1 ? sender.address1 : '',
        street2: sender.address2 ? sender.address2 : ''
    };
    var iszenkraftAdvancedJSONOn = Site.getCurrent().getCustomPreferenceValue('zenkraftAdvancedJSON');
    var isSetUp = (iszenkraftAdvancedJSONOn);
    var advJsonSpec = {};
    var advJson;
    if (isSetUp) {
        try {
            advJson = JSON.parse(Site.getCurrent().getCustomPreferenceValue('zenkraftAdvancedJSONObject'));
            advJsonSpec = advJson.RETURN[sender.countryCode.value.toUpperCase()];
        } catch (e) {
            Logger.error('Invalid Zenkraft Advanced JSON object');
            return {};
        }
    }
    var recipient = {
        email: advJsonSpec.hasOwnProperty('ADDRESS') ? advJsonSpec.ADDRESS.EMAIL : Site.getCurrent().getCustomPreferenceValue('zenkraftRecipientEmail'),
        name: advJsonSpec.hasOwnProperty('ADDRESS') ? advJsonSpec.ADDRESS.NAME : Site.getCurrent().getCustomPreferenceValue('zenkraftRecipientName'),
        company: advJsonSpec.hasOwnProperty('ADDRESS') ? advJsonSpec.ADDRESS.COMPANY : Site.getCurrent().getCustomPreferenceValue('zenkraftRecipientCompany'),
        street1: advJsonSpec.hasOwnProperty('ADDRESS') ? advJsonSpec.ADDRESS.STREET : Site.getCurrent().getCustomPreferenceValue('zenkraftRecipientStreet'),
        city: advJsonSpec.hasOwnProperty('ADDRESS') ? advJsonSpec.ADDRESS.CITY : Site.getCurrent().getCustomPreferenceValue('zenkraftRecipientCity'),
        state: advJsonSpec.hasOwnProperty('ADDRESS') ? advJsonSpec.ADDRESS.STATECODE : Site.getCurrent().getCustomPreferenceValue('zenkraftRecipientCity'),
        // eslint-disable-next-line max-len
        postal_code: advJsonSpec.hasOwnProperty('ADDRESS') ? advJsonSpec.ADDRESS.POSTALCODE.replace(/\s+/g, '') : Site.getCurrent().getCustomPreferenceValue('zenkraftRecipientPostalCode').replace(/\s+/g, ''),
        country: advJsonSpec.hasOwnProperty('ADDRESS') ? advJsonSpec.ADDRESS.COUNTRYCODE : Site.getCurrent().getCustomPreferenceValue('zenkraftRecipientCountryCode'),
        phone: advJsonSpec.hasOwnProperty('ADDRESS') ? advJsonSpec.ADDRESS.PHONE : Site.getCurrent().getCustomPreferenceValue('zenkraftRecipientPhone')
    };
    var req = {
        return: {
            return_id: returnID,
            order: {
                order_id: order.getOrderNo()
            },
            customer: {
                customer_id: order.getCustomerNo() ? order.getCustomerNo() : order.getCustomer().getID()
            },
            return_lines: getReturnLines(order, returnID, returnsRequireApproval),
            return_from: zenkraftSender,
            return_to: recipient
        }
    };
    return sendSyncReturnWithZenkraft(req);
}

/* Exports of the module */
// /**
//* @see {@link module:cartridge/scripts/zenkraft~MyFunction} */
exports.getShippingData = getShippingData;
exports.getShippingLabel = getShippingLabel;
exports.getTrackingInfo = getTrackingInfo;
exports.getDropOffLocations = getDropOffLocations;
exports.getEstimatedDeliveryDates = getEstimatedDeliveryDates;
exports.getSyncReturnRequest = getSyncReturnRequest;
exports.configureZenkraftService = configureZenkraftService;
