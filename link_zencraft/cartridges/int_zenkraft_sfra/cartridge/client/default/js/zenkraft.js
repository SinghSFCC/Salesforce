/* global $, globalResourceMsg */
'use strict';

/**
 * @private
 * @function
 * @description Binds Zenkraft Events
 */
function initializeEvents() {
    /*
    * Return Labels Events
    */

    $('.zenkraft-checkbox').change(function zenkraftCheckbox() {
        var quantityshow = $(this).parents().eq(3).find('.line-item-quantity.display-only');
        var quantitysel = $(this).parents().eq(3).find('.line-item-quantity.selector');
        var quantityselect = quantitysel.find('select');
        var buttons = $('.btn-labelaction');
        var errorlabel = $('.label-error');
        // eslint-disable-next-line radix
        var quantity = parseInt(quantityshow.data('quantity'));

        if (this.checked) {
            errorlabel.hide();
            quantityshow.hide();
            quantitysel.show();
            quantityselect.empty();

            // eslint-disable-next-line no-plusplus
            for (quantity; quantity > 0; quantity--) {
                quantityselect.append($('<option>').attr('value', quantity).text(quantity.toFixed()));
            }

            buttons.removeAttr('disabled');
        } else {
            quantityshow.show();
            quantitysel.hide();
        }
    });

    $('.btn-printlabel').click(function printLabelClick() {
        var url = $(this).data('url');
        var items = {};
        var itemselected = false;

        $('.line-item').each(function printLabelSelect() {
            var lineitem = $(this);
            if (lineitem.find('.zenkraft-checkbox').prop('checked')) {
                // eslint-disable-next-line vars-on-top
                var productid = lineitem.data('itemid').toString();
                items[productid] = lineitem.find('.line-item-quantity.selector select').val();
                itemselected = true;
            }
        });

        if (itemselected) {
            // eslint-disable-next-line vars-on-top
            var body = JSON.stringify({
                products: items
            });
            $('.card').spinner().start();
            // eslint-disable-next-line object-shorthand
            $.ajax({
                type: 'POST',
                dataType: 'json',
                url: url,
                contentType: 'application/json',
                data: body
            })
                .done(function openLabel(response) {
                    $('.card').spinner().stop();
                    if (response.error) {
                        throw new Error('Unable to get label');
                    }
                    window.open(response.shipment.packages[0].label);
                });
        } else {
            $('.label-error').show();
            $('.card').spinner().stop();
        }
    });

    $('.btn-emaillabel').click(function emailLabelClick() {
        var url = $(this).data('url');
        var items = {};
        var itemselected = false;

        $('.line-item').each(function selectItems() {
            var lineitem = $(this);
            if (lineitem.find('.zenkraft-checkbox').prop('checked')) {
                // eslint-disable-next-line vars-on-top
                var productid = lineitem.data('itemid').toString();
                items[productid] = lineitem.find('.line-item-quantity.selector select').val();
                itemselected = true;
            }
        });

        // If items have been selected, open the dialog. If not, prompt the user to select an item
        if (itemselected) {
            // eslint-disable-next-line prefer-template, vars-on-top
            var htmlString = '<!-- Modal -->'
                + '<div class="modal label-email-modal show" id="consent-tracking" role="dialog">'
                + '<div class="modal-dialog">'
                + '<!-- Modal content-->'
                + '<div class="modal-content">'
                + '<div class="modal-header">'
                + globalResourceMsg.emailLabelHeader
                + '</div>'
                + '<div class="modal-body">'
                + '<div class="form-group">'
                + '<p>' + globalResourceMsg.enterEmail + '</p>'
                // eslint-disable-next-line max-len
                + '<label class="form-control-label">Email Address:</label><input type="text" class="form-control" id="label_email_address"/><div class="print-label-error invalid-feedback"></div><div class="print-label-success">' + globalResourceMsg.emailSuccess + '</div>'
                + '</div>'
                + '</div>'
                + '<div class="modal-footer">'
                + '<div class="button-wrapper">'
                + '<button class="btn-close btn btn-primary">'
                + globalResourceMsg.close
                + '</button>'
                + '<button class="affirm btn btn-primary">'
                + globalResourceMsg.sendLabel
                + '</button>'
                + '</div>'
                + '</div>'
                + '</div>'
                + '</div>'
                + '</div>';

            $('body').append(htmlString);

            $('.modal-footer').on('click', '.btn-close', function modalClick(e) {
                e.preventDefault();

                $('#consent-tracking .modal-body').remove();
                $('#consent-tracking').remove();
            });

            $('.modal-footer').on('click', '.affirm', function modalFooterClick(e) {
                // Check for a valid email address
                var useremail = $('#label_email_address').val();
                var regex = /^[\w.%+-]+@[\w.-]+\.[\w]{2,6}$/;
                var validemail = regex.test(useremail);
                var body = JSON.stringify({
                    products: items,
                    emailaddress: useremail
                });

                e.preventDefault();

                // We only want to make the ajax call if the email address is valid
                if (useremail !== '' && validemail) {
                    $('.modal-dialog').spinner().start();

                    // Make the ajax call to send the label via email
                    // eslint-disable-next-line object-shorthand
                    $.ajax({
                        type: 'POST',
                        dataType: 'json',
                        contentType: 'application/json',
                        url: url,
                        data: body
                    })
                        .done(function sendLabelEmail(response) {
                            $('.modal-dialog').spinner().stop();
                            if (response.error) {
                                $('.print-label-error').html(globalResourceMsg.errorSending).show();
                                throw new Error('Unable to get label');
                            } else {
                                $('.print-label-success').show();
                                $('button.affirm').hide();
                            }
                        });
                } else {
                    $('.print-label-error').html(globalResourceMsg.invalidEmail).show();
                }
            });
        } else {
            $('.label-error').show();
            $.spinner().stop();
        }
    });
}

/* Export Public Methods */
initializeEvents();
