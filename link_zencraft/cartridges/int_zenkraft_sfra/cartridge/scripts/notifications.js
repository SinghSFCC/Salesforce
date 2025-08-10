/* global dw, empty */
/**
* Model for sending shipping notifications
*
* @module cartridge/scripts/models/NotificationModel
*/

'use strict';

/**
* Get Twilio Settings
*
* @param {string} phone number
* @param {string} new status
* @return {boolean} success (true/false)
*/
var getTwilioSettings = function twilioSettings() {
    var Site = require('dw/system/Site');

    return {
        BASE_URL: Site.getCurrent().getCustomPreferenceValue('twilioBaseURL'),
        ACCOUNT_SID: Site.getCurrent().getCustomPreferenceValue('twilioAccountSID'),
        AUTH_TOKEN: Site.getCurrent().getCustomPreferenceValue('twilioAuthToken'),
        FROM_PHONE: Site.getCurrent().getCustomPreferenceValue('twilioFromPhone')
    };
};

/**
 * Twilio Service Configuration
 */
var initTwilioService = function startTwilio() {
    var dwsvc = require('dw/svc');
    var dwutil = require('dw/util');

    dwsvc.LocalServiceRegistry.configure('http.twilio', {
        createRequest: function createTwilioRequest(svc, request) {
            var site = dw.system.Site.current;

            // Get account settings from site prefs
            var ACCOUNT_SID = site.getCurrent().getCustomPreferenceValue('twilioAccountSID');
            var AUTH_TOKEN = site.getCurrent().getCustomPreferenceValue('twilioAuthToken');

            svc.setRequestMethod('POST');
            svc.addHeader('content-type', 'application/x-www-form-urlencoded');
            // eslint-disable-next-line max-len
            svc.addHeader('authorization', 'Basic ' + dwutil.StringUtils.encodeBase64(ACCOUNT_SID + ':' + AUTH_TOKEN));

            return !empty(request) ? request : {};
        },

        parseResponse: function parseTwilioResponse(svc, client) {
            var data = client.text;
            data = JSON.parse(data);

            return data;
        }
    });
};

/**
* Send SMS Notification via Twilio
*
* @param {string} phone number
* @param {string} status status
* @return {boolean} success (true/false)
*/
var sendSMSNotification = function sendSMS(phone, status) {
    var prefs = {};
    var req;
    var svcConfig;
    initTwilioService();

    prefs = getTwilioSettings();
    req = 'To=' + phone + '&From=' + prefs.FROM_PHONE + '&Body=Your shipment status has changed to ' + status + '.';

    svcConfig = dw.svc.LocalServiceRegistry.get('http.twilio');

    svcConfig.setURL(svcConfig.getURL() + '/' + prefs.ACCOUNT_SID + '/Messages.json');

    svcConfig.call(req);

    return true;
};

/**
 * Update notification string
 * @param {string} notificationType - Notification type
 * @param {Object} notifyObject - Notification object
 * @returns {string} - Updated string
 */
function updateNotificationString(notificationType, notifyObject) {
    var notificationsArray = notificationType.split(',');
    var update;
    notificationsArray.forEach(function (notification) {
        if (notification.indexOf(':') === -1 && notificationsArray.length === 1) {
            update = notifyObject.type + ':' + notifyObject.contact;
        }
        if (notification.indexOf(notifyObject.type) > -1) {
            update = notificationType.replace(
                notification,
                notifyObject.type + ':' + notifyObject.contact
            );
        }
        if (notificationsArray.length > 0 && notificationType.indexOf(notifyObject.type) === -1) {
            update = notificationType + ',' + notifyObject.type + ':' + notifyObject.contact;
        }
    });
    return update;
}

/**
 * Update system shipments
 * @param {*} notifyObject - Notification object
 * @param {*} orderNo - Order number
 * @param {*} shipmentNo - Shipment number
 * @returns {string} - Status string
 */
