/* global request, empty, response, dw, session */
/**
* This controller provides integrations with the Zenkraft API.
*
* @module  controllers/Zenkraft
*/

'use strict';

var server = require('server');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var zenkraftMiddleware = require('*/cartridge/scripts/middleware/zenkraft');

/**
 * Gets Shipping Label from the Zenkraft API
 *
 * @return {Object} Object representing the shipping label
 */
server.post('GetShippingLabel', server.middleware.https, function (req, res, next) {
    var Site = require('dw/system/Site');
    var Locale = require('dw/util/Locale');
    var syncReturnWithZenkraft = Site.getCurrent().getCustomPreferenceValue('syncReturnWithZenkraft');
    var OrderMgr = require('dw/order/OrderMgr');
    var OrderModel = require('*/cartridge/models/order');
    // var Zenkraft = require('*/cartridge/scripts/zenkraft');
    var returnHelper = require('*/cartridge/scripts/helpers/zenkraftReturnHelper');
    var data;
    try {
        data = JSON.parse(request.httpParameterMap.getRequestBodyAsString());
    } catch (e) {
        res.json({ error: 'Wrong request' });
        return next();
    }
    if (empty(data) || empty(data.orderID) || empty(data.items)) {
        res.json({ error: 'Wrong request' });
        return next();
    }

    var order = OrderMgr.getOrder(data.orderID);
    if (empty(order)) {
        res.json({ error: 'No order found' });
        return next();
    }
    var currentLocale = Locale.getLocale(req.locale.id);
    var orderModel = new OrderModel(order, { config: { numberOfLineItems: '*' }, countryCode: currentLocale.country, containerView: 'order' });
    var returnsRequireApproval = returnHelper.checkOrderReturnApproval(order);

    var returnID = returnHelper.createReturnCase(order, data.items);
    if (syncReturnWithZenkraft) {
        // send zenkraft return sync
        // Zenkraft.getSyncReturnRequest(order, returnID.returnID, returnsRequireApproval);
    }
    var returnObject = returnHelper.getReturnCase(returnID.returnID);
    if (!returnsRequireApproval) {
        returnObject = returnHelper.getCombineLabel(returnObject, data.items);
    } else {
        res.json({
            returnsRequireApproval: returnsRequireApproval,
            returnObject: returnObject
        });
        return next();
    }
    delete returnObject.returnLineItems;
    var newReturnLines = null;
    var addressHashes = {};
    if (returnID.returnLines) {
        var StringUtils = require('dw/util/StringUtils');
        newReturnLines = returnID.returnLines.map(function (item) {
            var ProductMgr = require('dw/catalog/ProductMgr');
            var product = ProductMgr.getProduct(item.custom.productID);
            var productImage = product.getImage('medium').getURL().abs().toString();
            var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
            var lineItem = orderModel.items.items.filter(function (pli) {
                return pli.UUID === item.custom.pliUUID;
            });
            return {
                returnID: item.custom.returnID,
                productID: item.custom.productID,
                productName: product.name,
                productImage: productImage,
                quantity: item.custom.quantity,
                reasonCode: item.custom.reasonCode,
                subReasonCode: item.custom.subReasonCode,
                trackingNumber: item.custom.trackingNumber,
                label: item.custom.label,
                labelType: item.custom.labelType,
                address: item.custom.returnAddress,
                addressHash: StringUtils.encodeBase64(JSON.stringify(item.custom.returnAddress), 'UTF-8'),
                renderedTemplate: lineItem ? renderTemplateHelper.getRenderedHtml({ returnLineItem: lineItem[0] }, 'account/return/returnPLI') : null,
                creationDate: item.creationDate
            };
        });
        newReturnLines.forEach(function (returnLine) {
            if (!Object.hasOwnProperty.call(addressHashes, returnLine.addressHash)) {
                addressHashes[returnLine.addressHash] = [returnLine];
            } else {
                var values = addressHashes[returnLine.addressHash];
                values.push(returnLine);
                addressHashes[returnLine.addressHash] = values;
            }
        });
    }
    var returnGroups = [];
    Object.keys(addressHashes).forEach(function (addressHash) {
        if (addressHashes[addressHash].length > 1) {
            var combinedLabel = returnHelper.getCombineLabel({
                returnLineItems: addressHashes[addressHash]
            }, data.items);
            returnGroups.push({
                label: combinedLabel.combinedLabel,
                combinedLabel: true,
                returnLines: addressHashes[addressHash]
            });
        } else {
            returnGroups.push({
                label: addressHashes[addressHash][0].label,
                returnLines: addressHashes[addressHash]
            });
        }
    });
    var address = {
        street1: order.shipments[0].shippingAddress.address1 ? order.shipments[0].shippingAddress.address1 : '',
        city: order.shipments[0].shippingAddress.city ? order.shipments[0].shippingAddress.city : '',
        countryCode: order.shipments[0].shippingAddress.countryCode && order.shipments[0].shippingAddress.countryCode.value ? order.shipments[0].shippingAddress.countryCode.value : '',
        stateCode: order.shipments[0].shippingAddress.stateCode ? order.shipments[0].shippingAddress.stateCode : '',
        postalCode: order.shipments[0].shippingAddress.postalCode ? order.shipments[0].shippingAddress.postalCode : ''
    };
    res.json({
        address: address,
        returnObject: returnObject,
        returnLines: addressHashes,
        returnGroups: returnGroups,
        totalLocations: addressHashes.length
    });
    return next();
});

