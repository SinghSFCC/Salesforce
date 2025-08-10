/* global $, google */
'use strict';

var zenGoogle = require('./zen-google');
// TODO: var geocoder = new google.maps.Geocoder();

/**
 * Format price
 * @param {string} currency - Currencty code
 * @param {string|number} totalCost - total cost
 * @returns {string} - HTML Formatted price
 */
function getFormatedPrice(currency, totalCost) {
    var thisCurrency = currency;
    var thisTotalCost = totalCost;
    if (thisCurrency.toLowerCase() === 'usd') {
        thisCurrency = '$';
    } else if (thisCurrency.toLowerCase() === 'eur') {
        thisCurrency = '€';
    }
    if (thisTotalCost.indexOf('.') > -1) {
        var splitedPrice = totalCost.split('.');
        if (splitedPrice.length === 2 && splitedPrice[1].length === 1) {
            thisTotalCost += '0';
        }
    }
    return '<span> - ' + thisCurrency + thisTotalCost + '</span>';
}

/**
 * Initialize events
 */
function initEvents() {
    // bind address autocomplete for EDD search to window.autocomplete
    var searchInput = $('#zk_location')[0];
    var autocomplete = new google.maps.places.Autocomplete(searchInput);

    google.maps.event.addListener(autocomplete, 'place_changed', function () {
        var place = autocomplete.getPlace();
        var doesPlaceHavePostalCode = zenGoogle.checkPlaceForPostalCode(place);
        if (!doesPlaceHavePostalCode) {
            $('#zk_location').addClass('is-invalid');
            $('.stage1').append('<small class="error text-danger">The selected address must have postal-code.</small>');
            return;
        }
        $('.zenkraft_estimated_delivery_pdp').spinner().start();
        var productID = $('.container.product-detail').data('pid');
        var url = $('.zenkraft_estimated_delivery_pdp').data('methodurl');
        var address = {};
        var reqdata = {};

        try {
            $('.stage1').find('.error').remove();
            $('#zk_location').removeClass('is-invalid');
            address = zenGoogle.getGeoAddressFromGoogleObject(place);
        } catch (error) {
            $('#zk_location').addClass('is-invalid');
            $('.stage1').append('<small class="error text-danger">Please enter your full address. </small>');
            $('.zenkraft_estimated_delivery_pdp').spinner().stop();
            return;
        }

        reqdata = {
            pid: productID,
            address1: address.address1,
            countryCode: address.countryCode,
            stateCode: address.stateCode,
            postalCode: address.postalCode,
            city: address.city
        };
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: url,
            contentType: 'application/json',
            data: reqdata
        })
            .done(function (response) {
                var html = '';
                if (response.shipMethods && response.shipMethods.length > 0) {
                    response.shipMethods.forEach(function (method) {
                        if (!method.futureDateDelivery) {
                            html += '<div class="row mt-2"><div class="col-1 col-lg-1 ">';
                            html += '<input type="radio" id="edd-ship-selection" name="edd-shipping-option" value="' + method.ID + '"/></div>';
                            html += '<div class="col-11 col-lg-11 ">';
                            html += method.displayName;

                            if (method.estimatedArrivalTime) {
                                html += ' - <span style="color:#0F7E11"> ' + method.estimatedArrivalTime + '</span>';
                            }
                            if (method.currency && method.totalCost) {
                                html += getFormatedPrice(method.currency, method.totalCost);
                            }
                            html += '</div></div>';
                        }
                    });
                    html += '<hr>';
                    $('.stage2').append(html);
                } else if (response.msg) {
                    html = '<div class="noresults-pdp">' + response.msg + '</div>';
                    $('.stage2').append(html);
                }
                $('.zenkraft_estimated_delivery_pdp').spinner().stop();
            });

        if (place.formatted_address.includes('China')) {
            $('.stage1').css('display', 'none');
            $('.stage3').css('display', 'block');
        } else {
            $('.stage1').css('display', 'none');
            $('.stage2').css('display', 'block');
        }

        $('#pref-save-address').val(place.formatted_address);


        $('.destination').html(place.formatted_address);
    });

    $(document).on('click', '.noresults-pdp', function () {
        var $stage1 = $('.stage1');
        var $stage2 = $('.stage2');

        $stage2.css('display', 'none');
        $stage1.css('display', 'block');
        $stage1.find('#zk_location').val('');
        $stage2.find('.noresults-pdp').remove();
    });

    $('body').on('product:afterAddToCart', function (event, data) {
        var shippingUrl = data.cart.actionUrls.selectShippingUrl;
        var selectedID = $('input[name="edd-shipping-option"]:checked').val();
        if (selectedID) {
            var urlParams = {
                methodID: selectedID
            };

            $.ajax({
                url: shippingUrl,
                type: 'post',
                dataType: 'json',
                data: urlParams,
                success: function () {
                    // TODO
                }
            });
        }
    });
}

/**
 * Set countdown
 */
function setCountdown() {
    var countDown = new Date();
    countDown.setHours(20, 0, 0);
    var countDownDate = countDown.getTime();

    // Update the count down every 1 second
    var x = setInterval(function () {
        // Get today's date and time
        var nowDate = new Date();
        var now = nowDate.getTime();

        // Find the distance between now and the count down date
        var distance = countDownDate - now;

        // if we have passed the countdown date, countdown to tomorrow
        if (distance <= 0) {
            countDown.setDate(countDown.getDate() + 1);
            countDownDate = countDown.getTime();
            distance = countDownDate - now;
        }

        // Time calculations for days, hours, minutes and seconds
        // var days = Math.floor(distance / (1000 * 60 * 60 * 24));
        var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Display the result
        $('.time-countdown').text('within ' + hours + 'h '
            + minutes + 'm ' + seconds + 's ');

        // If the count down is finished, write some text
        if (distance < 0) {
            clearInterval(x);
        }
    }, 1000);
}

initEvents();
setCountdown();
