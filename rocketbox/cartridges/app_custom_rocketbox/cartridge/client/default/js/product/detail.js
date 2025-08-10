'use strict';
var baseDetail = require('base/product/detail');
var base = require('./base');
baseDetail.scrollToRatingReviews = function(){
    $('.product-number-rating a').on('click', function(){
        $('.rating-reviews.collapsible-xl').addClass('active')[0].scrollIntoView({behavior: "smooth"});
    });
};

baseDetail.initProductImageCarousel = function(){
    $('.slider-for').slick({
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: false,
        fade: true,
        asNavFor: '.slider-nav'
    });
    $('.slider-nav').slick({
        slidesToShow: 4,
        slidesToScroll: 1,
        vertical:true,
        asNavFor: '.slider-for',
        dots: false,
        focusOnSelect: true,
        verticalSwiping:true
    });
};

baseDetail.sizeChart = function () {
    $('.size-chart a').on('click', function (e) {
        e.preventDefault();
        var url = $(this).attr('href');
        var $prodSizeChart = $(this).closest('.size-chart').find('.size-chart-collapsible');
        if ($prodSizeChart.is(':empty')) {
            $.ajax({
                url: url,
                type: 'get',
                dataType: 'json',
                success: function (data) {
                    $prodSizeChart.append(data.content);
                }
            });
        }
        $prodSizeChart.toggleClass('active');
    });

    var $sizeChart = $('.size-chart-collapsible');
    $('body').on('click touchstart', function (e) {
        if ($('.size-chart').has(e.target).length <= 0) {
            $sizeChart.removeClass('active');
        }
    });
};

baseDetail.modifyQuantity = base.modifyQuantity;

baseDetail.addToCart = base.addToCart;

baseDetail.colorAttribute = base.colorAttribute;

baseDetail.selectAttribute = base.selectAttribute;

baseDetail.availability = base.availability;

module.exports = baseDetail;