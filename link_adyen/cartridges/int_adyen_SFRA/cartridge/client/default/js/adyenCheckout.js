"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

// eslint-disable-next-line no-unused-vars
var maskedCardNumber;
var MASKED_CC_PREFIX = '************';
var selectedMethod;
var componentsObj = {};
var checkoutConfiguration = window.Configuration;
var formErrorsExist;
var isValid = false;
var checkout;
$('#dwfrm_billing').submit(function (e) {
  e.preventDefault();
  var form = $(this);
  var url = form.attr('action');
  $.ajax({
    type: 'POST',
    url: url,
    data: form.serialize(),
    async: false,
    success: function success(data) {
      formErrorsExist = 'fieldErrors' in data;
    }
  });
});

checkoutConfiguration.onChange = function (state) {
  var type = state.data.paymentMethod.type;
  isValid = state.isValid;

  if (!componentsObj[type]) {
    componentsObj[type] = {};
  }

  componentsObj[type].isValid = isValid;
  componentsObj[type].stateData = state.data;
};

checkoutConfiguration.showPayButton = false;
checkoutConfiguration.paymentMethodsConfiguration = {
  card: {
    enableStoreDetails: showStoreDetails,
    onBrand: function onBrand(brandObject) {
      document.querySelector('#cardType').value = brandObject.brand;
    },
    onFieldValid: function onFieldValid(data) {
      if (data.endDigits) {
        maskedCardNumber = MASKED_CC_PREFIX + data.endDigits;
        document.querySelector('#cardNumber').value = maskedCardNumber;
      }
    },
    onChange: function onChange(state) {
      isValid = state.isValid;
      var componentName = state.data.paymentMethod.storedPaymentMethodId ? "storedCard".concat(state.data.paymentMethod.storedPaymentMethodId) : state.data.paymentMethod.type;

      if (componentName === selectedMethod || selectedMethod === 'bcmc') {
        componentsObj[selectedMethod].isValid = isValid;
        componentsObj[selectedMethod].stateData = state.data;
      }
    }
  },
  boletobancario: {
    personalDetailsRequired: true,
    // turn personalDetails section on/off
    billingAddressRequired: false,
    // turn billingAddress section on/off
    showEmailAddress: false,
    // allow shopper to specify their email address
    // Optionally prefill some fields, here all fields are filled:
    data: {
      firstName: document.getElementById('shippingFirstNamedefault').value,
      lastName: document.getElementById('shippingLastNamedefault').value
    }
  },
  paywithgoogle: {
    environment: window.Configuration.environment,
    onSubmit: () => {
      assignPaymentMethodValue();
      document.querySelector('button[value="submit-payment"]').disabled = false;
      document.querySelector('button[value="submit-payment"]').click();
    },
    configuration: {
      gatewayMerchantId: window.merchantAccount
    },
    showPayButton: true,
    buttonColor: 'white'
  },
  paypal: {
    environment: window.Configuration.environment,
    intent: 'capture',
    onSubmit: (state, component) => {
      assignPaymentMethodValue();
      document.querySelector('#adyenStateData').value = JSON.stringify(componentsObj[selectedMethod].stateData);
      paymentFromComponent(state.data, component);
    },
    onCancel: (data, component) => {
      paymentFromComponent({
        cancelTransaction: true
      }, component);
    },
    onError: (error, component) => {
      if (component) {
        component.setStatus('ready');
      }

      document.querySelector('#showConfirmationForm').submit();
    },
    onAdditionalDetails: state => {
      document.querySelector('#additionalDetailsHidden').value = JSON.stringify(state.data);
      document.querySelector('#showConfirmationForm').submit();
    },
    onClick: (data, actions) => {
      $('#dwfrm_billing').trigger('submit');

      if (formErrorsExist) {
        return actions.reject();
      }
    }
  },
  mbway: {
    showPayButton: true,
    onSubmit: (state, component) => {
      $('#dwfrm_billing').trigger('submit');
      assignPaymentMethodValue();

      if (!formErrorsExist) {
        document.getElementById('component_mbway').querySelector('button').disabled = true;
        paymentFromComponent(state.data, component);
        document.querySelector('#adyenStateData').value = JSON.stringify(state.data);
      }
    },
    onError: () =>
    /* error, component */
    {
      document.querySelector('#showConfirmationForm').submit();
    },
    onAdditionalDetails: (state
    /* , component */
    ) => {
      document.querySelector('#additionalDetailsHidden').value = JSON.stringify(state.data);
      document.querySelector('#showConfirmationForm').submit();
    }
  },
  afterpay_default: {
    visibility: {
      personalDetails: 'editable',
      billingAddress: 'hidden',
      deliveryAddress: 'hidden'
    },
    data: {
      personalDetails: {
        firstName: document.querySelector('#shippingFirstNamedefault').value,
        lastName: document.querySelector('#shippingLastNamedefault').value,
        telephoneNumber: document.querySelector('#shippingPhoneNumberdefault').value,
        shopperEmail : $('#email_id').data('emailid') || document.querySelector('#email').value,
      }
    }
  },
  facilypay_3x: {
    visibility: {
      personalDetails: 'editable',
      billingAddress: 'hidden',
      deliveryAddress: 'hidden'
    },
    data: {
      personalDetails: {
        firstName: document.querySelector('#shippingFirstNamedefault').value,
        lastName: document.querySelector('#shippingLastNamedefault').value,
        telephoneNumber: document.querySelector('#shippingPhoneNumberdefault').value,
        shopperEmail : $('#email_id').data('emailid') || document.querySelector('#email').value,
      }
    }
  }
};

