import { createElement, render } from '../utils/dom.js';
import { materialService } from '../db/materialService.js';
import { showToast } from './toast.js';

const PREDEFINED_UNITS = ['Bags', 'Loads', 'm³', 'kg', 'Units', 'Litres', 'Brass'];

export class MaterialFormModal {
  constructor() {
    this.el = null;
    this.nameInput = null;
    this.quantityInput = null;
    this.unitSelect = null;
    this.customUnitInput = null;
    this.suggestionsEl = null;
    this.onSubmitCallback = null;
    this.initialData = null;
    this.knownNames = [];
  }

  async show({ initialData = null, onSubmit }) {
    this.initialData = initialData;
    this.onSubmitCallback = onSubmit;
    
    // Load known material names for suggestions
    try {
      this.knownNames = await materialService.getAllMaterialNames();
    } catch (e) {
      this.knownNames = [];
    }

    this.init();

    // Transition in
    setTimeout(() => {
      this.el.classList.remove('opacity-0');
      this.el.querySelector('.modal-box').classList.remove('scale-95');
      this.nameInput.focus();
    }, 10);
  }

  close() {
    if (!this.el) return;
    this.el.classList.add('opacity-0');
    this.el.querySelector('.modal-box').classList.add('scale-95');
    
    setTimeout(() => {
      if (this.el && this.el.parentNode) {
        this.el.parentNode.removeChild(this.el);
      }
      this.el = null;
    }, 200);
  }

  init() {
    if (this.el) return;

    this.nameInput = createElement('input', {
      type: 'text',
      class: 'w-full bg-surface border border-secondary p-3 rounded-lg focus:ring-2 focus:ring-primary outline-none',
      placeholder: 'e.g. Ultratech Cement, River Sand',
      value: this.initialData ? this.initialData.materialName : '',
      required: true,
      oninput: (e) => this.handleNameInput(e.target.value),
      onblur: () => setTimeout(() => this.hideSuggestions(), 200) // Delay to allow clicks
    });

    this.quantityInput = createElement('input', {
      type: 'number',
      step: 'any',
      min: '0.01',
      class: 'w-full bg-surface border border-secondary p-3 rounded-lg focus:ring-2 focus:ring-primary outline-none font-bold',
      placeholder: '0.00',
      value: this.initialData ? this.initialData.quantity : '',
      required: true
    });

    // Custom unit input field
    this.customUnitInput = createElement('input', {
      type: 'text',
      class: 'w-full bg-surface border border-secondary p-3 rounded-lg focus:ring-2 focus:ring-primary outline-none hidden',
      placeholder: 'e.g. bags, loads',
      value: ''
    });

    // Unit select element
    const initialUnit = this.initialData ? this.initialData.unit : 'Bags';
    const isCustomUnit = initialUnit && !PREDEFINED_UNITS.includes(initialUnit);
    
    this.unitSelect = createElement('select', {
      class: 'w-full bg-surface border border-secondary p-3 rounded-lg focus:ring-2 focus:ring-primary outline-none',
      onchange: (e) => {
        if (e.target.value === 'custom') {
          this.customUnitInput.classList.remove('hidden');
          this.customUnitInput.focus();
        } else {
          this.customUnitInput.classList.add('hidden');
        }
      }
    }, [
      ...PREDEFINED_UNITS.map(unit => createElement('option', {
        value: unit,
        selected: unit === initialUnit
      }, unit)),
      createElement('option', { value: 'custom', selected: isCustomUnit }, 'Other (Type Custom...)')
    ]);

    if (isCustomUnit) {
      this.customUnitInput.classList.remove('hidden');
      this.customUnitInput.value = initialUnit;
    }

    this.suggestionsEl = createElement('div', {
      class: 'absolute left-0 right-0 top-full bg-surface border border-outline-variant rounded-lg shadow-lg max-h-40 overflow-y-auto hidden z-[95] mt-1'
    });

    const isEdit = !!this.initialData;

    this.el = createElement('div', {
      class: 'fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4 transition-opacity duration-200 opacity-0'
    }, [
      createElement('form', {
        class: 'modal-box bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl w-full max-w-sm shadow-2xl transition-transform duration-200 scale-95 flex flex-col gap-4',
        onsubmit: (e) => {
          e.preventDefault();
          this.handleSubmit();
        }
      }, [
        createElement('h3', { class: 'font-headline-md text-on-surface' }, isEdit ? 'Edit Material' : 'Add Material'),
        
        // Name field
        createElement('div', { class: 'space-y-1 relative' }, [
          createElement('label', { class: 'font-label-bold text-on-surface-variant' }, 'Material Name'),
          this.nameInput,
          this.suggestionsEl
        ]),

        // Quantity & Unit Grid
        createElement('div', { class: 'grid grid-cols-2 gap-4' }, [
          createElement('div', { class: 'space-y-1' }, [
            createElement('label', { class: 'font-label-bold text-on-surface-variant' }, 'Quantity'),
            this.quantityInput
          ]),
          createElement('div', { class: 'space-y-1' }, [
            createElement('label', { class: 'font-label-bold text-on-surface-variant' }, 'Unit'),
            this.unitSelect
          ])
        ]),

        // Custom Unit Field (conditional)
        this.customUnitInput,

        // Actions
        createElement('div', { class: 'flex justify-end gap-3 mt-2' }, [
          createElement('button', {
            type: 'button',
            class: 'px-4 py-2 border border-outline text-secondary font-label-bold rounded-lg hover:bg-surface-container transition-colors',
            onclick: () => this.close()
          }, 'Cancel'),
          createElement('button', {
            type: 'submit',
            class: 'px-4 py-2 bg-primary text-on-primary font-label-bold rounded-lg hover:bg-primary/95 transition-colors'
          }, isEdit ? 'Save Changes' : 'Add')
        ])
      ])
    ]);

    document.body.appendChild(this.el);
  }

  handleNameInput(value) {
    if (!value.trim()) {
      this.hideSuggestions();
      return;
    }

    const term = value.toLowerCase();
    const matches = this.knownNames.filter(name => name.toLowerCase().includes(term));

    if (matches.length === 0) {
      this.hideSuggestions();
      return;
    }

    render(this.suggestionsEl, createElement('div', { class: 'py-1 flex flex-col' }, 
      matches.map(name => createElement('button', {
        type: 'button',
        class: 'text-left px-3 py-2 text-sm hover:bg-surface-container transition-colors font-body-md text-on-surface',
        onclick: () => {
          this.nameInput.value = name;
          this.hideSuggestions();
        }
      }, name))
    ));

    this.suggestionsEl.classList.remove('hidden');
  }

  hideSuggestions() {
    if (this.suggestionsEl) {
      this.suggestionsEl.classList.add('hidden');
    }
  }

  handleSubmit() {
    const materialName = this.nameInput.value.trim();
    const quantity = parseFloat(this.quantityInput.value);
    
    let unit = this.unitSelect.value;
    if (unit === 'custom') {
      unit = this.customUnitInput.value.trim();
    }

    if (!materialName) {
      showToast('Material name is required', 'error');
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      showToast('Quantity must be greater than 0', 'error');
      return;
    }

    if (!unit) {
      showToast('Unit is required', 'error');
      return;
    }

    // Callback with data
    const materialData = {
      materialName,
      quantity,
      unit
    };

    if (this.initialData) {
      materialData.id = this.initialData.id;
      materialData.dailyRecordId = this.initialData.dailyRecordId;
    }

    this.onSubmitCallback(materialData);
    this.close();
  }
}

export const materialFormModal = new MaterialFormModal();
