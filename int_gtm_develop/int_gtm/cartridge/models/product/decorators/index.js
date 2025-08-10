'use strict';

var extend = require('*/cartridge/scripts/util/objects').extend;

module.exports = extend(module.superModule, {
    category: require('./category'),

}, true);
