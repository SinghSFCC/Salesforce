/* global dw request response empty */

const paymentInstrumentHelper = require('*/cartridge/scripts/paypal/bmPaymentInstrumentHelper');
const {
    createErrorLog
} = require('*/cartridge/scripts/paypal/bmPaypalUtils');
const paypalApi = require('*/cartridge/scripts/paypal/bmPaypalApi');

const {
    createCustomTransactionInvNum,
    getCountriesLabelsAndCodes,
    createOrderPagingModelParameters
} = require('*/cartridge/scripts/paypal/bmPaypalHelper');

const ISML = require('dw/template/ISML');
const Transaction = require('dw/system/Transaction');
const CSRFProtection = require('dw/web/CSRFProtection');
const SystemObjectMgr = require('dw/object/SystemObjectMgr');
const CustomObjectMgr = require('dw/object/CustomObjectMgr');
const ArrayList = require('dw/util/ArrayList');
const Calendar = require('dw/util/Calendar');
const StringUtils = require('dw/util/StringUtils');
const Money = require('dw/value/Money');
const OrderMgr = require('dw/order/OrderMgr');
const PagingModel = require('dw/web/PagingModel');
const Order = require('dw/order/Order');
const PropertyComparator = require('dw/util/PropertyComparator');
const currentSite = require('dw/system/Site').getCurrent();

/**
 * Get PayPalNewTransactions Custom Object with given order number
 *
 * @param {string} orderNo - Order number
 * @returns {Object} (transactionIdFromOrder: String - Transaction ID from order, order: dw.object.CustomObject - Custom Object that matched with order number)
 */
function getCustomOrderInfo(orderNo) {
    var order;
    var transactionId;
    try {
        order = CustomObjectMgr.getCustomObject('PayPalNewTransactions', orderNo);
        transactionId = order.custom.transactionId;
    } catch (error) {
        createErrorLog(error);
        return false;
    }
    return {
        transactionIdFromOrder: transactionId,
        order: order
    };
}

/**
 * Combine orders and PayPalNewTransactions Custom Objects into one array for pagination
 *
 * @param {string} orderNo - Order number used in "Search by order number" feature
 * @returns {dw.util.ArrayList} Combined array with all orders
 */
function getOrders(orderNo) {
    var systemOrders = SystemObjectMgr.querySystemObjects('Order', 'orderNo LIKE {0} AND custom.paypalPaymentMethod = \'express\' AND status != {1}', 'creationDate desc', orderNo, Order.ORDER_STATUS_FAILED);
    var paypalOrders = CustomObjectMgr.queryCustomObjects('PayPalNewTransactions', 'custom.orderNo LIKE {0}', 'custom.orderDate desc', orderNo);
    var orders = new ArrayList(); // eslint-disable-line no-shadow
    var order;
    var paymentInstrument;
    var orderDate;
    var orderTotal;
    var obj;

    var orderIndex = 0;
    var maxSystemOrdersCount = 9000;
    var maxPaypalOrdersCount = 9000;
    var paypalOrdersCount = paypalOrders.getCount();
    if (paypalOrdersCount < maxPaypalOrdersCount) {
        maxSystemOrdersCount = 18000 - paypalOrdersCount;
    }

    while (systemOrders.hasNext()) {
        orderIndex++;
        if (orderIndex > maxSystemOrdersCount) {
            break;
        }
        order = systemOrders.next();
        paymentInstrument = paymentInstrumentHelper.getPaypalPaymentInstrument(order);
        if (paymentInstrument === null) {
            continue; // eslint-disable-line no-continue
        }
        orderDate = new Date(order.creationDate);
        obj = {
            orderNo: order.orderNo,
            orderDate: StringUtils.formatCalendar(new Calendar(orderDate), 'M/dd/yy h:mm a'),
            createdBy: order.createdBy,
            isRegestered: order.customer.registered,
            customer: order.customerName,
            email: order.customerEmail,
            orderTotal: order.totalGrossPrice,
            currencyCode: order.getCurrencyCode(),
            paypalAmount: paymentInstrument.getPaymentTransaction().getAmount(),
            status: paymentInstrument.custom.paypalPaymentStatus,
            dateCompare: orderDate.getTime(),
            isCustom: false
        };
        orders.push(obj);
    }

    orderIndex = 0;
    while (paypalOrders.hasNext()) {
        orderIndex++;
        if (orderIndex > maxSystemOrdersCount) {
            break;
        }
        order = paypalOrders.next().custom;
        orderDate = new Date(order.orderDate.replace('Z', '.000Z'));
        orderTotal = new Money(order.orderTotal, order.currencyCode);
        obj = {
            orderNo: order.orderNo,
            orderDate: StringUtils.formatCalendar(new Calendar(orderDate), 'M/dd/yy h:mm a'),
            createdBy: 'Merchant',
            isRegestered: 'Unknown',
            customer: order.firstName + ' ' + order.lastName,
            email: order.email,
            orderTotal: orderTotal,
            currencyCode: order.currencyCode,
            paypalAmount: orderTotal,
            status: order.paymentStatus,
            isCustom: true,
            dateCompare: orderDate.getTime()
        };
        orders.push(obj);
    }

    orders.sort(new PropertyComparator('dateCompare', false));

    return orders;
}

