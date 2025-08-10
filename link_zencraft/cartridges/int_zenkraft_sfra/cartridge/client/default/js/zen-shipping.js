/* global $, google */
'use strict';

var shippingBase = require('app_storefront_base/checkout/shipping');
var addressHelpers = require('app_storefront_base/checkout/address');
var dropOffModal = require('./dropOffModal');

var baseObj = shippingBase;

$('body').on('shipping:updateShippingMethods', function (e, shippingdata) {
    var shipping = shippingdata.shipping;
    var checkedInput = $("input[name='dwfrm_shipping_shippingAddress_shippingMethodID']:checked");
    $('label.ship-method-row').removeClass('border-primary selected');
    $('label[for="' + checkedInput.attr('id') + '"]').addClass('border-primary selected');
    var uuidEl = $('input[value=' + shipping.UUID + ']');
    if (uuidEl && uuidEl.length > 0) {
        $.each(uuidEl, function (shipmentIndex, el) {
            var form = el.form;
            if (!form) return;

            var $shippingMethodList = $('.shipping-method-list', form);

            if ($shippingMethodList && $shippingMethodList.length > 0) {
                $shippingMethodList.empty();
                var shippingMethods = shipping.applicableShippingMethods;
                var selected = shipping.selectedShippingMethod || {};
                var shippingMethodFormID = form.name + '_shippingAddress_shippingMethodID';
                // Create the new rows for each shipping method
                $.each(shippingMethods, function (index, shippingMethod) {
                    // if there is no drop off location for that address do not show the drop off shipping method
                    var tmpl = $('#shipping-method-template').clone();
                    var thisLabel = $('label', tmpl);
                    var thisInput = $('input', tmpl);
                    var labelLeft = thisLabel.find('.col-10');
                    var labelRight = thisLabel.find('.col-2');
                    // set input
                    thisInput.prop('id', 'shippingMethod-' + shippingMethod.ID + '-' + shipping.UUID);
                    thisInput.prop('name', shippingMethodFormID);
                    thisInput.prop('value', shippingMethod.ID);
                    thisInput.attr('checked', shippingMethod.ID === selected.ID);
                    // set label
                    thisLabel.prop('for', 'shippingMethod-' + shippingMethod.ID + '-' + shipping.UUID);
                    thisLabel.attr('data-methodid', shippingMethod.ID);
                    // update preselected shipping method class list
                    if (shippingMethod.ID === selected.ID) {
                        thisLabel.addClass('border-primary selected');
                        if (shippingMethod.dropOffMethod) {
                            $('form').attr('data-address-mode', 'new');
                            $('.btn-show-details').parents('.form-group').addClass('d-none');
                        }
                    }
                    if (!shippingMethod.dropOffMethod && (!shippingMethod.futureDeliveryDates || shippingMethod.futureDeliveryDates.length === 0)) {
                        labelLeft.append('<div class="shipping-method-name col-11 offset-1 font-weight-bold">' + shippingMethod.displayName + '</div>');
                        if (shippingMethod.estimatedArrivalTime && !shippingMethod.futureDeliveryDates && !shippingMethod.dropOffMethod) {
                            labelLeft.append('<div class="col-1 d-flex m-auto"><i class="fa fa-truck" aria-hidden="true"></i></div><div class="col-11"> ' + shippingMethod.estimatedArrivalTime.toUpperCase() + '</div>');
                        }
                    } else if (shippingMethod.dropOffMethod) {
                        labelLeft.append('<div class="shipping-method-name col-11 offset-1 font-weight-bold">' + shippingMethod.displayName + '</div>');
                    } else {
                        labelLeft.append('<div class="shipping-method-name col-11 offset-1 font-weight-bold">' + shippingMethod.displayName + '</div>');
                        if (shippingMethod.estimatedArrivalTime && !shippingMethod.futureDeliveryDates && !shippingMethod.dropOffMethod) {
                            labelLeft.append('<div class="col-1 d-flex m-auto"><i class="fa fa-truck" aria-hidden="true"></i></div><div class="arrival-time col-11"> ' + shippingMethod.estimatedArrivalTime.toUpperCase() + '</div>');
                        }
                    }

                    // display possible delivery options
                    if (!shippingMethod.dropOffMethod && shippingMethod.instructions && shippingMethod.instructions.length > 0 && shippingMethod.ID === selected.ID) {
                        var options = '';
                        shippingMethod.instructions.forEach(function (instruction) {
                            options += '<option data-fields="' + (instruction.fields ? JSON.stringify(instruction.fields).replace(/"/g, "'") : '') + '" value="' + instruction.id + '">' + instruction.value + '</option>';
                        });
                        labelLeft.append('<div class="col-11 offset-1 instructions"><label for="delivery-instructions-' + shippingMethod.ID +
                            '" class="instruction-label mb-2">Delivery Instructions</label><select class="delivery-instructions custom-select" name="delivery_instructions" id="delivery-instructions-' +
                            shippingMethod.ID + '"><option data-fields="" value="false">None</option>' + options + '</select><div class="delivery-instructions-fields"></div></div>');
                    }

                    // display possible future delivery dates
                    if (shippingMethod.futureDeliveryDates && shippingMethod.futureDeliveryDates.length > 0) {
                        labelLeft.append('<div class="col-1 d-flex m-auto"><i class="fa fa-calendar" aria-hidden="true"></i></div> <div class="col-11"><select class="custom-select future-delivery"></select></div>');
                        shippingMethod.futureDeliveryDates.forEach(function (dateObject) {
                            labelLeft.find('select.future-delivery').append(
                                '<option value="' + dateObject.date + '">' + dateObject.formatedDate.toUpperCase() + '</option>'
                            );
                        });
                        thisLabel.addClass('future-delivery-method');
                    }
                    // format the drop off method
                    if (shippingMethod.dropOffMethod) {
                        labelLeft.append('<div class="col-1 d-flex m-auto">' +
                            '<i class="fa fa-building-o" aria-hidden="true"></i>' +
                            '</div>' +
                            '<div class="col-11">' +
                            '<div>' + shippingMethod.estimatedArrivalTime.toUpperCase() + '</div>' +
                            '<div class="drop-off-method-name"></div>' +
                            '<div><span class="drop-off-method-distance"></span>' +
                            '</div>' +
                            '<div>' +
                            '<span class="change-dopu-link" data-url="' + shippingMethod.dropOffURL + '" data-methodid="' + shippingMethod.ID + '" data-sessionid="shippingMethod-' + shippingMethod.ID + '-' + shipping.UUID +
                            '"> Other locations</span>' +
                            '</div>' +
                            '</div>');

                        var methodNameContainer = labelLeft.find('.shipping-method-name');
                        methodNameContainer.html(methodNameContainer.html() + ' Pick-up Location');
                        thisLabel.addClass('drop-off-method');
                        thisLabel.data('teodor', 'test');
                    }
                    // display the method shipping cost
                    labelRight.append('<div class="shipping-cost text-center">' + shippingMethod.shippingCost + '</div>');
                    thisLabel.find('select').addClass('w-100');
                    $shippingMethodList.append(tmpl.html());
                    if ($('#checkout-main').data('checkout-stage') === 'shipping') {
                        if ($(form).find('#delivery-instruction').length) {
                            $('#delivery-instruction').val('');
                        } else {
                            $(form).append('<input type="hidden" name="delivery_instruction" id="delivery-instruction"/>');
                        }
                    }
                });
            }
        });
    }

    // overwrite existing event handler
    $('.shipping-method-list').off('change');
    $('.shipping-method-list').on('change', function (event) {
        if (event.target.type === 'select-one' || $(event.target).parent().hasClass('delivery-instructions-fields')) {
            return;
        }
        var $shippingForm = $(this).parents('form');
        var input = $('input[type=radio]:checked', this);
        if (input.parents('label').is(':visible')) {
            var methodID = input.val();
            var shipmentUUID = $shippingForm.find('[name=shipmentUUID]').val();
            var urlParams = addressHelpers.methods.getAddressFieldsFromUI($shippingForm);
            urlParams.shipmentUUID = shipmentUUID;
            urlParams.methodID = methodID;
            urlParams.isGift = $shippingForm.find('.gift').prop('checked');
            urlParams.giftMessage = $shippingForm.find('textarea[name$=_giftMessage]').val();
            var url = $(this).data('select-shipping-method-url');
            if (baseObj.methods && baseObj.methods.selectShippingMethodAjax) {
                baseObj.methods.selectShippingMethodAjax(url, urlParams, $(this));
            } else {
                baseObj.methods.selectShippingMethodAjax(url, urlParams, $(this));
            }
        }
    });
});

$(document).ready(function () {
    var postalEl = $('input[name$="shippingAddress_addressFields_postalCode"]');
    var updated = false;
    postalEl.each(function (index, postal) {
        if ($(postal).val().length > 0 && $(postal).is(':visible')) {
            if (baseObj.methods && baseObj.methods.updateShippingMethodList) {
                baseObj.methods.updateShippingMethodList($(postal).parents('form'));
                updated = true;
            } else {
                updateShippingMethodList($(postal).parents('form'));
                updated = true;
            }
        }
        if (!updated && $(postalEl[0]).val().length > 0) {
            if (baseObj.methods && baseObj.methods.updateShippingMethodList) {
                baseObj.methods.updateShippingMethodList($(postalEl[0]).parents('form'));
                updated = true;
            } else {
                updateShippingMethodList($(postalEl[0]).parents('form'));
                updated = true;
            }
        }
    });
    $('select[name$="shippingAddress_addressFields_states_stateCode"]').off('change');
    $(document).off('change', 'select[name$="shippingAddress_addressFields_states_stateCode"]');
});

$(document).on('change', 'input[name$="dwfrm_shipping_shippingAddress_addressFields_postalCode"]', function (e) {
    if (baseObj.methods && baseObj.methods.updateShippingMethodList) {
        baseObj.methods.updateShippingMethodList($(e.currentTarget.form));
    } else {
        updateShippingMethodList($(e.currentTarget.form));
    }
});

$(document).on('change', '.future-delivery-method select.custom-select', function (e) {
    if ($('#requested-delivery-date').length === 0) {
        $('#dwfrm_shipping').append('<input type="hidden" id="requested-delivery-date" name="requested_delivery_date" class="drop-off-location-data"/>');
    }
    var data = {
        methodID: $(this).parents('label').data('methodid'),
        date: $(e.target).val()
    };
    $('#requested-delivery-date').val(JSON.stringify(data));
});

$('body').on('click', 'button.choose-location', function (e) {
    e.preventDefault();
    var shipForm = $(this).parents('form');
    var collectionPointData = JSON.parse(sessionStorage['collection-point-' + $(this).parents('.collection-point').attr('id')]);
    $('input[name$=_address1]', shipForm).val(collectionPointData.street1);
    $('input[name$=_city]', shipForm).val(collectionPointData.city);
    $('input[name$=_postalCode]', shipForm).val(collectionPointData.postal_code);
    if ($('.drop-off-location-data').length === 0) {
        shipForm.append('<input type="hidden" name="drop_off_location_data" class="drop-off-location-data"/>');
    }
    $('.drop-off-location-data').val(JSON.stringify({
        location_code: dropOffModal.getDropOffLocationId(collectionPointData),
        location_name: dropOffModal.getDropOffLocationDisplayName(collectionPointData)
    }));
    shipForm.find('.change-dopu-link').attr('data-activelocation', dropOffModal.getDropOffLocationId(collectionPointData));
    shipForm.attr('data-address-mode', 'new');
    $('.btn-show-details').parents('.form-group').addClass('d-none');
    $('.drop-off-method-name').html(dropOffModal.getDropOffLocationDisplayName(collectionPointData));
    $('.drop-off-method-distance').html(collectionPointData.distance + ' ' +
        dropOffModal.getDistanceUnitDisplayValue(collectionPointData.distance_units) + 'away');
});

$(document).on('change', 'select.delivery-instructions', function () {
    var select = $(this);
    var option = select.find('option:selected');
    var fields = [];
    if (option.data('fields').length > 0) {
        fields = JSON.parse(option.data('fields').replace(/'/g, '"'));
    }
    $('.delivery-instructions-fields').empty();
    var data = { selectedOption: select.val() };
    $('#delivery-instruction').val(JSON.stringify(data));
    if (fields.length > 0) {
        fields.forEach(function (field) {
            var attributes = '';
            field.attributes.forEach(function (attribute) {
                attributes += attribute.id + '="' + attribute.value + '" ';
            });
            select.parents('.instructions').find('.delivery-instructions-fields').append('<' + field.nodeType + ' ' + attributes + '></' + field.nodeType + '>');
        });
    }
});

$(document).on('change', '.delivery-instructions-fields input, .delivery-instructions-fields textarea', function (e) {
    var inputs = $(this).parents('.delivery-instructions-fields').find('input, textarea');
    var data = {};
    data.selectedOption = $(this).parents('.instructions').find('select.delivery-instructions').val();
    inputs.each(function (index, value) {
        data[$(value).attr('name')] = $(value).val();
    });
    $('#delivery-instruction').val(JSON.stringify(data));
});

$(document).on('click', '.ship-method-row', function (e) {
    if (e.target.localName === 'div') return;
    var isDropoff = $(this).hasClass('drop-off-method');
    if (isDropoff) {
        var $child = $(this).find('.change-dopu-link');
        dropOffModal.triggerDropoffModal($child.data('url'));
    }
});
