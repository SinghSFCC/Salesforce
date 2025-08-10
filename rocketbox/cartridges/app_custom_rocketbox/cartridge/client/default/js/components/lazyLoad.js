module.exports = function(){
    window.lazyLoadOptions = {
        threshold: 150,
        elements_selector: ".lazy",
        use_native: true
    };
    window.globalLazyLoad = new LazyLoad({
        callback_error : function(element){
            element.src = element.dataset['loadError']
            if(element.dataset.bg){
                $(element).css('background-image','url('+element.dataset['loadError']+')');
            }
        },
    });
} 