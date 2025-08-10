'use strict';

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('./product/detail'));
    // Include base details


    // Apple pay
    try {
        processInclude(require('applepay/product/detail'));
    } catch (ex) {
        // plugin not in use
    }

    // Instore pickup
    try {
        processInclude(require('instorepickup/product/pdpInstoreInventory'));
    } catch (ex) {
        // plugin not in use
    }

    // Wishlists
    try {
        processInclude(require('wishlist/product/wishlist'));
    } catch (ex) {
        // plugin not in use
    }

});
