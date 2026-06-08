import { createElement, render } from '../utils/dom.js';
import { store } from '../state/store.js';
import { eventBus } from '../state/eventBus.js';
import { showToast } from '../components/toast.js';
import { showConfirmDialog } from '../components/confirmDialog.js';
import { navigateTo } from '../router.js';
import { supabase } from '../db/supabaseClient.js';
import { getTodayDateString } from '../utils/date.js';

export class SettingsScreen {
  constructor() {
    this.el = null;
    this.newTagInput = null;
    this.tagsContainer = null;
    this.darkModeToggle = null;

    this.boundSettingsChanged = () => this.renderSettings();
  }

  mount(container) {
    this.el = createElement('div', { class: 'space-y-stack-md pb-12 max-w-xl mx-auto' });
    container.appendChild(this.el);

    eventBus.on('settings:changed', this.boundSettingsChanged);

    this.renderSettings();
  }

  unmount() {
    eventBus.off('settings:changed', this.boundSettingsChanged);
  }

  renderSettings() {
    if (!this.el) return;
    this.el.innerHTML = '';

    const settings = store.getState().settings;

    // 1. Preferences Section (Dark Mode)
    this.darkModeToggle = createElement('input', {
      type: 'checkbox',
      class: 'sr-only peer',
      checked: settings.darkMode,
      onchange: (e) => {
        store.updateSettings({ darkMode: e.target.checked });
        showToast(`Dark Mode ${e.target.checked ? 'Enabled' : 'Disabled'}`, 'info');
      }
    });

    const preferencesSection = createElement('section', {
      class: 'bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-xs space-y-4'
    }, [
      createElement('h2', { class: 'font-label-bold text-xs uppercase tracking-wider text-secondary' }, 'Preferences'),
      createElement('div', { class: 'flex items-center justify-between' }, [
        createElement('div', {}, [
          createElement('p', { class: 'font-label-bold text-sm text-on-surface' }, 'Dark Theme'),
          createElement('p', { class: 'text-xs text-secondary' }, 'Switch to a high-contrast dark theme')
        ]),
        createElement('label', { class: 'relative inline-flex items-center cursor-pointer' }, [
          this.darkModeToggle,
          createElement('div', {
            class: 'w-11 h-6 bg-surface-container-high rounded-full peer peer-checked:after:translate-x-full after:content-[\'\'] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary'
          })
        ])
      ])
    ]);

    // 2. Manage Default Activity Tags
    this.newTagInput = createElement('input', {
      type: 'text',
      class: 'flex-grow bg-surface border border-secondary px-3 py-2 rounded-lg outline-none text-sm focus:ring-1 focus:ring-primary',
      placeholder: 'Add new tag...'
    });

    this.tagsContainer = createElement('div', { class: 'flex flex-wrap gap-2 pt-2' });
    this.renderTagsList(settings.defaultTags);

    const tagsSection = createElement('section', {
      class: 'bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-xs space-y-4'
    }, [
      createElement('h2', { class: 'font-label-bold text-xs uppercase tracking-wider text-secondary' }, 'Default Activity Tags'),
      createElement('div', { class: 'flex gap-2' }, [
        this.newTagInput,
        createElement('button', {
          class: 'bg-primary text-on-primary px-4 py-2 rounded-lg font-label-bold text-xs hover:bg-primary/95 transition-colors cursor-pointer',
          onclick: () => this.handleAddTag()
        }, 'Add')
      ]),
      this.tagsContainer
    ]);

    // 3. Backup & Reset Section
    const backupSection = createElement('section', {
      class: 'bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-xs space-y-4'
    }, [
      createElement('h2', { class: 'font-label-bold text-xs uppercase tracking-wider text-secondary' }, 'Data Operations (Offline Backup)'),
      
      // Export
      createElement('div', { class: 'flex items-center justify-between py-2 border-b border-outline-variant' }, [
        createElement('div', {}, [
          createElement('p', { class: 'font-label-bold text-sm text-on-surface' }, 'Export Backup (JSON)'),
          createElement('p', { class: 'text-xs text-secondary' }, 'Download all logs to a JSON file on your machine')
        ]),
        createElement('button', {
          class: 'material-symbols-outlined text-primary hover:bg-surface-container p-2 rounded-full cursor-pointer',
          title: 'Export',
          onclick: () => this.handleExportData()
        }, 'download')
      ]),

      // Import
      createElement('div', { class: 'flex items-center justify-between py-2 border-b border-outline-variant' }, [
        createElement('div', {}, [
          createElement('p', { class: 'font-label-bold text-sm text-on-surface' }, 'Import Backup (JSON)'),
          createElement('p', { class: 'text-xs text-secondary' }, 'Restore database from an exported backup file')
        ]),
        createElement('div', { class: 'relative overflow-hidden' }, [
          createElement('button', {
            class: 'material-symbols-outlined text-primary hover:bg-surface-container p-2 rounded-full cursor-pointer',
            title: 'Import'
          }, 'upload'),
          createElement('input', {
            type: 'file',
            accept: '.json',
            class: 'absolute inset-0 opacity-0 cursor-pointer',
            onchange: (e) => this.handleImportData(e)
          })
        ])
      ]),

      // Clear all
      createElement('div', { class: 'flex items-center justify-between py-2' }, [
        createElement('div', {}, [
          createElement('p', { class: 'font-label-bold text-sm text-error' }, 'Factory Reset Data'),
          createElement('p', { class: 'text-xs text-secondary' }, 'Permanently wipe all logs, materials, and activities')
        ]),
        createElement('button', {
          class: 'material-symbols-outlined text-error hover:bg-error/10 p-2 rounded-full cursor-pointer',
          title: 'Reset database',
          onclick: () => this.handleClearAllData()
        }, 'delete_forever')
      ])
    ]);

    // About section
    const aboutSection = createElement('section', { class: 'text-center py-4 space-y-1 select-none' }, [
      createElement('p', { class: 'font-label-bold text-xs text-secondary' }, 'BuildGuard Construction Diary'),
      createElement('p', { class: 'text-[10px] text-secondary/70' }, 'v1.0.0 • Client-side IndexedDB Engine')
    ]);

    this.el.appendChild(preferencesSection);
    this.el.appendChild(tagsSection);
    this.el.appendChild(backupSection);
    this.el.appendChild(aboutSection);
  }

