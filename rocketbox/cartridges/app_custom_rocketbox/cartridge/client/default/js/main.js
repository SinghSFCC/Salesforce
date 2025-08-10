require('base/main');
require('slick-carousel');
window.LazyLoad = require('vanilla-lazyload');
require('intersection-observer');
require('url-polyfill');
if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector;
}
var processInclude = require('base/util');
$(document).ready(function () {    
    processInclude(require('./components/menu'));
    processInclude(require('./components/cart'));
    processInclude(require('./components/consentTracking'));  
    processInclude(require('./components/slick-carousel-responsive'));
    processInclude(require('./components/miniCart'));
    processInclude(require('./components/lazyLoad'));   
});

