class CartDrawer extends HTMLElement {
  constructor() {
    super();
    console.log('CartDrawer initialized'); // Debug log

    // Bind methods to this instance
    this.handleEngravingClick = this.handleEngravingClick.bind(this);
    this.handleSaveClick = this.handleSaveClick.bind(this);
    this.close = this.close.bind(this);
    this.open = this.open.bind(this);

    // Add event listeners
    this.addEventListener(
      'keyup',
      (evt) => evt.code === 'Escape' && this.close(),
    );
    this.querySelector('#CartDrawer-Overlay').addEventListener(
      'click',
      this.close,
    );

    // Set up engraving functionality
    this.setupEngravingHandlers();

    this.setHeaderCartIconAccessibility();
  }

  setupEngravingHandlers() {
    // Remove existing handlers if they exist
    if (this._handlersSetup) {
      console.log('Handlers already set up, removing old ones');
      document.removeEventListener('click', this._handleDocumentClick);
      this._handlersSetup = false;
    }

    console.log('Setting up engraving handlers');

    // Create a single document click handler
    this._handleDocumentClick = (event) => {
      if (event.target.matches('.add-engraving-button')) {
        console.log('Add engraving button clicked');
        this.handleEngravingClick(event);
      } else if (event.target.matches('.save-engraving-button')) {
        console.log('Save engraving button clicked');
        this.handleSaveClick(event);
      }
    };

    // Add the document click handler
    document.addEventListener('click', this._handleDocumentClick);
    this._handlersSetup = true;
  }

  handleEngravingClick(event) {
    console.log('Handling engraving click');
    event.preventDefault();
    event.stopPropagation();

    const button = event.target;
    const engravingSection = button.closest('.engraving-section');
    console.log('Found engraving section:', engravingSection);

    if (!engravingSection) {
      console.error('Could not find engraving section');
      return;
    }

    const inputWrapper = engravingSection.querySelector(
      '.engraving-input-wrapper',
    );
    console.log('Found input wrapper:', inputWrapper);

    if (!inputWrapper) {
      console.error('Could not find input wrapper');
      return;
    }

    const input = inputWrapper.querySelector('.engraving-input');
    console.log('Found input:', input);

    // Toggle the input wrapper
    const isHidden = inputWrapper.style.display === 'none';
    console.log('is hidden', isHidden, inputWrapper.style.display);

    // Use a small delay to prevent double-triggering
    setTimeout(() => {
      inputWrapper.style.display = isHidden ? 'block' : 'none';

      // Focus the input if showing
      if (isHidden && input) {
        input.focus();
      }
    }, 0);
  }

  handleSaveClick(event) {
    console.log('Handling save click');
    event.preventDefault();
    event.stopPropagation();

    const button = event.target;
    const engravingSection = button.closest('.engraving-section');
    const input = engravingSection.querySelector('.engraving-input');
    const itemKey = button.dataset.itemKey;

    if (!itemKey) {
      console.error('No item key found on save button');
      return;
    }

    this.saveEngraving(itemKey, input.value);
  }
  async saveEngraving(itemKey, engravingText) {
    const saveButton = this.querySelector(
      `[data-item-key="${itemKey}"].save-engraving-button`,
    );
    if (!saveButton) return;

    const originalText = saveButton.textContent;
    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;

    console.log('engravingConfig', window.engravingConfig);
    try {
      // Verify engraving data is loaded
      if (!window.engravingConfig.variantId) {
        throw new Error('Engraving service not loaded - please wait');
      }

      // Get current cart state
      const cart = await (await fetch('/cart.js')).json();
      const parentItem = cart.items.find((item) => item.key === itemKey);
      if (!parentItem) throw new Error('Parent item not found');

      // Find ALL existing engravings for this item
      const existingEngravings = cart.items.filter(
        (item) =>
          item.properties?._ParentItem === itemKey &&
          item.id === window.engravingConfig.variantId,
      );

      // Remove ALL existing engravings first
      // for (const engraving of existingEngravings) {
      //   await fetch('/cart/change.js', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({
      //       id: engraving.key,
      //       quantity: 0,
      //     }),
      //   });
      // }

      // If we have engraving text, add exactly ONE new engraving
      if (engravingText) {
        await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [
              {
                quantity: 1,
                id: window.engravingConfig.variantId,
                properties: {
                  _ParentItem: itemKey,
                  'Engraving Text': engravingText,
                  'For Product':
                    parentItem.product_title || parentItem.title || 'Item',
                  _CreatedAt: Date.now(), // Helps identify newest engraving
                },
              },
            ],
          }),
        });
      }

      // Update parent item properties
      // await fetch('/cart/change.js', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     id: itemKey,
      //     properties: {
      //       Engraving: engravingText || null,
      //     },
      //   }),
      // });

      // Refresh UI
      await this.updateCartDrawer();
      saveButton.textContent = engravingText
        ? 'Edit Engraving'
        : 'Add Engraving';
    } catch (error) {
      console.error('Engraving error:', error);
      saveButton.textContent = 'Error - Try Again';
    } finally {
      saveButton.disabled = false;
      setTimeout(() => {
        if (saveButton.textContent === 'Error - Try Again') {
          saveButton.textContent = originalText;
        }
      }, 2000);
    }
  }
  async updateCartDrawer() {
    const sectionsResponse = await fetch('/?sections=cart-drawer');
    const sections = await sectionsResponse.json();

    if (sections['cart-drawer']) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(sections['cart-drawer'], 'text/html');
      const newCartDrawer = doc.querySelector('cart-drawer');

      if (newCartDrawer) {
        this.innerHTML = newCartDrawer.innerHTML;
        if (this.setupEngravingHandlers) {
          this.setupEngravingHandlers();
        }
      }
    }
  }
  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    if (!cartLink) return;

    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    cartLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(cartLink);
    });
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role'))
      this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement =
          this.querySelector('.drawer__inner') ||
          this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true },
    );

    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute(
        'aria-controls',
        cartDrawerNote.nextElementSibling.id,
      );
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute(
        'aria-expanded',
        !event.currentTarget.closest('details').hasAttribute('open'),
      );
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__inner').classList.contains('is-empty') &&
      this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (!sectionElement) return;
      sectionElement.innerHTML = this.getSectionInnerHTML(
        parsedState.sections[section.id],
        section.selector,
      );
    });

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener(
        'click',
        this.close.bind(this),
      );
      this.setupEngravingHandlers(); // Re-setup handlers after rendering contents
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);