function updateSystemShipments(notifyObject, orderNo, shipmentNo) {
    var OrderMgr = require('dw/order/OrderMgr');
    var Transaction = require('dw/system/Transaction');
    var order = OrderMgr.getOrder(orderNo);
    var shipments = order.getShipments().toArray();
    shipments = shipments.filter(function (shipment) {
        if (shipment.shipmentNo === shipmentNo) {
            return true;
        }
        return false;
    });
    if (shipments.length === 0) {
        return false;
    }
    shipments.forEach(function (shipment) {
        Transaction.wrap(function () {
            if (shipment.custom.zenkraft_notification_type && !empty(shipment.custom.zenkraft_notification_type)) {
                // eslint-disable-next-line no-param-reassign
                shipment.custom.zenkraft_notification_type = updateNotificationString(shipment.custom.zenkraft_notification_type, notifyObject);
            } else {
                // eslint-disable-next-line no-param-reassign
                shipment.custom.zenkraft_notification_type = updateNotificationString('', notifyObject);
            }
            if (notifyObject.stage) {
                // eslint-disable-next-line no-param-reassign
                shipment.custom.zenkraft_tracking_stage = notifyObject.stage;
            }
        });
    });
    return 'You have successfully subscribed to ' +
        notifyObject.type.toUpperCase() +
        ' notifications for this shipment. You will receive a message when the status is updated.';
}


/**
 * Update Zenkraft parces
 * @param {*} notifyObject - Notification object
 * @returns {string} - status string
 */
function updateZenkraftParcels(notifyObject) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');
    var query = "custom.trackingNumber = '" + notifyObject.trackingNumber + "' AND custom.carrier = '" + notifyObject.carrier + "'";
    var zenkraftParcels = CustomObjectMgr.queryCustomObjects('zenkraftParcel', query, null);
    if (zenkraftParcels.getCount() === 0) {
        return false;
    }
    zenkraftParcels.asList().toArray().forEach(function (zenkraftParcel) {
        Transaction.wrap(function () {
            if (zenkraftParcel.custom.notificationType && !empty(zenkraftParcel.custom.notificationType)) {
                // eslint-disable-next-line no-param-reassign
                zenkraftParcel.custom.notificationType = updateNotificationString(zenkraftParcel.custom.notificationType, notifyObject);
            } else {
                // eslint-disable-next-line no-param-reassign
                zenkraftParcel.custom.notificationType = updateNotificationString('', notifyObject);
            }
            if (notifyObject.stage) {
                // eslint-disable-next-line no-param-reassign
                zenkraftParcel.custom.trackingStage = notifyObject.stage;
            }
        });
    });
    return 'You have successfully subscribed to ' +
        notifyObject.type.toUpperCase() +
        ' notifications for this shipment. You will receive a message when the status is updated.';
}

/**
* Creates Custom Object to later process shipping notifications
* @param {Object} notifyObject - Object containing notification data
* @param {string} orderNo - Order number
* @param {string} shipmentNo - Shipment number
* @return {boolean} success (true/false)
*/
var addNotificationObject = function addNotifyCO(notifyObject, orderNo, shipmentNo) {
    var Site = require('dw/system/Site');
    var useParcelObjectforTracking = Site.getCurrent().getCustomPreferenceValue('useParcelObjectforTracking');
    var response = 'There was an issue when trying to subscribe you to SMS notifications. Please try again later.';
    var checkResponse;

    if (useParcelObjectforTracking) {
        checkResponse = updateZenkraftParcels(notifyObject);
    }

    if (!useParcelObjectforTracking && orderNo && shipmentNo) {
        checkResponse = updateSystemShipments(notifyObject, orderNo, shipmentNo);
    }

    if (checkResponse) {
        response = checkResponse;
    }

    return response;
};

/* Exports of the module */
exports.SendSMSNotification = sendSMSNotification;
exports.addNotificationObject = addNotificationObject;
