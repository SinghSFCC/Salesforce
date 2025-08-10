'use strict';

const Template = require('dw/util/Template');
const HashMap = require('dw/util/HashMap');
const URLUtils = require('dw/web/URLUtils');
const service = require('*/cartridge/services/InstagramFeedService');

/**
 * Call Instagram Service and render the insta media files.
 * @param {dw.experience.ComponentScriptContext} context The Component script context object.
 * @returns {string} The template to be displayed
 */

module.exports.render = function (context) {
    const content = context.content;
    const model = new HashMap();

    var url = service.instagramFeedService.getURL() + '?fields=media_type,permalink,media_url,caption&limit=' + content.limit + '&access_token='+content.accessToken;

    var svcResult = service.instagramFeedService.setURL(url).call();
    if (svcResult.status === 'OK') {
        model.mediaFiles = svcResult.object.data.filter(d => d.media_type === "IMAGE");
    }

    return new Template('experience/components/instagramComponent').render(model).text;
};
