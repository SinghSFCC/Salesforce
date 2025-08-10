'use strict'
 const {backButtonDetection, setupSearch, getCategoryTemplate, getPageDesignerCategoryPage, setupContentSearch, applyCache, getBannerImageUrl} = module.superModule;

 /**
 * performs a search
 *
 * @param {Object} req - Provided HTTP query parameters
 * @param {Object} res - Provided HTTP query parameters
 * @return {Object} - an object with relevant search information
 * @param {Object} httpParameterMap - Query params
 */
function search(req, res) {
    var CatalogMgr = require('dw/catalog/CatalogMgr');
    var URLUtils = require('dw/web/URLUtils');
    var ProductSearchModel = require('dw/catalog/ProductSearchModel');

    var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
    var ProductSearch = require('*/cartridge/models/search/productSearch');
    var reportingUrlsHelper = require('*/cartridge/scripts/reportingUrls');
    var schemaHelper = require('*/cartridge/scripts/helpers/structuredDataHelper');

    var apiProductSearch = new ProductSearchModel();
    var categoryTemplate = '';
    var maxSlots = 4;
    var productSearch;
    var reportingURLs;

    var searchRedirect = req.querystring.q ? apiProductSearch.getSearchRedirect(req.querystring.q) : null;

    if (searchRedirect) {
        return { searchRedirect: searchRedirect.getLocation() };
    }

    apiProductSearch = setupSearch(apiProductSearch, req.querystring, req.httpParameterMap);
    apiProductSearch.search();

    if (!apiProductSearch.personalizedSort) {
        applyCache(res);
    }
    categoryTemplate = getCategoryTemplate(apiProductSearch);
    productSearch = new ProductSearch(
        apiProductSearch,
        req.querystring,
        req.querystring.srule,
        CatalogMgr.getSortingOptions(),
        CatalogMgr.getSiteCatalog().getRoot()
    );

    pageMetaHelper.setPageMetaTags(req.pageMetaData, productSearch);

    var canonicalUrl = URLUtils.url('Search-Show', 'cgid', req.querystring.cgid);
    var refineurl = URLUtils.url('Search-Refinebar');
    var categoryRefineUrl = URLUtils.url('Search-CategoryRefinebar');
    var allowedParams = ['q', 'cgid', 'pmin', 'pmax', 'srule', 'pmid'];
    var isRefinedSearch = false;

    Object.keys(req.querystring).forEach(function (element) {
        if (allowedParams.indexOf(element) > -1) {
            refineurl.append(element, req.querystring[element]);
            categoryRefineUrl.append(element, req.querystring[element]);
        }

        if (['pmin', 'pmax'].indexOf(element) > -1) {
            isRefinedSearch = true;
        }

        if (element === 'preferences') {
            var i = 1;
            isRefinedSearch = true;
            Object.keys(req.querystring[element]).forEach(function (preference) {
                refineurl.append('prefn' + i, preference);
                categoryRefineUrl.append('prefn' + i, preference);
                refineurl.append('prefv' + i, req.querystring[element][preference]);
                categoryRefineUrl.append('prefv' + i, req.querystring[element][preference]);
                i++;
            });
        }
    });

    if (productSearch.searchKeywords !== null && !isRefinedSearch) {
        reportingURLs = reportingUrlsHelper.getProductSearchReportingURLs(productSearch);
    }

    var result = {
        productSearch: productSearch,
        maxSlots: maxSlots,
        reportingURLs: reportingURLs,
        refineurl: refineurl,
        categoryRefineUrl: categoryRefineUrl,
        canonicalUrl: canonicalUrl,
        apiProductSearch: apiProductSearch
    };

    if (productSearch.isCategorySearch && !productSearch.isRefinedCategorySearch && categoryTemplate && apiProductSearch.category.parent.ID === 'root') {
        pageMetaHelper.setPageMetaData(req.pageMetaData, productSearch.category);
        result.category = apiProductSearch.category;
        result.categoryTemplate = categoryTemplate;
    }

    if (!categoryTemplate || categoryTemplate === 'rendering/category/categoryproducthits') {
        result.schemaData = schemaHelper.getListingPageSchema(productSearch.productIds);
    }

    return result;
}


exports.backButtonDetection = backButtonDetection;
exports.setupSearch = setupSearch;
exports.getCategoryTemplate = getCategoryTemplate;
exports.getPageDesignerCategoryPage = getPageDesignerCategoryPage;
exports.setupContentSearch = setupContentSearch;
exports.applyCache = applyCache;
exports.getBannerImageUrl = getBannerImageUrl;
exports.search = search;
