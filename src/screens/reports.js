import { createElement, render } from '../utils/dom.js';
import { analyticsService } from '../db/analyticsService.js';
import { materialService } from '../db/materialService.js';
import { formatRupees } from '../utils/currency.js';
import { 
  getTodayDateString, 
  toDateString, 
  formatDateShort 
} from '../utils/date.js';
import { showToast } from '../components/toast.js';
import { supabase } from '../db/supabaseClient.js';
import { createLoader } from '../components/loader.js';

export class ReportsScreen {
  constructor() {
    this.el = null;
    
    // Active filter
    this.periodType = 'month'; // 'month' | 'quarter' | 'year' | 'custom'
    
    // Custom range inputs
    this.customStart = getTodayDateString();
    this.customEnd = getTodayDateString();

    this.chartsData = [];
    this.cumulativeMaterials = [];
    this.labourStats = { average: 0, peak: 0, total: 0 };
    this.totalExpenses = 0;
    this.expenseChange = 0;
  }

  mount(container) {
    this.el = createElement('div', { class: 'space-y-stack-md pb-12 max-w-xl mx-auto' });
    container.appendChild(this.el);
    this.loadData();
  }

  unmount() {}

  async loadData() {
    if (this.el) {
      render(this.el, createLoader('Generating Reports...'));
    }

    try {
      const { start, end } = this.getDateRangeForPeriod();
      
      // Fetch labor stats
      this.labourStats = await analyticsService.getLabourStats(start, end);
      
      // Fetch cumulative material summary
      this.cumulativeMaterials = await materialService.getCumulativeByDateRange(start, end);

      // Fetch expenses
      const allRecords = await analyticsService.getDashboardStats(); // to get allTime and trend
      
      // Calculate total expenses for the selected period
      const periodRecords = await analyticsService.getExpenseTrend(this.periodType === 'year' ? 'year' : 'week');
      this.chartsData = periodRecords;
      
      // Fetch exact records for range to sum expenses
      const dbRecords = await analyticsService.getLabourStats(start, end); // wait, getLabourStats returns totals, let's query all records in range
      const rangeRecords = await analyticsService.getLabourStats(start, end); // wait, let's write a quick sum logic
      
      // Let's get all daily records and sum them up for the range
      const { data: recordsInRange, error } = await supabase
        .from('daily_records')
        .select('tea_morning, tea_evening')
        .gte('date', start)
        .lte('date', end);
        
      if (!error && recordsInRange) {
        this.totalExpenses = recordsInRange.reduce((sum, r) => sum + parseFloat(r.tea_morning) + parseFloat(r.tea_evening), 0);
      }

      // Simple percent change vs last month
      this.expenseChange = allRecords.trend.expenseChange;

      this.renderReports();
    } catch (e) {
      console.error(e);
      render(this.el, createElement('div', { class: 'p-8 text-center text-error' }, 'Failed to load report data.'));
    }
  }

  getDateRangeForPeriod() {
    const today = new Date();
    let start, end;

    if (this.periodType === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      start = toDateString(firstDay);
      end = toDateString(lastDay);
    } else if (this.periodType === 'quarter') {
      // Last 3 calendar months (including current)
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      start = toDateString(firstDay);
      end = toDateString(lastDay);
    } else if (this.periodType === 'year') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      const lastDay = new Date(today.getFullYear(), 11, 31);
      start = toDateString(firstDay);
      end = toDateString(lastDay);
    } else {
      // Custom
      start = this.customStart;
      end = this.customEnd;
    }

