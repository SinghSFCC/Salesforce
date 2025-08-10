/* global request, empty, response, dw */

'use strict';

var server = require('server');
var account = module.superModule;
server.extend(account);

server.append('Show', function (req, res, next) {
    var Site = require('dw/system/Site');
    var viewData = res.getViewData();
    var order = viewData.account.orderHistory;
    var Zenkraft = require('*/cartridge/scripts/zenkraft');
    var returnHelper = require('*/cartridge/scripts/helpers/zenkraftReturnHelper');
    viewData.enableZenkraftTrackingOnOrderHistory = Site.getCurrent().getCustomPreferenceValue('enableZenkraftTrackingOnOrderHistory');

    if (viewData.enableZenkraftTrackingOnOrderHistory) {
        var trackInfo;

        if (order && order.firstShipmentTrackNo !== 'Pending' && order.firstShipmentCarrier !== 'Pending') {
            trackInfo = Zenkraft.getTrackingInfo(order.firstShipmentTrackNo, order.firstShipmentCarrier.toLowerCase());
            if (!empty(trackInfo)) {
                order.trackStatus = trackInfo.status || 'Pending';
                order.tracking_stage = trackInfo.tracking_stage || 'CREATED';
            } else {
                order.trackStatus = 'Pending';
            }
        }
    }
    var returns = returnHelper.getCustomerReturns(req.currentCustomer, req.locale.id);
    var lastReturn = false;
    if (returns) {
        lastReturn = [returns[0]];
    }
    viewData.account.returns = lastReturn;
    res.setViewData(viewData);

    next();
});

module.exports = server.exports();