/**
 * Render Template
 * @param {string} templateName - Template Name
 * @param {Object} data - pdict data
 */
function render(templateName, data) {
    if (typeof data !== 'object') {
        data = {}; // eslint-disable-line no-param-reassign
    }
    try {
        ISML.renderTemplate(templateName, data);
    } catch (e) {
        throw new Error(e.javaMessage + '\n\r' + e.stack, e.fileName, e.lineNumber);
    }
}

/**
 * Render JSON from Objects
 * @param {Object} responseResult - Response Result
 * @param {Object} responseData - Response Data
 */
function renderJson(responseResult, responseData) {
    var data = {};
    if (!empty(responseData)) {
        data.transactionid = !empty(responseData.transactionid) ? responseData.transactionid : null;
        data.l_longmessage0 = !empty(responseData.l_longmessage0) ? responseData.l_longmessage0 : null;
        data.ack = !empty(responseData.ack) ? responseData.ack : null;
    }

    if (!empty(responseResult)) {
        data.result = responseResult;
    }

    response.setContentType('application/json');
    response.writer.print(JSON.stringify(data, null, 2));
}

/**
 * Show template with create new transaction form
 */
function createNewTransaction() {
    var invNum = createCustomTransactionInvNum();
    var isCapture = currentSite.getCustomPreferenceValue('PP_API_PaymentAction');
    var allCurrencies = currentSite.getAllowedCurrencies();
    var defaultCurrency = currentSite.getDefaultCurrency();
    var countries = getCountriesLabelsAndCodes();

    render('paypalbm/components/newTransaction', {
        CSRFProtection: CSRFProtection,
        invNum: invNum,
        isCapture: isCapture,
        allCurrencies: allCurrencies,
        defaultCurrency: defaultCurrency,
        countries: countries
    });
}

/**
 * Returns max amount is allowed for multiple capture operation
 */
function helperGetCaptureAmount() {
    var order = null;
    var responseResult = 'Success';

    if (!empty(request.httpParameterMap.orderNo.value)) {
        if (request.httpParameterMap.isCustomOrder.booleanValue) {
            var orderInfo = getCustomOrderInfo(request.httpParameterMap.orderNo.stringValue);
            if (!orderInfo) {
                responseResult = 'Error';
            } else {
                order = orderInfo.order;
            }
        } else {
            order = OrderMgr.getOrder(request.httpParameterMap.orderNo.stringValue);
        }
    }

    if (!order) {
        responseResult = 'Error';
    }

    renderJson(responseResult);
}

/**
 * Create new PayPalNewTransactions Custom Object with data from a new transaction
 *
 * @param {Object} transactionData - Response data from a API call
 * @param {string} invNum - Custom order number for a PayPalNewTransactions Custom Object
 */
