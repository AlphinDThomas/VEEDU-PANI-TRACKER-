import { createElement, render } from '../utils/dom.js';
import { searchService } from '../db/searchService.js';
import { navigateTo } from '../router.js';
import { formatRupees } from '../utils/currency.js';

export class SearchModal {
  constructor() {
    this.el = null;
    this.input = null;
    this.resultsContainer = null;
    this.debounceTimer = null;
  }

  show() {
    this.init();
    document.body.classList.add('overflow-hidden'); // Prevent background scrolling

    // Transition in
    setTimeout(() => {
      this.el.classList.remove('opacity-0');
      this.el.querySelector('.modal-box').classList.remove('translate-y-4');
      this.input.focus();
    }, 10);
  }

  close() {
    if (!this.el) return;
    this.el.classList.add('opacity-0');
    this.el.querySelector('.modal-box').classList.add('translate-y-4');
    document.body.classList.remove('overflow-hidden');

    setTimeout(() => {
      if (this.el && this.el.parentNode) {
        this.el.parentNode.removeChild(this.el);
      }
      this.el = null;
    }, 200);
  }

  init() {
    if (this.el) return;

    this.resultsContainer = createElement('div', { class: 'space-y-4 overflow-y-auto max-h-[60vh] custom-scrollbar pb-4' });
    this.input = createElement('input', {
      type: 'text',
      placeholder: 'Search dates, materials, tags, notes...',
      class: 'w-full bg-surface border border-secondary p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-on-surface font-body-md pl-10',
      oninput: (e) => this.handleInput(e)
    });

    this.el = createElement('div', {
      class: 'fixed inset-0 z-[80] bg-black/40 backdrop-blur-xs flex items-start justify-center p-4 transition-opacity duration-200 opacity-0'
    }, [
      createElement('div', {
        class: 'modal-box bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-lg shadow-2xl transition-transform duration-200 translate-y-4 mt-10 overflow-hidden flex flex-col'
      }, [
        // Header
        createElement('div', { class: 'p-4 border-b border-outline-variant flex items-center justify-between gap-3' }, [
          createElement('div', { class: 'relative flex-grow' }, [
            createElement('span', { class: 'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary' }, 'search'),
            this.input,
            createElement('button', {
              class: 'material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface text-lg',
              onclick: () => {
                this.input.value = '';
                this.handleSearch('');
              }
            }, 'cancel')
          ]),
          createElement('button', {
            class: 'text-primary font-label-bold text-sm hover:underline px-2 py-1',
            onclick: () => this.close()
          }, 'Close')
        ]),

        // Results Content
        createElement('div', { class: 'p-4 flex-grow' }, [
          this.resultsContainer
        ])
      ])
    ]);

    document.body.appendChild(this.el);
    this.renderInitialState();
  }

  renderInitialState() {
    render(this.resultsContainer, createElement('div', { class: 'text-center py-8 text-secondary font-body-md' }, [
      createElement('span', { class: 'material-symbols-outlined text-4xl block mb-2' }, 'search_insights'),
      'Type to materials, activities.'
    ]));
  }

