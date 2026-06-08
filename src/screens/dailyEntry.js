import { createElement, render } from '../utils/dom.js';
import { dailyRecordService } from '../db/dailyRecordService.js';
import { materialService } from '../db/materialService.js';
import { activityService } from '../db/activityService.js';
import { store } from '../state/store.js';
import { eventBus } from '../state/eventBus.js';
import { materialFormModal } from '../components/materialForm.js';
import { showToast } from '../components/toast.js';
import { showConfirmDialog } from '../components/confirmDialog.js';
import { formatRupees } from '../utils/currency.js';
import { formatDateShort, getTodayDateString } from '../utils/date.js';

export class DailyEntryScreen {
  constructor() {
    this.el = null;
    this.currentDate = store.getState().selectedDate;

    // Form states
    this.recordId = null;
    this.labourCount = 0;
    this.labourNotes = '';
    this.teaMorning = 0;
    this.teaEvening = 0;
    this.siteNotes = '';
    
    // Sub-lists in-memory until saved
    this.materials = []; // Array of { id, materialName, quantity, unit, isNew, isDeleted }
    this.activityDescription = '';
    this.selectedTags = []; // Array of string

    this.boundDateSelected = (date) => this.handleDateChange(date);
    this.boundSettingsChanged = () => this.renderForm();
  }

  mount(container) {
    this.el = createElement('div', { class: 'space-y-stack-md pb-12 max-w-xl mx-auto' });
    container.appendChild(this.el);

    eventBus.on('date:selected', this.boundDateSelected);
    eventBus.on('settings:changed', this.boundSettingsChanged);

    this.loadDateData(this.currentDate);
  }

  unmount() {
    eventBus.off('date:selected', this.boundDateSelected);
    eventBus.off('settings:changed', this.boundSettingsChanged);
  }

  async handleDateChange(date) {
    this.currentDate = date;
    await this.loadDateData(date);
  }

  async loadDateData(date) {
    try {
      const record = await dailyRecordService.getByDate(date);
      
      if (record) {
        this.recordId = record.id;
        this.labourCount = record.labourCount;
        this.labourNotes = record.labourNotes || '';
        this.teaMorning = record.teaMorning;
        this.teaEvening = record.teaEvening;
        this.siteNotes = record.siteNotes || '';

        // Load materials
        const dbMaterials = await materialService.getByRecordId(record.id);
        this.materials = dbMaterials.map(m => ({ ...m, isNew: false, isDeleted: false }));

        // Load activities
        const dbActivities = await activityService.getByRecordId(record.id);
        if (dbActivities.length > 0) {
          // Join multiple activities text or take the first one
          this.activityDescription = dbActivities[0].description;
          this.selectedTags = dbActivities[0].tags || [];
          this.activityId = dbActivities[0].id;
        } else {
          this.activityDescription = '';
          this.selectedTags = [];
          this.activityId = null;
        }
      } else {
        // Check if there is a duplication source
        if (window.duplicateSourceRecord) {
          const source = window.duplicateSourceRecord;
          this.recordId = null;
          this.labourCount = source.record.labourCount;
          this.labourNotes = source.record.labourNotes || '';
          this.teaMorning = source.record.teaMorning;
          this.teaEvening = source.record.teaEvening;
          this.siteNotes = source.record.siteNotes || '';
          this.materials = source.materials.map(m => ({ ...m, isNew: true, isDeleted: false }));
          
          if (source.activity) {
            this.activityDescription = source.activity.description;
            this.selectedTags = [...source.activity.tags];
          } else {
            this.activityDescription = '';
            this.selectedTags = [];
          }
          this.activityId = null;
          
          // Clear duplicate source
          window.duplicateSourceRecord = null;
          showToast('Duplicated entries copied. Make adjustments and save.', 'info');
        } else {
          // Reset form for fresh date
          this.recordId = null;
          this.labourCount = 0;
          this.labourNotes = '';
          this.teaMorning = 0;
          this.teaEvening = 0;
          this.siteNotes = '';
          this.materials = [];
          this.activityDescription = '';
          this.selectedTags = [];
          this.activityId = null;
        }
      }

      this.renderForm();
    } catch (e) {
      console.error(e);
      showToast('Error loading date data', 'error');
    }
  }