function createNewTransactionCustomObject(transactionData, invNum) {
    var newOrder = CustomObjectMgr.createCustomObject('PayPalNewTransactions', invNum);
    newOrder.custom.orderDate = transactionData.create_time;
    newOrder.custom.orderTotal = transactionData.purchase_units[0].amount.value;
    newOrder.custom.paymentStatus = transactionData.status || 'Unknown';
    newOrder.custom.transactionId = transactionData.id;
    newOrder.custom.firstName = transactionData.payer.name.given_name;
    newOrder.custom.lastName = transactionData.payer.name.surname;
    newOrder.custom.email = transactionData.payer.email_address || 'Unknown';
    newOrder.custom.currencyCode = transactionData.purchase_units[0].amount.currency_code;
    newOrder.custom.transactionsHistory = [transactionData.id];
}

/**
 * Get orders list. Can be filtered by order ID or transaction ID
 */
function orders() {
    var orderNo;
    var alternativeFlow = false;
    var orders; // eslint-disable-line no-shadow
    var isSearchByOrderNo = request.httpParameterMap.orderNo.submitted;
    var isSearchByTransaction = request.httpParameterMap.transactionId.submitted;

    if (request.httpParameterMap.transactionId.submitted && !empty(request.httpParameterMap.transactionId.stringValue)) {
        var transactionId = request.httpParameterMap.transactionId.stringValue;
        var systemOrder = SystemObjectMgr.querySystemObjects('Order', 'custom.paypalPaymentMethod = \'express\' AND custom.PP_API_TransactionID LIKE {0} AND status != {1}', 'creationDate desc', transactionId, Order.ORDER_STATUS_FAILED);
        var paypalOrder = CustomObjectMgr.queryCustomObjects('PayPalNewTransactions', 'custom.transactionId = {0}', null, transactionId);
        if (paypalOrder.count) {
            orderNo = new ArrayList(paypalOrder).toArray()[0].custom.orderNo;
        } else if (systemOrder.count) {
            orderNo = new ArrayList(systemOrder).toArray()[0].orderNo;
        }
    }

    if (!orderNo) {
        alternativeFlow = true;
    }

    if (alternativeFlow) {
        orderNo = empty(request.httpParameterMap.orderNo.stringValue) ? '*' : request.httpParameterMap.orderNo.stringValue;
        orderNo = request.httpParameterMap.transactionId.submitted ? '0' : orderNo;
        orderNo = request.httpParameterMap.transactionId.stringValue === '' ? '*' : orderNo;
    }

    try {
        orders = getOrders(orderNo);
    } catch (error) {
        createErrorLog(error);
        render('paypalbm/components/serverError');
        return;
    }

    if (!isSearchByOrderNo && !isSearchByTransaction) {
        isSearchByOrderNo = true;
    }

    var pageSize = !empty(request.httpParameterMap.pagesize.intValue) ? request.httpParameterMap.pagesize.intValue : 10;
    var currentPage = request.httpParameterMap.page.intValue ? request.httpParameterMap.page.intValue : 1;
    pageSize = pageSize === 0 ? orders.length : pageSize;
    var start = pageSize * (currentPage - 1);
    var orderPagingModel = new PagingModel(orders);

    orderPagingModel.setPageSize(pageSize);
    orderPagingModel.setStart(start);

    var orderPagingModelParameters = createOrderPagingModelParameters(orderPagingModel, request.httpParameterMap);

    render('paypalbm/orderList', {
        PagingModel: orderPagingModel,
        orderPagingModelParameters: orderPagingModelParameters,
        isSearchByOrderNo: isSearchByOrderNo,
        isSearchByTransaction: isSearchByTransaction
    });
}

/**
 * Get order transaction details
 */