  handleInput(e) {
    const val = e.target.value;
    clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.handleSearch(val);
    }, 300);
  }

  async handleSearch(query) {
    if (!query.trim()) {
      this.renderInitialState();
      return;
    }

    render(this.resultsContainer, createElement('div', { class: 'text-center py-8 text-secondary font-body-md' }, [
      createElement('span', { class: 'material-symbols-outlined animate-spin text-3xl block mb-2' }, 'sync'),
      'Searching database...'
    ]));

    try {
      const results = await searchService.globalSearch(query);
      this.renderResults(results);
    } catch (err) {
      console.error(err);
      render(this.resultsContainer, createElement('div', { class: 'text-center py-8 text-error font-body-md' }, 'Error performing search.'));
    }
  }

  renderResults(results) {
    if (results.totalCount === 0) {
      render(this.resultsContainer, createElement('div', { class: 'text-center py-8 text-secondary font-body-md' }, [
        createElement('span', { class: 'material-symbols-outlined text-4xl block mb-2' }, 'find_in_page'),
        `No matches found for "${results.query}".`
      ]));
      return;
    }

    const items = [];

    // 1. Render Daily Record Matches
    if (results.records.length > 0) {
      items.push(createElement('h4', { class: 'text-xs font-label-bold uppercase tracking-wider text-secondary mt-2' }, `Daily Logs (${results.records.length})`));

      const recordList = createElement('div', { class: 'flex flex-col gap-2' });
      results.records.forEach(r => {
        const item = createElement('div', {
          class: 'p-3 bg-surface-container-low rounded-xl border border-outline-variant hover:border-primary cursor-pointer transition-all active:scale-98',
          onclick: () => {
            this.close();
            navigateTo('daily-entry', { date: r.date });
          }
        }, [
          createElement('div', { class: 'flex justify-between items-center' }, [
            createElement('span', { class: 'font-label-bold text-primary' }, r.formattedDate),
            createElement('span', { class: 'text-[11px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded font-bold' }, r.matchField)
          ]),
          createElement('p', { class: 'text-xs text-on-surface-variant line-clamp-2 mt-1 italic' }, `"${r.snippet}"`)
        ]);
        recordList.appendChild(item);
      });
      items.push(recordList);
    }

    // 2. Render Material Matches
    if (results.materials.length > 0) {
      items.push(createElement('h4', { class: 'text-xs font-label-bold uppercase tracking-wider text-secondary mt-4' }, `Materials Delivered (${results.materials.length})`));

      const materialList = createElement('div', { class: 'flex flex-col gap-2' });
      results.materials.forEach(m => {
        const item = createElement('div', {
          class: 'p-3 bg-surface-container-low rounded-xl border border-outline-variant hover:border-primary cursor-pointer transition-all active:scale-98',
          onclick: () => {
            this.close();
            navigateTo('daily-entry', { date: m.date });
          }
        }, [
          createElement('div', { class: 'flex justify-between items-center' }, [
            createElement('span', { class: 'font-label-bold text-on-surface' }, m.materialName),
            createElement('span', { class: 'text-xs text-primary font-bold' }, `${m.quantity} ${m.unit}`)
          ]),
          createElement('div', { class: 'text-[11px] text-secondary mt-1 flex justify-between' }, [
            createElement('span', {}, `Date: ${m.formattedDate}`),
            createElement('span', { class: 'hover:underline text-primary' }, 'Go to entry →')
          ])
        ]);
        materialList.appendChild(item);
      });
      items.push(materialList);
    }

    // 3. Render Activity Matches
    if (results.activities.length > 0) {
      items.push(createElement('h4', { class: 'text-xs font-label-bold uppercase tracking-wider text-secondary mt-4' }, `Activities (${results.activities.length})`));

      const activityList = createElement('div', { class: 'flex flex-col gap-2' });
      results.activities.forEach(act => {
        const item = createElement('div', {
          class: 'p-3 bg-surface-container-low rounded-xl border border-outline-variant hover:border-primary cursor-pointer transition-all active:scale-98',
          onclick: () => {
            this.close();
            navigateTo('daily-entry', { date: act.date });
          }
        }, [
          createElement('p', { class: 'text-sm text-on-surface font-body-md' }, act.description),
          createElement('div', { class: 'flex flex-wrap gap-1 mt-2' },
            act.tags.map(tag => createElement('span', { class: 'text-[10px] bg-secondary-fixed text-on-secondary-fixed-variant px-2 py-0.5 rounded-full font-semibold' }, tag))
          ),
          createElement('div', { class: 'text-[11px] text-secondary mt-2 flex justify-between' }, [
            createElement('span', {}, `Date: ${act.formattedDate}`),
            createElement('span', { class: 'hover:underline text-primary' }, 'Go to entry →')
          ])
        ]);
        activityList.appendChild(item);
      });
      items.push(activityList);
    }

    render(this.resultsContainer, createElement('div', { class: 'space-y-4' }, items));
  }
}
export const searchModal = new SearchModal();
