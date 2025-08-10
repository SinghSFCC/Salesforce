'use strict';

const server = require('server');

const Transaction = require('dw/system/Transaction');
const HookMgr = require('dw/system/HookMgr');
const PaymentMgr = require('dw/order/PaymentMgr');
const Money = require('dw/value/Money');
const BasketMgr = require('dw/order/BasketMgr');
const OrderMgr = require('dw/order/OrderMgr');
const Order = require('dw/order/Order');
const Status = require('dw/system/Status');
const URLUtils = require('dw/web/URLUtils');

const {
    isPurchaseUnitChanged,
    getPurchaseUnit,
    getBARestData,
    hasOnlyGiftCertificates
} = require('*/cartridge/scripts/paypal/helpers/paypalHelper');

const {
    validateExpiredTransaction,
    parseBody,
    validateProcessor,
    removeNonPaypalPayment,
    validateHandleHook,
    validateGiftCertificateAmount
} = require('*/cartridge/scripts/paypal/middleware');

const {
    updateOrderDetails,
    getBillingAgreementToken,
    createBillingAgreement,
    getOrderDetails,
    cancelBillingAgreement
} = require('*/cartridge/scripts/paypal/paypalApi');

const {
    encodeString,
    createErrorMsg,
    createErrorLog
} = require('*/cartridge/scripts/paypal/paypalUtils');

const {
    createPaymentInstrument,
    getPaypalPaymentInstrument,
    removePaypalPaymentInstrument
} = require('*/cartridge/scripts/paypal/helpers/paymentInstrumentHelper');

const {
    updateOrderBillingAddress,
    updateOrderShippingAddress,
    updateBAShippingAddress
} = require('*/cartridge/scripts/paypal/helpers/addressHelper');

const {
    paypalPaymentMethodId
} = require('*/cartridge/config/paypalPreferences');

const COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

const BillingAgreementModel = require('*/cartridge/models/billingAgreement');


server.get('GetPurchaseUnit', server.middleware.https, function (req, res, next) {
    var {
        currentBasket
    } = BasketMgr;
    var cartFlow = req.querystring.isCartFlow === 'true';
    var purchase_units = [getPurchaseUnit(currentBasket, cartFlow)];
    session.privacy.orderDataHash = encodeString(purchase_units[0]);
    res.json({
        purchase_units: purchase_units
    });
    next();
});

server.use('UpdateOrderDetails', server.middleware.https, validateExpiredTransaction, function (req, res, next) {
    var {
        currentBasket
    } = BasketMgr;
    var isCartFlow = req.querystring.isCartFlow === 'true';
    var purchase_unit = getPurchaseUnit(currentBasket, isCartFlow);
    var isUpdateRequired = isPurchaseUnitChanged(purchase_unit);
    var paymentInstrument = getPaypalPaymentInstrument(currentBasket);

    if (paymentInstrument.custom.PP_API_ActiveBillingAgreement) {
        if (paymentInstrument.paymentTransaction.amount.value.toString() !== purchase_unit.amount.value) {
            var newAmount = new Money(purchase_unit.amount.value, purchase_unit.amount.currency_code);
            Transaction.wrap(function () {
                paymentInstrument.paymentTransaction.setAmount(newAmount);
            });
        }
        res.json({});
        return next();
    } else if (isUpdateRequired) {
        if (purchase_unit.amount.value === '0') {
            res.setStatusCode(500);
            res.json({
                errorMsg: createErrorMsg('zeroamount')
            });

            return next();
        }
        var {
            err
        } = updateOrderDetails(paymentInstrument, purchase_unit);
        if (err) {
            res.setStatusCode(500);
            res.json({
                errorMsg: err
            });
            return next();
        }
        session.privacy.orderDataHash = encodeString(purchase_unit);
        res.json({});
        return next();
    }
});

