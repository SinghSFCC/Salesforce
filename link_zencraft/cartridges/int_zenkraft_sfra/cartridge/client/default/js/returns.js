/* global jQuery, $, google */
'use strict';
var dropOffModal = require('./dropOffModal');

/**
 * Initialize return map
 * @param {Object} collectionPoint - Collection point
 * @returns {Object} - Google Maps marker
 */
function initReturnMap(collectionPoint) {
    // set up the map
    var latlng = new google.maps.LatLng(collectionPoint.lat, collectionPoint.lng);
    // var bounds = new google.maps.LatLngBounds();
    var latNumber = parseFloat(collectionPoint.lat);
    var lngNumber = parseFloat(collectionPoint.lng);

    var mapOptions = {
        zoom: 15,
        center: latlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    // init map
    var locmap = new google.maps.Map($('.return-map-container').get(0), mapOptions);

    // set marker
    var marker1 = new google.maps.Marker({ position: { lat: latNumber, lng: lngNumber }, map: locmap });
    return marker1;
}

/**
 * Initialize events
 */
function initEvents() {
    var locationBody;

    /**
     * Show select items
     */
    function showSelectItems() {
        $('.js-select-return-items').show();
        $('.js-select-return-reasons').hide();
        $('.js-button-returns-back').hide();
        $('.js-button-returns-next').show();
        $('.js-label-step, .js-reasons-step')
            .find('.js-progress-rectangle, .js-progress-triangle')
            .removeClass('active');
        $('.js-select-items-step')
            .find('.js-progress-rectangle, .js-progress-triangle')
            .addClass('active');
    }

    /**
     * Populate reasons element
     */
    function showReasons() {
        $('.js-select-return-items').hide();
        $('.js-return-label').hide();
        $('.js-button-returns-back').show();
        $('.js-button-returns-next').show();
        $('.js-checkbox-return-item:not(:checked)').each(function () {
            var orderItemID = this.id;
            $('.js-reason-line[data-orderitemid="' + orderItemID + '"]').hide();
        });
        $('.js-checkbox-return-item:checked').each(function () {
            var orderItemID = this.id;
            $('.js-reason-line[data-orderitemid="' + orderItemID + '"]').show();
        });
        $('.js-select-return-reasons').show();
        $('.js-select-items-step, .js-label-step')
            .find('.js-progress-rectangle, .js-progress-triangle')
            .removeClass('active');
        $('.js-reasons-step')
            .find('.js-progress-rectangle, .js-progress-triangle')
            .addClass('active');
    }

    /**
     * Display label
     */
    function showLabel() {
        $('.js-select-return-reasons').hide();
        $('.js-button-returns-next').hide();
        $('.js-button-returns-back').hide();
        // $('.js-return-label').show();
        $('.js-select-items-step, .js-reasons-step')
            .find('.js-progress-rectangle, .js-progress-triangle')
            .removeClass('active');
        $('.js-label-step')
            .find('.js-progress-rectangle')
            .addClass('active');
    }

    /**
     * Hanle select items
     */
    function handleSelectItems() {
        var $selectedItems = $('.js-checkbox-return-item:checked');
        if ($selectedItems.length) {
            showReasons();
        } else {
            $('.invalid-feedback').show();
        }
    }

    /**
     * Get nearest dropoff location
     * @param {string} locationURL - Location URL
     * @param {*} locationBodyObject - Location Body
     */
    function getNearestDropOffLocation(locationURL, locationBodyObject, container) {
        $.ajax({
            type: 'POST',
            dataType: 'json',
            url: locationURL,
            contentType: 'application/json',
            data: locationBodyObject
        })
            .done(function (response) {
                var $loader = $('.location-progress');
                var $nearest = container || $('.nearest-location');
                var $address = container || $('.nearest-location');
                var $distance = $address.find('.nearest-loc-distance');
                var $street = $address.find('.nearest-loc-address-street');
                var $city = $address.find('.nearest-loc-address-city');
                var $postal = $address.find('.nearest-loc-address-postal');
                var $button = $address.find('btn-show-more-locations');

                if (!response.error) {
                    sessionStorage.nearestLocation = JSON.stringify(response);
                    $button.attr('data-activelocation', dropOffModal.getDropOffLocationId(sessionStorage.nearestLocation));
                    // populate the location info
                    $distance.html(response.distance + ' ' + response.distance_units);
                    $street.html(response.street1);
                    $city.html(response.city);
                    $postal.html(response.postal_code);
                    initReturnMap(response);
                    $loader.hide();
                    $nearest.show();
                } else {
                    $('.location-progress').html(response.error);
                }
            });
    }

    /**
     * Get return label
     */
    function displayReturnLabel() {
        $(document).ready(function () {
            if ($('#approved-return-case-data').length > 0) {
                showLabel();
                var dataItem = $('#approved-return-case-data');
                locationBody = JSON.stringify({
                    address: {
                        postalCode: dataItem.data('postalcode'),
                        city: dataItem.data('city'),
                        countryCode: {
                            value: dataItem.data('countrycode')
                        },
                        stateCode: dataItem.data('statecode'),
                        address1: dataItem.data('street1')
                    }
                });
                var labelBase64src = 'data:application/pdf;base64,' + dataItem.data('alllabels').split(',')[0];
                labelBase64src = labelBase64src.replace(/\r?\n|\r/g, '');
                $('.return-label-download').attr('href', labelBase64src);
                $('.sample-label-image').show();
                var locationURL = dataItem.data('locationurl');
                getNearestDropOffLocation(locationURL, locationBody);
            }
        });
    }
    displayReturnLabel();


    /**
     * Handle selected reasons dropdown
     */
    function handleSelectReasons() {
        $('body').spinner().start();

        var url = $('.js-button-returns-next').data('url');
        var locationURL = $('.js-button-returns-next').data('locationurl');
        var googleAPIEnabled = $('.js-button-returns-next').data('gmapsenabled');
        var orderID = $('.js-button-returns-next').data('orderid');

        var $selectedLineItems = $('.js-reason-line:visible');
        var items = $selectedLineItems
            .filter(function () {
                var $this = $(this);
                var reasonCode = $this.find('.js-reason').val();
                if (!reasonCode || reasonCode === 'not-selected') { return false; }
                var subReasonEl = $this.find('.js-sub-reason:visible');
                if (subReasonEl.length !== 1) { return false; }
                return subReasonEl.val();
            })
            .map(function () {
                var $this = $(this);
                return {
                    productID: $this.data('itemid'),
                    orderItemID: $this.data('orderitemid'),
                    UUID: $this.data('pliuuid'),
                    reason: {
                        id: $this.find('.js-reason').val(),
                        value: $this.find('.js-reason').find('option:selected').html()
                    },
                    subReason: {
                        id: $this.find('.js-sub-reason:visible').val(),
                        value: $this.find('.js-sub-reason:visible').find('option:selected').html()
                    },
                    quantity: $this.find('.js-return-quantity').val()
                };
            })
            .get();

        if (items.length !== $selectedLineItems.length) {
            $('.label-error').show();
            $('body').spinner().stop();
        }

        $.ajax({
            type: 'POST',
            dataType: 'json',
            url: url,
            contentType: 'application/json',
            data: JSON.stringify({
                items: items,
                orderID: orderID
            })
        })
            .done(function (response) {
                var newurl = window.location.href;
                if (newurl.indexOf('?id=') === -1) {
                    newurl = newurl + '?id=' + response.returnObject.id;
                }
                window.history.pushState({ path: newurl }, '', newurl);
                if (response.returnsRequireApproval) {
                    $('.display-return-label').html(
                        '<h1>Thank you for your request</h1>' +
                        '<p>Our customer service team have received your request.</br>' +
                        'Once your return is approved you will receive an email with</br> a link to download a shipping label.</p>'
                    );
                    $('.js-button-returns-back').hide();
                    $('.display-return-label').show();
                    $('body').spinner().stop();
                    return showLabel();
                }
                var returnLines = response.returnGroups || response.returnLines;
                $('.return-heading .totalLocations').text(returnLines.length);
                $('.return-heading').removeClass('d-none');
                $('.actions').addClass('d-none');
                var i = 1;
                returnLines.forEach(function (ret) {
                    var retLines = ret.returnLines;
                    var $rtLblDisplay = $('.return-labels');
                    if ($rtLblDisplay.length > 0) {
                        $rtLblDisplay.append('<h4 class="return-label-count">Return ' + i + ' of ' + returnLines.length + '</h4>');
                    }
                    var combinedLabel = ret.combinedLabel || false;
                    var combinedLabelPrinted = false;
                    retLines.forEach(function (retLine) {
                        var $retLbl = $('.return-label-template').clone();
                        $retLbl.removeClass('return-label-template');

                        var labelBase64src = '';
                        var labeltype = '';

                        $('body').spinner().stop();
                        if (response.error) {
                            throw new Error('Unable to get label');
                        }

                        // Set product attributes
                        $('.line-item-name', $retLbl).html(retLine.productName);
                        $('.line-item-image img', $retLbl).attr('src', retLine.productImage);
                        $('.line-item-attributes.quantity', $retLbl).html('1');
                        $('.item-data', $retLbl).html(retLine.renderedTemplate);
                        $retLbl.show();

                        if (!combinedLabelPrinted) {
                            labeltype = retLine.labelType.toLowerCase();

                            if (labeltype === 'pdf') {
                                labelBase64src = 'data:application/pdf;base64,' + retLine.label;
                                labelBase64src = labelBase64src.replace(/\r?\n|\r/g, '');
                                $('.sample-label-image', $retLbl).show();
                            } else {
                                labelBase64src = 'data:image/' + labeltype + ';base64,' + retLine.label;
                                $('.label-image img', $retLbl).attr('src', labelBase64src);
                            }
                            $('.return-label-download', $retLbl).attr('href', labelBase64src);
                            var address = JSON.parse(retLine.address);
                            // Get nearest location based on ship from address on order
                            locationBody = JSON.stringify({
                                address: {
                                    postalCode: address.postal_code,
                                    city: address.city,
                                    countryCode: {
                                        value: address.country
                                    },
                                    stateCode: address.state ? address.state : address.stateCode ? address.stateCode : '',
                                    street1: address.street1
                                }
                            });
                            if (googleAPIEnabled) {
                                getNearestDropOffLocation(locationURL, locationBody, $('.nearest-location', $retLbl));
                            }
                            $('.action-container', $retLbl).show();
                            if (combinedLabel) {
                                $('.return-label-download', $retLbl).text('Download All');
                                combinedLabelPrinted = true;
                            }
                        }
                        showLabel();
                        $('.return-labels').append($retLbl);
                    });
                    i++;
                });
                $('body').spinner().stop();
            });
    }

    $('.js-button-returns-next').click(function () {
        $('.invalid-feedback').hide();
        if ($('.js-select-return-items').is(':visible')) {
            handleSelectItems();
        } else {
            handleSelectReasons();
        }
    });

    $('.js-button-returns-back').click(function () {
        if ($('.js-return-label').is(':visible')) {
            showReasons();
        } else {
            showSelectItems();
        }
    });
    $(document).off('change', '.return-reason-selector').on('change', '.return-reason-selector', function () {
        var $lineItem = $(this).closest('.js-reason-line');
        $lineItem.find('.js-sub-reason.active')
            .removeClass('active')
            .hide();
        var selectedReason = $(this).val();
        $lineItem.find('.js-sub-reason-' + selectedReason)
            .addClass('active')
            .show();
    });

    $(document).on('click', 'button.choose-location', function (e) {
        e.preventDefault();
        var collectionPointData = JSON.parse(sessionStorage['collection-point-' + $(this).parents('.collection-point').attr('id')]);
        var container = $(this).parents('.returns-nearest-location');
        container.find('.nearest-loc-distance').html(collectionPointData.distance + ' ' +
            dropOffModal.getDistanceUnitDisplayValue(collectionPointData.distance_units) + ' away');
        container.find('.nearest-loc-address-street').html(collectionPointData.street1);
        container.find('.nearest-loc-address-city').html(collectionPointData.city);
        container.find('.nearest-loc-address-postal').html(collectionPointData.postal_code);
        container.find('button.btn-show-more-locations').data('activelocation', dropOffModal.getDropOffLocationId(collectionPointData));
        initReturnMap(collectionPointData);
    });
}

$(document).ready(function () {
    initEvents();
});
