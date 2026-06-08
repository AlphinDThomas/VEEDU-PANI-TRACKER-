import { supabase } from './supabaseClient.js';

// Helper to map snake_case db record to camelCase app record
const mapToAppRecord = (dbRecord) => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.id,
    dailyRecordId: dbRecord.daily_record_id,
    description: dbRecord.activity_name, // Mapping activity_name to description for UI
    tags: dbRecord.tags || [],
    createdAt: dbRecord.created_at
  };
};

export const activityService = {
  /**
   * Add a construction activity to a daily record
   * @param {string} dailyRecordId 
   * @param {Object} data - { description, tags: string[] }
   * @returns {Promise<Object>} Created activity
   */
  async add(dailyRecordId, data) {
    const entry = {
      daily_record_id: dailyRecordId,
      activity_name: (data.description || '').trim(),
      tags: Array.isArray(data.tags) ? data.tags.map(t => t.trim()) : []
    };

    const { data: createdData, error } = await supabase
      .from('activities')
      .insert(entry)
      .select()
      .single();

    if (error) throw error;
    return mapToAppRecord(createdData);
  },

  /**
   * Fetch all activities for a specific daily record ID
   * @param {string} dailyRecordId 
   * @returns {Promise<Array>}
   */
  async getByRecordId(dailyRecordId) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('daily_record_id', dailyRecordId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data.map(mapToAppRecord);
  },

  /**
   * Update an existing activity
   * @param {string} id 
   * @param {Object} data 
   * @returns {Promise<Object>} Updated activity
   */
  async update(id, data) {
    const updates = {};
    if (data.description !== undefined) updates.activity_name = data.description.trim();
    if (data.tags !== undefined) updates.tags = Array.isArray(data.tags) ? data.tags.map(t => t.trim()) : [];

    const { data: updatedData, error } = await supabase
      .from('activities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToAppRecord(updatedData);
  },

  /**
   * Remove an activity
   * @param {string} id 
   * @returns {Promise<void>}
   */
  async remove(id) {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get all unique tags ever used in any activity
   * @returns {Promise<Array<string>>}
   */
  async getAllTags() {
    // For large tables, selecting all tags and doing it client-side isn't ideal
    // but without an RPC, it's the simplest approach for now.
    const { data, error } = await supabase
      .from('activities')
      .select('tags');

    if (error) throw error;

    const tagSet = new Set();
    for (const act of data) {
      if (Array.isArray(act.tags)) {
        act.tags.forEach(t => {
          if (t) tagSet.add(t);
        });
      }
    }
    
    return Array.from(tagSet).sort();
  }
};
