'use strict';

const StringUtils = require('dw/util/StringUtils');
const Calendar = require('dw/util/Calendar');
const Order = require('dw/order/Order');
const OrderMgr = require('dw/order/OrderMgr');
const CustomObjectMgr = require('dw/object/CustomObjectMgr');
const PaymentMgr = require('dw/order/PaymentMgr');

const {
    createErrorLog
} = require('*/cartridge/scripts/paypal/bmPaypalUtils');

const paypalApi = require('*/cartridge/scripts/paypal/bmPaypalApi');

const allowedProcessorsIds = 'PAYPAL';

/**
 * Returns paypal payment method ID
 * @returns {string} active paypal payment method id
 */
function getPaypalPaymentMethodId() {
    var activePaymentMethods = PaymentMgr.getActivePaymentMethods();
    var paypalPaymentMethodID;

    Array.some(activePaymentMethods, function (paymentMethod) {
        if (paymentMethod.paymentProcessor.ID === allowedProcessorsIds) {
            paypalPaymentMethodID = paymentMethod.ID;
            return true;
        }
        return false;
    });
    return paypalPaymentMethodID;
}

/**
 * Return PayPal order payment instrument
 *
 * @param {dw.order.LineItemCtnr} basket - Basket
 * @returns {dw.order.OrderPaymentInstrument} payment instrument with id PAYPAL
 */
function getPaypalPaymentInstrument(basket) {
    var paymentInstruments = basket.getPaymentInstruments(getPaypalPaymentMethodId());
    return !empty(paymentInstruments) && paymentInstruments[0];
}

/**
 * Return Formated Date
 *
 * @param {string} isoString - iso time String
 * @returns {dw.util.StringUtils} formated creation date
 */
function formatedDate(isoString) {
    var formatedString = isoString.replace('Z', '.000Z');
    return StringUtils.formatCalendar(new Calendar(new Date(formatedString)), 'M/dd/yy h:mm a');
}

/**
 * Returns transaction payment status
 * @param  {Object} transactionResponse transaction details
 * @returns {string} payment status
 */
function getPaymentStatus(transactionResponse) {
    var payments = transactionResponse.purchase_units[0].payments;
    var paymentStatus = payments.captures ? payments.captures[0].status : payments.authorizations[0].status;
    if (payments.authorizations && payments.authorizations[0].status === 'CAPTURED' && !payments.refunds) {
        paymentStatus = payments.authorizations[0].status;
    }

    return paymentStatus;
}

/**
 * Update transaction history of a PayPalNewTransactions Custom Object

 * @param {string} orderNo - Order number
 * @param {string} transactionId - Transaction ID from new transaction
 */
function updateCustomOrderData(orderNo) {
    var order = CustomObjectMgr.getCustomObject('PayPalNewTransactions', orderNo);
    var transactionDetailsResult = paypalApi.getOrderDetails(order.custom.transactionId);

    if (transactionDetailsResult.err) {
        throw new Error('transactionDetailsResult.error');
    }

    order.custom.paymentStatus = getPaymentStatus(transactionDetailsResult);
}

/**
 * Update paypalPaymentStatus of a Order

 * @param {string} orderNo - Order number
 */
function updateOrderData(orderNo) {
    var order = OrderMgr.getOrder(orderNo);
    var paymentInstrument = getPaypalPaymentInstrument(order);
    var paymentInstrumentCustomEl = paymentInstrument.getCustom();
    var transactionDetailsResult = paypalApi.getOrderDetails(paymentInstrumentCustomEl.paypalOrderID);

    if (transactionDetailsResult.err) {
        throw new Error('transactionDetailsResult.error');
    }

    var paymentStatus = getPaymentStatus(transactionDetailsResult);
    paymentInstrument.custom.paypalPaymentStatus = paymentStatus;
    if (paymentStatus === 'COMPLETED' || paymentStatus === 'REFUNDED') {
        order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
    }
}

/**
 * Update transactionID and transactions history for PayPal payment instrument
 *
 * @param {string} orderNo - order number
 * @param {boolean} isCustomOrder -  Indicate if current order is Custom Object
 * @param {string} transactionID - PayPal transaction ID
 * @param {string} methodName - Used API method
 * @returns {boolean} true in case of success and false when error
 */
function updateOrderTransaction(orderNo, isCustomOrder) {
    try {
        if (isCustomOrder) {
            updateCustomOrderData(orderNo);
        } else {
            updateOrderData(orderNo);
        }
    } catch (error) {
        createErrorLog(error);
        return false;
    }

    return true;
}

/**
 * Returns transaction end time, result
 * (min) transaction lifetime (by default 72h or 4320min)
 * @param {string} creationDate  - date
 * @returns {boolean}  true or false
 */
function isExpiredHonorPeriod(creationDate) {
    var min = 4320;
    // var min = 300; // For testing after 3 mins reauthorize button appears.
    return Date.now() >= new Date(creationDate.replace('Z', '.000Z')).getTime() + min * 60000;
}

/**
 * Return PayPal order payment instrument
 *
 * @param {Object} resp - responce from Rest
 * @param {Object} order - dw.order.Order
 * @param {boolean} isCustomOrder - isCustomOrder
 * @returns {Object} reorganized data
 */
