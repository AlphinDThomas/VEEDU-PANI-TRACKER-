import { createElement, render } from '../utils/dom.js';
import { analyticsService } from '../db/analyticsService.js';
import { navigateTo } from '../router.js';
import { formatRupees } from '../utils/currency.js';
import { formatDateShort, getTodayDateString } from '../utils/date.js';
import { eventBus } from '../state/eventBus.js';

export class DashboardScreen {
  constructor() {
    this.el = null;
    this.boundRefresh = () => this.refreshData();
  }

  mount(container) {
    this.el = createElement('div', { class: 'space-y-stack-md pb-12' });
    container.appendChild(this.el);
    
    // Subscribe to database changes
    eventBus.on('record:created', this.boundRefresh);
    eventBus.on('record:updated', this.boundRefresh);
    eventBus.on('record:deleted', this.boundRefresh);

    this.refreshData();
  }

  unmount() {
    eventBus.off('record:created', this.boundRefresh);
    eventBus.off('record:updated', this.boundRefresh);
    eventBus.off('record:deleted', this.boundRefresh);
  }

  async refreshData() {
    if (!this.el) return;

    try {
      const stats = await analyticsService.getDashboardStats();
      const trendData = await analyticsService.getExpenseTrend('week');
      const recentActs = await analyticsService.getRecentActivities(5);

      this.renderDashboard(stats, trendData, recentActs);
    } catch (e) {
      console.error(e);
      render(this.el, createElement('div', { class: 'p-8 text-center text-error' }, 'Failed to load dashboard data.'));
    }
  }

  renderDashboard(stats, trendData, recentActs) {
    this.el.innerHTML = '';

    const todayDateStr = formatDateShort(getTodayDateString());

    // 1. Today's Overview Section
    const overviewSection = createElement('section', {}, [
      createElement('div', { class: 'flex items-center justify-between mb-stack-sm' }, [
        createElement('h2', { class: 'font-headline-md text-on-surface' }, "Today's Overview"),
        createElement('span', { class: 'text-label-bold text-secondary' }, todayDateStr)
      ]),
      createElement('div', { class: 'grid grid-cols-2 md:grid-cols-4 gap-base' }, [
        // Labourers
        this.createStatTile('groups', 'Labourers', stats.today.labourCount, () => navigateTo('daily-entry')),
        // Tea/Snacks
        this.createStatTile('coffee', 'Tea/Snacks', formatRupees(stats.today.teaTotal, false), () => navigateTo('daily-entry')),
        // Materials
        this.createStatTile('inventory_2', 'Materials', stats.today.materialsCount, () => navigateTo('daily-entry')),
        // Activities
        this.createStatTile('assignment', 'Activities', stats.today.activitiesCount, () => navigateTo('daily-entry'))
      ])
    ]);

    // 2. Construction Statistics Section (Bento Style)
    const statsSection = createElement('section', {}, [
      createElement('h2', { class: 'font-headline-md text-on-surface mb-stack-sm' }, 'Construction Statistics'),
      createElement('div', { class: 'grid grid-cols-1 md:grid-cols-12 gap-gutter' }, [
        // Total Labourers (Large Bento Card)
        createElement('div', {
          class: 'md:col-span-8 bg-primary-container p-container-padding rounded-xl text-on-primary-container flex flex-col justify-between min-h-[160px] relative overflow-hidden group bento-card cursor-pointer',
          onclick: () => navigateTo('reports')
        }, [
          createElement('div', { class: 'z-10' }, [
            createElement('p', { class: 'font-label-bold text-xs uppercase tracking-wider opacity-90' }, 'Total Labourers Logged'),
            createElement('h3', { class: 'font-headline-lg mt-2' }, `${stats.allTime.totalLabourers} Personnel`)
          ]),
          createElement('span', {
            class: 'material-symbols-outlined absolute -bottom-4 -right-4 text-[120px] opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500'
          }, 'engineering'),
          createElement('div', { class: 'z-10 mt-4 bg-white/10 p-2 rounded-lg inline-flex items-center gap-2 w-fit text-sm font-label-bold' }, [
            createElement('span', { class: 'material-symbols-outlined text-sm' }, stats.trend.labourChange >= 0 ? 'trending_up' : 'trending_down'),
            createElement('span', {}, `${Math.abs(stats.trend.labourChange)}% from last month`)
          ])
        ]),

        // Expenses & Days (Stacked Bento Card)
        createElement('div', { class: 'md:col-span-4 grid grid-rows-2 gap-gutter' }, [
          createElement('div', {
            class: 'bg-surface-container-highest p-4 rounded-xl border-l-4 border-primary cursor-pointer hover:bg-surface-container-high transition-colors',
            onclick: () => navigateTo('reports')
          }, [
            createElement('p', { class: 'text-label-bold text-xs text-secondary' }, 'Total Expenses'),
            createElement('h3', { class: 'font-headline-md text-primary mt-1' }, formatRupees(stats.allTime.totalExpenses, false))
          ]),
          createElement('div', {
            class: 'bg-on-background p-4 rounded-xl border-l-4 border-outline text-surface-bright cursor-pointer hover:opacity-95 transition-opacity',
            onclick: () => navigateTo('calendar')
          }, [
            createElement('p', { class: 'text-label-bold text-xs opacity-70' }, 'Working Days'),
            createElement('h3', { class: 'font-headline-md mt-1' }, `${stats.allTime.workingDays} Days`)
          ])
        ])
      ])
    ]);

    // 3. Quick Insights Section (Charts and Activities)
    const insightsSection = createElement('section', { class: 'grid grid-cols-1 md:grid-cols-2 gap-gutter' }, [
      // Chart Card
      this.createTrendChart(trendData),
      
      // Activities Card
      this.createActivitiesFeed(recentActs)
    ]);

    // Append all sections to element
    this.el.appendChild(overviewSection);
    this.el.appendChild(statsSection);
    this.el.appendChild(insightsSection);

    // Add FAB
    const fab = createElement('button', {
      class: 'fixed bottom-24 right-6 w-14 h-14 bg-primary-container text-on-primary-container rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40 cursor-pointer',
      title: 'Add Entry',
      onclick: () => navigateTo('daily-entry')
    }, [
      createElement('span', { class: 'material-symbols-outlined text-3xl' }, 'add')
    ]);
    this.el.appendChild(fab);
  }

