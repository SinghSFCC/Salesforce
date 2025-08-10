'use strict';

var server = require('server');
var shippingservice = module.superModule;
server.extend(shippingservice);

server.append('PlaceOrder', function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var ShippingMgr = require('dw/order/ShippingMgr');
    var Transaction = require('dw/system/Transaction');
    var viewData = res.getViewData();
    var shippingMethods = ShippingMgr.getAllShippingMethods().toArray();
    var order = OrderMgr.getOrder(viewData.orderID);
    var orderShipment = order.getShipments()[0];
    var sessionCustom = req.session.raw.getPrivacy();
    shippingMethods.forEach(function (shippingMethod) {
        if (orderShipment.shippingMethodID === shippingMethod.ID && shippingMethod.custom.dropOffMethod && sessionCustom.drop_off_location_data) {
            var locationObject = JSON.parse(sessionCustom.drop_off_location_data);
            Transaction.wrap(function () {
                if (locationObject.location_code && locationObject.location_code.length > 0) {
                    orderShipment.custom.zenkraftDOPULocationCode = locationObject.location_code;
                }
                if (locationObject.location_name && locationObject.location_name.length > 0) {
                    orderShipment.custom.zenkraftDOPULocationName = locationObject.location_name;
                }
            });
        }
        if (orderShipment.shippingMethodID === shippingMethod.ID && shippingMethod.custom.futureDateDelivery && shippingMethod.custom.futureDateDelivery > 0 && sessionCustom.requested_delivery_date) {
            var dateObject = JSON.parse(sessionCustom.requested_delivery_date);
            if (dateObject.methodID === orderShipment.shippingMethodID) {
                Transaction.wrap(function () {
                    orderShipment.custom.zenkraftRequestedDeliveryDate = new Date(parseInt(dateObject.date, 10));
                });
            }
        }
        if (sessionCustom.delivery_instruction && sessionCustom.delivery_instruction.length > 0) {
            Transaction.wrap(function () {
                orderShipment.custom.zenkraftDeliveryInformation = sessionCustom.delivery_instruction;
            });
        }
    });
    return next();
});

module.exports = server.exports();
