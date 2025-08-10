    if ($('.consented').length === 0 && $('.tracking-consent').hasClass('api-true')) {
        if($(window).width()<768) {
            $('#consent-tracking').remove();
            $.spinner().stop();
        }
    }

    $('body').on('shown.bs.modal', '#consent-tracking', function () {
        $('#consent-tracking').siblings().attr('aria-hidden', 'true');
        $('#consent-tracking .close').focus();
    });

    $('body').on('hidden.bs.modal', '#consent-tracking', function () {
        $('#consent-tracking').siblings().attr('aria-hidden', 'false');
		$.spinner().stop();
    });

    $('#consent-tracking .modal-header').append('<span class="close-btn" data-dismiss="modal"><span class="close">&times;</span></span>');
    $(document).ajaxComplete(function (event, xhr) {
        $("#consent-tracking .btn-secondary,#consent-tracking .close-btn span.close").click(function(){
            $("button.decline").trigger("click");
        });
    });
