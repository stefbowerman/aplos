import $ from 'jquery';
import { chosenSelects } from '../../core/utils';
import {
  formatMoney,
  stripZeroCents
} from '../../core/currency';
import Variants from './variants';

const selectors = {
  addToCart: '[data-add-to-cart]',
  addToCartText: '[data-add-to-cart-text]',
  originalSelectorId: '[data-product-select]',
  priceWrapper: '[data-price-wrapper]',
  productJson: '[data-product-json]',
  productPrice: '[data-product-price]',
  singleOptionSelector: '[data-single-option-selector]',
  variantOptionValueList: '[data-variant-option-value-list][data-option-position]',
  variantOptionValue: '[data-variant-option-value]',
  productQuantity: '[data-product-quantity]',
  dotQty: '[data-dot-qty]',
  quantityAdjuster: '[data-quantity-adjuster]'
};

const classes = {
  hide: 'hide',
  variantOptionValueActive: 'is-active',
  dotActive: 'is-active'
};

export default class ProductForm {
  /**
   * ProductForm constructor
   *
   * @param { jQuery } $container - Main element containing all form elements   
   * @param { Object } config
   * @param { Function } config.onVariantChange -  Called when a new variant has been selected from the form,
   * @param { Boolean } config.enableHistoryState - If set to "true", turns on URL updating when switching variant
   */
  constructor($container, config) {
    this.settings = {};
    this.name = 'productForm';
    this.namespace = `.${this.name}`;

    this.events = {
      RESIZE: `resize${this.namespace}`,
      CLICK:  `click${this.namespace}`
    };
    
    const defaults = {
      onVariantChange: $.noop,
      enableHistoryState: true
    };

    this.settings = $.extend({}, defaults, config);

    this.$container = $container; // Scoping element for all DOM lookups

    if (!this.$container || this.$container.length === 0) {
      console.warn(`[${this.name}] - $container required to initialize`);
      return;
    }

    /* eslint-disable */
    /* temporarily disable to allow long lines for element descriptions */
    this.$addToCartBtn           = $(selectors.addToCart, this.$container);
    this.$addToCartBtnText       = $(selectors.addToCartText, this.$container); // Text inside the add to cart button
    this.$productPrice           = $(selectors.productPrice, this.$container);
    this.$singleOptionSelectors  = $(selectors.singleOptionSelector, this.$container); // Dropdowns for each variant option containing all values for that option
    this.$variantOptionValueList = $(selectors.variantOptionValueList, this.$container); // Alternate UI that takes the place of a single option selector (could be swatches, dots, buttons, whatever..)
    this.$productQuantity        = $(selectors.productQuantity, this.$container); // Hidden quantity input
    this.$dotQtys                = $(selectors.dotQty, this.$container); // Dot quantity UI, click them to change the selected quantity
    /* eslint-enable */

    this.productSingleObject  = JSON.parse($(selectors.productJson, this.$container).html());

    this.variants = new Variants({
      $container: this.$container,
      enableHistoryState: this.settings.enableHistoryState,
      singleOptionSelector: selectors.singleOptionSelector,
      originalSelectorId: selectors.originalSelectorId,
      product: this.productSingleObject
    });

    this.$container.on('change.quantityAdjuster', this.onQuantityAdjusterChange.bind(this));
    this.$container.on('variantChange', this.onVariantChange.bind(this));
    this.$container.on(this.events.CLICK, selectors.variantOptionValue, this.onVariantOptionValueClick.bind(this));
    this.$dotQtys.on('click', this.onDotQuantityClick.bind(this));

    chosenSelects(this.$container);

    // For demo
    this.$container.on('click', '.pill', (e) => {
      const $p = $(e.currentTarget);
      $p.siblings().removeClass('is-active');
      $p.addClass('is-active');
    });
  }

  onVariantChange(evt) {
    const variant = evt.variant;

    this.updateProductPrices(variant);
    this.updateAddToCartState(variant);
    this.updateVariantOptionValues(variant);

    this.$singleOptionSelectors.trigger('chosen:updated');

    this.settings.onVariantChange(variant);
  }

  /**
   * Updates the DOM state of the add to cart button
   *
   * @param {Object} variant - Shopify variant object
   */
  updateAddToCartState(variant) {
    if (variant) {
      this.$addToCartBtn.prop('disabled', !variant.available);
      this.$addToCartBtnText.html(theme.strings[`${variant.available ? 'addToCart' : 'soldOut'}`]);
    }
    else {
      this.$addToCartBtnText.html(theme.strings.unavailable);
      this.$addToCartBtn.prop('disabled', true);
    }
  }

  /**
   * Updates the DOM with specified prices
   *
   * @param {Object} variant - Shopify variant object
   */
  updateProductPrices(variant) {
    if (variant) {
      this.$productPrice.html(stripZeroCents(formatMoney(variant.price, window.theme.moneyFormat)));
    }
  }

  /**
   * Updates the DOM state of the elements matching the variantOption Value selector based on the currently selected variant
   *
   * @param {Object} variant - Shopify variant object
   */
  updateVariantOptionValues(variant) {
    if (variant) {
      // Loop through all the options and update the option value
      for (let i = 1; i <= 3; i++) {
        const variantOptionValue = variant[`option${i}`];

        if (!variantOptionValue) break; // Break if the product doesn't have an option at this index

        // Since we are finding the variantOptionValueUI based on the *actual* value, we need to scope to the correct list
        // As some products can have the same values for different variant options (waist + inseam both use "32", "34", etc..)
        const $list = this.$variantOptionValueList.filter(`[data-option-position="${i}"]`);
        const $variantOptionValueUI   = $list.find('[data-variant-option-value="'+variantOptionValue+'"]');

        $variantOptionValueUI.addClass(classes.variantOptionValueActive);
        $variantOptionValueUI.siblings().removeClass(classes.variantOptionValueActive);
      }
    }
  }

  updateQuantity(quantity) {
    // @TODO - Store quantity as instance var to check against when "changing" ?

    this.$dotQtys
      .removeClass(classes.dotActive)
      .filter((i, el) => {
        return $(el).data('dot-qty') === quantity;
      })
      .addClass(classes.dotActive);

    // @TODO - Need to get this working the other way around - update the adjuster

    this.$productQuantity.val(quantity);
  }

  /**
   * Handle variant option value click event.
   * Update the associated select tag and update the UI for this value
   *
   * @param {event} evt
   */
  onVariantOptionValueClick(e) {
    const $option = $(e.currentTarget);

    if ($option.hasClass(classes.variantOptionValueActive)) {
      return;
    }

    const value     = $option.data('variant-option-value');
    const position  = $option.parents(selectors.variantOptionValueList).data('option-position');
    const $selector = this.$singleOptionSelectors.filter(`[data-index="option${position}"]`);

    $selector.val(value);
    $selector.trigger('change');

    $option.addClass(classes.variantOptionValueActive);
    $option.siblings().removeClass(classes.variantOptionValueActive);
  }

  onDotQuantityClick(e) {
    const $dotQty = $(e.currentTarget);

    if ($dotQty.hasClass(classes.dotActive)) return;

    this.updateQuantity($dotQty.data('dot-qty'));
  }

  onQuantityAdjusterChange(e) {
    const instance = e.instance;

    if (!instance) return;

    this.updateQuantity(instance.getVal());
  }
}
