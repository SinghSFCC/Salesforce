const defaultStyle = {
    color: 'gold',
    shape: 'rect',
    layout: 'vertical',
    label: 'paypal',
    tagline: false
};

/**
 *  Gets paypal button styles
 * @param {Element} button - button element
 * @returns {Object} with button styles or if error appears with default styles
 */
function getPaypalButtonStyle(button) {
    try {
        const config = button.getAttribute('data-paypal-button-config');
        if (config) {
            const buttonConfigs = JSON.parse(config);
            return buttonConfigs.style;
        }
    } catch (error) {
        return {
            style: defaultStyle
        };
    }
}

export {
    getPaypalButtonStyle
};