if (window.installments) {
  try {
    var installments = JSON.parse(window.installments);
    checkoutConfiguration.paymentMethodsConfiguration.card.installments = installments;
  } catch (e) {} // eslint-disable-line no-empty

}

if (window.paypalMerchantID !== 'null') {
  checkoutConfiguration.paymentMethodsConfiguration.paypal.merchantId = window.paypalMerchantID;
}

if (window.googleMerchantID !== 'null' && window.Configuration.environment === 'live') {
  checkoutConfiguration.paymentMethodsConfiguration.paywithgoogle.configuration.merchantIdentifier = window.googleMerchantID;
}
/**
 * Changes the "display" attribute of the selected method from hidden to visible
 */


function displaySelectedMethod(type) {
  selectedMethod = type;
  resetPaymentMethod();

  if (['paypal', 'paywithgoogle', 'mbway'].indexOf(type) > -1) {
    document.querySelector('button[value="submit-payment"]').disabled = true;
  } else {
    document.querySelector('button[value="submit-payment"]').disabled = false;
  }

  document.querySelector("#component_".concat(type)).setAttribute('style', 'display:block');
}
/**
 * To avoid re-rendering components twice, unmounts existing components from payment methods list
 */


function unmountComponents() {
  var promises = Object.entries(componentsObj).map(function (_ref) {
    var [key, val] = _ref;
    delete componentsObj[key];
    return resolveUnmount(key, val);
  });
  return Promise.all(promises);
}

function resolveUnmount(key, val) {
  try {
    return Promise.resolve(val.node.unmount("component_".concat(key)));
  } catch (e) {
    // try/catch block for val.unmount
    return Promise.resolve(false);
  }
}
/**
 * checks if payment method is blocked and returns a boolean accordingly
 */


function isMethodTypeBlocked(methodType) {
  var blockedMethods = ['bcmc_mobile_QR', 'applepay', 'cup', 'wechatpay', 'wechatpay_pos', 'wechatpaySdk', 'wechatpayQr'];
  return blockedMethods.includes(methodType);
}
/**
 * Calls getPaymenMethods and then renders the retrieved payment methods (including card component)
 */


function renderGenericComponent() {
  return _renderGenericComponent.apply(this, arguments);
}

