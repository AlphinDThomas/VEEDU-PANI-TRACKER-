/**
 * Date Utilities for BuildGuard
 */

/**
 * Get current date string in YYYY-MM-DD format based on local time
 * @returns {string}
 */
export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format YYYY-MM-DD to "DD MMM YYYY" (e.g., 09 Jun 2026)
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string}
 */
export function formatDateString(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-IN', options);
}

/**
 * Format YYYY-MM-DD to short display like "Oct 24, 2023"
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string}
 */
export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Format YYYY-MM-DD to monthly range format like "Oct 2023"
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string}
 */
export function formatDateMonthYear(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Parse date components from YYYY-MM-DD
 * @param {string} dateStr 
 * @returns {{year: number, month: number, day: number}}
 */
export function parseDateString(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month: month - 1, day }; // month is 0-indexed in JS Dates
}

/**
 * Get days in month
 * @param {number} year 
 * @param {number} month - 0-indexed
 * @returns {number}
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the day of the week for the 1st of a month
 * @param {number} year 
 * @param {number} month - 0-indexed
 * @returns {number} - 0 (Sunday) to 6 (Saturday)
 */
export function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

/**
 * Returns previous month details
 * @param {number} year 
 * @param {number} month - 0-indexed
 * @returns {{year: number, month: number}}
 */
export function getPrevMonth(year, month) {
  if (month === 0) {
    return { year: year - 1, month: 11 };
  }
  return { year, month: month - 1 };
}

/**
 * Returns next month details
 * @param {number} year 
 * @param {number} month - 0-indexed
 * @returns {{year: number, month: number}}
 */
export function getNextMonth(year, month) {
  if (month === 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month: month + 1 };
}

/**
 * Month names array
 */
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Returns YYYY-MM-DD from Date object
 * @param {Date} date 
 * @returns {string}
 */
export function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