/**
* Sends a shipping label to a provided email address
*
* @return {Object} Object representing the shipping label
*/
server.post('SendShippingLabel', server.middleware.https, function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var Zenkraft = require('*/cartridge/scripts/zenkraft');
    var parameterMap = request.httpParameterMap;
    var order;
    var reqbody = JSON.parse(request.httpParameterMap.getRequestBodyAsString());
    var products = reqbody.products;
    var email = reqbody.emailaddress;

    if (!empty(parameterMap.orderID)) {
        order = OrderMgr.getOrder(parameterMap.orderID);
    }

    if (!empty(order) && !empty(email)) {
        var label = Zenkraft.getShippingLabel(order, products, email);

        // set content to json
        res.json(label);
        return next();
    }
    res.json({ error: 'No order found' });
    return next();
});


/**
* showTracking
* - Renders a public page for shipment tracking
*/

server.get('Track', server.middleware.https, function (req, res, next) {
    var Site = require('dw/system/Site');
    var URLUtils = require('dw/web/URLUtils');
    var OrderMgr = require('dw/order/OrderMgr');
    var trackingHelper = require('*/cartridge/scripts/helpers/trackingHelper');
    var parameterMap = request.httpParameterMap;
    var trackingNo = parameterMap.tracknumber.isSubmitted() ? parameterMap.tracknumber.value : false;
    var orderNo = parameterMap.order.isSubmitted() ? parameterMap.order.value : false;
    var carrier = parameterMap.carrier.isSubmitted() ? parameterMap.carrier.value.toLowerCase() : false;
    var order = false;
    var trackingsData;
    var useParcelObjectforTracking = Site.getCurrent().getCustomPreferenceValue('useParcelObjectforTracking');
    var requireLogin = Site.getCurrent().getCustomPreferenceValue('trackingPageRequiresLogin');
    if (requireLogin && !session.getCustomer().isAuthenticated()) {
        res.redirect(URLUtils.url('Login-Show'));
        return next();
    }
    if (!(Site.getCurrent().getCustomPreferenceValue('enableZenkraftTrackingPage'))) {
        res.redirect(URLUtils.url('Home-Show'));
        return next();
    }
    if (orderNo) {
        order = OrderMgr.getOrder(orderNo);
    }

    if (useParcelObjectforTracking) {
        trackingsData = trackingHelper.getParcelObjects(order, trackingNo, carrier);
    } else {
        trackingsData = trackingHelper.getSystemShipments(order, trackingNo, carrier);
    }
    if (!trackingsData) {
        res.setStatusCode(404);
        res.render('error/notFound');
        return next();
    }

    res.render('account/tracking/tracking', { TrackingNo: trackingNo, TrackingsData: trackingsData, OrderNo: orderNo });
    return next();
});

/**
* Displays a page for a single shipment that allows users to
* request a shipping label for a return.
*/
server.post('PrintLabel',
    server.middleware.https,
    csrfProtection.validateRequest,
    function (req, res, next) {
        var OrderMgr = require('dw/order/OrderMgr');

        var Order = OrderMgr.getOrder(req.form.orderno);
        // is the order created by the authenticated user
        /* if (Order.getCustomer() !== session.getCustomer()) {
            res.redirect(URLUtils.url('Home-Show'));
            return next();
        } */
        var shipment = Order.getDefaultShipment();

        res.render('account/orderhistory/printLabel', { Order: Order, Shipment: shipment });
        next();
    }
);