  async calculateRunningTotalLabour() {
    try {
      const allRecords = await dailyRecordService.getAll();
      // Filter records up to selected date
      const pastRecords = allRecords.filter(r => r.date <= this.currentDate);
      const pastTotal = pastRecords.reduce((sum, r) => {
        // Skip current record count to display running total before/without saved value, or include it?
        // Let's display cumulative total including current input!
        if (this.recordId && r.id === this.recordId) return sum;
        return sum + r.labourCount;
      }, 0);
      
      return pastTotal + (parseInt(this.labourCount) || 0);
    } catch (e) {
      return 0;
    }
  }

  async renderForm() {
    if (!this.el) return;
    this.el.innerHTML = '';

    const formattedDate = formatDateShort(this.currentDate);
    const runningTotal = await this.calculateRunningTotalLabour();

    // 1. Date Picker / Header Card
    const dateInput = createElement('input', {
      type: 'date',
      class: 'absolute inset-0 opacity-0 cursor-pointer',
      value: this.currentDate,
      onchange: (e) => {
        if (e.target.value) {
          store.setSelectedDate(e.target.value);
        }
      }
    });

    const dateCard = createElement('div', {
      class: 'relative flex items-center justify-between bg-surface-container-low p-3 rounded-xl border border-outline-variant cursor-pointer active:opacity-90 overflow-hidden'
    }, [
      createElement('div', { class: 'flex items-center gap-2 pointer-events-none' }, [
        createElement('span', { class: 'material-symbols-outlined text-primary' }, 'calendar_month'),
        createElement('span', { class: 'font-label-bold text-on-surface' }, formattedDate)
      ]),
      createElement('div', { class: 'flex items-center gap-2' }, [
        createElement('button', {
          class: 'bg-primary text-on-primary px-3 py-1.5 rounded-lg font-label-bold text-xs transition-transform active:scale-95 z-10',
          onclick: (e) => {
            e.stopPropagation(); // Avoid triggering file input
            store.setSelectedDate(getTodayDateString());
          }
        }, 'Today'),
        createElement('span', { class: 'material-symbols-outlined text-secondary pointer-events-none' }, 'arrow_drop_down')
      ]),
      dateInput
    ]);

    // 2. Section: Labour Attendance
    const labourSection = createElement('section', {
      class: 'bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-xs space-y-stack-sm'
    }, [
      createElement('div', { class: 'flex justify-between items-center' }, [
        createElement('h2', { class: 'font-label-bold text-xs uppercase tracking-wider text-secondary' }, 'Labour Attendance'),
        this.recordId 
          ? createElement('span', { class: 'bg-green-600/10 text-green-700 px-2 py-0.5 rounded text-[11px] font-bold' }, 'SAVED')
          : createElement('span', { class: 'bg-tertiary-container text-on-tertiary-container px-2 py-0.5 rounded text-[11px] font-bold' }, 'NEW LOG')
      ]),
      createElement('div', { class: 'grid grid-cols-2 gap-4' }, [
        createElement('div', { class: 'space-y-1' }, [
          createElement('label', { class: 'font-label-bold text-xs text-on-surface-variant' }, 'Total Count'),
          createElement('input', {
            type: 'number',
            min: '0',
            class: 'w-full bg-surface border border-secondary p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-bold text-lg',
            value: this.labourCount,
            oninput: async (e) => {
              this.labourCount = parseInt(e.target.value) || 0;
              this.updateSummaryPreview();
              // Update running total display
              const runTotDisplay = document.getElementById('runningTotalDisplay');
              if (runTotDisplay) {
                const updatedRun = await this.calculateRunningTotalLabour();
                runTotDisplay.innerText = updatedRun;
              }
            }
          })
        ]),
        createElement('div', { class: 'space-y-1' }, [
          createElement('label', { class: 'font-label-bold text-xs text-on-surface-variant' }, 'Running Total'),
          createElement('div', {
            id: 'runningTotalDisplay',
            class: 'h-[52px] flex items-center px-3 bg-surface-container rounded-lg border border-outline-variant font-headline-md text-primary select-none'
          }, String(runningTotal))
        ])
      ]),
      createElement('div', { class: 'space-y-1' }, [
        createElement('label', { class: 'font-label-bold text-xs text-on-surface-variant' }, 'Notes / Remarks'),
        createElement('input', {
          type: 'text',
          class: 'w-full bg-surface border border-secondary p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm',
          placeholder: 'e.g. 2 masons, 4 helpers, delayed due to rain',
          value: this.labourNotes,
          oninput: (e) => { this.labourNotes = e.target.value; }
        })
      ])
    ]);

    // 3. Section: Tea & Snacks
    const teaTotal = this.teaMorning + this.teaEvening;
    const teaSection = createElement('section', {
      class: 'bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-xs space-y-stack-sm'
    }, [
      createElement('h2', { class: 'font-label-bold text-xs uppercase tracking-wider text-secondary' }, 'Tea & Snacks'),
      createElement('div', { class: 'grid grid-cols-2 gap-4' }, [
        createElement('div', { class: 'space-y-1' }, [
          createElement('label', { class: 'font-label-bold text-xs text-on-surface-variant' }, 'Morning (₹)'),
          createElement('div', { class: 'relative' }, [
            createElement('span', { class: 'absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm' }, '₹'),
            createElement('input', {
              type: 'number',
              min: '0',
              step: 'any',
              placeholder: '0.00',
              class: 'w-full bg-surface border border-secondary pl-7 pr-3 py-3 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm font-semibold',
              value: this.teaMorning || '',
              oninput: (e) => {
                this.teaMorning = parseFloat(e.target.value) || 0;
                this.updateTeaTotal();
                this.updateSummaryPreview();
              }
            })
          ])
        ]),
        createElement('div', { class: 'space-y-1' }, [
          createElement('label', { class: 'font-label-bold text-xs text-on-surface-variant' }, 'Evening (₹)'),
          createElement('div', { class: 'relative' }, [
            createElement('span', { class: 'absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm' }, '₹'),
            createElement('input', {
              type: 'number',
              min: '0',
              step: 'any',
              placeholder: '0.00',
              class: 'w-full bg-surface border border-secondary pl-7 pr-3 py-3 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm font-semibold',
              value: this.teaEvening || '',
              oninput: (e) => {
                this.teaEvening = parseFloat(e.target.value) || 0;
                this.updateTeaTotal();
                this.updateSummaryPreview();
              }
            })
          ])
        ])
      ]),
      createElement('div', { class: 'flex justify-between items-center pt-2 border-t border-outline-variant' }, [
        createElement('span', { class: 'font-label-bold text-sm text-on-surface' }, 'Daily Total'),
        createElement('span', { id: 'teaTotalDisplay', class: 'font-headline-md text-primary' }, formatRupees(teaTotal))
      ])
    ]);

    // 4. Section: Materials Delivered
    this.materialsContainer = createElement('div', { class: 'space-y-2' });
    this.renderMaterialsList();

    const materialsSection = createElement('section', {
      class: 'bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-xs space-y-stack-sm'
    }, [
      createElement('h2', { class: 'font-label-bold text-xs uppercase tracking-wider text-secondary' }, 'Materials Delivered'),
      this.materialsContainer,
      createElement('button', {
        type: 'button',
        class: 'w-full flex items-center justify-center gap-2 border-2 border-dashed border-outline p-3.5 rounded-xl text-primary font-button-text hover:bg-surface-container transition-colors cursor-pointer text-sm',
        onclick: () => this.openAddMaterialModal()
      }, [
        createElement('span', { class: 'material-symbols-outlined text-lg' }, 'add_circle'),
        'Add Material'
      ])
    ]);

    // 5. Section: Construction Activities
    const tagsContainer = createElement('div', { class: 'flex flex-wrap gap-2' });
    const defaultTags = store.getState().settings.defaultTags;
    
    defaultTags.forEach(tag => {
      const isSelected = this.selectedTags.includes(tag);
      const chipClass = isSelected
        ? 'bg-primary text-on-primary px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border border-primary transition-all active:scale-95 shadow-xs'
        : 'bg-secondary-fixed text-on-secondary-fixed-variant border border-outline-variant hover:bg-surface-container-high px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all active:scale-95';

      const tagChip = createElement('button', {
        type: 'button',
        class: chipClass,
        onclick: () => this.toggleTag(tag)
      }, tag);

      tagsContainer.appendChild(tagChip);
    });

    const activitiesSection = createElement('section', {
      class: 'bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-xs space-y-stack-sm'
    }, [
      createElement('h2', { class: 'font-label-bold text-xs uppercase tracking-wider text-secondary' }, 'Construction Activities'),
      createElement('textarea', {
        rows: '4',
        class: 'w-full bg-surface border border-secondary p-3 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none text-sm',
        placeholder: 'Describe the activities or tasks completed today...',
        value: this.activityDescription,
        oninput: (e) => { this.activityDescription = e.target.value; }
      }),
      tagsContainer
    ]);

    // 6. Section: Site Notes
    const notesSection = createElement('section', {
      class: 'bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-xs space-y-stack-sm'
    }, [
      createElement('h2', { class: 'font-label-bold text-xs uppercase tracking-wider text-secondary' }, 'General Site Notes'),
      createElement('textarea', {
        rows: '2',
        class: 'w-full bg-surface border border-secondary p-3 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none text-sm',
        placeholder: 'Any general details, instructions, weather issues, contractor visits...',
        value: this.siteNotes,
        oninput: (e) => { this.siteNotes = e.target.value; }
      })
    ]);

    // 7. Preview Summary Card
    this.previewLabourCount = createElement('p', { class: 'font-bold' }, `${this.labourCount} Total`);
    this.previewExpenseCount = createElement('p', { class: 'font-bold' }, formatRupees(teaTotal));

    const previewCard = createElement('div', {
      class: 'bg-inverse-surface text-inverse-on-surface p-5 rounded-xl space-y-3 relative overflow-hidden shadow-sm'
    }, [
      createElement('div', {
        class: 'absolute inset-0 opacity-5 pointer-events-none',
        style: 'background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 20px 20px;'
      }),
      createElement('div', { class: 'flex justify-between items-start relative z-10' }, [
        createElement('div', {}, [
          createElement('h3', { class: 'font-label-bold text-xs opacity-70' }, 'Daily Summary Preview'),
          createElement('p', { class: 'font-headline-md text-primary-fixed-dim' }, `${formatDateShort(this.currentDate).split(',')[0]} Log`)
        ]),
        createElement('span', { class: 'material-symbols-outlined text-primary-fixed-dim' }, 'summarize')
      ]),
      createElement('div', { class: 'grid grid-cols-2 gap-4 relative z-10 text-[14px]' }, [
        createElement('div', { class: 'border-l-2 border-primary-container pl-3' }, [
          createElement('p', { class: 'opacity-70 text-xs' }, 'Labours'),
          this.previewLabourCount
        ]),
        createElement('div', { class: 'border-l-2 border-primary-container pl-3' }, [
          createElement('p', { class: 'opacity-70 text-xs' }, 'Expenses'),
          this.previewExpenseCount
        ])
      ])
    ]);

    // 8. Action Buttons
    const saveButton = createElement('button', {
      type: 'button',
      class: 'w-full bg-primary-container text-on-primary-container h-touch-target-min rounded-xl font-button-text text-button-text shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer',
      onclick: () => this.handleSave()
    }, [
      createElement('span', { class: 'material-symbols-outlined' }, 'save'),
      'Save Entry'
    ]);

    let deleteButton = null;
    if (this.recordId) {
      deleteButton = createElement('button', {
        type: 'button',
        class: 'w-full bg-error/10 hover:bg-error text-error hover:text-on-error border border-error/20 h-touch-target-min rounded-xl font-button-text text-button-text shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2',
        onclick: () => this.handleDelete()
      }, [
        createElement('span', { class: 'material-symbols-outlined' }, 'delete'),
        'Delete Log'
      ]);
    }

    // Append all parts
    this.el.appendChild(dateCard);
    this.el.appendChild(labourSection);
    this.el.appendChild(teaSection);
    this.el.appendChild(materialsSection);
    this.el.appendChild(activitiesSection);
    this.el.appendChild(notesSection);
    this.el.appendChild(previewCard);
    this.el.appendChild(saveButton);
    if (deleteButton) {
      this.el.appendChild(deleteButton);
    }
  }

