'use strict';

module.exports = function (object, category) {
    Object.defineProperty(object, 'category', {
        enumerable: true,
        value: category
    });
};
