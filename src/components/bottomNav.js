import { createElement } from '../utils/dom.js';
import { navigateTo } from '../router.js';
import { store } from '../state/store.js';
import { eventBus } from '../state/eventBus.js';

export function createBottomNav() {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'daily-entry', label: 'Daily Entry', icon: 'edit_square' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
    { id: 'reports', label: 'Reports', icon: 'analytics' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  const tabElements = {};

  const nav = createElement('nav', {
    class: 'fixed bottom-0 w-full z-50 bg-surface border-t border-outline-variant shadow-lg flex justify-around items-center h-16 pb-safe px-2'
  });

  const renderTabs = (activeRoute) => {
    nav.innerHTML = '';

    tabs.forEach(tab => {
      const isActive = activeRoute === tab.id;
      
      const tabBtnClass = isActive
        ? 'flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-xl px-3 py-1 scale-100 transition-all duration-150 cursor-pointer'
        : 'flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container-low px-3 py-1 rounded-xl transition-all duration-150 cursor-pointer';

      const iconStyle = isActive
        ? "font-variation-settings: 'FILL' 1;"
        : '';

      const btn = createElement('button', {
        class: tabBtnClass,
        onclick: () => navigateTo(tab.id)
      }, [
        createElement('span', {
          class: 'material-symbols-outlined text-xl',
          style: iconStyle
        }, tab.icon),
        createElement('span', {
          class: 'font-label-bold text-[10px] mt-0.5'
        }, tab.label)
      ]);

      tabElements[tab.id] = btn;
      nav.appendChild(btn);
    });
  };

  // Listen to route changes to update active states
  eventBus.on('route:changed', (newRoute) => {
    renderTabs(newRoute);
  });

  // Render initial state
  renderTabs(store.getState().currentRoute);

  return nav;
}
