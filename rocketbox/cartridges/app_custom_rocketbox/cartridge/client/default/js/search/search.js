
'use strict';
var baseSearch = require('base/search/search');

/**
 * Update DOM elements with Ajax results
 *
 * @param {Object} $results - jQuery DOM element
 * @param {string} selector - DOM element to look up in the $results
 * @return {undefined}
 */
 function updateDom($results, selector) {
    var $updates = $results.find(selector);
    $(selector).empty().html($updates.html());
}


/**
 * Update sort option URLs from Ajax response
 *
 * @param {string} response - Ajax response HTML code
 * @return {undefined}
 */
 function updateSortOptions(response) {
    var $tempDom = $('<div>').append($(response));
    var sortOptions = $tempDom.find('.grid-footer').data('sort-options').options;
    sortOptions.forEach(function (option) {
        $('option.' + option.id).val(option.url);
    });
}


/**
 * Keep refinement panes expanded/collapsed after Ajax refresh
 * @param {Object} $results - jQuery DOM element
 * @return {undefined}
 */
function handleRefinements($results) {
    $('.refinement.active').each(function () {
        $(this).removeClass('active');
        var activeDiv = $results.find('.' + $(this)[0].className.replace(/ /g, '.'));
        activeDiv.addClass('active');
        activeDiv.find('button.title').attr('aria-expanded', 'true');
    });

    updateDom($results, '.refinements.all-refinements');
    updateDom($results, '.refinements.category-refinements');
}

/**
 * Parse Ajax results and updated select DOM elements
 *
 * @param {string} response - Ajax response HTML code
 * @return {undefined}
 */
 function parseResults(response, updateOnlyRefinementBar) {
    var $results = $(response);
    var specialHandlers = {
        '.refinements': handleRefinements
    };

    if(!updateOnlyRefinementBar){
        // Update DOM elements that do not require special handling
        [
            '.grid-header:not(".category-refinement-header")',
            '.header-bar',
            '.header.page-title',
            '.product-grid',
            '.show-more',
            '.filter-bar'
        ].forEach(function (selector) {
            updateDom($results, selector);
        });
    }

    Object.keys(specialHandlers).forEach(function (selector) {
        specialHandlers[selector]($results);
    });
}

function refinementHandler(e, updateOnlyRefinementBar){
    e.preventDefault();
            e.stopPropagation();

            $.spinner().start();
            $(this).trigger('search:filter', e);
            $.ajax({
                url: $(this).data('href'),
                data: {
                    page: $('.grid-footer').data('page-number'),
                    selectedUrl: $(this).data('href')
                },
                method: 'GET',
                success: function (response) {
                    parseResults(response,updateOnlyRefinementBar);
                    plpLazyLoad.update();
                    $.spinner().stop();
                },
                error: function () {
                    $.spinner().stop();
                }
            });
}

function closeRefinementBar(){
    if(window.refinementBarInitialState){
        $('.refinement-bar-container').replaceWith(window.refinementBarInitialState);
    }
    $('.refinement-bar-container.open').removeClass('open');
    $('.modal-background').hide();
    window.refinementBarInitialState = null;
}

baseSearch.applyFilter = function () {
    // Handle refinement value selection and reset click where entire dom needs change
    $('.container').on(
        'click',
        '.refinement-bar button.reset, .floating-refinement-bar button.reset, .selected-filter-brick button, .swatch-filter button',
        function(e){
            refinementHandler.call(this,e,false);
            closeRefinementBar();
        });

    // Handle grouped refinement selection
        $('.container').on(
            'click',
            '.floating-refinement-bar button.finalize-refinements',
            function(e){
                if($(this).data('href') && $(this).data('href').length > 0){
                    refinementHandler.call(this,e,false);
                    closeRefinementBar();
                }
                else{
                    closeRefinementBar();
                }
            });

    // Handle refinement value selection that need to be held for grouping
    $('.container').on(
        'click',
        '.floating-refinement-bar .refinements button:not(".expander, .title")',
        function(e){
            if(!window.refinementBarInitialState){
                window.refinementBarInitialState = $('.refinement-bar-container').clone();
            }
            $('.floating-refinement-bar button.finalize-refinements').attr('data-href', $(this).data('href'));
            refinementHandler.call(this,e,true);

        });

        $('.container').on(
            'click',
            '.refinement-bar .refinements button:not(".expander, .title, .sort-option-btn"), .category-refinement-bar .refinements button:not(".expander, .title")',
            function(e){
                refinementHandler.call(this,e,false);
            });
}