/**
* AddNotification
* - Adds a new shipping notification custom object to the site
* - This custom object is used in a job to send notifications for changes
* in shipment status.
*
* @param {string} type - The type of notification (sms, voice, etc).
* @param {string} phone - Phone number (optional).
* @return {string} JSON object status success or failure.
*/
server.post('AddNotification', function (req, res, next) {
    var notifications = require('*/cartridge/scripts/notifications');
    var reqbody = JSON.parse(request.httpParameterMap.getRequestBodyAsString());
    var orderNo = reqbody.orderNo && !empty(reqbody.orderNo) ? reqbody.orderNo : false;
    var shipmentNo = reqbody.shipmentNo && !empty(reqbody.shipmentNo) ? reqbody.shipmentNo : false;
    var notification = 'There was an issue when trying to subscribe you to SMS notifications. Please try again later.';
    var notifyObject = {
        type: !empty(reqbody.type) ? reqbody.type : false,
        contact: !empty(reqbody.contact) ? reqbody.contact : false,
        trackingNumber: !empty(reqbody.tracknumber) ? reqbody.tracknumber : false,
        carrier: !empty(reqbody.carrier) ? reqbody.carrier : false,
        stage: !empty(reqbody.stage) ? reqbody.stage : false,
        tracking_stage: !empty(reqbody.stage) ? reqbody.stage : false
    };

    if (reqbody.orderNo && !empty(reqbody.orderNo)) {
        notification = notifications.addNotificationObject(notifyObject, orderNo, shipmentNo);
    }

    // return success or failure response
    res.json({ success: notification });
    return next();
});

/**
* Displays a page for a single shipment that allows users to
* request a shipping label for a return.
*/
server.use('Returns', function (req, res, next) {
    var Resource = require('dw/web/Resource');
    var URLUtils = require('dw/web/URLUtils');
    var Locale = require('dw/util/Locale');
    var OrderMgr = require('dw/order/OrderMgr');
    var Site = require('dw/system/Site');
    var OrderModel = require('*/cartridge/models/order');
    var returnHelper = require('*/cartridge/scripts/helpers/zenkraftReturnHelper');
    var requireLogin = Site.getCurrent().getCustomPreferenceValue('enableZenkraftReturnsRequireLogin');
    var googleAPIEnabled = Site.getCurrent().getCustomPreferenceValue('googleMapsAPIKey');
    var order = '';
    var method = req.httpMethod;
    var breadcrumbs = [
        {
            htmlValue: Resource.msg('global.home', 'common', null),
            url: URLUtils.home().toString()
        },
        {
            htmlValue: Resource.msg('page.title.myaccount', 'account', null),
            url: URLUtils.url('Account-Show').toString()
        },
        {
            htmlValue: Resource.msg('label.orderhistory', 'account', null),
            url: URLUtils.url('Order-History').toString()
        }
    ];

    if (!session.getCustomer().isAuthenticated() && requireLogin) {
        res.redirect(URLUtils.url('Login-Show'));
        return next();
    }

    if (method === 'GET') {
        var isIdSubmitted = request.httpParameterMap.id.submitted;
        if (!isIdSubmitted) {
            res.setStatusCode(404);
            res.render('error/notFound');
            return next();
        }
        var zenkraftReturn = returnHelper.getReturnCase(request.httpParameterMap.id.getValue());
        var address = null;
        if (zenkraftReturn) {
            order = OrderMgr.getOrder(zenkraftReturn.orderNumber);
            address = order.shipments[0].shippingAddress;
        }

        if (zenkraftReturn && zenkraftReturn.custom) {
            res.render('account/orderhistory/return', {
                zenkraftReturn: zenkraftReturn,
                breadcrumbs: breadcrumbs,
                address: address
            });
        }
        res.redirect(URLUtils.https('Order-Details', 'orderID', order.orderNo));
        return next();
    } else if (method === 'POST') {
        order = OrderMgr.getOrder(req.form.orderno);
        if (!returnHelper.checkOrderDaysAvailableForReturn(order)) {
            res.render('account/orderhistory/returns/unavivable', {
                orderNo: order.orderNo,
                breadcrumbs: breadcrumbs
            });
            return next();
        }
        var pageSettings = {
            returnsRequireApproval: returnHelper.checkOrderReturnApproval(order)
        };
        var config = {
            numberOfLineItems: '*'
        };
        var currentLocale = Locale.getLocale(req.locale.id);
        var orderModel = new OrderModel(
            order,
            { config: config, countryCode: currentLocale.country, containerView: 'order' }
        );
        orderModel = returnHelper.setOrderModelforReturns(JSON.stringify(orderModel));

        res.render('account/orderhistory/returns', {
            order: orderModel,
            breadcrumbs: breadcrumbs,
            pageSettings: pageSettings,
            googleAPIEnabled: googleAPIEnabled
        });
        return next();
    }
    res.setStatusCode(404);
    res.render('error/notFound');
    return next();
});

