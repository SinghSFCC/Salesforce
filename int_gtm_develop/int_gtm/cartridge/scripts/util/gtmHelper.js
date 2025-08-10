'use strict';

var collections = require('*/cartridge/scripts/util/collections');
var URLUtils = require('dw/web/URLUtils');
var BasketMgr = require('dw/order/BasketMgr');

/**
 * Get gtm product details for a given product
 * @param {dw.catalog.Product} item - Product
 * @param  gtmBasketData -Gtm Data
 * @returns gtmProductList -product array for products
 */
function getProductDetail(gtmProduct, gtmBasketData, eventType) {
    var price = 'list' in gtmProduct.price && gtmProduct.price.list !== null ? gtmProduct.price.list.decimalPrice : null;
    price = (price === null || price === undefined) && 'sales' in gtmProduct.price && gtmProduct.price.sales !== null ? gtmProduct.price.sales.decimalPrice : price;
    var brand = !empty(gtmProduct.brand) ? gtmProduct.brand : 'RocketBox';
    var category = 'category' in gtmProduct ? gtmProduct.category : 'SFRA';
    var imageURL = '';
    var gtmProductList = [];
    var position = 1;
    var coupon = '';
    var currentBasket = BasketMgr.getCurrentOrNewBasket();
    var allPromotions = gtmProduct.promotions;

   if(!empty(allPromotions)){ 
        allPromotions.forEach(function (promotion, index) {
            if (promotion.coupons) {
                coupon += promotion.coupons[index];
            }
        });
   }
    if (!empty(gtmProduct)) {
        var images = gtmProduct.images.large;
        var result = !empty(images) ? images[0] : null;
        if (!empty(result)) {
            imageURL = result.absURL.toString();
        }
    }

    var productUrl = URLUtils.abs('Product-Show', 'pid', gtmProduct.id).toString();
    var gtmProductAdded = {
        "event" : eventType,
        "product_id": gtmProduct.id,
        "name": gtmProduct.productName,
        "price": price,
        "brand": brand,
        "category": category,
        "position": position,
        "quantity": gtmProduct.selectedQuantity,
        "cart_id": currentBasket.UUID,
        "coupon" : !empty(coupon) ? coupon : 'No Coupon Asociated With Product',
        "image_url" : imageURL,
        "sku": gtmProduct.manufacturerSKU ? gtmProduct.manufacturerSKU : gtmProduct.id,
        "url" : productUrl,
        "variant" : gtmProduct.variationAttributes
    }

    gtmProductList.push(gtmProductAdded);

    return gtmProductList;
}

function getProductAddToCart(gtmBasketData) {
    var counter = 0;
    var currentBasket = BasketMgr.getCurrentOrNewBasket();
    var gtmItemList = [];
    var coupon = '';

    for each(var item in gtmBasketData.items) {
        if (item.bonusProductLineItemUUID !== 'bonus') {
            var price = 'list' in item.price && item.price.list !== null ? item.price.list.decimalPrice : null;
            price = (price === null || price === undefined) && 'sales' in item.price && item.price.sales !== null ? item.price.sales.decimalPrice : price;
            var brand = !empty(item.brand) ? item.brand : 'RocketBox';
            var category = 'category' in item ? item.category : 'SFRA';
            var productUrl = URLUtils.abs('Product-Show', 'pid', item.id).toString();
            var imageURL = '';

            if (!empty(item)) {
                var images = item.images.small;
                var result = !empty(images) ? images[0] : null;
                if (!empty(result)) {
                    imageURL = result.absURL.toString();
                }
            }

            var allPromotions = item.appliedPromotions;
            if(!empty(allPromotions)){
                allPromotions.forEach(function (promotion, index) {
                if (promotion.coupons) {
                    coupon += promotion.coupons[index];
                }
                });
            }

            var lineItem = {
                "product_id": item.id,
                "name": item.productName,
                "price": price,
                "brand": brand,
                "category": category,
                "position": counter,
                "quantity": item.quantity,
                "cart_id": currentBasket.UUID,
                "coupon" : !empty(coupon) ? coupon : 'No Coupon Asociated With Product',
                "image_url" : imageURL,
                "sku": item.id,
                "url" : productUrl, 
                "variant" : item.variationAttributes
            }
            gtmItemList.push(lineItem);
            counter++;
        }
    }

    return gtmItemList;
}

function getProductAddToWishList(gtmBasketData) {
    var counter = 0;
    var currentBasket = BasketMgr.getCurrentOrNewBasket();
    var gtmItemList = [];
    var coupon = '';
    var wishlistid =  gtmBasketData.wishlist.UUID;
    var wishlistname =  'RocketBox';
    
    for each(var item in  gtmBasketData.wishlist.items) {
        if (item.bonusProductLineItemUUID !== 'bonus') {
            var price = 'list' in item.priceObj && item.priceObj.list !== null ? item.priceObj.list.decimalPrice : null;
            price = (price === null || price === undefined) && !empty(item.priceObj) && (item.priceObj.sales !== null) ? item.priceObj.sales.decimalPrice : price;
            var brand = !empty(item.brand) ? item.brand : 'RocketBox';
            var category = 'category' in item ? item.category : 'SFRA';
            var productUrl = URLUtils.abs('Product-Show', 'pid', item.pid).toString();
            var imageURL = '';

            if (!empty(item)) {
                var images = item.imageObj.small;
                var result = !empty(images) ? images[0] : null;
                if (!empty(result)) {
                    imageURL = result.absURL.toString();
                }
            }

            var allPromotions = item.appliedPromotions;
            if(!empty(allPromotions)){
                allPromotions.forEach(function (promotion, index) {
                if (promotion.coupons) {
                    coupon += promotion.coupons[index];
                }
                });
            }

            var lineItem = {
                "product_id": item.pid,
                "name": item.name,
                "price": price,
                "brand": brand,
                "category": category,
                "position": counter,
                "quantity": item.qty,
                "cart_id": currentBasket.UUID,
                "coupon" : !empty(coupon) ? coupon : 'No Coupon Asociated With Product',
                "image_url" : imageURL,
                "sku": item.id,
                "url" : productUrl,
                "variant" : item.variationAttributes ? item.variationAttributes : item.pid ,
                "wishlistId" : wishlistid,
                "wishlistname" : wishlistname
            }
            gtmItemList.push(lineItem);
            counter++;
        }
    }


    return gtmItemList;
}

module.exports = {
    getProductDetail: getProductDetail,
    getProductAddToCart : getProductAddToCart,
    getProductAddToWishList : getProductAddToWishList
};
