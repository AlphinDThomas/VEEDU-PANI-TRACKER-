import { getTodayDateString } from '../utils/date.js';
import { eventBus } from './eventBus.js';

const LOCAL_STORAGE_KEY_SETTINGS = 'buildguard_settings';

const DEFAULT_TAGS = [
  'Brick work', 'Plumbing', 'Foundation',
  'Roof Slab', 'Electrical', 'Painting'
];

class Store {
  constructor() {
    // Load settings from localStorage or use defaults
    let savedSettings = {};
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);
      if (data) savedSettings = JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }

    this.state = {
      currentRoute: 'dashboard',
      selectedDate: getTodayDateString(),
      currentRecord: null,
      dashboardStats: {
        today: {
          labourCount: 0,
          teaTotal: 0,
          materialsCount: 0,
          activitiesCount: 0
        },
        allTime: {
          totalLabourers: 0,
          totalExpenses: 0,
          workingDays: 0,
          totalMaterials: 0
        },
        trend: {
          labourChange: 0,
          expenseChange: 0
        }
      },
      searchQuery: '',
      searchResults: null,
      settings: {
        darkMode: savedSettings.darkMode || false,
        defaultTags: savedSettings.defaultTags || DEFAULT_TAGS
      }
    };
  }

  // Getters
  getState() {
    return this.state;
  }

  // Setters
  setState(newState) {
    this.state = { ...this.state, ...newState };
  }

  setCurrentRoute(route) {
    this.state.currentRoute = route;
    eventBus.emit('route:changed', route);
  }

  setSelectedDate(date) {
    this.state.selectedDate = date;
    eventBus.emit('date:selected', date);
  }

  setCurrentRecord(record) {
    this.state.currentRecord = record;
  }

  updateSettings(newSettings) {
    this.state.settings = { ...this.state.settings, ...newSettings };
    
    // Persist
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(this.state.settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }

    // Apply dark mode
    if (this.state.settings.darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }

    eventBus.emit('settings:changed', this.state.settings);
  }

  setSearchQuery(query) {
    this.state.searchQuery = query;
  }

  setSearchResults(results) {
    this.state.searchResults = results;
    eventBus.emit('search:executed', results);
  }
}

export const store = new Store();