    return { start, end };
  }

  handlePeriodChange(type) {
    this.periodType = type;
    this.loadData();
  }

  renderReports() {
    if (!this.el) return;
    this.el.innerHTML = '';

    // 1. Period Filter Bar
    const filterBar = this.createFilterBar();

    // 2. Labour Report Card
    const labourCard = this.createLabourCard();

    // 3. Expense Report Card
    const expenseCard = this.createExpenseCard();

    // 4. Material Summary Card
    const materialsCard = this.createMaterialsCard();

    // 5. PDF Export Section
    const exportCard = this.createExportCard();

    this.el.appendChild(filterBar);
    this.el.appendChild(labourCard);
    this.el.appendChild(expenseCard);
    this.el.appendChild(materialsCard);
    this.el.appendChild(exportCard);
  }

  createFilterBar() {
    const filters = [
      { id: 'month', label: 'Current Month', icon: 'calendar_month' },
      { id: 'quarter', label: 'Last 3 Months', icon: 'date_range' },
      { id: 'year', label: 'Year', icon: 'event' },
      { id: 'custom', label: 'Custom Range', icon: 'tune' }
    ];

    const chips = createElement('div', { class: 'flex overflow-x-auto gap-base pb-2 scroll-hide' });
    
    filters.forEach(f => {
      const isActive = this.periodType === f.id;
      const chipClass = isActive
        ? 'flex-shrink-0 px-4 py-2 rounded-full bg-primary-container text-on-primary-container font-label-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs border border-primary-container'
        : 'flex-shrink-0 px-4 py-2 rounded-full bg-surface-container text-on-surface-variant font-label-bold text-xs border border-outline-variant hover:bg-surface-container-high transition-colors cursor-pointer';

      const chip = createElement('button', {
        class: chipClass,
        onclick: () => this.handlePeriodChange(f.id)
      }, [
        createElement('span', { class: 'material-symbols-outlined text-[16px]' }, f.icon),
        f.label
      ]);
      chips.appendChild(chip);
    });

    const container = createElement('section', { class: 'flex flex-col gap-base' }, [
      createElement('h2', { class: 'font-label-bold text-xs uppercase tracking-wider text-secondary' }, 'Analytics Period'),
      chips
    ]);

    // Render custom range selectors if active
    if (this.periodType === 'custom') {
      const customInputs = createElement('div', {
        class: 'grid grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant mt-2'
      }, [
        createElement('div', { class: 'space-y-1' }, [
          createElement('label', { class: 'font-label-bold text-[11px] text-secondary' }, 'Start Date'),
          createElement('input', {
            type: 'date',
            class: 'w-full bg-surface border border-outline p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary',
            value: this.customStart,
            onchange: (e) => {
              this.customStart = e.target.value;
              this.loadData();
            }
          })
        ]),
        createElement('div', { class: 'space-y-1' }, [
          createElement('label', { class: 'font-label-bold text-[11px] text-secondary' }, 'End Date'),
          createElement('input', {
            type: 'date',
            class: 'w-full bg-surface border border-outline p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary',
            value: this.customEnd,
            onchange: (e) => {
              this.customEnd = e.target.value;
              this.loadData();
            }
          })
        ])
      ]);
      container.appendChild(customInputs);
    }

    return container;
  }

  createLabourCard() {
    return createElement('section', {
      class: 'bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-xs'
    }, [
      createElement('div', { class: 'flex justify-between items-start mb-stack-sm' }, [
        createElement('div', {}, [
          createElement('h3', { class: 'font-headline-md text-on-surface' }, 'Labour Report'),
          createElement('p', { class: 'font-body-md text-xs text-secondary' }, 'Workforce distribution & peaks')
        ]),
        createElement('span', { class: 'material-symbols-outlined text-tertiary text-2xl' }, 'groups')
      ]),
      createElement('div', { class: 'grid grid-cols-2 gap-stack-sm' }, [
        createElement('div', { class: 'bg-surface-container-low p-4 rounded-lg border-l-4 border-tertiary' }, [
          createElement('p', { class: 'font-label-bold text-[11px] text-secondary uppercase tracking-wider' }, 'Average Capacity'),
          createElement('p', { class: 'font-headline-lg text-on-surface mt-1' }, [
            String(this.labourStats.average),
            createElement('span', { class: 'text-sm text-secondary ml-1 font-normal' }, '/day')
          ])
        ]),
        createElement('div', { class: 'bg-surface-container-low p-4 rounded-lg border-l-4 border-primary-container' }, [
          createElement('p', { class: 'font-label-bold text-[11px] text-secondary uppercase tracking-wider' }, 'Highest Peak'),
          createElement('p', { class: 'font-headline-lg text-on-surface mt-1' }, [
            String(this.labourStats.peak),
            createElement('span', { class: 'text-sm text-secondary ml-1 font-normal' }, 'staff')
          ])
        ])
      ])
    ]);
  }

  createExpenseCard() {
    // Expense Flow (Left side chart, right side total)
    const expenseFlowChart = createElement('div', {
      class: 'bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-xs flex flex-col justify-between'
    });

    expenseFlowChart.appendChild(createElement('div', { class: 'flex justify-between items-center mb-6' }, [
      createElement('h3', { class: 'font-headline-md text-on-surface' }, 'Expense Flow'),
      createElement('span', { class: 'material-symbols-outlined text-primary text-xl' }, 'bar_chart')
    ]));

    if (this.chartsData.length === 0) {
      expenseFlowChart.appendChild(createElement('div', { class: 'h-28 flex items-center justify-center text-secondary text-xs italic' }, 'No expense data for this range.'));
    } else {
      const maxVal = Math.max(...this.chartsData.map(d => d.expense), 100);
      const bars = createElement('div', { class: 'flex items-end justify-between h-28 gap-2 mt-auto border-b border-outline-variant pb-1' });
      
      this.chartsData.forEach(d => {
        const heightPct = Math.round((d.expense / maxVal) * 80) + 10;
        const formatted = formatRupees(d.expense, false);

        const bar = createElement('div', {
          class: 'w-full bg-secondary-container hover:bg-primary-container rounded-t-xs transition-all relative group cursor-pointer',
          style: `height: ${heightPct}%;`
        }, [
          createElement('div', {
            class: 'absolute -top-7 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md font-label-bold z-10'
          }, formatted)
        ]);

        bars.appendChild(bar);
      });

      expenseFlowChart.appendChild(bars);

      // Labels
      expenseFlowChart.appendChild(createElement('div', { class: 'flex justify-between mt-2 font-label-bold text-[10px] text-secondary px-1' }, 
        this.chartsData.map(d => createElement('span', {}, d.label))
      ));
    }

    // Right card showing total spent
    const totalSpentCard = createElement('div', {
      class: 'bg-primary text-on-primary p-6 rounded-xl border border-primary shadow-xs flex flex-col justify-center items-center text-center'
    }, [
      createElement('p', { class: 'font-label-bold text-xs opacity-90 uppercase tracking-wider' }, 'Total Spent in Period'),
      createElement('p', { class: 'text-[32px] font-bold mt-2' }, formatRupees(this.totalExpenses, false)),
      createElement('div', { class: 'mt-4 px-3 py-1 bg-white/10 rounded-full font-label-bold text-xs flex items-center gap-1.5' }, [
        createElement('span', { class: 'material-symbols-outlined text-[14px]' }, this.expenseChange >= 0 ? 'trending_up' : 'trending_down'),
        `${this.expenseChange >= 0 ? '+' : ''}${this.expenseChange}% vs last month`
      ])
    ]);

    return createElement('section', { class: 'grid grid-cols-1 md:grid-cols-3 gap-stack-md' }, [
      createElement('div', { class: 'md:col-span-2' }, expenseFlowChart),
      totalSpentCard
    ]);
  }

  createMaterialsCard() {
    const listEl = createElement('div', { class: 'space-y-3' });

    if (this.cumulativeMaterials.length === 0) {
      listEl.appendChild(createElement('div', {
        class: 'text-center py-6 text-xs text-secondary border border-dashed border-outline-variant rounded-xl italic'
      }, 'No materials delivered in this period.'));
    } else {
      this.cumulativeMaterials.forEach(m => {
        let iconName = 'architecture'; // cement
        const nameLower = m.materialName.toLowerCase();
        
        if (nameLower.includes('sand') || nameLower.includes('soil')) iconName = 'agriculture';
        if (nameLower.includes('steel') || nameLower.includes('rod') || nameLower.includes('rebar') || nameLower.includes('wire')) iconName = 'hardware';
        if (nameLower.includes('brick') || nameLower.includes('block') || nameLower.includes('stone')) iconName = 'structural_element';
        if (nameLower.includes('pipe') || nameLower.includes('plumb') || nameLower.includes('tap')) iconName = 'plumbing';

        const row = createElement('div', {
          class: 'flex items-center justify-between p-3 bg-surface rounded-lg border border-outline-variant'
        }, [
          createElement('div', { class: 'flex items-center gap-3' }, [
            createElement('div', { class: 'w-10 h-10 rounded bg-secondary-container flex items-center justify-center text-on-secondary-container' }, [
              createElement('span', { class: 'material-symbols-outlined' }, iconName)
            ]),
            createElement('div', {}, [
              createElement('p', { class: 'font-label-bold text-sm text-on-surface' }, m.materialName),
              createElement('p', { class: 'text-[11px] text-secondary' }, `Logged ${m.entryCount} times`)
            ])
          ]),
          createElement('div', { class: 'text-right' }, [
            createElement('span', { class: 'font-headline-md text-primary' }, String(m.totalQuantity)),
            createElement('span', { class: 'font-label-bold text-xs text-secondary ml-1' }, m.unit)
          ])
        ]);

        listEl.appendChild(row);
      });
    }

    return createElement('section', {
      class: 'bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-xs'
    }, [
      createElement('div', { class: 'flex items-center gap-2 mb-stack-sm' }, [
        createElement('span', { class: 'material-symbols-outlined text-secondary' }, 'inventory_2'),
        createElement('h3', { class: 'font-headline-md text-on-surface' }, 'Material Summary')
      ]),
      listEl
    ]);
  }

  createExportCard() {
    const exportBtn = createElement('button', {
      class: 'w-full bg-primary-container text-on-primary-container h-touch-target-min rounded-xl font-button-text text-button-text shadow-md active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer',
      onclick: () => this.handlePdfExport(exportBtn)
    }, [
      createElement('span', { class: 'material-symbols-outlined' }, 'picture_as_pdf'),
      'One-Click PDF Export'
    ]);

    return createElement('section', { class: 'mt-4 flex flex-col items-center gap-2' }, [
      exportBtn,
      createElement('p', { class: 'font-label-bold text-xs text-secondary select-none' }, 'Generates a clean print-ready summary of this report.')
    ]);
  }

  async handlePdfExport(btn) {
    const originalText = btn.innerHTML;
    
    // Visual feedback
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Generating report...';
    btn.classList.replace('bg-primary-container', 'bg-tertiary');
    btn.classList.replace('text-on-primary-container', 'text-white');

    setTimeout(() => {
      btn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Opening print dialog...';
      btn.classList.replace('bg-tertiary', 'bg-green-600');
      
      setTimeout(() => {
        // Trigger browser print
        window.print();
        
        // Reset button
        btn.innerHTML = originalText;
        btn.classList.remove('bg-green-600');
        btn.classList.add('bg-primary-container');
        btn.classList.add('text-on-primary-container');
      }, 1000);
    }, 1200);
  }
}
export default ReportsScreen;
