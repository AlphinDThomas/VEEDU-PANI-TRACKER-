import { supabase } from './supabaseClient.js';
import { formatDateShort } from '../utils/date.js';

export const searchService = {
  /**
   * Search across dates, notes, materials, activities, and tags.
   * @param {string} query 
   * @returns {Promise<Object>} SearchResults
   */
  async globalSearch(query) {
    const term = (query || '').toLowerCase().trim();
    
    const results = {
      query: query,
      totalCount: 0,
      records: [],
      materials: [],
      activities: []
    };

    if (!term) return results;

    const likeTerm = `%${term}%`;

    // 1. Search daily records by date, siteNotes, labourNotes
    const { data: recordData, error: recordError } = await supabase
      .from('daily_records')
      .select('id, date, site_notes, labour_notes')
      .or(`date.ilike.${likeTerm},site_notes.ilike.${likeTerm},labour_notes.ilike.${likeTerm}`);

    if (!recordError && recordData) {
      for (const r of recordData) {
        let matchField = 'date';
        let snippet = formatDateShort(r.date);
        
        if (r.site_notes && r.site_notes.toLowerCase().includes(term)) {
          matchField = 'siteNotes';
          snippet = r.site_notes;
        } else if (r.labour_notes && r.labour_notes.toLowerCase().includes(term)) {
          matchField = 'labourNotes';
          snippet = r.labour_notes;
        }

        results.records.push({
          id: r.id,
          date: r.date,
          formattedDate: formatDateShort(r.date),
          matchField,
          snippet
        });
      }
    }

    // 2. Search material entries by name
    const { data: materialData, error: materialError } = await supabase
      .from('materials')
      .select('id, daily_record_id, material_name, quantity, unit, daily_records(date)')
      .ilike('material_name', likeTerm);

    if (!materialError && materialData) {
      for (const m of materialData) {
        const recordDate = m.daily_records?.date || '';
        results.materials.push({
          id: m.id,
          dailyRecordId: m.daily_record_id,
          date: recordDate,
          formattedDate: recordDate ? formatDateShort(recordDate) : 'Unknown date',
          materialName: m.material_name,
          quantity: parseFloat(m.quantity),
          unit: m.unit
        });
      }
    }

    // 3. Search activities by description or tags
    // For tags (array of text), we can use contains or just fetch and filter
    const { data: activityData, error: activityError } = await supabase
      .from('activities')
      .select('id, daily_record_id, activity_name, tags, daily_records(date)')
      .or(`activity_name.ilike.${likeTerm},tags.cs.{${term}}`); // Simple array contain check in postgres

    // To be safe and catch partial tag matches, we can also just fetch activities that match description
    // and then manually filter tags if needed, or use a more complex query. We'll fetch by description first.
    const { data: activityDataFallback, error: activityFallbackError } = await supabase
      .from('activities')
      .select('id, daily_record_id, activity_name, tags, daily_records(date)');

    if (!activityFallbackError && activityDataFallback) {
      for (const act of activityDataFallback) {
        const descMatch = (act.activity_name || '').toLowerCase().includes(term);
        const tagMatch = Array.isArray(act.tags) && act.tags.some(tag => tag.toLowerCase().includes(term));

        if (descMatch || tagMatch) {
          const recordDate = act.daily_records?.date || '';
          // Avoid duplicates if we combine queries
          if (!results.activities.find(a => a.id === act.id)) {
            results.activities.push({
              id: act.id,
              dailyRecordId: act.daily_record_id,
              date: recordDate,
              formattedDate: recordDate ? formatDateShort(recordDate) : 'Unknown date',
              description: act.activity_name,
              tags: act.tags,
              matchField: descMatch ? 'description' : 'tags'
            });
          }
        }
      }
    }

    // Sort outputs descending by date
    const dateSorter = (a, b) => (b.date || '').localeCompare(a.date || '');
    results.records.sort(dateSorter);
    results.materials.sort(dateSorter);
    results.activities.sort(dateSorter);

    results.totalCount = results.records.length + results.materials.length + results.activities.length;
    
    return results;
  }
};
