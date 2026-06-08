import { store } from './state/store.js';

const ROUTES = ['dashboard', 'daily-entry', 'calendar', 'reports', 'settings'];

export function initRouter() {
  const handleRouting = () => {
    const hash = window.location.hash || '#/dashboard';
    
    // Parse route from hash (e.g. #/daily-entry -> daily-entry)
    let route = hash.replace(/^#\//, '');
    
    // Optional check for date query param in hash, e.g. #/daily-entry?date=2026-06-09
    let dateParam = null;
    if (route.includes('?')) {
      const parts = route.split('?');
      route = parts[0];
      const queryParams = new URLSearchParams(parts[1]);
      dateParam = queryParams.get('date');
    }

    if (!ROUTES.includes(route)) {
      // Fallback
      route = 'dashboard';
      window.location.hash = '#/dashboard';
    }

    // If date query param exists, set it in the store
    if (dateParam) {
      store.setSelectedDate(dateParam);
    }

    // Set the route in the store, which will trigger listeners
    store.setCurrentRoute(route);
  };

  window.addEventListener('hashchange', handleRouting);
  
  // Run on initial load
  handleRouting();
}

/**
 * Programmatically navigate to a route
 * @param {string} route - Route name (e.g. 'daily-entry')
 * @param {Object} [params] - Query parameters
 */
export function navigateTo(route, params = {}) {
  let url = `#/${route}`;
  const query = new URLSearchParams(params).toString();
  if (query) {
    url += `?${query}`;
  }
  window.location.hash = url;
}
