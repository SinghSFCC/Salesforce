'use strict';

/**
 * Determines if the passed in item is an object
 * @private
 * @param {*} item Checks if item is an object
 * @returns {boolean} Returns true if the item is an object
 */
function _isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Generic function to deep merge two objects
 * @public
 * @param {Object} target Object to merge onto. New object is created if
 *  undefined
 * @param {Array<Object>} sources Objects to merge into target
 * @returns {Object} Merged object
 */
function mergeDeep(target, sources) {
    if (!sources.length) {
        return target;
    }

    var source = sources.shift();

    if (_isObject(target) && _isObject(source)) {
        for (var key in source) {
            if (_isObject(source[key])) {
                if (!target[key]) {
                    target[key] = {};
                }
                mergeDeep(target[key], [source[key]]);
            } else {
                target[key] = source[key];
            }
        }
    }

    return mergeDeep(target, sources);
}

/**
 * Extend a JS object
 * @public
 * @param {Object} obj1 object to extend
 * @param {Object} obj2 object to extend with
 * @param {boolean} overwrite should an exisiting key value pair be overwitten
 * @returns {Object} object - the extended object
 */
function extend(obj1, obj2, overwrite) {
    for (var key in obj2) {
        if (!overwrite && key in obj1) {
            continue;
        }
        obj1[key] = obj2[key];
    }
    return obj1;
}

module.exports = {
    extend: extend,
    mergeDeep: mergeDeep
};
