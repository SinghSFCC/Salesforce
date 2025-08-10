'use strict';

const Template = require('dw/util/Template');
const HashMap = require('dw/util/HashMap');
const URLUtils = require('dw/web/URLUtils');

/**
 * Render logic for storefront.productBannerStrip component.
 * @param {dw.experience.ComponentScriptContext} context The Component script context object.
 * @returns {string} The template to be displayed
 */

module.exports.render = function (context) {
    const content = context.content;
    const model = new HashMap();
    model.videoLink = content.videoLink;
    return new Template('experience/components/youtubeComponent').render(model).text;
};
