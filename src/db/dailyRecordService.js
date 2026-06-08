import { supabase } from './supabaseClient.js';

// Helper to map snake_case db record to camelCase app record
const mapToAppRecord = (dbRecord) => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.id,
    date: dbRecord.date,
    labourCount: dbRecord.labour_count,
    labourNotes: dbRecord.labour_notes,
    teaMorning: parseFloat(dbRecord.tea_morning),
    teaEvening: parseFloat(dbRecord.tea_evening),
    siteNotes: dbRecord.site_notes,
    status: dbRecord.status,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at
  };
};

export const dailyRecordService = {
  /**
   * Create a new daily record. Fails if date already exists.
   * @param {Object} data 
   * @returns {Promise<Object>} Created record
   */
  async create(data) {
    const record = {
      date: data.date,
      labour_count: parseInt(data.labourCount) || 0,
      labour_notes: data.labourNotes || '',
      tea_morning: parseFloat(data.teaMorning) || 0,
      tea_evening: parseFloat(data.teaEvening) || 0,
      site_notes: data.siteNotes || '',
      status: data.status || 'draft'
    };

    const { data: createdData, error } = await supabase
      .from('daily_records')
      .insert(record)
      .select()
      .single();

    if (error) throw error;
    return mapToAppRecord(createdData);
  },

  /**
   * Fetch record for a specific date (YYYY-MM-DD)
   * @param {string} date - "YYYY-MM-DD"
   * @returns {Promise<Object|null>}
   */
  async getByDate(date) {
    const { data, error } = await supabase
      .from('daily_records')
      .select('*')
      .eq('date', date)
      .maybeSingle();
      
    if (error) throw error;
    return mapToAppRecord(data);
  },

  /**
   * Fetch record by primary key ID
   * @param {string} id 
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('daily_records')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return mapToAppRecord(data);
  },

  /**
   * Update fields on an existing record
   * @param {string} id 
   * @param {Object} data 
   * @returns {Promise<Object>} Updated record
   */
  async update(id, data) {
    const updates = {};
    if (data.date !== undefined) updates.date = data.date;
    if (data.labourCount !== undefined) updates.labour_count = parseInt(data.labourCount) || 0;
    if (data.labourNotes !== undefined) updates.labour_notes = data.labourNotes;
    if (data.teaMorning !== undefined) updates.tea_morning = parseFloat(data.teaMorning) || 0;
    if (data.teaEvening !== undefined) updates.tea_evening = parseFloat(data.teaEvening) || 0;
    if (data.siteNotes !== undefined) updates.site_notes = data.siteNotes;
    if (data.status !== undefined) updates.status = data.status;
    updates.updated_at = new Date().toISOString();

    const { data: updatedData, error } = await supabase
      .from('daily_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToAppRecord(updatedData);
  },

  /**
   * Delete record
   * @param {string} id 
   * @returns {Promise<void>}
   */
  async delete(id) {
    const { error } = await supabase
      .from('daily_records')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  },

  /**
   * Fetch all records, sorted by date descending
   * @returns {Promise<Array>}
   */
  async getAll() {
    const { data, error } = await supabase
      .from('daily_records')
      .select('*')
      .order('date', { ascending: false });
      
    if (error) throw error;
    return data.map(mapToAppRecord);
  },

  /**
   * Fetch records within a date range (inclusive)
   * @param {string} start - YYYY-MM-DD
   * @param {string} end - YYYY-MM-DD
   * @returns {Promise<Array>}
   */
  async getByDateRange(start, end) {
    const { data, error } = await supabase
      .from('daily_records')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true });
      
    if (error) throw error;
    return data.map(mapToAppRecord);
  },

  /**
   * Fetch all records for a specific month
   * @param {number} year - Four-digit year
   * @param {number} month - 0-indexed month (0 = Jan, 11 = Dec)
   * @returns {Promise<Array>}
   */
  async getByMonth(year, month) {
    const monthStr = String(month + 1).padStart(2, '0');
    const start = `${year}-${monthStr}-01`;
    // Get last day of month
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    return this.getByDateRange(start, end);
  },

  /**
   * Get date strings that have entries for a specific month (for calendar dots)
   * @param {number} year - Four-digit year
   * @param {number} month - 0-indexed month (0 = Jan, 11 = Dec)
   * @returns {Promise<Array<string>>} List of date strings YYYY-MM-DD
   */
  async getDatesWithEntries(year, month) {
    const monthStr = String(month + 1).padStart(2, '0');
    const start = `${year}-${monthStr}-01`;
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_records')
      .select('date')
      .gte('date', start)
      .lte('date', end);
      
    if (error) throw error;
    return data.map(r => r.date);
  },

  /**
   * Check if record exists for a date
   * @param {string} date - YYYY-MM-DD
   * @returns {Promise<boolean>}
   */
  async exists(date) {
    const { count, error } = await supabase
      .from('daily_records')
      .select('id', { count: 'exact', head: true })
      .eq('date', date);
      
    if (error) throw error;
    return count > 0;
  }
};