server.post('ReturnFromCart',
    server.middleware.https,
    removeNonPaypalPayment,
    validateProcessor,
    validateHandleHook,
    validateGiftCertificateAmount,
    function (req, res, next) {
        var {
            currentBasket
        } = BasketMgr;
        var paymentFormResult;
        var paymentForm = server.forms.getForm('billing');
        var processorId = PaymentMgr.getPaymentMethod(paypalPaymentMethodId).getPaymentProcessor().ID.toLowerCase();

        if (HookMgr.hasHook('app.payment.form.processor.' + processorId)) {
            paymentFormResult = HookMgr.callHook('app.payment.form.processor.' + processorId,
                'processForm',
                req,
                paymentForm, {}
            );
        } else {
            paymentFormResult = HookMgr.callHook('app.payment.form.processor.default_form_processor', 'processForm');
        }

        if (!paymentFormResult || paymentFormResult.error) {
            res.setStatusCode(500);
            res.print(createErrorMsg());
            return next();
        }

        var processorHandle = HookMgr.callHook('app.payment.processor.' + processorId,
            'Handle',
            currentBasket,
            paymentFormResult.viewData.paymentInformation
        );

        if (!processorHandle || !processorHandle.success) {
            res.setStatusCode(500);
            res.print(createErrorMsg());
            return next();
        }

        var {
            shippingAddress
        } = processorHandle;
        if (processorHandle.paymentInstrument.custom.paypalOrderID) {
            if (!hasOnlyGiftCertificates(currentBasket)) {
                updateOrderShippingAddress(currentBasket, shippingAddress);
            }
        } else {
            updateBAShippingAddress(currentBasket, shippingAddress);
        }

        res.json();
        return next();
    });

server.get('GetBillingAgreementToken', server.middleware.https, function (req, res, next) {
    var isCartFlow = req.querystring.isCartFlow === 'true';
    var {
        billingAgreementToken,
        err
    } = getBillingAgreementToken(getBARestData(isCartFlow));
    if (err) {
        res.setStatusCode(500);
        res.print(err);
        return next();
    }

    res.json({
        token: billingAgreementToken
    });
    next();
});

server.post('CreateBillingAgreement', server.middleware.https, parseBody,
    function (_, res, next) {
        var response = createBillingAgreement(res.parsedBody.billingToken);
        if (response.err) {
            res.setStatusCode(500);
            res.print(response.err);
            return next();
        }

        res.json(response);
        next();
    });

server.use('RemoveBillingAgreement', server.middleware.https, function (req, res, next) {
    var billingAgreementModel = new BillingAgreementModel();

    var baEmail = req.querystring.billingAgreementEmail;
    var billingAgreement = billingAgreementModel.getBillingAgreementByEmail(baEmail);
    billingAgreementModel.removeBillingAgreement(billingAgreement);
    cancelBillingAgreement(billingAgreement.baID);

    res.json({});
    return next();
});

server.post('SaveBillingAgreement', server.middleware.https, parseBody,
    function (_, res, next) {
        var billingAgreementModel = new BillingAgreementModel();
        var baData = res.parsedBody;

        if (baData) {
            var savedBA = billingAgreementModel.getBillingAgreements();
            var isAccountAlreadyExist = billingAgreementModel.isAccountAlreadyExist(baData.email);
            if (!isAccountAlreadyExist) {
                if (empty(savedBA)) {
                    baData.default = true;
                }
                baData.saveToProfile = true;
                billingAgreementModel.saveBillingAgreement(baData);
            }
        }

        res.json({});
        return next();
    });

server.get('GetOrderDetails', server.middleware.https, function (req, res, next) {
    var orderId = req.querystring.orderId;
    var response = getOrderDetails({
        custom: {
            paypalOrderID: orderId
        }
    });
    if (response.err) {
        res.setStatusCode(500);
        res.print(response.err);
        return next();
    }

    res.json(response);
    next();
});

server.post('FinishLpmOrder', server.middleware.https, parseBody, function (_, res, next) {
    var {
        details
    } = res.parsedBody;
    var {
        currentBasket
    } = BasketMgr;
    var paymentInstrument = createPaymentInstrument(currentBasket, 'PayPal');

    Transaction.wrap(function () {
        paymentInstrument.custom.paypalOrderID = details.id;
        paymentInstrument.custom.currentPaypalEmail = details.payer.email_address;
    });

    // Creates a new order.
    var order = COHelpers.createOrder(currentBasket);
    if (!order) {
        res.setStatusCode(500);
        res.print(createErrorMsg());
        return next();
    }

    // Update billing address.
    updateOrderBillingAddress(currentBasket, details.payer);

    // Places the order.
    try {
        Transaction.begin();
        var placeOrderStatus = OrderMgr.placeOrder(order);
        if (placeOrderStatus === Status.ERROR) throw new Error();
        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
        order.setExportStatus(Order.EXPORT_STATUS_READY);
        Transaction.commit();
    } catch (e) {
        Transaction.wrap(function () {
            OrderMgr.failOrder(order, true);
        });
        createErrorLog(e);
        res.setStatusCode(500);
        res.print(e.message);
        return next();
    }

    // Clean up basket.
    removePaypalPaymentInstrument(currentBasket);

    res.json({
        redirectUrl: URLUtils.https('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken).toString()
    });
    next();
});

module.exports = server.exports();
