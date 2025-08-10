/* global $ */
'use strict';

/**
 * Check place object for postal code
 * @param {Object} place - Place object from google api
 * @returns {string} - Postal code
 */
function checkPlaceForPostalCode(place) {
    var postalCode = false;
    place.address_components.forEach(function (component) {
        if (component.types.indexOf('postal_code') > -1) {
            postalCode = true;
        }
    });
    return postalCode;
}

/**
 * Get geo location address from google object
 * @param {Object} place - Place object
 * @returns {Object} - Geo location of the place
 */
function getGeoAddressFromGoogleObject(place) {
    var objAddress = {
        address1: place.name,
        city: '',
        stateCode: '',
        postalCode: '',
        countryCode: ''
    };

    for (var i = 0; i < place.address_components.length; i++) {
        for (var b = 0; b < place.address_components[i].types.length; b++) {
            // find state name - there are different types that might hold a city admin_area_lvl_1 usually does in come cases looking for sublocality type will be more appropriate
            if (place.address_components[i].types[b] === 'administrative_area_level_1' && objAddress.stateCode.length === 0) {
                objAddress.stateCode = place.address_components[i].short_name;
            }
            // find city name
            if ((place.address_components[i].types[b] === 'locality' || place.address_components[i].types[b] === 'postal_town' || place.address_components[i].types[b] === 'sublocality_level_1') && objAddress.city.length === 0) {
                objAddress.city = place.address_components[i].long_name;
            }
            // find postal code
            if (place.address_components[i].types[b] === 'postal_code' && objAddress.postalCode.length === 0) {
                objAddress.postalCode = place.address_components[i].long_name;
            }
            // find country code
            if (place.address_components[i].types[b] === 'country' && objAddress.countryCode.length === 0) {
                objAddress.countryCode = place.address_components[i].short_name;
            }
            if (objAddress.stateCode.length > 0 && objAddress.city.length > 0 && objAddress.postalCode.length > 0 && objAddress.countryCode.length > 0) {
                break;
            }
        }
    }

    return objAddress;
}

module.exports = {
    getGeoAddressFromGoogleObject: getGeoAddressFromGoogleObject,
    checkPlaceForPostalCode: checkPlaceForPostalCode
};
