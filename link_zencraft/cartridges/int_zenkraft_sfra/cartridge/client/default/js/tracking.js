/* global $ */
'use strict';

var init = function init() {
    // initialize event handlers
    $('.expand-tracking-details').on('click', function toggleDetails(e) {
        e.preventDefault();
        $(this).siblings('.tracking-details-window').toggle();
    });
};

var initNotifications = function initNotifications() {
    var tabs = $('.notification-tabs');

  // ignore if notifications are not enabled
    if (tabs.length < 1) {
        return;
    }

  // show/hide content based on selected tab
    tabs.on('click', 'button', function notifyTabChange() {
        var btnclicked = $(this);
    // eslint-disable-next-line prefer-template
        var contentSelector = '.notify-content.' + btnclicked.data('tab');

        if (btnclicked.parent().hasClass('active')) {
            // hide any open tabs
            $('.notify-content').hide();

            // toggle active class on the tabs
            $('.notification-tabs li').removeClass('active');
            btnclicked.parent().addClass('active');

            // show the selected content
            $(contentSelector).show();
        }
    });

  // SMS: triggered when the user hits the Save button to trigger
  // an SMS subscription to shipping notifications
    $('.btn-shipment-sms').on('click', function smsSubscriptionTrigger() {
        var url = $(this).data('url');
        var thisParent = $(this).parent();
        var contact = thisParent.find('.shipment-notification-sms').val();

        if (contact.length === 0) {
            thisParent.prepend('<div class="sms-status-message">Enter your phone number to continue.</div>');
            return;
        }

        var body = JSON.stringify({
            type: $(this).data('type'),
            tracknumber: $(this).data('tracking'),
            carrier: $(this).data('carrier'),
            contact: contact,
            stage: $(this).data('stage'),
            orderNo: $(this).data('order'),
            shipmentNo: $(this).data('shipment')
        });

        thisParent.spinner().start();

        $.ajax({
            type: 'POST',
            dataType: 'html',
            contentType: 'application/json',
            url: url,
            data: body
        }).done(function (response) {
            var resp = JSON.parse(response);
            thisParent.spinner().stop();
            if (resp.success) {
                thisParent.html('<div class="sms-status-message">' +
                resp.success +
                '</div>');
            }
        });
    });
};

var initFeedback = function initFeedback() {
    $('.feedback-submit').on('click', function submitFeedback() {
        $('.feedback-body').spinner().start();

        setTimeout(function feedbackTimeout() {
            $('.feedback-form-wrapper').hide();
            $('.feedback-comments-thankyou').show();
            $('.feedback-body').spinner().stop();
        }, 2000);
    });
};

init();

// shipment notifications
initNotifications();
initFeedback();
