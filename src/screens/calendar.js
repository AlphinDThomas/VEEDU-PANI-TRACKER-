import { createElement, render } from '../utils/dom.js';
import { dailyRecordService } from '../db/dailyRecordService.js';
import { materialService } from '../db/materialService.js';
import { activityService } from '../db/activityService.js';
import { store } from '../state/store.js';
import { navigateTo } from '../router.js';
import { formatRupees } from '../utils/currency.js';
import { 
  formatDateShort, 
  getDaysInMonth, 
  getFirstDayOfMonth, 
  getPrevMonth, 
  getNextMonth, 
  MONTHS,
  toDateString 
} from '../utils/date.js';
import { eventBus } from '../state/eventBus.js';
import { createLoader } from '../components/loader.js';

export class CalendarScreen {
  constructor() {
    this.el = null;
    
    // Calendar view state (defaults to selected date's month/year)
    const activeDate = new Date(store.getState().selectedDate);
    this.viewYear = activeDate.getFullYear();
    this.viewMonth = activeDate.getMonth(); // 0-indexed
    
    this.selectedDateStr = store.getState().selectedDate;
    this.datesWithEntries = [];

    // Details elements
    this.detailsCardContainer = null;

    this.boundRefresh = () => this.refreshCalendar();
  }

  mount(container) {
    this.el = createElement('div', { class: 'space-y-stack-md pb-12 max-w-xl mx-auto' });
    container.appendChild(this.el);

    eventBus.on('record:created', this.boundRefresh);
    eventBus.on('record:updated', this.boundRefresh);
    eventBus.on('record:deleted', this.boundRefresh);

    this.refreshCalendar();
  }

  unmount() {
    eventBus.off('record:created', this.boundRefresh);
    eventBus.off('record:updated', this.boundRefresh);
    eventBus.off('record:deleted', this.boundRefresh);
  }

  async refreshCalendar() {
    if (this.el) render(this.el, createLoader('Loading Calendar...'));
    try {
      this.datesWithEntries = await dailyRecordService.getDatesWithEntries(this.viewYear, this.viewMonth);
      this.renderLayout();
    } catch (e) {
      console.error(e);
    }
  }

  async handleMonthNavigate(direction) {
    if (direction === 'prev') {
      const prev = getPrevMonth(this.viewYear, this.viewMonth);
      this.viewYear = prev.year;
      this.viewMonth = prev.month;
    } else {
      const next = getNextMonth(this.viewYear, this.viewMonth);
      this.viewYear = next.year;
      this.viewMonth = next.month;
    }
    await this.refreshCalendar();
  }

  renderLayout() {
    if (!this.el) return;
    this.el.innerHTML = '';

    // 1. Calendar Widget Card
    const calendarCard = createElement('section', {
      class: 'bg-surface-container-lowest rounded-xl p-4 border border-outline-variant custom-shadow'
    }, [
      // Calendar Month Header
      createElement('div', { class: 'flex items-center justify-between mb-4' }, [
        createElement('h2', { class: 'font-label-bold text-sm text-on-surface uppercase tracking-wider' }, 
          `${MONTHS[this.viewMonth]} ${this.viewYear}`),
        createElement('div', { class: 'flex gap-1' }, [
          createElement('button', {
            class: 'p-2 hover:bg-surface-container rounded-lg transition-colors cursor-pointer material-symbols-outlined text-md',
            onclick: () => this.handleMonthNavigate('prev')
          }, 'chevron_left'),
          createElement('button', {
            class: 'p-2 hover:bg-surface-container rounded-lg transition-colors cursor-pointer material-symbols-outlined text-md',
            onclick: () => this.handleMonthNavigate('next')
          }, 'chevron_right')
        ])
      ]),

      // Weekday Labels
      createElement('div', { class: 'grid grid-cols-7 gap-y-4 text-center font-label-bold text-[12px] text-secondary mb-2' }, [
        createElement('div', {}, 'S'),
        createElement('div', {}, 'M'),
        createElement('div', {}, 'T'),
        createElement('div', {}, 'W'),
        createElement('div', {}, 'T'),
        createElement('div', {}, 'F'),
        createElement('div', {}, 'S')
      ]),

      // Calendar Grid
      this.createCalendarGrid()
    ]);

    // 2. Details Card Container
    this.detailsCardContainer = createElement('section', { class: 'space-y-stack-sm' });

    this.el.appendChild(calendarCard);
    this.el.appendChild(this.detailsCardContainer);

    // Initial details rendering for active selected date
    this.renderDetailsForDate(this.selectedDateStr);
  }

