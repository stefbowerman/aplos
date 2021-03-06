import $ from 'jquery';
import Swiper from 'swiper';
import {
  isTouch,
  isThemeEditor
} from '../core/utils';
import BaseSection from './base';

const selectors = {
  slideshow: '[data-slideshow]'
};

export default class TestimonialsSection extends BaseSection {
  constructor(container) {
    super(container, 'testimonials');

    this.$slideshow = $(selectors.slideshow, this.$container);

    const $slideshowPrev = this.$slideshow.find('.swiper-prev');
    const $slideshowNext = this.$slideshow.find('.swiper-next');

    const swiperOptions = {
      loop: true,
      speed: 1200,
      autoplay: {
        delay: 3500
      },
      simulateTouch: false,
      disableOnInteraction: false
    };

    if (isTouch()) {
      swiperOptions.effect = 'slide';
      $slideshowPrev.remove();
      $slideshowNext.remove();
    }
    else {
      swiperOptions.effect = 'fade';
      swiperOptions.fadeEffect = { crossFade: true };
      swiperOptions.navigation = {
        prevEl: $slideshowPrev.get(0),
        nextEl: $slideshowNext.get(0)
      };
    }

    this.swiper = new Swiper(this.$slideshow.get(0), swiperOptions);

    if (!isThemeEditor()) {
      this.swiper.autoplay.start();
    }
  }

  /**
   * Theme Editor section events below
   */
  onBlockSelect(e) {
    const $blockSlide = this.$slideshow.find(`[data-block-id="${e.detail.blockId}"]`);

    if ($blockSlide.length === 0) {
      return;
    }

    this.swiper.slideToLoop($blockSlide.first().data('swiper-slide-index'));
    this.swiper.autoplay.stop();
  }

  onBlockDeselect(e) {
    this.swiper.autoplay.start();
  }
}
