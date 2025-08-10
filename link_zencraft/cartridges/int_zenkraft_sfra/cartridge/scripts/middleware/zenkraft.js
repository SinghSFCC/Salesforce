'use strict';
// TODO: Check for OCAPI authentication

/**
 * Custom OCAPI Auth
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next - Next middleware
 */
function customOcapiAuth(req, res, next) {
    if (empty(request.httpHeaders.authorization)) {
        return false;
    }
    var Site = require('dw/system/Site');
    var Encoding = require('dw/crypto/Encoding');
    var HTTPClient = require('dw/net/HTTPClient');
    var zenkraftApiKey = Site.getCurrent().getCustomPreferenceValue('zenkraftMasterAPIKey');
    var auth = request.httpHeaders.authorization;
    var credentialsString = Encoding.fromBase64(auth.replace('Basic ', '')).toString();
    var credentialsArray = credentialsString.split(':');
    if (credentialsArray.length !== 3) {
        return false;
    }
    var username = credentialsArray[0];
    var password = credentialsArray[1];
    var client = new HTTPClient();
    var url = 'https://account.demandware.com/dwsso/oauth2/access_token?&grant_type=client_credentials';
    client.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    client.open('POST', url, username, password);
    client.setTimeout(3000);
    client.send();
    if (client.statusCode !== 200 || (!client.text.indexOf('access_token' !== -1) && zenkraftApiKey !== credentialsArray[2])) {
        res.json({ error: 'You are not Authorized' });
        return this.done(req, res);
    }
    return next();
}

module.exports = {
    customOcapiAuth: customOcapiAuth
};