function _renderGenericComponent() {
  _renderGenericComponent = _asyncToGenerator(function* () {
    if (Object.keys(componentsObj).length !== 0) {
      yield unmountComponents();
    }

    getPaymentMethods(function (data) {
      var paymentMethod;
      var i;
      checkoutConfiguration.paymentMethodsResponse = data.AdyenPaymentMethods;

      if (data.amount) {
        checkoutConfiguration.amount = data.amount;
        checkoutConfiguration.paymentMethodsConfiguration.paypal.amount = data.amount;
      }

      if (data.countryCode) {
        checkoutConfiguration.countryCode = data.countryCode;
      }

      checkout = new AdyenCheckout(checkoutConfiguration);
      document.querySelector('#paymentMethodsList').innerHTML = '';

      if (data.AdyenPaymentMethods.storedPaymentMethods) {
        for (i = 0; i < checkout.paymentMethodsResponse.storedPaymentMethods.length; i++) {
          paymentMethod = checkout.paymentMethodsResponse.storedPaymentMethods[i];

          if (paymentMethod.supportedShopperInteractions.includes('Ecommerce')) {
            renderPaymentMethod(paymentMethod, true, data.ImagePath);
          }
        }
      }

      data.AdyenPaymentMethods.paymentMethods.forEach((pm, i) => {
        !isMethodTypeBlocked(pm.type) && renderPaymentMethod(pm, false, data.ImagePath, data.AdyenDescriptions[i].description);
      });

      if (data.AdyenConnectedTerminals && data.AdyenConnectedTerminals.uniqueTerminalIds && data.AdyenConnectedTerminals.uniqueTerminalIds.length > 0) {
        var posTerminals = document.querySelector('#adyenPosTerminals');

        while (posTerminals.firstChild) {
          posTerminals.removeChild(posTerminals.firstChild);
        }

        addPosTerminals(data.AdyenConnectedTerminals.uniqueTerminalIds);
      }

      var firstPaymentMethod = document.querySelector('input[type=radio][name=brandCode]');
      firstPaymentMethod.checked = true;
      displaySelectedMethod(firstPaymentMethod.value);
    });
  });
  return _renderGenericComponent.apply(this, arguments);
}

function renderPaymentMethod(paymentMethod, storedPaymentMethodBool, path) {
  var description = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
  var node;
  var paymentMethodsUI = document.querySelector('#paymentMethodsList');
  var li = document.createElement('li');
  var paymentMethodID = storedPaymentMethodBool ? "storedCard".concat(paymentMethod.id) : paymentMethod.type;
  var isSchemeNotStored = paymentMethod.type === 'scheme' && !storedPaymentMethodBool;
  var paymentMethodImage = storedPaymentMethodBool ? "".concat(path).concat(paymentMethod.brand, ".png") : "".concat(path).concat(paymentMethod.type, ".png" );
  var cardImage = "".concat(path, "card.png");
  var imagePath = isSchemeNotStored ? cardImage : paymentMethodImage;
  var label = storedPaymentMethodBool ? "".concat(paymentMethod.name, " ").concat(MASKED_CC_PREFIX).concat(paymentMethod.lastFour) : "".concat(paymentMethod.name);
  var liContents = "\n                              <input name=\"brandCode\" type=\"radio\" value=\"".concat(paymentMethodID, "\" id=\"rb_").concat(paymentMethodID, "\">\n                              <img class=\"paymentMethod_img\" src=\"").concat(imagePath, "\" ></img>\n                              <label id=\"lb_").concat(paymentMethodID, "\" for=\"rb_").concat(paymentMethodID, "\">").concat(label, "</label>\n                             ");

  if (description) {
    liContents += "<p>".concat(description, "</p>");
  }

  var container = document.createElement('div');
  li.innerHTML = liContents;
  li.classList.add('paymentMethod');

  if (storedPaymentMethodBool) {
    node = checkout.create('card', paymentMethod);

    if (!componentsObj[paymentMethodID]) {
      componentsObj[paymentMethodID] = {};
    }

    componentsObj[paymentMethodID].node = node;
  } else {
    var fallback = getFallback(paymentMethod.type);

    if (fallback) {
      var template = document.createElement('template');
      template.innerHTML = fallback;
      container.append(template.content);
    } else {
      try {
        node = checkout.create(paymentMethod.type);

        if (!componentsObj[paymentMethodID]) {
          componentsObj[paymentMethodID] = {};
        }

        componentsObj[paymentMethodID].node = node;
      } catch (e) {} // eslint-disable-line no-empty

    }
  }

  container.classList.add('additionalFields');
  container.classList.add('py-3');
  container.setAttribute('id', "component_".concat(paymentMethodID));
  container.setAttribute('style', 'display:none');
  li.append(container);
  paymentMethodsUI.append(li);

  if (paymentMethod.type !== 'paywithgoogle') {
    node && node.mount(container);
  } else {
    node.isAvailable().then(() => {
      node.mount(container);
    }).catch(() => {}); // eslint-disable-line no-empty
  }

  var input = document.querySelector("#rb_".concat(paymentMethodID));

  input.onchange = event => {
    displaySelectedMethod(event.target.value);
  };

  if (paymentMethodID === 'giropay') {
    container.innerHTML = '';
  }

  if (componentsObj[paymentMethodID] && !container.childNodes[0]) {
    componentsObj[paymentMethodID].isValid = true;
  }
} // eslint-disable-next-line no-unused-vars


