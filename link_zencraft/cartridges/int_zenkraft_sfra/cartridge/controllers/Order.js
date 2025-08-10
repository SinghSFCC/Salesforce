/* global request, empty, response, dw */
// Checkout.js

'use strict';

var server = require('server');
var base = module.superModule;
server.extend(base);

server.append('Track', function (req, res, next) {
    var Site = require('dw/system/Site');
    var viewData = res.getViewData();
    var orders = viewData.orders;
    var Zenkraft = require('*/cartridge/scripts/zenkraft');
    viewData.enableZenkraftTrackingOnOrderHistory = Site.getCurrent().getCustomPreferenceValue('enableZenkraftTrackingOnOrderHistory');

    if (viewData.enableZenkraftTrackingOnOrderHistory) {
        // eslint-disable-next-line no-unused-vars
        var newOrders;

        newOrders = orders.map(function (orderModel) {
            var result = orderModel;
            var trackInfo;

            if (orderModel.firstShipmentTrackNo !== 'Pending' && orderModel.firstShipmentCarrier !== 'Pending') {
                trackInfo = Zenkraft.getTrackingInfo(orderModel.firstShipmentTrackNo, orderModel.firstShipmentCarrier.toLowerCase());
            }

            if (!empty(trackInfo)) {
                result.trackStatus = trackInfo.status || 'Pending';
                result.tracking_stage = trackInfo.tracking_stage || 'CREATED';
            } else {
                result.trackStatus = 'Pending';
            }

            return result;
        });
    }
    next();
});

server.append('History', function (req, res, next) {
    var Site = require('dw/system/Site');
    var viewData = res.getViewData();
    var orders = viewData.orders;
    var Zenkraft = require('*/cartridge/scripts/zenkraft');
    viewData.enableZenkraftTrackingOnOrderHistory = Site.getCurrent().getCustomPreferenceValue('enableZenkraftTrackingOnOrderHistory');

    if (viewData.enableZenkraftTrackingOnOrderHistory) {
        // eslint-disable-next-line no-unused-vars
        var newOrders;

        newOrders = orders.map(function (orderModel) {
            var result = orderModel;
            var trackInfo;

            if (orderModel.firstShipmentTrackNo !== 'Pending' && orderModel.firstShipmentCarrier !== 'Pending') {
                trackInfo = Zenkraft.getTrackingInfo(orderModel.firstShipmentTrackNo, orderModel.firstShipmentCarrier.toLowerCase());
            }

            if (!empty(trackInfo)) {
                result.trackStatus = trackInfo.status || 'Pending';
                result.tracking_stage = trackInfo.tracking_stage || 'CREATED';
            } else {
                result.trackStatus = 'Pending';
            }

            return result;
        });
    }

    next();
});

server.append('Details', function (req, res, next) {
    var Site = require('dw/system/Site');
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(req.querystring.orderID);
    var shippingStatus = order.getShippingStatus().getValue();
    var viewData = res.getViewData();
    var Zenkraft = require('*/cartridge/scripts/zenkraft');
    viewData.isOrderShipped = shippingStatus === 2;

    viewData.enableZenkraftTrackingOnOrderHistory = Site.getCurrent().getCustomPreferenceValue('enableZenkraftTrackingOnOrderHistory');

    if (viewData.enableZenkraftTrackingOnOrderHistory) {
        var orderModel = viewData.order;
        var trackInfo;

        if (orderModel && orderModel.firstShipmentTrackNo !== 'Pending' && orderModel.firstShipmentCarrier !== 'Pending') {
            trackInfo = Zenkraft.getTrackingInfo(orderModel.firstShipmentTrackNo, orderModel.firstShipmentCarrier.toLowerCase());
        }
        if (!empty(trackInfo)) {
            orderModel.trackStatus = trackInfo.status || 'Pending';
            orderModel.tracking_stage = trackInfo.tracking_stage || 'CREATED';
        } else {
            orderModel.trackStatus = 'Pending';
        }
    }

    res.setViewData(viewData);
    next();
});

server.append('Confirm', function (req, res, next) {
    var viewData = res.getViewData();
    var orderModel = viewData.order;
    var shippings = orderModel.shipping;
    var sessionRates;
    try {
        sessionRates = JSON.parse(req.session.privacyCache.zenkraftCosts);
    } catch (e) {
        sessionRates = {};
    }
    for (var i = 0; i < shippings.length; i++) {
        if (shippings[i].selectedShippingMethod.zenkraftID && sessionRates[shippings[i].selectedShippingMethod.zenkraftID]) {
            shippings[i].selectedShippingMethod.shippingCost = sessionRates[shippings[i].selectedShippingMethod.zenkraftID];
        }
    }
    viewData.order.shipping = shippings;
    res.setViewData(viewData);
    next();
});

module.exports = server.exports();
