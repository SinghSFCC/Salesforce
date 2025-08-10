'use strict';
/* global empty dw request session customer */

const OrderMgr = require('dw/order/OrderMgr');
const {
    createErrorLog
} = require('*/cartridge/scripts/paypal/bmPaypalUtils');

const Resource = require('dw/web/Resource');

var paypalHelper = {};

paypalHelper.createCustomTransactionInvNum = function () {
    var invNum = OrderMgr.createOrderSequenceNo();

    try {
        if (!empty(OrderMgr.getOrder(invNum))) {
            invNum = OrderMgr.createOrderSequenceNo();
        }
    } catch (error) {
        createErrorLog(error);
    }

    return 'pp_' + invNum;
};

/**
 * Creates an array of objects with countries. Each object contains a label and a value of separate country.
 * @returns {Array} Array of objects.
 */
paypalHelper.getCountriesLabelsAndCodes = function () {
    const countriesCode = require('*/countriesCodes');

    return countriesCode.map(function (code) {
        return {
            value: code,
            label: Resource.msg('country.' + code.toLocaleLowerCase(), 'paypalbm', null)
        };
    });
};

/**
 * Creates parameters for orderPagingModel.
 * @param {*} orderPagingModel orderPagingModel.
 * @param {*} httpParameterMap Current httpParameterMap.
 * @returns {Object} Object with orderPadingModel parameters.
 */
paypalHelper.createOrderPagingModelParameters = function (orderPagingModel, httpParameterMap) {
    var lr = 2;
    var rangeBegin;
    var rangeEnd;
    var showingStart = orderPagingModel.start + 1;
    var showingEnd = orderPagingModel.start + orderPagingModel.pageSize;
    var parameters = httpParameterMap.getParameterNames().toArray().filter(function (parametersName) {
        return parametersName !== 'page';
    }).map(function (parametersName) {
        return {
            key: parametersName,
            value: httpParameterMap[parametersName]
        };
    });

    if (showingEnd > orderPagingModel.count) {
        showingEnd = orderPagingModel.count;
    }

    if (orderPagingModel.maxPage <= 2 * lr) {
        rangeBegin = 1;
        rangeEnd = orderPagingModel.maxPage - 1;
    } else {
        rangeBegin = Math.max(Math.min(orderPagingModel.currentPage - lr, orderPagingModel.maxPage - 2 * lr), 1);
        rangeEnd = Math.min(rangeBegin + 2 * lr, orderPagingModel.maxPage - 1);
    }

    return {
        current: orderPagingModel.start,
        totalCount: orderPagingModel.count,
        pageSize: orderPagingModel.pageSize,
        currentPage: orderPagingModel.currentPage,
        maxPage: orderPagingModel.maxPage,
        showingStart: showingStart,
        showingEnd: showingEnd,
        rangeBegin: rangeBegin,
        rangeEnd: rangeEnd,
        parameters: parameters
    };
};

module.exports = paypalHelper;