  updateTeaTotal() {
    const total = this.teaMorning + this.teaEvening;
    const el = document.getElementById('teaTotalDisplay');
    if (el) el.innerText = formatRupees(total);
  }

  updateSummaryPreview() {
    if (this.previewLabourCount) {
      this.previewLabourCount.innerText = `${this.labourCount} Total`;
    }
    if (this.previewExpenseCount) {
      const total = this.teaMorning + this.teaEvening;
      this.previewExpenseCount.innerText = formatRupees(total);
    }
  }

  toggleTag(tag) {
    if (this.selectedTags.includes(tag)) {
      this.selectedTags = this.selectedTags.filter(t => t !== tag);
    } else {
      this.selectedTags.push(tag);
    }
    this.renderForm();
  }

  renderMaterialsList() {
    if (!this.materialsContainer) return;
    this.materialsContainer.innerHTML = '';

    const activeMaterials = this.materials.filter(m => !m.isDeleted);

    if (activeMaterials.length === 0) {
      render(this.materialsContainer, createElement('p', {
        class: 'text-center py-4 text-xs text-secondary border border-dashed border-outline-variant rounded-xl italic bg-surface-container-low'
      }, 'No materials added for this date.'));
      return;
    }

    activeMaterials.forEach(m => {
      const row = createElement('div', {
        class: 'flex justify-between items-center p-3 bg-surface border border-outline-variant rounded-lg hover:border-secondary transition-colors'
      }, [
        createElement('div', { class: 'flex items-center gap-3' }, [
          createElement('span', { class: 'material-symbols-outlined text-secondary' }, 'inventory_2'),
          createElement('div', {}, [
            createElement('p', { class: 'font-body-md font-semibold text-on-surface' }, m.materialName),
            createElement('p', { class: 'text-[11px] text-secondary' }, `Unit: ${m.unit}`)
          ])
        ]),
        createElement('div', { class: 'flex items-center gap-3' }, [
          createElement('span', { class: 'bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-lg font-label-bold text-xs font-semibold' }, `${m.quantity} ${m.unit}`),
          createElement('button', {
            type: 'button',
            class: 'material-symbols-outlined text-error hover:bg-error-container hover:text-on-error-container p-1 rounded-lg cursor-pointer transition-colors',
            title: 'Delete material',
            onclick: () => this.deleteMaterial(m)
          }, 'delete')
        ])
      ]);
      this.materialsContainer.appendChild(row);
    });
  }

