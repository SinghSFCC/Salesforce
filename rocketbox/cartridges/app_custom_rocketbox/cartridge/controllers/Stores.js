'use strict';

var server = require('server');
server.extend(module.superModule);

server.append('Find', function (req, res, next) {
  var viewData = res.getViewData();
  viewData.storePage = 'storeLocator';
  res.setViewData(viewData);
  next();
});

module.exports = server.exports();
