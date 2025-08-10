'use strict';

/* API Includes */
var Bytes = require('dw/util/Bytes');
var CacheMgr = require('dw/system/CacheMgr');
var MessageDigest = require('dw/crypto/MessageDigest');

/**
 * Generates a cache key based on the request body JSON payload.
 *
 * @param {Object} keyObject Object to be used to generate a cache key.
 * @returns {string} Hash string representation of the request payload.
 */
function getCacheKey(keyObject) {
    var string = JSON.stringify(keyObject);
    var bytes = new Bytes(string);

    return new MessageDigest(MessageDigest.DIGEST_SHA_256).digest(bytes);
}

/**
 * Retrieves the ZenKraft cache instance from the CacheMgr.
 * @param {string} id - Cache ID
 * @returns {dw.system.Cache} Cache instance.
 */
function getCustomCache(id) {
    return CacheMgr.getCache(id);
}

/**
 * Adds an entry to the cache instance.
 *
 * @param {Object} keyObject Object to be used to generate a cache key.
 * @param {Object} valueObject Object to be cached.
 */
function putCache(id, keyObject, valueObject) {
    var cache = getCustomCache(id);
    var key = getCacheKey(keyObject);

    cache.put(key, valueObject);
}

/**
 * Invalidates an entry in the cache instance.
 *
 * @param {Object} keyObject Request body object.
 */
function invalidateCache(keyObject, id) {
    var cache = getCustomCache(id);
    var key = getCacheKey(keyObject);

    cache.invalidate(key);
}

/**
 * Retreives an entry from the cache instance. Loads the expected data using the loader function
 * when cache entry does not exist, then caches the value returned by the loader function.
 *
 * @param {Object} keyObject Object to be used to generate a cache key.
 * @param {Function} loaderFunction Function to load the expected cache data in the absence of an entry.
 * @returns {Object|undefined} Cached value or undefined if loaderFunction not provided.
 */
function getCache(keyObject, id, loaderFunction) {
    var cache = getCustomCache(id);
    var key = getCacheKey(keyObject);
    var callback = (typeof loaderFunction === 'function') ? loaderFunction : null;

    return cache.get(key, callback);
}

module.exports = {
    putCache: putCache,
    invalidateCache: invalidateCache,
    getCache: getCache
};
