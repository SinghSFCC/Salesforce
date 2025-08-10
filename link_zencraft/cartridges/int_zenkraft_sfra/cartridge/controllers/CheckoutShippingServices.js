// CheckoutShippingServices.js

'use strict';

var server = require('server');
var shippingservice = module.superModule;
server.extend(shippingservice);

// Extend UpdateShippingMethodsList route to include Estimated Delivery Dates in viewData
server.append('SelectShippingMethod', function (req, res, next) {
    var Site = require('dw/system/Site');

    if (Site.getCurrent().getCustomPreferenceValue('enableZenkraftEstimatedDeliveryDates')) {
        var zenkraftHelper = require('*/cartridge/scripts/helpers/zenkraftHelper'); // eslint-disable-line vars-on-top, max-len
        this.on('route:BeforeComplete', function getShipmentsData(req, res) { // eslint-disable-line no-shadow, max-len
            var thisViewData = res.getViewData(); // eslint-disable-line vars-on-top
            res.setViewData(zenkraftHelper.handleShippingMethods(thisViewData));
        });
    }
    return next();
});

// Extend UpdateShippingMethodsList route to include Estimated Delivery Dates in viewData
server.append('UpdateShippingMethodsList', function (req, res, next) {
    var Site = require('dw/system/Site');

    if (Site.getCurrent().getCustomPreferenceValue('enableZenkraftEstimatedDeliveryDates')) {
        var zenkraftHelper = require('*/cartridge/scripts/helpers/zenkraftHelper'); // eslint-disable-line vars-on-top, max-len
        var thisViewData = res.getViewData(); // eslint-disable-line vars-on-top
        res.setViewData(zenkraftHelper.handleShippingMethods(thisViewData));
    }
    next();
});

// Extend UpdateShippingMethodsList route to include Estimated Delivery Dates in viewData
server.append('SubmitShipping', function (req, res, next) {
    var Site = require('dw/system/Site');
    // var httpParameterMap = request.getHttpParameterMap();
    var httpParameterMap = req.form;
    if (httpParameterMap.drop_off_location_data) {
        req.session.privacyCache.set('drop_off_location_data', httpParameterMap.drop_off_location_data);
    }
    if (httpParameterMap.requested_delivery_date) {
        req.session.privacyCache.set('requested_delivery_date', httpParameterMap.requested_delivery_date);
    }
    if (httpParameterMap.delivery_instruction) {
        req.session.privacyCache.set('delivery_instruction', httpParameterMap.delivery_instruction.value);
    }
    if (Site.getCurrent().getCustomPreferenceValue('enableZenkraftEstimatedDeliveryDates')) {
        var zenkraftHelper = require('*/cartridge/scripts/helpers/zenkraftHelper'); // eslint-disable-line vars-on-top, max-len

        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var thisViewData = res.getViewData(); // eslint-disable-line vars-on-top
            res.setViewData(zenkraftHelper.handleShippingMethods(thisViewData));
        });
    }
    return next();
});

server.prepend('SubmitShipping', function (req, res, next) {
    var httpParameterMap = req.form;
    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();
    if (basket) {
        var shippingMethod = basket.defaultShipment.shippingMethod;
        if (shippingMethod && shippingMethod.custom.dropOffMethod && httpParameterMap.drop_off_location_data == null) {
            res.json({
                error: true,
                fieldErrors: [],
                serverErrors: ['Please select a pick up location']
            });
            var route = server.getRoute('SubmitShipping');
            return route.done(req, res);
        }
    }
    return next();
});

module.exports = server.exports();