/**
* Returns JSON of the nearest drop-off locations based
* on a shipping address
*/
server.post('GetNearestDropOffLocation', function (req, res, next) {
    var address = JSON.parse(request.httpParameterMap.getRequestBodyAsString()).address;
    var locations = {};
    var firstLocation = {};
    var zenkraft = require('*/cartridge/scripts/zenkraft');

    locations = zenkraft.getDropOffLocations(address);

    if (locations.locations) {
        firstLocation = locations.locations[0];
        if (!firstLocation.country) {
            firstLocation.country = address.countryCode.value;
        }
    } else {
        firstLocation = { error: 'Sorry, no drop-off locations were found near your shipping address.' };
    }

    res.json(firstLocation);
    return next();
});

/**
* Returns JSON of the nearest drop-off locations after the closest
*/
server.post('GetNearestDropOffLocations', function (req, res, next) {
    var address = JSON.parse(request.httpParameterMap.getRequestBodyAsString()).address;
    var locations = {};
    // eslint-disable-next-line no-unused-vars
    var otherLocations = {};
    var zenkraft = require('*/cartridge/scripts/zenkraft');

    locations = zenkraft.getDropOffLocations(address);

    if (locations) {
        otherLocations = delete locations.locations[0];
    }
    for (var i = 0; i < locations.locations.length; i++) {
        if (locations.locations[i] && !locations.locations[i].country) {
            locations.locations[i].country = address.countryCode.value;
        }
    }

    res.json(locations.locations);
    return next();
});

/**
* Returns JSON of shipping methods for a product along with
* any estimated delivery dates from Zenkraft
*/
server.get('GetShippingMethodsForProduct', function (req, res, next) {
    var Resource = require('dw/web/Resource');
    var ShippingMgr = require('dw/order/ShippingMgr');
    var ProductMgr = require('dw/catalog/ProductMgr');
    var ShippingMethodModel = require('*/cartridge/models/shipping/shippingMethod');
    var collections = require('*/cartridge/scripts/util/collections');
    var zenkraft = require('*/cartridge/scripts/zenkraft');
    var zenkraftHelper = require('*/cartridge/scripts/helpers/zenkraftHelper');
    var shippingMethods;
    var shipMethods = [];
    var parameterMap = request.httpParameterMap;
    var productID;
    var prod;
    var methods = {};
    var address = {};

    address.city = parameterMap.city.value;
    address.stateCode = parameterMap.stateCode.value;
    address.postalCode = parameterMap.postalCode.value;
    address.countryCode = parameterMap.countryCode.value;
    address.address1 = parameterMap.address1.value;

    productID = parameterMap.pid.value;
    prod = ProductMgr.getProduct(productID);

    shippingMethods = ShippingMgr.getProductShippingModel(prod).getApplicableShippingMethods();
    var estDate = zenkraft.getEstimatedDeliveryDates(address);

    if (estDate && estDate.rates) {
        collections.forEach(shippingMethods, function (shippingMethod) {
            var modelMethod = new ShippingMethodModel(shippingMethod);
            var filterMethod = zenkraftHelper.filterShippingMethodsForEstimatedDate(modelMethod, estDate.rates);
            if (filterMethod && filterMethod.totalCost) {
                shipMethods.push(filterMethod);
            }
        });
        methods.shipMethods = shipMethods;
    }
    if (shipMethods.length === 0) {
        methods.msg = Resource.msg('pdp.no.shipping.methods', 'product', null);
    }

    res.json(methods);
    return next();
});

