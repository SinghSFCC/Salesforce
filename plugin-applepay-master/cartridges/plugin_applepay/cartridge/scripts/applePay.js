var Status = require('dw/system/Status');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var Logger = require('dw/system/Logger');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');

exports.authorizeOrderPayment = function (order, event) {
    try {
        //order.addNote('Payment Authorization Apple Pay');
        var paymentInstruments = order.getPaymentInstruments(
            PaymentInstrument.METHOD_DW_APPLE_PAY).toArray();
        if (!paymentInstruments.length) {
            Logger.error('Unable to find Apple Pay payment instrument for order.');
            return null;
        }
        var billingAddress = order.getBillingAddress();
        var shippingAddress = order.getDefaultShipment().getShippingAddress();

        var paymentInstrument = paymentInstruments[0];
        var paymentMethodID = paymentInstrument.getPaymentMethod();
        var paymentTransaction = paymentInstrument.getPaymentTransaction();
        var processor = PaymentMgr.getPaymentMethod(paymentMethodID).getPaymentProcessor();


        Transaction.begin();
        // Transaction requirement updates
        paymentTransaction.setPaymentProcessor(processor);
        paymentTransaction.setTransactionID(event.payment.token.transactionIdentifier);
        paymentTransaction.custom.apple_eventData = JSON.stringify(event.payment.token);
        billingAddress.setCountryCode(event.payment.billingContact.countryCode.toUpperCase());
        shippingAddress.setCountryCode(event.payment.shippingContact.countryCode.toUpperCase());

        Transaction.commit();
        return new Status(Status.OK);
    } catch (err) {
        var exc = err;
        Logger.error('Error processing Apple Pay.' + exc.message);
    }
};

exports.getRequest = function () {
    session.custom.applepaysession = 'yes';   // eslint-disable-line
};