  createCalendarGrid() {
    const grid = createElement('div', { class: 'grid grid-cols-7 gap-y-4 text-center' });

    const totalDays = getDaysInMonth(this.viewYear, this.viewMonth);
    const startWeekday = getFirstDayOfMonth(this.viewYear, this.viewMonth);
    
    // Previous Month Days (to pad starting row)
    const prevMonthData = getPrevMonth(this.viewYear, this.viewMonth);
    const prevMonthTotalDays = getDaysInMonth(prevMonthData.year, prevMonthData.month);
    
    for (let i = startWeekday - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      grid.appendChild(createElement('div', {
        class: 'py-2 text-on-surface-variant/30 font-body-md select-none'
      }, String(dayNum)));
    }

    // Current Month Days
    for (let day = 1; day <= totalDays; day++) {
      const dayDateObj = new Date(this.viewYear, this.viewMonth, day);
      const dateStr = toDateString(dayDateObj);
      
      const isSelected = dateStr === this.selectedDateStr;
      const hasLog = this.datesWithEntries.includes(dateStr);

      let dayClass = 'py-2 relative flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container rounded-lg font-body-md';
      
      if (isSelected) {
        dayClass = 'py-2 relative flex flex-col items-center justify-center cursor-pointer bg-primary text-on-primary rounded-lg font-label-bold ring-2 ring-primary ring-offset-2 ring-offset-surface-container-lowest';
      }

      const dotsContainer = createElement('span', {
        class: `w-1.5 h-1.5 rounded-full mt-1 ${hasLog ? (isSelected ? 'bg-white' : 'bg-primary') : 'bg-transparent'}`
      });

      const dayTile = createElement('div', {
        class: dayClass,
        onclick: () => this.handleDateSelect(dateStr)
      }, [
        createElement('span', {}, String(day)),
        dotsContainer
      ]);

      grid.appendChild(dayTile);
    }

    // Next Month Days (to pad last row)
    const totalGridSlots = startWeekday + totalDays;
    const remainingSlots = (7 - (totalGridSlots % 7)) % 7;
    for (let i = 1; i <= remainingSlots; i++) {
      grid.appendChild(createElement('div', {
        class: 'py-2 text-on-surface-variant/30 font-body-md select-none'
      }, String(i)));
    }

    return grid;
  }

  handleDateSelect(dateStr) {
    this.selectedDateStr = dateStr;
    store.setSelectedDate(dateStr);
    
    // Refresh calendar layout to update selected border
    this.refreshCalendar();
  }

