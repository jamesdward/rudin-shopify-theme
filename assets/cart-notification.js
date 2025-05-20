class CartNotification extends HTMLElement {
  constructor() {
    super();

    this.notification = document.getElementById('cart-notification');
    this.header = document.querySelector('sticky-header');
    this.onBodyClick = this.handleBodyClick.bind(this);
    this.addEngravingButton = document.getElementById('add-engraving-button');
    this.engravingInputWrapper = document.querySelector(
      '.engraving-input-wrapper',
    );
    this.engravingInput = document.getElementById('engraving-text');
    this.saveEngravingButton = document.getElementById('save-engraving-button');

    console.log('CartNotification initialized', {
      addEngravingButton: this.addEngravingButton,
      engravingInputWrapper: this.engravingInputWrapper,
      engravingInput: this.engravingInput,
      saveEngravingButton: this.saveEngravingButton,
    });

    this.notification.addEventListener(
      'keyup',
      (evt) => evt.code === 'Escape' && this.close(),
    );
    this.querySelectorAll('button[type="button"]').forEach((closeButton) => {
      if (!closeButton.closest('.engraving-section')) {
        closeButton.addEventListener('click', this.close.bind(this));
      }
    });

    // Add engraving event listeners
    if (this.addEngravingButton) {
      this.addEngravingButton.addEventListener('click', (e) => {
        console.log('Add engraving button clicked');
        e.stopPropagation();
        this.toggleEngravingInput();
      });
    }
    if (this.saveEngravingButton) {
      this.saveEngravingButton.addEventListener('click', (e) => {
        console.log('Save engraving button clicked');
        e.stopPropagation();
        this.saveEngraving();
      });
    }
  }

  toggleEngravingInput() {
    console.log('Toggling engraving input');
    this.engravingInputWrapper.style.display =
      this.engravingInputWrapper.style.display === 'none' ? 'block' : 'none';
    if (this.engravingInputWrapper.style.display === 'block') {
      this.engravingInput.focus();
    }
  }

  async saveEngraving() {
    const engravingText = this.engravingInput.value.trim();
    console.log('Saving engraving:', {
      engravingText,
      cartItemKey: this.cartItemKey,
    });

    if (!engravingText) {
      console.log('No engraving text provided');
      return;
    }

    try {
      // First, get the current cart to ensure we have the latest data
      const cartResponse = await fetch('/cart.js');
      if (!cartResponse.ok) throw new Error('Failed to fetch cart');
      const cartData = await cartResponse.json();

      // Find the current item in the cart
      const currentItem = cartData.items.find(
        (item) => item.key === this.cartItemKey,
      );
      if (!currentItem) throw new Error('Item not found in cart');

      // Prepare the properties object
      const properties = {
        ...currentItem.properties,
        _Engraving: engravingText,
      };

      // Use the cart/change endpoint instead of cart/update
      const requestBody = {
        id: this.cartItemKey,
        properties: properties,
      };
      console.log('Sending cart change request:', requestBody);

      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Cart change response status:', response.status);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log('Cart change response data:', data);

      // After updating the cart, fetch the latest cart data with sections
      const sectionsResponse = await fetch(
        '/?sections=cart-notification-product,cart-notification-button,cart-icon-bubble',
      );
      if (!sectionsResponse.ok) {
        throw new Error('Failed to fetch cart sections');
      }

      const sectionsData = await sectionsResponse.json();
      console.log('Sections data:', sectionsData);

      // Update the cart data with the sections
      data.sections = sectionsData;

      this.engravingInputWrapper.style.display = 'none';
      this.engravingInput.value = '';

      // Refresh cart notification to show updated item
      this.renderContents(data);

      // Dispatch a custom event to notify other components that the cart has been updated
      document.dispatchEvent(
        new CustomEvent('cart:updated', {
          detail: { cart: data },
        }),
      );
    } catch (error) {
      console.error('Error saving engraving:', error);
    }
  }

  open() {
    this.notification.classList.add('animate', 'active');

    this.notification.addEventListener(
      'transitionend',
      () => {
        this.notification.focus();
        trapFocus(this.notification);
      },
      { once: true },
    );

    document.body.addEventListener('click', this.onBodyClick);
  }

  close() {
    this.notification.classList.remove('active');
    document.body.removeEventListener('click', this.onBodyClick);

    removeTrapFocus(this.activeElement);
  }

  renderContents(parsedState) {
    console.log('Rendering cart notification contents:', parsedState);
    this.cartItemKey = parsedState.key;

    if (!parsedState.sections) {
      console.error('No sections data available in parsedState');
      return;
    }

    this.getSectionsToRender().forEach((section) => {
      const element = document.getElementById(section.id);
      if (!element) {
        console.error(`Element with id ${section.id} not found`);
        return;
      }

      const sectionHtml = this.getSectionInnerHTML(
        parsedState.sections[section.section],
        section.section,
      );

      if (sectionHtml) {
        element.innerHTML = sectionHtml;
      } else {
        console.error(`No HTML content found for section ${section.id}`);
      }
    });

    if (this.header) this.header.reveal();
    this.open();
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-notification-product',
        section: 'cart-notification-product',
      },
      {
        id: 'cart-notification-button',
        section: 'cart-notification-button',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
      },
    ];
  }

  getSectionInnerHTML(html, section) {
    console.log('Getting section inner HTML for:', section, html);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const sectionElement = doc.querySelector(`#shopify-section-${section}`);

    if (!sectionElement) {
      console.error(`Section element not found for ${section}`);
      return html; // Return the original HTML if section element not found
    }

    return sectionElement.innerHTML;
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (target !== this.notification && !target.closest('cart-notification')) {
      const disclosure = target.closest('details-disclosure, header-menu');
      this.activeElement = disclosure
        ? disclosure.querySelector('summary')
        : null;
      this.close();
    }
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-notification', CartNotification);