function addPosTerminals(terminals) {
  var terminalSelect = document.createElement('select');
  terminalSelect.id = 'terminalList';

  for (var t in terminals) {
    var option = document.createElement('option');
    option.value = terminals[t];
    option.text = terminals[t];
    terminalSelect.appendChild(option);
  }

  document.querySelector('#adyenPosTerminals').append(terminalSelect);
}

function resetPaymentMethod() {
  $('#requiredBrandCode').hide();
  $('#selectedIssuer').val('');
  $('#adyenIssuerName').val('');
  $('#dateOfBirth').val('');
  $('#telephoneNumber').val('');
  $('#gender').val('');
  $('#bankAccountOwnerName').val('');
  $('#bankAccountNumber').val('');
  $('#bankLocationId').val('');
  $('.additionalFields').hide();
}
/**
 * Makes an ajax call to the controller function GetPaymentMethods
 */


function getPaymentMethods(paymentMethods) {
  $.ajax({
    url: 'Adyen-GetPaymentMethods',
    type: 'get',
    success: function success(data) {
      paymentMethods(data);
    }
  });
}
/**
 * Makes an ajax call to the controller function PaymentFromComponent. Used by certain payment methods like paypal
 */


function paymentFromComponent(data, component) {
  $.ajax({
    url: 'Adyen-PaymentFromComponent',
    type: 'post',
    data: {
      data: JSON.stringify(data),
      paymentMethod: document.querySelector('#adyenPaymentMethodName').value
    },
    success: function success(data) {
      if (data.orderNo) {
        document.querySelector('#merchantReference').value = data.orderNo;
      }

      if (data.orderToken) {
        document.querySelector('#orderToken').value = data.orderToken;
      }

      if (data.fullResponse && data.fullResponse.action) {
        component.handleAction(data.fullResponse.action);
      } else {
        document.querySelector('#showConfirmationForm').submit();
      }
    }
  }).fail(function () {});
} // Submit the payment


$('button[value="submit-payment"]').on('click', function () {
  if (document.querySelector('#selectedPaymentOption').value === 'AdyenPOS') {
    document.querySelector('#terminalId').value = document.querySelector('#terminalList').value;
    return true;
  }

  assignPaymentMethodValue();
  validateComponents();
  return showValidation();
});

function assignPaymentMethodValue() {
  var adyenPaymentMethod = document.querySelector('#adyenPaymentMethodName');
  adyenPaymentMethod.value = document.querySelector("#lb_".concat(selectedMethod)).innerHTML;
}

