'use strict';

const Template = require('dw/util/Template');
const HashMap = require('dw/util/HashMap');
const PageRenderHelper = require('*/cartridge/experience/utilities/PageRenderHelper.js');
const RegionModelRegistry = require('*/cartridge/experience/utilities/RegionModelRegistry.js');

/**
 * Render logic for the home page.
 * @param {dw.experience.PageScriptContext} context The page script context object.
 * @returns {string} The template text
*/
module.exports.render = function (context) {
    const model = new HashMap();
    const page = context.page;
    model.page = page;     // automatically register configured regions
    const metaDefinition = require('*/cartridge/experience/pages/customHomePage.json');
    model.regions = new RegionModelRegistry(page, metaDefinition);

    // Used in htmlHead.isml via common/layout/page.isml decorator.
    model.CurrentPageMetaData = {};
    model.CurrentPageMetaData.title = metaDefinition.name;
    model.CurrentPageMetaData.description = page.pageDescription;
    model.CurrentPageMetaData.keywords = page.pageKeywords;
    if (PageRenderHelper.isInEditMode()) {
        const HookManager = require('dw/system/HookMgr');
        HookManager.callHook('app.experience.editmode', 'editmode');
        model.resetEditPDMode = true;
    }

    // render the page
    return new Template('experience/pages/customHomePage').render(model).text;
};
