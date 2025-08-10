'use strict';

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('./search/search'));
    processInclude(require('productcompare/product/compare'));
    processInclude(require('./product/quickView'));
    processInclude(require('wishlist/product/wishlistHeart'));
});