baseSearch.mobileSort = function () {
    // Handle sort order menu selection
    $('.container').on('click', '#sort-menu .sort-option-btn', function (e) {
        e.preventDefault();
        var $this = $(this);
        $.spinner().start();
        $this.trigger('search:sort', $this.data('sortvalue'));
        $.ajax({
            url: $this.data('sortvalue'),
            data: { selectedUrl: $this.data('sortvalue') },
            method: 'GET',
            success: function (response) {
                $('.product-grid').empty().html(response);
                $this.parent().siblings().find('i.fa-check-circle').addClass('fa-circle-o').removeClass('fa-check-circle');
                $this.find('i.fa-circle-o').addClass('fa-check-circle').removeClass('fa-circle-o');
                window.globalLazyLoad.update();
                $.spinner().stop();
            },
            error: function () {
                $.spinner().stop();
            }
        });
    });
}

baseSearch.quickViewShow = function () {
    $('.container').on('mouseenter', '.product', function (e) {
        $(this).find('a.quickview:not(.quickview-show)').addClass('quickview-show');
    });

    $('.container').on('mouseleave', '.product', function (e) {
        $(this).find('a.quickview.quickview-show').removeClass('quickview-show');
    });
}

baseSearch.init = function(){
    $('.container').on('scroll', '.refinement-bar', function(e){
        $(e.target).parents('.refinement-bar-container').addClass('on-scrollbar');

        clearTimeout($.data(this, 'scrollTimer'));
        $.data(this, 'scrollTimer', setTimeout(function() {
            $('.on-scrollbar').removeClass('on-scrollbar');
        }, 500));
        });

        $('.container').on('click', '.close-refinement-btn', closeRefinementBar);

    $('.container').on('click', '.filter-results', function() {
        $('.refinement-bar-container').addClass('open');
    });

    $('.container').on('click', '.tile-view-selector button', function() {
        if($(this).hasClass('fa-align-left') && !$(this).hasClass('selected')){
            $('.tile-view-selector button').toggleClass('selected')
            $('.product-tile.tile-view').hide();
            $('.tile-sizer').removeClass('col-sm-4').addClass('col-sm-12');
            $('.product-tile.list-view').css('display','flex');
        }
        else if($(this).hasClass('fa-th') && !$(this).hasClass('selected')){
            $('.tile-view-selector button').toggleClass('selected')
            $('.product-tile.list-view').hide();
            $('.tile-sizer').removeClass('col-sm-12').addClass('col-sm-4');
            $('.product-tile.tile-view').show();
        }
    });
};

baseSearch.sort = function () {
    // Handle sort order menu selection
    $('.container').on('change', '[name=sort-order]', function (e) {
        e.preventDefault();
        var text = $(this).find('option:selected').text();
        var $aux = $('<select/>').append($('<option/>').text(text));
        $(this).after($aux);
        $(this).width($aux.width()+24);
        $aux.remove();
        $.spinner().start();
        $(this).trigger('search:sort', this.value);
        $.ajax({
            url: this.value,
            data: { selectedUrl: this.value },
            method: 'GET',
            success: function (response) {
                $('.product-grid').empty().html(response);
                plpLazyLoad.update();
                $.spinner().stop();
            },
            error: function () {
                $.spinner().stop();
            }
        });
    });
};

baseSearch.lazyLoadOptions = function(){
    window.plpLazyLoad = new LazyLoad({
        callback_error : function(element){
            element.src = element.dataset['loadError']
            if(element.dataset.bg){
                $(element).css('background-image','url('+element.dataset['loadError']+')');
            }
        },
    });
}

baseSearch.showMore = function () {
    // Show more products
    $('.container').on('click', '.show-more button', function (e) {
        e.stopPropagation();
        var showMoreUrl = $(this).data('url');
        e.preventDefault();

        $.spinner().start();
        $(this).trigger('search:showMore', e);
        $.ajax({
            url: showMoreUrl,
            data: { selectedUrl: showMoreUrl },
            method: 'GET',
            success: function (response) {
                $('.grid-footer').replaceWith(response);
                updateSortOptions(response);
                plpLazyLoad.update();
                $.spinner().stop();
            },
            error: function () {
                $.spinner().stop();
            }
        });
    });
};

module.exports = baseSearch;