function showValidation() {
  var input;

  if (componentsObj[selectedMethod] && !componentsObj[selectedMethod].isValid) {
    componentsObj[selectedMethod].node.showValidation();
    return false;
  }

  if (selectedMethod === 'ach') {
    var inputs = document.querySelectorAll('#component_ach > input');
    inputs = Object.values(inputs).filter(function (input) {
      return !(input.value && input.value.length > 0);
    });

    for (input of inputs) {
      input.classList.add('adyen-checkout__input--error');
    }

    if (inputs.length > 0) {
      return false;
    }

    return true;
  }

  if (selectedMethod === 'ratepay') {
    input = document.querySelector('#dateOfBirthInput');

    if (!(input.value && input.value.length > 0)) {
      input.classList.add('adyen-checkout__input--error');
      return false;
    }

    return true;
  }

  return true;
}

function validateCustomInputField(input) {
  if (input.value === '') {
    input.classList.add('adyen-checkout__input--error');
  } else if (input.value.length > 0) {
    input.classList.remove('adyen-checkout__input--error');
  }
}
/**
 * Assigns stateData value to the hidden stateData input field so it's sent to the backend for processing
 */


function validateComponents() {
  if (document.querySelector('#component_ach')) {
    var inputs = document.querySelectorAll('#component_ach > input');

    for (var input of inputs) {
      input.onchange = function () {
        validateCustomInputField(this);
      };
    }
  }

  if (document.querySelector('#dateOfBirthInput')) {
    document.querySelector('#dateOfBirthInput').onchange = function () {
      validateCustomInputField(this);
    };
  }

  var stateData;

  if (componentsObj[selectedMethod] && componentsObj[selectedMethod].stateData) {
    stateData = componentsObj[selectedMethod].stateData;
  } else {
    stateData = {
      paymentMethod: {
        type: selectedMethod
      }
    };
  }

  if (selectedMethod === 'ach') {
    var bankAccount = {
      ownerName: document.querySelector('#bankAccountOwnerNameValue').value,
      bankAccountNumber: document.querySelector('#bankAccountNumberValue').value,
      bankLocationId: document.querySelector('#bankLocationIdValue').value
    };
    stateData.paymentMethod = _objectSpread(_objectSpread({}, stateData.paymentMethod), {}, {
      bankAccount: bankAccount
    });
  } else if (selectedMethod === 'ratepay') {
    if (document.querySelector('#genderInput').value && document.querySelector('#dateOfBirthInput').value) {
      stateData.shopperName = {
        gender: document.querySelector('#genderInput').value
      };
      stateData.dateOfBirth = document.querySelector('#dateOfBirthInput').value;
    }
  }

  document.querySelector('#adyenStateData').value = JSON.stringify(stateData);
}
/**
 * Contains fallback components for payment methods that don't have an Adyen web component yet
 */


function getFallback(paymentMethod) {
  var ach = "<div id=\"component_ach\">\n                    <span class=\"adyen-checkout__label\">Bank Account Owner Name</span>\n                    <input type=\"text\" id=\"bankAccountOwnerNameValue\" class=\"adyen-checkout__input\">\n                    <span class=\"adyen-checkout__label\">Bank Account Number</span>\n                    <input type=\"text\" id=\"bankAccountNumberValue\" class=\"adyen-checkout__input\" maxlength=\"17\" >\n                    <span class=\"adyen-checkout__label\">Routing Number</span>\n                    <input type=\"text\" id=\"bankLocationIdValue\" class=\"adyen-checkout__input\" maxlength=\"9\" >\n                 </div>";
  var ratepay = "<span class=\"adyen-checkout__label\">Gender</span>\n                    <select id=\"genderInput\" class=\"adyen-checkout__input\">\n                        <option value=\"MALE\">Male</option>\n                        <option value=\"FEMALE\">Female</option>\n                    </select>\n                    <span class=\"adyen-checkout__label\">Date of birth</span>\n                    <input id=\"dateOfBirthInput\" class=\"adyen-checkout__input\" type=\"date\"/>";
  var fallback = {
    ach: ach,
    ratepay: ratepay
  };
  return fallback[paymentMethod];
}

module.exports = {
  methods: {
    renderGenericComponent: renderGenericComponent
  }
};