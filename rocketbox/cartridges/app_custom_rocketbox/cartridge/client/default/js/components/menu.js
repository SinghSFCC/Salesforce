var isDeskTop = $(".main-menu .navbar").css('position') !== 'fixed';
$(".main-menu a.nav-link[data-toggle]").on("click", function(e){
    if(!isDeskTop){
        e.preventDefault();
    }
});

$(".mobile-menu-toggle").on("click", function(e){
    e.preventDefault();
    $(".navbar-toggler").trigger("click");
});

$(window).on("resize load", function(){
    isDeskTop = $(".main-menu .navbar").css('position') !== 'fixed';
    if(window.resizeTimeout){
        clearTimeout(window.resizeTimeout);
    }
    window.resizeTimeout = setTimeout(function(){
        if(!isDeskTop){
            var height = $(".header-banner .content").outerHeight() + 16;
            $("body").css("padding-bottom",height+"px");
        }else{
            $("body").css("padding-bottom","");
        }
    }, 200);
});