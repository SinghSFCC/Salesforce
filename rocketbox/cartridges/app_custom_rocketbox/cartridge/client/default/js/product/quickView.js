'use strict';
var baseQuickView = require('base/product/quickView');
var base = require('./base');

baseQuickView.focusQuickview = function () {
    $('body').on('shown.bs.modal', '#quickViewModal', function () {
        $('#quickViewModal .close').focus();

        
    });
};

baseQuickView.initCarousel = function() {
    $('body').on('quickview:ready', function() {
        $('#quickViewModal .slider-for').slick({
            slidesToShow: 1,
            slidesToScroll: 1,
            arrows: true,
            fade: true,
            asNavFor: '.slider-nav'
        });
        $('#quickViewModal .slider-nav').slick({
            slidesToShow: 4,
            slidesToScroll: 1,
            vertical:true,
            asNavFor: '.slider-for',
            dots: false,
            focusOnSelect: true,
            verticalSwiping:true,
        });
        baseQuickView.modifyQuantity();
    });
}

baseQuickView.modifyQuantity = base.modifyQuantity;

baseQuickView.addToCart = base.addToCart;

baseQuickView.colorAttribute = base.colorAttribute;

baseQuickView.selectAttribute = base.selectAttribute;

baseQuickView.availability = base.availability;

module.exports = baseQuickView;