  openAddMaterialModal() {
    materialFormModal.show({
      onSubmit: (materialData) => {
        // Add to in-memory list
        this.materials.push({
          ...materialData,
          isNew: true,
          isDeleted: false
        });
        this.renderMaterialsList();
      }
    });
  }

  deleteMaterial(material) {
    if (material.isNew) {
      // Just filter it out
      this.materials = this.materials.filter(m => m !== material);
    } else {
      // Mark it as deleted to delete from DB on Save
      material.isDeleted = true;
    }
    this.renderMaterialsList();
  }

  async handleSave() {
    // 1. Validation
    if (this.labourCount < 0) {
      showToast('Labour count cannot be negative', 'error');
      return;
    }
    if (this.teaMorning < 0 || this.teaEvening < 0) {
      showToast('Tea expenses cannot be negative', 'error');
      return;
    }

    try {
      let savedRecord;
      const recordData = {
        date: this.currentDate,
        labourCount: this.labourCount,
        labourNotes: this.labourNotes,
        teaMorning: this.teaMorning,
        teaEvening: this.teaEvening,
        siteNotes: this.siteNotes,
        status: 'draft' // For simple status
      };

      // 2. Save DailyRecord
      if (this.recordId) {
        savedRecord = await dailyRecordService.update(this.recordId, recordData);
      } else {
        savedRecord = await dailyRecordService.create(recordData);
        this.recordId = savedRecord.id;
      }

      // 3. Process Materials List
      for (const m of this.materials) {
        if (m.isDeleted && !m.isNew) {
          // Delete from DB
          await materialService.remove(m.id);
        } else if (m.isNew && !m.isDeleted) {
          // Add to DB
          await materialService.add(this.recordId, m);
        }
      }

      // 4. Save/Update Activities
      const activityData = {
        description: this.activityDescription.trim(),
        tags: this.selectedTags
      };

      if (this.activityId) {
        if (activityData.description || activityData.tags.length > 0) {
          await activityService.update(this.activityId, activityData);
        } else {
          // If description and tags are cleared, delete the activity
          await activityService.remove(this.activityId);
          this.activityId = null;
        }
      } else {
        if (activityData.description || activityData.tags.length > 0) {
          const savedAct = await activityService.add(this.recordId, activityData);
          this.activityId = savedAct.id;
        }
      }

      // Reload data to clean up temporary states
      await this.loadDateData(this.currentDate);

      showToast('Entry saved successfully!', 'success');
      
      // Emit events to refresh other screens
      eventBus.emit('record:updated', savedRecord);
    } catch (e) {
      console.error(e);
      showToast('Error saving entry: ' + e.message, 'error');
    }
  }

  async handleDelete() {
    if (!this.recordId) return;

    const confirmed = await showConfirmDialog({
      title: 'Delete Log?',
      message: `Are you sure you want to delete the daily log for ${formatDateShort(this.currentDate)}? This will cascade-delete all material and activity records for this date.`,
      confirmText: 'Delete',
      isDanger: true
    });

    if (!confirmed) return;

    try {
      await dailyRecordService.delete(this.recordId);
      
      showToast('Log deleted successfully', 'info');
      eventBus.emit('record:deleted', { id: this.recordId, date: this.currentDate });
      
      // Refresh form
      await this.loadDateData(this.currentDate);
    } catch (e) {
      console.error(e);
      showToast('Error deleting entry', 'error');
    }
  }
}
export default DailyEntryScreen;
