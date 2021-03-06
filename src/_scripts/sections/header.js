import $ from 'jquery';
import { throttle } from 'throttle-debounce';
import Cookies from 'js-cookie';
import { 
  isThemeEditor,
  whichTransitionEnd
} from '../core/utils';
import BaseSection from './base';
import AJAXCartDrawer from '../components/ajaxCartDrawer';

const $window = $(window);
const $body = $(document.body);

const selectors = {
  header: '[data-header]',
  pencilBanner: '[data-pencil-banner]',
  headerMain: '[data-header-main]',
  cartBadge: '[data-cart-badge]',
  cartBadgeCount: '[data-cart-badge-count]',
  closePencilBanner: '[data-pencil-banner-close]'
};

const classes = {
  headerHidden: 'is-hidden',
  headerIsShifting: 'is-shifting',
  headerMainFixed: 'is-fixed',
  cartBadgeHasItems: 'has-items'
};

export default class HeaderSection extends BaseSection {
  constructor(container) {
    super(container, 'header');

    this.$header         = $(selectors.header, this.$container);
    this.$pencilBanner   = $(selectors.pencilBanner, this.$container);
    this.$headerMain     = $(selectors.headerMain, this.$container);
    this.$cartBadge      = $(selectors.cartBadge, this.$container);
    this.$cartBadgeCount = $(selectors.cartBadgeCount, this.$container);

    this.transitionEndEvent = whichTransitionEnd();
    this.pbCookie = {
      name: this.$container.data('cookie-name'),
      value: this.$container.data('cookie-hash')
    };

    // Cache these values because we use them in the scroll handler
    this.prevScrollTop      = 0;
    this.dirChangeScrollTop = 0; // Scrolltop value when the user changes scroll direction
    this.scrollDirection    = null; // up / down
    this.headerHeight       = 0;
    this.pencilBannerHeight = 0;

    // Bind these events so we can remove them
    this.throttledOnScroll = this.onScroll.bind(this); // throttle(50, this.onScroll.bind(this));
    this.throttledOnResize = throttle(100, this.onResize.bind(this));
    this.onAJAXCartRender = this.onAJAXCartRender.bind(this);

    this.$container.on('click', selectors.closePencilBanner, this.onClosePencilBannerClick.bind(this));
    $window.on(AJAXCartDrawer.events.RENDER, this.onAJAXCartRender);
    $window.on('scroll', this.throttledOnScroll);
    $window.on('resize', this.throttledOnResize);

    this.cacheDimensions(); // need these dimensions set before we call any scroll handlers
    this.onScroll(); // hit this one time on init to make sure everything is good    
  }

  onUnload() {
    $window.off(AJAXCartDrawer.events.RENDER, this.onAJAXCartRender);
    $window.off('scroll', this.throttledOnScroll);
    $window.off('resize', this.throttledOnResize);
  }

  cacheDimensions() {
    this.headerHeight       = this.$header.outerHeight();
    this.pencilBannerHeight = this.$pencilBanner.is(':visible') ? this.$pencilBanner.outerHeight() : 0;
  }

  /**
   * Update the cart badge + count
   *
   * @param {Number} count
   */
  updateCartCount(count) {
    this.$cartBadgeCount.html(count);
    this.$cartBadge.toggleClass(classes.cartBadgeHasItems, count > 0);
  }

  onAJAXCartRender(e) {
    if (e.cart) {
      this.updateCartCount(e.cart.item_count);
    }
  }

  onScroll() {
    // Do measurements outside of rAF.
    const scrollTop = $window.scrollTop();
    const direction = scrollTop >= this.prevScrollTop ? 'down' : 'up';
    const fixed     = scrollTop > this.pencilBannerHeight;
    let hideHeader  = false;

    if (direction !== this.scrollDirection) {
      this.dirChangeScrollTop = scrollTop;
    }

    if (direction === 'down' && scrollTop > this.headerHeight) { //  going down and scrolled past header natural height
      hideHeader = true;
    }
    else if (direction === 'up') {
      hideHeader = this.dirChangeScrollTop - scrollTop <= 25; //  going up and scrolled up 15px from last time we changed scroll direction
    }

    // For situations where we toggle content visibility and cause page jumps
    // Or we scroll past the top on mobile
    if (scrollTop <= 0) {
      hideHeader = false;
    }

    // Update body class to reflect scroll state
    if (scrollTop <= 0) {
      $body.removeClass('scrolling-up');
      $body.removeClass('scrolling-down');
    }
    else if (direction !== this.scrollDirection) {
      $body
        .removeClass(`scrolling-${this.scrollDirection}`)
        .addClass(`scrolling-${direction}`);
    }    

    requestAnimationFrame(() => {
      this.$header.toggleClass(classes.headerHidden, hideHeader);
      this.$headerMain.toggleClass(classes.headerMainFixed, fixed);
    });

    this.prevScrollTop   = scrollTop;
    this.scrollDirection = direction;
  }

  onResize() {
    this.cacheDimensions();
  }

  onClosePencilBannerClick(e) {
    e.preventDefault();

    if (isThemeEditor()) return;

    this.$header.one(this.transitionEndEvent, () => {
      this.$header
        .css('top', '')
        .removeClass(classes.headerIsShifting);
      this.$pencilBanner.hide();
      this.cacheDimensions();
      this.onScroll();

      // set cookie so we don't show until the next session
      Cookies.remove(this.pbCookie.name);
      Cookies.set(this.pbCookie.name, this.pbCookie.value);      
    });

    this.$header
      .addClass(classes.headerIsShifting)
      .css('top', this.pencilBannerHeight * -1);
  }
}