/**
 * Query Return Cases
 *
 * @param {String} request.httpParameterMap.query
 * The search can be configured using a simple query language,
 * which provides most common filter and operator functionality.
 *
 * Documentation: https://documentation.b2c.commercecloud.salesforce.com/DOC2/index.jsp?topic=%2Fcom.demandware.dochelp%2FDWAPI%2Fscriptapi%2Fhtml%2Fapi%2Fclass_dw_object_CustomObjectMgr.html&resultof=%22%43%75%73%74%6f%6d%4f%62%6a%65%63%74%4d%67%72%22%20%22%63%75%73%74%6f%6d%6f%62%6a%65%63%74%6d%67%72%22%20&anchor=dw_object_CustomObjectMgr_queryCustomObjects_String_String_String_Object_DetailAnchor
 * Examles: custom.carrier = 'fedex', custom.processed != Null
 *
 * @returns {Array} ressponse.data - array objects to export
 */
server.post('GetReturnCases', zenkraftMiddleware.customOcapiAuth, function (req, res, next) {
    var body = request.httpParameterMap;

    if (body.query.empty) {
        res.json({
            error: true,
            msg: 'You request should include query',
            documentation: 'https://documentation.b2c.commercecloud.salesforce.com/DOC2/index.jsp?topic=%2Fcom.demandware.dochelp%2FDWAPI%2Fscriptapi%2Fhtml%2Fapi%2Fclass_dw_object_CustomObjectMgr.html&resultof=%22%43%75%73%74%6f%6d%4f%62%6a%65%63%74%4d%67%72%22%20%22%63%75%73%74%6f%6d%6f%62%6a%65%63%74%6d%67%72%22%20&anchor=dw_object_CustomObjectMgr_queryCustomObjects_String_String_String_Object_DetailAnchor'
        });
        return next();
    }
    var zenkraftHelper = require('*/cartridge/scripts/helpers/zenkraftHelper');
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var unExportedReturnCases = CustomObjectMgr.queryCustomObjects('zenkraftReturn', body.query, null, null).asList();
    var exportZenkraftObjects = zenkraftHelper.generateZenkraftExportData(unExportedReturnCases);

    res.json({ data: exportZenkraftObjects });
    return next();
});

/**
 * Update processed date of the Return Case.
 *
 * @param {String} request.httpParameterMap.requestBodyAsString
 * Must contains array of 'orderTrackNo'
 */
server.post('SetReturnCases', zenkraftMiddleware.customOcapiAuth, function (req, res, next) {
    var returnHelper = require('*/cartridge/scripts/helpers/zenkraftReturnHelper');
    var objects;
    var response = {};
    try {
        objects = JSON.parse(request.httpParameterMap.getRequestBodyAsString());
    } catch (e) {
        response.msg = 'Wrong request';
        response.error = e;
        res.json(res);
        return next();
    }
    response = returnHelper.handleExternalReturnCases(objects);
    res.json(response);
    return next();
});

server.get('ReturnHistory', function (req, res, next) {
    var Resource = require('dw/web/Resource');
    var URLUtils = require('dw/web/URLUtils');
    var returnHelper = require('*/cartridge/scripts/helpers/zenkraftReturnHelper');
    var returns = returnHelper.getCustomerReturns(req.currentCustomer, req.locale.id);
    res.render('account/return/history', {
        returns: returns,
        breadcrumbs: [
            {
                htmlValue: Resource.msg('global.home', 'common', null),
                url: URLUtils.home().toString()
            },
            {
                htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                url: URLUtils.url('Account-Show').toString()
            }
        ]
    });
    next();
});

server.post('GetDropoffLocation', function (req, res, next) {
    var payload = req.body;
    var shippingMethodAccountID = payload.method;
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();
    var locations = [];
    if (currentBasket) {
        var zenkraft = require('*/cartridge/scripts/zenkraft');

        var address = currentBasket.getDefaultShipment().shippingAddress;
        locations = zenkraft.getDropOffLocations(address, 'id_' + shippingMethodAccountID);
    }
    res.json({ dropOffLocations: locations.locations });
    next();
});

server.get('TestEmail', function (req, res, next) {
    var emailHelpers = require('*/cartridge/scripts/helpers/emailHelpers');
    var objectForEmail = {
        firstName: 'Teodor',
        lastName: 'Ganev',
        url: 'someurl'
    };

    var emailObj = {
        to: 'teodor.ganev@ttsoft.bg',
        subject: 'File attachment',
        from: 'teodor.ganev@ttsoft.bg',
        type: emailHelpers.emailTypes.passwordReset,
        files: ['/Impex/src/att/test.pdf']
    };

    var a = emailHelpers.sendEmail(emailObj, 'account/password/passwordChangedEmail', objectForEmail);
    res.json({
        success: JSON.stringify(a)
    });
    next();
});

module.exports = server.exports();
