var cart = require('base/cart/cart');
var updateMiniCart = true;
$('.minicart').on('click mouseenter focusin touchstart', function () {
  if ($('.search:visible').length === 0) {
    var url = $('.minicart').data('action-url');
    var count = parseInt($('.minicart .minicart-quantity').text(), 10);

    if (count !== 0 && $('.minicart .popover.show').length === 0) {
        if (!updateMiniCart) {
            $('.minicart .popover').addClass('show');
            return;
        }

        $('.minicart .popover').addClass('show');
        $('.minicart .popover').spinner().start();
        $.get(url, function (data) {
            $('.minicart .popover').empty();
            $('.minicart .popover').append(data);
            updateMiniCart = false;
            $.spinner().stop();
        });
    }
  }
  var url = $('.minicart').data('action-url');
  var count = parseInt($('.minicart .minicart-quantity').text(), 10);

  if (count == 0) {
     $('.cart-empty').show();
  }
  else {
    $('.cart-empty').hide();
  }

  if($('.popover-bottom').is(':empty')) {
    $('.popover-bottom').css('min-height', 0);
    $('.cart-empty').show();
  }
});
var WindowSize =$(window).width();

$('.minicart-link').click(function(event) {
    if ($('.notification-container').hasClass('dismiss-minicart')) {
        $('.notification-container').removeClass('dismiss-minicart').addClass('selected-minicart').show();
        $('.back-to-top').hide();
        $("#overlay").css({"display":"block"});

        if (WindowSize < 767){
          $('.prices-add-to-cart-actions').css('position','static');
        }
        
    }
    event.preventDefault();
  });
  
    $('#closeFilePanel').click(function(event) {
      if ($('.notification-container').hasClass('selected-minicart')) {
        $('.notification-container').removeClass('selected-minicart').addClass('dismiss-minicart');
      }
      event.preventDefault();
      $('.back-to-top').show();
      $("#overlay").css({"display":"none"});
      if (WindowSize < 767){
        $('.prices-add-to-cart-actions').css('position','fixed');
      }
    });

    $('body').mouseup(function(e) 
    {
        var container = $(".notification-container");
    if (!container.is(e.target) && container.has(e.target).length === 0) 
        {
            $('#closeFilePanel').trigger("click");
        }
      if($("#removeProductModal").hasClass('show')) {
         $('.modal-backdrop').remove();
      }
    });

    $('body').on('click', '.remove-product', function(){
      setTimeout( function(){
          $('.modal-backdrop').hide();
          
        }, 500); 
    });

  
    $('body').on('click', '.cart-delete-confirmation-btn', function(){
      setTimeout( function(){
        if($('.minicart .product-line-item').length == 0){
          $('#closeFilePanel').trigger("click");
        }
      }, 600);
    });


if($(".minicart-link .minicart-quantity").length){
  $(".mini-cart-bottom-fixed .minicart-quantity").text($(".minicart-link .minicart-quantity").text());
  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(function(mutationsList, observer){
    $(".mini-cart-bottom-fixed .minicart-quantity").text($(".minicart-link .minicart-quantity").text());
  });

  // Start observing the target node for configured mutations
  observer.observe($(".minicart-link .minicart-quantity")[0], { attributes: true, childList: true, subtree: true });
}
    