function orderTransaction() {
    var errorFlow = false;
    var order = null;
    var paymentInstrument = null;
    var transactionIdFromOrder = null;
    var paymentInstrumentCustomEl = null;
    var transactionID = null;

    if (request.httpParameterMap.orderNo && !empty(request.httpParameterMap.orderNo.value)) {
        if (request.httpParameterMap.isCustomOrder && !empty(request.httpParameterMap.isCustomOrder.stringValue)) {
            var orderInfo = getCustomOrderInfo(request.httpParameterMap.orderNo.stringValue);
            if (!orderInfo) {
                errorFlow = true;
            } else {
                order = orderInfo.order;
                transactionIdFromOrder = orderInfo.transactionIdFromOrder;
            }
        } else {
            order = OrderMgr.getOrder(request.httpParameterMap.orderNo.stringValue);
            if (order) {
                paymentInstrument = paymentInstrumentHelper.getPaypalPaymentInstrument(order);
            }
        }
    }

    if (!order || (!paymentInstrument && !transactionIdFromOrder)) {
        errorFlow = true;
    }

    if (errorFlow) {
        render('paypalbm/components/serverError');
        return;
    }

    if (!transactionIdFromOrder) {
        paymentInstrumentCustomEl = paymentInstrument.getCustom();
        transactionIdFromOrder = paymentInstrumentCustomEl.paypalToken || paymentInstrumentCustomEl.paypalOrderID;
    }

    if (!empty(request.httpParameterMap.transactionId.stringValue) && !empty(transactionIdFromOrder) &&
        request.httpParameterMap.transactionId.stringValue !== transactionIdFromOrder || empty(request.httpParameterMap.transactionId.stringValue)) {
        transactionID = transactionIdFromOrder;
    } else {
        transactionID = request.httpParameterMap.transactionId.stringValue;
    }

    var isCustomOrder = !empty(request.httpParameterMap.isCustomOrder.stringValue);
    var result = paypalApi.getOrderDetails(transactionID);

    if (result.err) {
        render('paypalbm/components/serverError');
        return;
    }

    var preparedData = paymentInstrumentHelper.prepareOrderTransactionData(result, order, isCustomOrder);
    render('paypalbm/orderTransaction', preparedData);
}

/**
 * Do some action, like DoAuthorize, DoCapture, DoRefund and etc
 */
function action() {
    var params = request.httpParameterMap;
    var responseResult = 'Success';
    var callApiResponse = {};
    if (!CSRFProtection.validateRequest()) {
        var errorMsg = {
            l_longmessage0: 'CSRF token mismatch'
        };
        renderJson('Error', errorMsg);
        return;
    }

    if (!params.helperAction.submitted) {
        var methodName = params.methodName.stringValue;
        var methodData = params;
        var orderNo = params.orderNo.stringValue;
        var isCustomOrder = params.isCustomOrder.booleanValue;
        var isSaveToCustomOrder = methodName !== 'DoReferenceTransaction' && methodName !== 'DoDirectPayment';

        callApiResponse = paypalApi.callMethod(methodName, methodData);
        if (callApiResponse.err) {
            responseResult = 'Error';
        } else {
            if (isSaveToCustomOrder) { // eslint-disable-line no-lonely-if
                var orderTransactionResult = {};
                Transaction.wrap(function () {
                    orderTransactionResult = paymentInstrumentHelper.updateOrderTransaction(orderNo, isCustomOrder);
                });

                if (!orderTransactionResult) {
                    responseResult = 'Error';
                }
            } else { // eslint-disable-line no-lonely-if
                var getTransactionResult = paypalApi.getOrderDetails(callApiResponse.responseData.transactionid);

                if (getTransactionResult.err) {
                    responseResult = 'Error';
                } else {
                    Transaction.wrap(function () {
                        getTransactionResult.status = paymentInstrumentHelper.getPaymentStatus(getTransactionResult);
                        createNewTransactionCustomObject(getTransactionResult, getTransactionResult.purchase_units[0].invoice_id);
                    });
                }
            }
        }
    } else {
        if (params.helperAction.stringValue === 'getCaptureAmount') {
            helperGetCaptureAmount();
            return;
        }
        responseResult = 'Error';
    }

    renderJson(responseResult, callApiResponse.responseData);
}

orders.public = true;
orderTransaction.public = true;
action.public = true;
createNewTransaction.public = true;

exports.Orders = orders;
exports.OrderTransaction = orderTransaction;
exports.Action = action;
exports.CreateNewTransaction = createNewTransaction;
