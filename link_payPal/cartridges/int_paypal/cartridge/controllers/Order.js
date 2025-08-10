'use strict';

const page = module.superModule;
const server = require('server');

const OrderMgr = require('dw/order/OrderMgr');
const Money = require('dw/value/Money');
const StringUtils = require('dw/util/StringUtils');

const {
    validatePaypalPaymentInstrument
} = require('*/cartridge/scripts/paypal/middleware');

const {
    getPaypalPaymentInstrument
} = require('*/cartridge/scripts/paypal/helpers/paymentInstrumentHelper');

server.extend(page);

server.append('Confirm', validatePaypalPaymentInstrument, function (req, res, next) {
    var formatMoney = StringUtils.formatMoney;
    var order = OrderMgr.getOrder(req.querystring.ID);
    var paypalPaymentInstrument = getPaypalPaymentInstrument(order);
    var currency = order.getCurrencyCode();
    var amount = paypalPaymentInstrument.paymentTransaction.amount.value;
    var paypalEmail = paypalPaymentInstrument.custom.currentPaypalEmail;
    var paymentAmount = formatMoney(new Money(amount, currency));
    res.setViewData({
        paypal: {
            paypalEmail: paypalEmail,
            paymentAmount: paymentAmount
        }
    });
    next();
});

server.append('Details', function (req, res, next) {
    var order = OrderMgr.getOrder(req.querystring.orderID);
    res.setViewData({
        paypal: {
            summaryEmail: null,
            currency: order.getCurrencyCode()
        }
    });
    next();
});

module.exports = server.exports();