  async renderDetailsForDate(dateStr) {
    if (!this.detailsCardContainer) return;
    render(this.detailsCardContainer, createLoader('Loading Details...'));

    const record = await dailyRecordService.getByDate(dateStr);

    // Clear loader
    this.detailsCardContainer.innerHTML = '';

    // 1. Details Header
    const formattedDate = formatDateShort(dateStr);
    this.detailsCardContainer.appendChild(createElement('div', { class: 'flex items-center justify-between mb-stack-sm' }, [
      createElement('h3', { class: 'font-headline-md text-on-surface' }, `Details for ${formattedDate}`),
      record 
        ? createElement('span', { class: 'px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-bold text-xs rounded uppercase font-bold' }, record.status)
        : null
    ]));

    if (!record) {
      // Empty State
      this.detailsCardContainer.appendChild(createElement('div', {
        class: 'bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3'
      }, [
        createElement('span', { class: 'material-symbols-outlined text-secondary text-5xl' }, 'post_add'),
        createElement('p', { class: 'font-body-md text-secondary italic' }, 'No diary entry logged for this date.'),
        createElement('button', {
          class: 'bg-primary text-on-primary px-4 py-2 rounded-xl font-label-bold text-sm hover:bg-primary/95 transition-colors cursor-pointer',
          onclick: () => {
            store.setSelectedDate(dateStr);
            navigateTo('daily-entry');
          }
        }, 'Create Log')
      ]));
      return;
    }

    // Load material & activity details for this record
    const materials = await materialService.getByRecordId(record.id);
    const activities = await activityService.getByRecordId(record.id);

    const teaTotal = record.teaMorning + record.teaEvening;

    // 2. Summary Details Card
    const summaryCard = createElement('div', {
      class: 'bg-surface-container-lowest border border-outline-variant rounded-xl p-5 custom-shadow space-y-4'
    }, [
      // Labour and Expenses Grid
      createElement('div', { class: 'grid grid-cols-2 gap-4' }, [
        // Labour
        createElement('div', { class: 'flex items-start gap-3' }, [
          createElement('div', { class: 'p-2 bg-secondary-container rounded-lg text-on-secondary-container flex items-center justify-center' }, [
            createElement('span', { class: 'material-symbols-outlined' }, 'groups')
          ]),
          createElement('div', {}, [
            createElement('p', { class: 'text-secondary font-label-bold text-[11px] uppercase tracking-wider' }, 'Labourers'),
            createElement('p', { class: 'font-headline-md text-on-surface mt-0.5' }, String(record.labourCount))
          ])
        ]),
        // Expenses
        createElement('div', { class: 'flex items-start gap-3' }, [
          createElement('div', { class: 'p-2 bg-primary-fixed text-on-primary-fixed-variant rounded-lg flex items-center justify-center' }, [
            createElement('span', { class: 'material-symbols-outlined' }, 'payments')
          ]),
          createElement('div', {}, [
            createElement('p', { class: 'text-secondary font-label-bold text-[11px] uppercase tracking-wider' }, 'Tea Expense'),
            createElement('p', { class: 'font-headline-md text-on-surface mt-0.5' }, formatRupees(teaTotal, false))
          ])
        ])
      ]),

      // Divider
      createElement('hr', { class: 'border-outline-variant' }),

      // Materials Used Block
      createElement('div', { class: 'flex items-start gap-3' }, [
        createElement('div', { class: 'p-2 bg-tertiary-container text-on-tertiary-container rounded-lg flex items-center justify-center' }, [
          createElement('span', { class: 'material-symbols-outlined' }, 'inventory_2')
        ]),
        createElement('div', { class: 'flex-grow min-w-0' }, [
          createElement('p', { class: 'text-secondary font-label-bold text-[11px] uppercase tracking-wider mb-2' }, 'Materials Delivered'),
          materials.length === 0 
            ? createElement('p', { class: 'text-xs text-secondary italic' }, 'No materials recorded.')
            : createElement('div', { class: 'space-y-1' }, materials.map(m => createElement('div', { class: 'flex justify-between items-center text-sm font-body-md py-0.5' }, [
                createElement('span', { class: 'text-on-surface-variant' }, m.materialName),
                createElement('span', { class: 'font-semibold text-on-surface' }, `${m.quantity} ${m.unit}`)
              ])))
        ])
      ])
    ]);

    // 3. Construction Activities & Notes
    let activityBlock = null;
    if (activities.length > 0 && activities[0].description) {
      const act = activities[0];
      activityBlock = createElement('div', { class: 'bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-2' }, [
        createElement('h4', { class: 'font-label-bold text-xs text-on-surface flex items-center gap-2' }, [
          createElement('span', { class: 'material-symbols-outlined text-[18px]' }, 'construction'),
          'Construction Activities'
        ]),
        createElement('p', { class: 'text-sm text-on-surface-variant font-body-md' }, act.description),
        act.tags.length > 0
          ? createElement('div', { class: 'flex flex-wrap gap-1 mt-2' }, 
              act.tags.map(tag => createElement('span', { class: 'text-[10px] bg-secondary-fixed text-on-secondary-fixed-variant px-2 py-0.5 rounded-full font-semibold' }, tag))
            )
          : null
      ]);
    }

    // Site notes Card
    let notesBlock = null;
    if (record.siteNotes) {
      notesBlock = createElement('div', { class: 'bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-2' }, [
        createElement('h4', { class: 'font-label-bold text-xs text-on-surface flex items-center gap-2' }, [
          createElement('span', { class: 'material-symbols-outlined text-[18px]' }, 'description'),
          'Site Notes'
        ]),
        createElement('p', { class: 'text-sm text-on-surface-variant font-body-md' }, record.siteNotes)
      ]);
    }

    // 4. Action Buttons
    const editBtn = createElement('button', {
      class: 'flex items-center justify-center gap-2 bg-primary text-on-primary py-3.5 px-6 rounded-xl font-button-text text-sm hover:bg-primary/95 active:scale-95 transition-transform cursor-pointer',
      onclick: () => {
        store.setSelectedDate(dateStr);
        navigateTo('daily-entry');
      }
    }, [
      createElement('span', { class: 'material-symbols-outlined text-sm' }, 'edit'),
      'Edit Entry'
    ]);

    const actionsContainer = createElement('div', { class: 'grid gap-4' }, [
      editBtn
    ]);

    this.detailsCardContainer.appendChild(summaryCard);
    if (activityBlock) this.detailsCardContainer.appendChild(activityBlock);
    if (notesBlock) this.detailsCardContainer.appendChild(notesBlock);
    this.detailsCardContainer.appendChild(actionsContainer);
  }

}
export default CalendarScreen;
