'use strict';

var productSearchBase = module.superModule;
var collections = require('*/cartridge/scripts/util/collections');
var searchRefinementsFactory = require('*/cartridge/scripts/factories/searchRefinements');
var Logger = require('dw/system/Logger');

/**
 * Retrieves search refinements
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @param {dw.catalog.ProductSearchRefinements} refinements - Search refinements
 * @param {ArrayList.<dw.catalog.ProductSearchRefinementDefinition>} refinementDefinitions - List of
 *     product serach refinement definitions
 * @return {Refinement[]} - List of parsed refinements
 */
 function getCategoryRefinement(productSearch, refinements, refinementDefinitions) {
     var categoryRefinementDefinition = collections.find(refinementDefinitions, function(definition){
        return definition.categoryRefinement;
     })
    
        if(!empty(categoryRefinementDefinition)){
            var refinementValues = refinements.getAllRefinementValues(categoryRefinementDefinition);
            var values = searchRefinementsFactory.get(productSearch, categoryRefinementDefinition, refinementValues);

            return {
                displayName: categoryRefinementDefinition.displayName,
                isCategoryRefinement: categoryRefinementDefinition.categoryRefinement,
                isAttributeRefinement: categoryRefinementDefinition.attributeRefinement,
                isPriceRefinement: categoryRefinementDefinition.priceRefinement,
                isPromotionRefinement: categoryRefinementDefinition.promotionRefinement,
                values: values
            };
        }
}

/**
 * Returns the refinement values that have been selected
 *
 * @param {Array.<CategoryRefinementValue|AttributeRefinementValue|PriceRefinementValue>}
 *     refinements - List of all relevant refinements for this search
 * @return {Object[]} - List of selected filters
 */
 function getSelectedFilters(refinements) {
    var selectedFilters = [];
    var selectedValues = [];

    refinements.forEach(function (refinement) {
        selectedValues = refinement.values.filter(function (value) { return value.selected; });
        selectedValues = selectedValues.map(function(value){
            Object.assign(value, {'displayName': refinement.displayName});
            return value;
        })
        if (selectedValues.length) {
            selectedFilters.push.apply(selectedFilters, selectedValues);
        }
    });

    return selectedFilters;
}

function ProductSearch(productSearch, httpParams, sortingRule, sortingOptions, rootCategory) {
    productSearchBase.call(this, productSearch, httpParams, sortingRule, sortingOptions, rootCategory);
    this.categoryRefinement = getCategoryRefinement(
        this.productSearch,
        this.productSearch.refinements,
        this.productSearch.refinements.refinementDefinitions
    );
    }

    ProductSearch.prototype = Object.create(productSearchBase.prototype);

    Object.defineProperty(ProductSearch.prototype, 'selectedFilters', {
        get: function () {
            return getSelectedFilters(this.refinements);
        }
    });

    module.exports = ProductSearch;