function prepareOrderTransactionData(resp, order, isCustomOrder) {
    var transaction = resp;
    var shippingAmount;
    var taxAmount;
    var transactionId = request.httpParameterMap.transactionId.stringValue;
    var refund;
    var capture;
    var payments = resp.purchase_units[0].payments;

    if (resp.purchase_units[0].amount.breakdown) {
        shippingAmount = resp.purchase_units[0].amount.breakdown.shipping && resp.purchase_units[0].amount.breakdown.shipping.value;
        taxAmount = resp.purchase_units[0].amount.breakdown.tax_total && resp.purchase_units[0].amount.breakdown.tax_total.value;
    } else {
        shippingAmount = !isCustomOrder ? order.shippingTotalPrice.value : 0;
        taxAmount = !isCustomOrder ? order.totalTax.value : 0;
    }
    var email = resp.payer.email_address || 'Unknown';

    var orderTransactionsIds;
    if (isCustomOrder) {
        // eslint-disable-next-line no-param-reassign
        order = order.getCustom();
        orderTransactionsIds = order.transactionsHistory;
    } else {
        var paymentInstrument = getPaypalPaymentInstrument(order);
        orderTransactionsIds = paymentInstrument.getPaymentTransaction().custom.transactionsHistory;
    }
    if (resp.intent === 'CAPTURE' && resp.status === 'COMPLETED' && !payments.authorizations) {
        transaction.paymentstatus = payments.captures[0].status;
    } else {
        transaction.paymentstatus = payments.authorizations[0].status;
    }

    transaction.isCaptureButtonAllowed = true;

    if (!empty(payments.refunds)) {
        refund = payments.refunds;
        if (!empty(transactionId)) {
            refund = Array.filter(refund, function (element) {
                var url = element.links[1].href;
                var captureID = url.substring(url.lastIndexOf('/') + 1);
                return captureID === transactionId;
            });
            transaction.isRefundButtonAllowed = false;
        }

        transaction.refundedAmount = Array.reduce(refund, function (prev, curr) {
            return Number(parseFloat(prev) + parseFloat(curr.amount.value)).toFixed(2);
        }, 0);
        transaction.restRefountAmount = Number(resp.purchase_units[0].amount.value - transaction.refundedAmount).toFixed(2);
    }

    if (!empty(payments.captures)) {
        if (!empty(transactionId)) {
            capture = Array.filter(payments.captures, function (element) {
                return element.id === transactionId;
            });

            transaction.capturedAmount = capture[0].amount.value;
            transaction.paymentstatus = capture[0].status;
            transaction.captureID = capture[0].id;
            transaction.isCaptureButtonAllowed = false;
        } else {
            transaction.capturedAmount = Array.reduce(payments.captures, function (prev, curr) {
                return Number(parseFloat(prev) + parseFloat(curr.amount.value)).toFixed(2);
            }, 0);
            transaction.restCaptureAmount = Number(resp.purchase_units[0].amount.value - transaction.capturedAmount).toFixed(2);
        }
        transaction.refundedAmount = !empty(transaction.refundedAmount) ?
            transaction.refundedAmount :
            0.00;
        transaction.restRefountAmount = Number(transaction.capturedAmount - transaction.refundedAmount).toFixed(2);
    }

    if (!empty(payments.captures) && !empty(transactionId)) {
        transaction.transactionid = transactionId;
    } else if (!empty(payments.authorizations)) {
        transaction.transactionid = payments.authorizations[0].id;
    } else {
        transaction.transactionid = payments.captures[0].id;
    }

    transaction.orderNo = order.orderNo;
    transaction.isCaptured = transaction.capturedAmount === resp.purchase_units[0].amount.value;
    transaction.firstname = resp.payer.name.given_name;
    transaction.lastname = resp.payer.name.surname;
    transaction.amt = resp.purchase_units[0].amount.value;
    transaction.currencycode = resp.purchase_units[0].amount.currency_code;
    transaction.invnum = resp.purchase_units[0].invoice_id;
    transaction.orderTimeCreated = resp.create_time ? formatedDate(resp.create_time) : '';
    transaction.orderTimeUpdated = resp.update_time ? formatedDate(resp.update_time) : '';
    transaction.captures = !empty(payments.captures) ? payments.captures : [];

    var timeCreateUpdate = !empty(resp.create_time) ? resp.create_time : resp.update_time;

    return {
        transaction: transaction,
        shippingAmount: shippingAmount,
        taxAmount: taxAmount,
        email: email,
        order: order,
        orderTransactionsIds: orderTransactionsIds,
        isCustomOrder: isCustomOrder,
        transactionID: isCustomOrder ?
            transaction.id : transaction.transactionid,
        authorizationId: !empty(payments.authorizations) && payments.authorizations[0].id,
        isExpiredHonorPeriod: isExpiredHonorPeriod(timeCreateUpdate)
    };
}

module.exports = {
    updateOrderTransaction: updateOrderTransaction,
    getPaymentStatus: getPaymentStatus,
    getPaypalPaymentInstrument: getPaypalPaymentInstrument,
    prepareOrderTransactionData: prepareOrderTransactionData
};
