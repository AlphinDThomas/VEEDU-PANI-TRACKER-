import { supabase } from './supabaseClient.js';
import { getTodayDateString } from '../utils/date.js';

// Helper to map DB records
const mapDailyRecord = (dbRecord) => {
  if (!dbRecord) return null;
  return {
    id: dbRecord.id,
    date: dbRecord.date,
    labourCount: dbRecord.labour_count,
    teaMorning: parseFloat(dbRecord.tea_morning),
    teaEvening: parseFloat(dbRecord.tea_evening)
  };
};

export const analyticsService = {
  /**
   * Fetch today's snapshot and all-time statistics
   * @param {string} [targetDate] - Optional date YYYY-MM-DD, defaults to local today
   * @returns {Promise<Object>} DashboardStats
   */
  async getDashboardStats(targetDate) {
    const dateStr = targetDate || getTodayDateString();
    
    // 1. Fetch target date record
    const { data: todayRecordData } = await supabase
      .from('daily_records')
      .select('id, labour_count, tea_morning, tea_evening')
      .eq('date', dateStr)
      .maybeSingle();
      
    let todayStats = {
      labourCount: 0,
      teaTotal: 0,
      materialsCount: 0,
      activitiesCount: 0
    };

    if (todayRecordData) {
      const { count: matCount } = await supabase
        .from('materials')
        .select('*', { count: 'exact', head: true })
        .eq('daily_record_id', todayRecordData.id);

      const { count: actCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('daily_record_id', todayRecordData.id);
        
      todayStats = {
        labourCount: todayRecordData.labour_count,
        teaTotal: parseFloat(todayRecordData.tea_morning) + parseFloat(todayRecordData.tea_evening),
        materialsCount: matCount || 0,
        activitiesCount: actCount || 0
      };
    }

    // 2. Fetch all-time stats
    const { data: allRecords } = await supabase
      .from('daily_records')
      .select('date, labour_count, tea_morning, tea_evening');
      
    const records = allRecords ? allRecords.map(mapDailyRecord) : [];
      
    let totalLabourers = 0;
    let totalExpenses = 0;
    const workingDays = records.length;

    for (const r of records) {
      totalLabourers += r.labourCount;
      totalExpenses += r.teaMorning + r.teaEvening;
    }

    const { count: totalMaterials } = await supabase
      .from('materials')
      .select('*', { count: 'exact', head: true });

    // 3. Calculate trend (This Month vs Last Month)
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth(); // 0-indexed

    // Range for this month
    const thisMonthPrefix = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}`;
    const thisMonthRecords = records.filter(r => r.date.startsWith(thisMonthPrefix));

    // Range for last month
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthPrefix = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}`;
    const lastMonthRecords = records.filter(r => r.date.startsWith(lastMonthPrefix));

    // Calculations
    const thisMonthLabour = thisMonthRecords.reduce((sum, r) => sum + r.labourCount, 0);
    const lastMonthLabour = lastMonthRecords.reduce((sum, r) => sum + r.labourCount, 0);
    
    const thisMonthExpense = thisMonthRecords.reduce((sum, r) => sum + r.teaMorning + r.teaEvening, 0);
    const lastMonthExpense = lastMonthRecords.reduce((sum, r) => sum + r.teaMorning + r.teaEvening, 0);

    const calcPctChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const labourChange = calcPctChange(thisMonthLabour, lastMonthLabour);
    const expenseChange = calcPctChange(thisMonthExpense, lastMonthExpense);

    return {
      today: todayStats,
      allTime: {
        totalLabourers,
        totalExpenses,
        workingDays,
        totalMaterials: totalMaterials || 0
      },
      trend: {
        labourChange,
        expenseChange
      }
    };
  },

  /**
   * Get expense trend data points for chart
   * @param {string} [period='week'] - 'week' | 'month' | 'year'
   * @returns {Promise<Array>} List of { date, label, expense }
   */
  async getExpenseTrend(period = 'week') {
    const { data: dbRecords } = await supabase
      .from('daily_records')
      .select('date, tea_morning, tea_evening')
      .order('date', { ascending: true });
      
    const allRecords = (dbRecords || []).map(mapDailyRecord);
    
    if (period === 'week') {
      const last7 = allRecords.slice(-7);
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      return last7.map(r => {
        const dateObj = new Date(r.date);
        return {
          date: r.date,
          label: days[dateObj.getDay()],
          expense: r.teaMorning + r.teaEvening
        };
      });
    } else if (period === 'month') {
      const last30 = allRecords.slice(-30);
      return last30.map(r => {
        const [,, day] = r.date.split('-');
        return {
          date: r.date,
          label: day,
          expense: r.teaMorning + r.teaEvening
        };
      });
    } else {
      const monthlyGroups = {};
      const monthsShort = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      
      for (const r of allRecords) {
        const dateObj = new Date(r.date);
        const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyGroups[key]) {
          monthlyGroups[key] = {
            date: key + '-01',
            label: monthsShort[dateObj.getMonth()],
            expense: 0
          };
        }
        monthlyGroups[key].expense += r.teaMorning + r.teaEvening;
      }
      
      return Object.values(monthlyGroups).slice(-12);
    }
  },

  /**
   * Get workforce/labour details in range
   * @param {string} [start] - Optional YYYY-MM-DD
   * @param {string} [end] - Optional YYYY-MM-DD
   * @returns {Promise<Object>} LabourStats
   */
  async getLabourStats(start, end) {
    let query = supabase.from('daily_records').select('labour_count');
    
    if (start && end) {
      query = query.gte('date', start).lte('date', end);
    }
    
    const { data: records } = await query;

    if (!records || records.length === 0) {
      return { average: 0, peak: 0, total: 0 };
    }

    let total = 0;
    let peak = 0;

    for (const r of records) {
      total += r.labour_count;
      if (r.labour_count > peak) peak = r.labour_count;
    }

    const average = parseFloat((total / records.length).toFixed(1));

    return { average, peak, total };
  },

  /**
   * Get recent activities from across recent diary entries
   * @param {number} [limit=5] - Number of items to retrieve
   * @returns {Promise<Array>} List of { description, tags, date, formattedDate }
   */
  async getRecentActivities(limit = 5) {
    // We can join activities with daily_records in Supabase
    const { data, error } = await supabase
      .from('activities')
      .select('id, activity_name, tags, daily_records(date)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    const recentActivities = [];
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (const act of data) {
      if (!act.daily_records) continue;
      
      const recordDate = act.daily_records.date;
      const dateObj = new Date(recordDate);
      const formattedDate = `${monthsShort[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
      
      recentActivities.push({
        id: act.id,
        description: act.activity_name,
        tags: act.tags,
        date: recordDate,
        formattedDate,
        timeLabel: recordDate === getTodayDateString() ? 'Today' : formattedDate
      });
    }

    // Since we ordered by activity creation time rather than record date, 
    // let's just return what we got
    return recentActivities;
  }
};
