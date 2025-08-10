/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./cartridges/int_adyen_SFRA/cartridge/client/default/js/adyenAccount.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./cartridges/int_adyen_SFRA/cartridge/client/default/js/adyenAccount.js":
/*!*******************************************************************************!*\
  !*** ./cartridges/int_adyen_SFRA/cartridge/client/default/js/adyenAccount.js ***!
  \*******************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nvar cardNode = document.getElementById('card');\nvar maskedCardNumber;\nvar isValid = false;\nvar componentState;\nvar MASKED_CC_PREFIX = '************';\nvar checkoutConfiguration = window.Configuration;\ncheckoutConfiguration.amount = {\n  value: 0,\n  currency: 'EUR'\n};\ncheckoutConfiguration.paymentMethodsConfiguration = {\n  card: {\n    enableStoreDetails: false,\n    hasHolderName: true,\n    installments: [],\n    onBrand: function onBrand(brandObject) {\n      $('#cardType').val(brandObject.brand);\n    },\n    onFieldValid: function onFieldValid(data) {\n      if (data.endDigits) {\n        maskedCardNumber = MASKED_CC_PREFIX + data.endDigits;\n        $('#cardNumber').val(maskedCardNumber);\n      }\n    },\n    onChange: function onChange(state) {\n      isValid = state.isValid;\n      componentState = state;\n    }\n  }\n};\nvar checkout = new AdyenCheckout(checkoutConfiguration);\nvar card = checkout.create('card').mount(cardNode);\n$('button[value=\"add-new-payment\"]').on('click', function () {\n  if (isValid) {\n    document.querySelector('#adyenStateData').value = JSON.stringify(componentState.data);\n    return true;\n  }\n\n  card.showValidation();\n  return false;\n});\n\n//# sourceURL=webpack:///./cartridges/int_adyen_SFRA/cartridge/client/default/js/adyenAccount.js?");

/***/ })

/******/ });