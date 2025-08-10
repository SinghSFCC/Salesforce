'use strict';

/* global request */

var HashMap = require('dw/util/HashMap');

/**
 * Check if product comparision is enabled for a category or any of its ancestors.
 *
 * @param {dw.catalog.Category} selectedCategory the category that should be checked
 * @returns {boolean} true if product comparision is enabled, false if it is not enabled.
 */
function getCategoryCompareStatus(selectedCategory) {
    var compareBooleanValue = false;
    if (selectedCategory) {
        var currentCategory;
        compareBooleanValue = selectedCategory.custom.enableCompare;

        if (selectedCategory.parent) {
            currentCategory = selectedCategory.parent;
            while (currentCategory.ID !== 'root') {
                compareBooleanValue = compareBooleanValue || currentCategory.custom.enableCompare;
                currentCategory = currentCategory.parent;
            }
        }
    }
    return compareBooleanValue;
}

/**
 * Render logic for the storefront.popularCategories.
 * @param {dw.experience.ComponentScriptContext} context The Component script context object.
 * @param {dw.util.Map} [modelIn] Additional model values created by another cartridge. This will not be passed in by Commcerce Cloud Plattform.
 *
 * @returns {string} The markup to be displayed
 */
module.exports.render = function (context, modelIn) {
    var model = modelIn || new HashMap();

    var content = context.content;
    model.compareEnabled = getCategoryCompareStatus(content.category);

    return module.superModule.render(context, model);
};