  renderTagsList(tags) {
    if (!this.tagsContainer) return;
    this.tagsContainer.innerHTML = '';

    tags.forEach(tag => {
      const chip = createElement('div', {
        class: 'bg-surface-container flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-on-surface border border-outline-variant hover:border-outline transition-colors'
      }, [
        createElement('span', {}, tag),
        createElement('button', {
          class: 'material-symbols-outlined text-secondary hover:text-error text-sm cursor-pointer',
          onclick: () => this.handleDeleteTag(tag)
        }, 'close')
      ]);
      this.tagsContainer.appendChild(chip);
    });
  }

  handleAddTag() {
    const val = this.newTagInput.value.trim();
    if (!val) return;

    const currentTags = store.getState().settings.defaultTags;
    if (currentTags.includes(val)) {
      showToast('Tag already exists', 'error');
      return;
    }

    const updatedTags = [...currentTags, val];
    store.updateSettings({ defaultTags: updatedTags });
    this.newTagInput.value = '';
    
    showToast('Tag added', 'success');
  }

  handleDeleteTag(tagToDelete) {
    const currentTags = store.getState().settings.defaultTags;
    const updatedTags = currentTags.filter(t => t !== tagToDelete);
    store.updateSettings({ defaultTags: updatedTags });
    
    showToast('Tag removed', 'info');
  }

  async handleExportData() {
    try {
      showToast('Compiling backup file...', 'info');

      const { data: dailyRecords } = await supabase.from('daily_records').select('*');
      const { data: materials } = await supabase.from('materials').select('*');
      const { data: activities } = await supabase.from('activities').select('*');

      const data = {
        app: 'BuildGuard',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        dailyRecords: dailyRecords || [],
        materials: materials || [],
        activities: activities || []
      };

      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(blob);
      const todayStr = getTodayDateString();

      const a = createElement('a', {
        href: url,
        download: `buildguard_backup_${todayStr}.json`
      });
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      showToast('Backup downloaded successfully', 'success');
    } catch (e) {
      console.error(e);
      showToast('Backup export failed', 'error');
    }
  }

  async handleImportData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validation
        if (data.app !== 'BuildGuard' || !Array.isArray(data.dailyRecords) || !Array.isArray(data.materials) || !Array.isArray(data.activities)) {
          showToast('Invalid backup file structure', 'error');
          return;
        }

        const confirmed = await showConfirmDialog({
          title: 'Restore Backup?',
          message: `This will overwrite your existing database with the ${data.dailyRecords.length} daily logs found in the backup file. This cannot be undone.`,
          confirmText: 'Restore & Overwrite',
          isDanger: true
        });

        if (!confirmed) return;

        showToast('Restoring database...', 'info');

        // Clear existing tables
        await supabase.from('materials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('daily_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Bulk add
        if (data.dailyRecords.length > 0) await supabase.from('daily_records').insert(data.dailyRecords);
        if (data.materials.length > 0) await supabase.from('materials').insert(data.materials);
        if (data.activities.length > 0) await supabase.from('activities').insert(data.activities);

        showToast('Database restored successfully!', 'success');
        
        // Notify views to refresh
        eventBus.emit('record:created', null);
        
        // Reset file input value
        event.target.value = '';
      } catch (err) {
        console.error(err);
        showToast('Failed to parse backup file', 'error');
      }
    };
    reader.readAsText(file);
  }

  async handleClearAllData() {
    const confirmed = await showConfirmDialog({
      title: 'Danger: Wipe Data?',
      message: 'Are you sure you want to delete all daily logs, materials, and activity remarks? All data will be lost forever!',
      confirmText: 'Yes, WIPE ALL DATA',
      isDanger: true
    });

    if (!confirmed) return;

    try {
      await supabase.from('materials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('daily_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      showToast('All data cleared successfully', 'info');
      
      // Notify views to refresh
      eventBus.emit('record:deleted', null);
      
      // Navigate to dashboard
      navigateTo('dashboard');
    } catch (e) {
      console.error(e);
      showToast('Failed to clear database', 'error');
    }
  }
}
export default SettingsScreen;
