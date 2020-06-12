import $ from 'jquery';
import BaseSection from './base';
import CartAPI from '../core/cartAPI';
import { getQueryParams } from '../core/utils';
import AJAXFormManager from '../managers/ajaxForm';
import AJAXCartUI from '../ui/ajaxCart';

const $window = $(window);

/**
 * Ajax Cart Section Script
 * ------------------------------------------------------------------------------
 * All logic is handled cia CartAPI or AJAXCartUI
 * This file is strictly for handling section settings and theme editor interactions
 *
 */
export default class AJAXCartSection extends BaseSection {
  constructor(container) {
    super(container, 'ajaxCart');

    // Create a new instance of the cart UI.
    // Pass in any variables used by the Handlebars template that aren't part of the cart object
    this.ajaxCartUI = new AJAXCartUI();

    // Store callbacks so we can remove them later
    this.callbacks = {
      changeSuccess: (e) => {
        this.ajaxCartUI.onChangeSuccess(e.cart);
      },
      changeFail: (e) => {
        this.ajaxCartUI.onChangeFail(e.message);
      }
    };

    $window.on(AJAXFormManager.events.ADD_SUCCESS, this.callbacks.changeSuccess);
    $window.on(AJAXFormManager.events.ADD_FAIL, this.callbacks.changeFail);

    // Make sure we get the latest cart data when this initializes
    CartAPI.getCart().then((cart) => {
      this.ajaxCartUI.render(cart);

      // If redirected from the cart, show the ajax cart after a short delay
      if (getQueryParams().cart) {
        this.ajaxCartUI.open();
      }
    });
  }

  onSelect() {
    this.ajaxCartUI.open();
  }

  onDeselect() {
    this.ajaxCartUI.close();
  }

  onUnload() {
    this.ajaxCartUI && this.ajaxCartUI.destroy(); // Need to destroy to clean up body / window event listeners
    $window.off(AJAXFormManager.events.ADD_SUCCESS, this.callbacks.changeSuccess);
    $window.off(AJAXFormManager.events.ADD_FAIL, this.callbacks.changeFail);
  }
}
