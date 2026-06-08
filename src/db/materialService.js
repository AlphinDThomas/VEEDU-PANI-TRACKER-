import { supabase } from './supabaseClient.js';

// Helper to map snake_case db record to camelCase app record
const mapToAppRecord = (dbRecord) => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.id,
    dailyRecordId: dbRecord.daily_record_id,
    materialName: dbRecord.material_name,
    quantity: parseFloat(dbRecord.quantity),
    unit: dbRecord.unit,
    cost: parseFloat(dbRecord.cost),
    invoiceNumber: dbRecord.invoice_number,
    supplierName: dbRecord.supplier_name,
    createdAt: dbRecord.created_at
  };
};

export const materialService = {
  /**
   * Add a material entry to a daily record
   * @param {string} dailyRecordId 
   * @param {Object} data - { materialName, quantity, unit, cost, invoiceNumber, supplierName }
   * @returns {Promise<Object>} Created entry
   */
  async add(dailyRecordId, data) {
    const entry = {
      daily_record_id: dailyRecordId,
      material_name: (data.materialName || '').trim(),
      quantity: parseFloat(data.quantity) || 0,
      unit: (data.unit || 'Units').trim(),
      cost: parseFloat(data.cost) || 0,
      invoice_number: data.invoiceNumber || null,
      supplier_name: data.supplierName || null
    };

    const { data: createdData, error } = await supabase
      .from('materials')
      .insert(entry)
      .select()
      .single();

    if (error) throw error;
    return mapToAppRecord(createdData);
  },

  /**
   * Get all material entries for a specific daily record ID
   * @param {string} dailyRecordId 
   * @returns {Promise<Array>}
   */
  async getByRecordId(dailyRecordId) {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('daily_record_id', dailyRecordId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data.map(mapToAppRecord);
  },

  /**
   * Update a material entry
   * @param {string} id 
   * @param {Object} data 
   * @returns {Promise<Object>} Updated entry
   */
  async update(id, data) {
    const updates = {};
    if (data.materialName !== undefined) updates.material_name = data.materialName.trim();
    if (data.quantity !== undefined) updates.quantity = parseFloat(data.quantity) || 0;
    if (data.unit !== undefined) updates.unit = data.unit.trim();
    if (data.cost !== undefined) updates.cost = parseFloat(data.cost) || 0;
    if (data.invoiceNumber !== undefined) updates.invoice_number = data.invoiceNumber;
    if (data.supplierName !== undefined) updates.supplier_name = data.supplierName;

    const { data: updatedData, error } = await supabase
      .from('materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToAppRecord(updatedData);
  },

  /**
   * Remove a material entry
   * @param {string} id 
   * @returns {Promise<void>}
   */
  async remove(id) {
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get cumulative totals of materials grouped by name and unit
   * @returns {Promise<Array>} List of { materialName, totalQuantity, unit, entryCount }
   */
  async getCumulativeTotals() {
    const { data, error } = await supabase
      .from('materials')
      .select('*');
      
    if (error) throw error;
    const entries = data.map(mapToAppRecord);
    return this._aggregateEntries(entries);
  },

  /**
   * Get cumulative totals of materials within a specific date range
   * @param {string} start - YYYY-MM-DD
   * @param {string} end - YYYY-MM-DD
   * @returns {Promise<Array>}
   */
  async getCumulativeByDateRange(start, end) {
    // 1. Fetch records in range
    const { data: records, error: recordsError } = await supabase
      .from('daily_records')
      .select('id')
      .gte('date', start)
      .lte('date', end);
      
    if (recordsError) throw recordsError;
    if (!records || records.length === 0) return [];

    const recordIds = records.map(r => r.id);
    
    // 2. Fetch materials for those records
    // We chunk it if there are too many IDs, but Supabase 'in' filter is usually fine for a reasonable amount
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('*')
      .in('daily_record_id', recordIds);

    if (materialsError) throw materialsError;
    const entries = materials.map(mapToAppRecord);
    return this._aggregateEntries(entries);
  },

  /**
   * Get unique material names used so far (useful for autocomplete)
   * @returns {Promise<Array<string>>}
   */
  async getAllMaterialNames() {
    const { data, error } = await supabase
      .from('materials')
      .select('material_name');
      
    if (error) throw error;
    
    // Distinct in memory
    const names = new Set(data.map(m => m.material_name));
    return Array.from(names).sort();
  },

  /**
   * Helper to aggregate material entries by name and unit
   * @private
   */
  _aggregateEntries(entries) {
    const groups = {};

    for (const entry of entries) {
      const name = entry.materialName.toLowerCase();
      const unit = entry.unit.toLowerCase();
      // Group key by name + unit to prevent mismatch
      const key = `${name}::${unit}`;

      if (!groups[key]) {
        groups[key] = {
          materialName: entry.materialName, // Preserve original casing
          totalQuantity: 0,
          unit: entry.unit,
          entryCount: 0
        };
      }

      groups[key].totalQuantity += entry.quantity;
      groups[key].entryCount += 1;
    }

    return Object.values(groups).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }
};
