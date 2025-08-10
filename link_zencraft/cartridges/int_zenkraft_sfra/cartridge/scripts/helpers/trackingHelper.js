'use strict';

var Zenkraft = require('*/cartridge/scripts/zenkraft');

/**
 * Get tracking products
 * @param {array} zenkraftParcelsProductsStrings - parce products array
 * @returns {array} - array of products
 */
function getTrackingProducts(zenkraftParcelsProductsStrings) {
    var ProductMgr = require('dw/catalog/ProductMgr');
    var products = [];
    var filteredProducts = {};
    zenkraftParcelsProductsStrings.forEach(function (productsString) {
        var productsArray = JSON.parse(productsString);
        productsArray.forEach(function (productObject) {
            var quntity = parseInt(productObject.ShippedQty, 10);
            if (filteredProducts[productObject.ItemID] || filteredProducts[productObject.ItemID] > 0) {
                filteredProducts[productObject.ItemID] += quntity;
            } else {
                filteredProducts[productObject.ItemID] = quntity;
            }
        });
    });
    var productIds = Object.keys(filteredProducts);
    productIds.forEach(function (productId) {
        var product = ProductMgr.getProduct(productId);
        products.push({ product: product, quantity: filteredProducts[productId] });
    });

    return products;
}

/**
 * Get parcel object
 * @param {dw.order.Order} order - Order object
 * @param {string|number} trackingNo - Tracking number
 * @param {string} carrier - Carried name
 * @returns {array} - Processed Zenkraft parcels
 */
function getParcelObjects(order, trackingNo, carrier) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var trackingInfo = false;
    var query = '';
    var processedZenkraftParcels = [];
    if (order && typeof order === 'object') {
        query = "custom.orderNo = '" + order.orderNo + "'";
    }
    if (carrier && trackingNo) {
        query = "custom.trackingNumber = '" + trackingNo + "' AND custom.carrier = '" + carrier + "'";
    }
    if (order && carrier && trackingNo) {
        query += " AND custom.orderNo = '" + order.orderNo + "'";
    }
    if (query.length === 0) {
        return false;
    }
    var zenkraftParcels = CustomObjectMgr.queryCustomObjects('zenkraftParcel', query, null);
    var zenkraftParcelsArray = zenkraftParcels.asList().toArray();
    if (zenkraftParcels.getCount() > 0) {
        if (carrier && trackingNo) {
            trackingInfo = Zenkraft.getTrackingInfo(trackingNo, carrier);
            var zenkraftParcelsProductStrings = [];
            zenkraftParcelsArray.forEach(function (zenkraftParcel) {
                trackingInfo.orderNo = zenkraftParcel.custom.orderNo ? zenkraftParcel.custom.orderNo : false;
                zenkraftParcelsProductStrings.push(zenkraftParcel.custom.contents);
            });
            trackingInfo.trackingNo = trackingNo;
            trackingInfo.products = getTrackingProducts(zenkraftParcelsProductStrings);
            processedZenkraftParcels.push(trackingInfo);
        } else {
            var trackingInfoObjects = {};
            zenkraftParcelsArray.forEach(function (zenkraftParcel) {
                var parcelCarrier = zenkraftParcel.custom.carrier ? zenkraftParcel.custom.carrier : false;
                var parcelTrackingNo = zenkraftParcel.custom.trackingNumber ? zenkraftParcel.custom.trackingNumber : false;
                if (parcelCarrier && parcelCarrier.length > 0 && parcelTrackingNo && parcelTrackingNo.length > 0) {
                    if (trackingInfoObjects[parcelTrackingNo + '-' + parcelCarrier]) {
                        trackingInfoObjects[parcelTrackingNo + '-' + parcelCarrier].push(zenkraftParcel.custom.contents);
                    } else {
                        trackingInfoObjects[parcelTrackingNo + '-' + parcelCarrier] = [zenkraftParcel.custom.contents];
                    }
                }
            });
            var uniqueZenkraftParcelKeys = Object.keys(trackingInfoObjects);
            uniqueZenkraftParcelKeys.forEach(function (key) {
                var trackingInfosArray = key.split('-');
                trackingInfo = Zenkraft.getTrackingInfo(trackingInfosArray[0], trackingInfosArray[1]);
                trackingInfo.products = getTrackingProducts(trackingInfoObjects[key]);
                trackingInfo.orderNo = order.orderNo;
                trackingInfo.trackingNo = trackingInfosArray[0];
                processedZenkraftParcels.push(trackingInfo);
            });
        }
    }
    return processedZenkraftParcels;
}

/**
 * Get native sshipment
 * @param {dw.order.Order} order - Current Order
 * @param {string|number} trackingNo - Tracking number
 * @param {string} carrier - Carried name
 * @returns {array} - Array with tracking data
 */
function getSystemShipments(order, trackingNo, carrier) {
    var trackingInfo;
    var shipments;
    var ShippingModel = require('*/cartridge/models/shipping');
    var trackingsData = [];
    if (carrier && trackingNo) {
        trackingInfo = Zenkraft.getTrackingInfo(trackingNo, carrier);
        trackingInfo.trackingNo = trackingNo;
        var notFound = true;
        if (order) {
            shipments = order.getShipments().toArray();
            shipments.forEach(function (shipment) {
                trackingInfo.ShippingModel = new ShippingModel(shipment);
                if (!empty(shipment.trackingNumber) && shipment.trackingNumber === trackingNo && !empty(shipment.custom.zenkraftCarrier) && shipment.custom.zenkraftCarrier === carrier) {
                    trackingInfo.systemShipment = shipment;
                    trackingInfo.orderNo = order.orderNo;
                    trackingsData.push(trackingInfo);
                    notFound = false;
                }
            });
        }
        if (notFound) {
            trackingsData.push(trackingInfo);
        }
    } else {
        if (order) {
            shipments = order.getShipments().toArray();
            shipments.forEach(function (shipment) {
                var currenShippingModel = new ShippingModel(shipment);
                if (shipment.custom.zenkraftCarrier && !empty(shipment.custom.zenkraftCarrier) && shipment.trackingNumber && !empty(shipment.trackingNumber) && shipment.productLineItems.length > 0) {
                    trackingInfo = Zenkraft.getTrackingInfo(shipment.trackingNumber, shipment.custom.zenkraftCarrier);
                    trackingInfo.trackingNo = shipment.trackingNumber;
                    if (trackingInfo.error || (!trackingInfo.tracking_stage || empty(trackingInfo.tracking_stage))) {
                        trackingsData.push({
                            orderNo: order.orderNo,
                            trackingNo: shipment.trackingNumber,
                            systemShipment: shipment,
                            ShippingModel: currenShippingModel
                        });
                    } else {
                        trackingInfo.orderNo = order.orderNo;
                        trackingInfo.trackingNo = shipment.trackingNumber;
                        trackingInfo.systemShipment = shipment;
                        trackingInfo.ShippingModel = currenShippingModel;
                        trackingsData.push(trackingInfo);
                    }
                } else {
                    if (shipment.productLineItems.length > 0) {
                        trackingsData.push({
                            orderNo: order.orderNo,
                            systemShipment: shipment,
                            ShippingModel: currenShippingModel
                        });
                    }
                }
            });
        }
    }
    return trackingsData;
}

exports.getParcelObjects = getParcelObjects;
exports.getSystemShipments = getSystemShipments;
