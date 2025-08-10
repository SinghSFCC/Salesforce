'use strict';

/*
* Update order and shipping status and update tracking number if provided
* Example OCAPI request to update status and tracking number
*
* {
*   "shipments": [{
*   	"shipment_no": "",
*   	"shipping_status": "shipped",
* 	"tracking_number": "987654321",
* 	"c_zenkraftCarrier": "fedex"
*   }],
*  "product_items": [{
*  	"item_id": "640188017041M",
*   "quantity": 1
*   }]
* }
*/

/**
* Update Shipping Status on shipment and order
*
* @param {Object} order SFCC order
* @param {Object} shipment SFCC shipment on the order
* @param {number} status Number representing shipping status
*/
function updateShipStatus(order, shipment, status) {
    order.setShippingStatus(status);
    shipment.setShippingStatus(status);
}

/**
* Update Tracking Number on a shipment
*
* @param {Object} shipment SFCC shipment
* @param {string} trackNumber Tracking Number
*/
function updateTrackingNumber(shipment, trackNumber) {
    shipment.setTrackingNumber(trackNumber);
}

/**
* Update Carrier custom attribute on a shipment
*
* @param {Object} shipment SFCC shipment
* @param {string} carrier carrier ID from Zenkraft service
*/
function updateCarrier(shipment, carrier) {
    // eslint-disable-next-line no-param-reassign
    shipment.custom.zenkraftCarrier = carrier;
}

/**
* Update Shipment data on a shipment based on
* OCAPI request body
*
* @param {Object} data SFCC shipment
* @param {Object} thisOrder SFCC order
* @param {Object} shipment SFCC shipment on the order
*/
function updateShipment(data, thisOrder, shipment) {
    // if the request has a shipping status == shipped, then let's update it to shipped
    if (data.order.shipments && data.order.shipments[0].shipping_status && data.order.shipments[0].shipping_status === 'shipped') {
        updateShipStatus(thisOrder, shipment, 2);
    }

    // if the request has tracking number, add it to our shipment
    if (data.order.shipments && data.order.shipments[0].tracking_number) {
        updateTrackingNumber(shipment, data.order.shipments[0].tracking_number);
    }

    // if the request has carrier, add it to our shipment
    if (data.order.shipments && data.order.shipments[0].c_zenkraftCarrier_s) {
        updateCarrier(shipment, data.order.shipments[0].c_zenkraftCarrier_s);
    }
}

exports.beforePATCH = function (order, orderInput) {
    var thisOrder = order;
    var data = JSON.parse(orderInput);
    var shipment;
    var lineItem;
    var lineItemArray;
    var existingLineItem;
    var currentQuantity;
    var newQuantity;
    var newLineItem;
    var newShipment;
    var diffQuantity;
    var allShipments;
    var lineItemPriceValue;
    var existingShippingMethod;


    // If the request has product items, get the shipment for the product line item
    if (data.order.product_items) {
        newShipment = thisOrder.createShipment('ZEN' + (Math.floor(Math.random() * 1000000000)));

        data.order.product_items.forEach(function (productItem) {
            // Get the quantity of the product to create the new shipment
            newQuantity = productItem.quantity;

            // do not move the item if the quantity is zero
            if (newQuantity !== '' && newQuantity > 0) {
                // Get the product line item by ID
                lineItem = thisOrder.getProductLineItems(productItem.item_id);
                lineItemArray = lineItem.toArray();
                existingLineItem = lineItemArray[0];

                // get the current price of the product to move later
                lineItemPriceValue = existingLineItem.getPriceValue();

                // get the current shipping method of the line item to move later
                existingShippingMethod = existingLineItem.shipment.getShippingMethod();

                // Get the current shipment quantity
                currentQuantity = existingLineItem.quantityValue;

                // If quantity equals existing or is empty, move the entire product line item to the new shipment
                if (currentQuantity === newQuantity || newQuantity === '') {
                    // remove product line from the original shipment
                    thisOrder.removeProductLineItem(existingLineItem);

                    // create new line item and add to the new shipment
                    newLineItem = thisOrder.createProductLineItem(productItem.item_id, newShipment);
                    newLineItem.setQuantityValue(currentQuantity);
                    newLineItem.setPriceValue(lineItemPriceValue);

                    // update shipment tracking and status
                    updateShipment(data, thisOrder, newShipment);
                } else {
                    // If not the same, subtract the quantity from the request
                    diffQuantity = currentQuantity - newQuantity;
                    // put the line item in the new shipment
                    newLineItem = thisOrder.createProductLineItem(productItem.item_id, newShipment);
                    // set the quantity to the value in the request
                    newLineItem.setQuantityValue(newQuantity);
                    newLineItem.setPriceValue(lineItemPriceValue);
                    // update the quantity on the original to the difference
                    existingLineItem.setQuantityValue(diffQuantity);
                    existingLineItem.setPriceValue(lineItemPriceValue);

                    // update shipment tracking and status
                    updateShipment(data, thisOrder, newShipment);
                }
            }
        });

        // set the shipping method on our new shipment to what it was before
        newShipment.setShippingMethod(existingShippingMethod);
    } else {
        // If a shipment number is specified, use that. If not, use default shipment
        if (data.order.shipments[0].shipment_no && data.order.shipments[0].shipment_no !== '') {
            shipment = thisOrder.getShipment(data.order.shipments[0].shipment_no);
        } else {
            shipment = thisOrder.getDefaultShipment();

            // if the default shipment is empty, iterate through shipments until
            // we find one with products
            if (shipment.productLineItems.isEmpty()) {
                allShipments = thisOrder.shipments.iterator();
                while (allShipments.hasNext()) {
                    var tempShipment = allShipments.next();

                    if (!(tempShipment.productLineItems.isEmpty())) {
                        shipment = tempShipment;
                        break;
                    }
                }
            }
        }

        // update shipment tracking and status
        updateShipment(data, thisOrder, shipment);
    }
    return;
};