  createStatTile(icon, label, value, onClick) {
    return createElement('div', {
      class: 'bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-outline-variant transition-all hover:translate-y-[-2px] hover:shadow-sm active:scale-95 cursor-pointer',
      onclick: onClick
    }, [
      createElement('span', { class: 'material-symbols-outlined text-primary mb-2' }, icon),
      createElement('p', { class: 'text-label-bold text-xs text-secondary' }, label),
      createElement('p', { class: 'font-headline-md text-on-surface mt-1' }, value)
    ]);
  }

  createTrendChart(trendData) {
    const chartContainer = createElement('div', {
      class: 'bg-surface-container-low p-container-padding rounded-xl shadow-xs border border-outline-variant flex flex-col justify-between'
    });

    chartContainer.appendChild(createElement('div', { class: 'flex items-center justify-between mb-4' }, [
      createElement('h3', { class: 'font-label-bold text-on-surface' }, 'Expense Trend (Last 7 Logs)'),
      createElement('span', {
        class: 'material-symbols-outlined text-secondary cursor-pointer p-1 rounded hover:bg-surface-container-high',
        onclick: () => navigateTo('reports')
      }, 'trending_flat')
    ]));

    if (trendData.length === 0) {
      chartContainer.appendChild(createElement('div', { class: 'h-32 flex items-center justify-center text-secondary text-xs italic' }, 'No logged data yet.'));
      return chartContainer;
    }

    // Determine max expense for scaling
    const maxVal = Math.max(...trendData.map(d => d.expense), 100);

    const barsContainer = createElement('div', {
      class: 'h-32 flex items-end gap-2 px-2 border-b border-outline-variant relative'
    });

    trendData.forEach(d => {
      const heightPct = Math.round((d.expense / maxVal) * 80) + 10; // min 10%, max 90%
      const formattedAmount = formatRupees(d.expense, false);

      const bar = createElement('div', {
        class: 'w-full bg-primary/80 hover:bg-primary h-full rounded-t-xs relative group chart-bar-hover transition-all cursor-pointer',
        style: `height: ${heightPct}%;`
      }, [
        // Tooltip
        createElement('div', {
          class: 'absolute -top-7 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md font-label-bold z-10'
        }, formattedAmount)
      ]);

      barsContainer.appendChild(bar);
    });

    chartContainer.appendChild(barsContainer);

    // Labels
    chartContainer.appendChild(createElement('div', {
      class: 'flex justify-between mt-2 text-[10px] text-secondary font-label-bold px-1'
    }, trendData.map(d => createElement('span', {}, d.label))));

    return chartContainer;
  }

  createActivitiesFeed(recentActs) {
    const listEl = createElement('div', { class: 'space-y-4' });

    if (recentActs.length === 0) {
      listEl.appendChild(createElement('div', { class: 'py-8 text-center text-secondary text-xs italic' }, 'No activities recorded yet.'));
    } else {
      recentActs.forEach((act, idx) => {
        let ringBg = 'bg-primary ring-primary/20';
        if (idx === 1) ringBg = 'bg-secondary ring-secondary/20';
        if (idx >= 2) ringBg = 'bg-tertiary ring-tertiary/20';

        const item = createElement('div', {
          class: 'flex gap-4 items-start cursor-pointer hover:opacity-85 transition-opacity',
          onclick: () => navigateTo('daily-entry', { date: act.date })
        }, [
          createElement('div', { class: `w-2 h-2 mt-2 rounded-full ring-4 ${ringBg} flex-shrink-0` }),
          createElement('div', { class: 'flex-grow min-w-0' }, [
            createElement('p', { class: 'font-label-bold text-sm text-on-surface truncate' }, act.description),
            createElement('p', { class: 'text-xs text-secondary' }, `${act.timeLabel} • ${act.tags.join(', ') || 'No Tags'}`)
          ])
        ]);

        listEl.appendChild(item);
      });
    }

    return createElement('div', {
      class: 'bg-surface-container-lowest p-container-padding rounded-xl shadow-xs border border-outline-variant flex flex-col justify-between'
    }, [
      createElement('h3', { class: 'font-label-bold text-on-surface mb-4' }, 'Recent Activities'),
      listEl,
      createElement('button', {
        class: 'w-full mt-6 py-2 border border-outline text-primary font-label-bold text-xs rounded hover:bg-surface-container transition-colors cursor-pointer',
        onclick: () => navigateTo('calendar')
      }, 'View All Logs')
    ]);
  }
}
export default DashboardScreen;
