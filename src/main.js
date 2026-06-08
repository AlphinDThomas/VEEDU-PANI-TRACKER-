import './styles/index.css';
import { store } from './state/store.js';
import { eventBus } from './state/eventBus.js';
import { createHeader } from './components/header.js';
import { createBottomNav } from './components/bottomNav.js';
import { initRouter } from './router.js';
import { createElement } from './utils/dom.js';

// Screens map
import DashboardScreen from './screens/dashboard.js';
import DailyEntryScreen from './screens/dailyEntry.js';
import CalendarScreen from './screens/calendar.js';
import ReportsScreen from './screens/reports.js';
import SettingsScreen from './screens/settings.js';

const SCREENS = {
  'dashboard': DashboardScreen,
  'daily-entry': DailyEntryScreen,
  'calendar': CalendarScreen,
  'reports': ReportsScreen,
  'settings': SettingsScreen
};

document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.querySelector('#app');
  if (!appContainer) return;

  // Initialize Dark Mode theme from store settings
  store.updateSettings(store.getState().settings);

  // Render Layout Shell
  const header = createHeader();
  const screenContainer = createElement('main', {
    id: 'screen-container',
    class: 'flex-grow max-w-4xl w-full mx-auto px-container-padding pt-6 pb-24'
  });
  const bottomNav = createBottomNav();

  appContainer.appendChild(header);
  appContainer.appendChild(screenContainer);
  appContainer.appendChild(bottomNav);

  let activeScreenInstance = null;

  // Listen to route changes to mount appropriate screen
  eventBus.on('route:changed', (newRoute) => {
    // 1. Unmount current active screen
    if (activeScreenInstance && typeof activeScreenInstance.unmount === 'function') {
      activeScreenInstance.unmount();
    }

    // 2. Clear container
    screenContainer.innerHTML = '';

    // 3. Mount new screen
    const ScreenClass = SCREENS[newRoute] || DashboardScreen;
    activeScreenInstance = new ScreenClass();
    
    if (typeof activeScreenInstance.mount === 'function') {
      activeScreenInstance.mount(screenContainer);
    }
    
    // Scroll to top on navigation
    window.scrollTo(0, 0);
  });

  // Start the router
  initRouter();
});
