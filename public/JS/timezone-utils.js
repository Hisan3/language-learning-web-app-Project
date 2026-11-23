// ============================================
// 🌍 GLOBAL TIMEZONE UTILITY
// Handles timezone conversion for all users worldwide
// ============================================

/**
 * Get the user's timezone
 * @returns {string} User's IANA timezone (e.g., 'Asia/Dhaka', 'America/New_York')
 */
function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('⚠️ Could not detect timezone, falling back to UTC');
    return 'UTC';
  }
}

/**
 * Convert UTC date string to user's local timezone
 * @param {string|Date} utcDate - UTC date string or Date object
 * @returns {Date} Date object in user's local timezone
 */
function convertUTCToLocal(utcDate) {
  if (!utcDate) return null;
  
  // Parse the UTC date
  const date = new Date(utcDate);
  
  // Return the date (JavaScript Date objects automatically handle timezone conversion)
  return date;
}

/**
 * Get the start of today in user's local timezone (00:00:00)
 * @returns {Date} Start of today in user's timezone
 */
function getLocalMidnight() {
  const now = new Date();
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return localMidnight;
}

/**
 * Get the end of today in user's local timezone (23:59:59)
 * @returns {Date} End of today in user's timezone
 */
function getLocalEndOfDay() {
  const now = new Date();
  const localEndOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return localEndOfDay;
}

/**
 * Check if a UTC date is today in user's local timezone
 * @param {string|Date} utcDate - UTC date string or Date object
 * @returns {boolean} True if the date is today in user's timezone
 */
function isToday(utcDate) {
  if (!utcDate) return false;
  
  const date = convertUTCToLocal(utcDate);
  const today = new Date();
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

/**
 * Get today's date in YYYY-MM-DD format in user's local timezone
 * @returns {string} Today's date in YYYY-MM-DD format
 */
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a UTC date to a readable string in user's local timezone
 * @param {string|Date} utcDate - UTC date string or Date object
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string in user's timezone
 */
function formatLocalDate(utcDate, options = {}) {
  if (!utcDate) return 'N/A';
  
  const date = convertUTCToLocal(utcDate);
  const userTimezone = getUserTimezone();
  
  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: userTimezone,
    ...options
  };
  
  return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
}

/**
 * Format a UTC date to a short time string in user's local timezone
 * @param {string|Date} utcDate - UTC date string or Date object
 * @returns {string} Formatted time string (e.g., "2:30 PM")
 */
function formatLocalTime(utcDate) {
  return formatLocalDate(utcDate, {
    hour: '2-digit',
    minute: '2-digit',
    month: undefined,
    day: undefined,
    year: undefined
  });
}

/**
 * Get the date part only in user's local timezone
 * @param {string|Date} utcDate - UTC date string or Date object
 * @returns {string} Date string in format "Jan 1, 2024"
 */
function formatLocalDateOnly(utcDate) {
  return formatLocalDate(utcDate, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: undefined,
    minute: undefined
  });
}

/**
 * Check if practice data is from today based on user's local timezone
 * Used for daily practice set resets
 * @param {string|Date} practiceDate - The date when practice data was published
 * @returns {boolean} True if practice is for today
 */
function isPracticeDateToday(practiceDate) {
  if (!practiceDate) return false;
  
  const practiceLocalDate = convertUTCToLocal(practiceDate);
  const todayLocal = new Date();
  
  // Compare only the date parts (ignore time)
  return practiceLocalDate.getDate() === todayLocal.getDate() &&
         practiceLocalDate.getMonth() === todayLocal.getMonth() &&
         practiceLocalDate.getFullYear() === todayLocal.getFullYear();
}

/**
 * Get a human-readable time ago string (e.g., "2 hours ago", "just now")
 * @param {string|Date} utcDate - UTC date string or Date object
 * @returns {string} Human-readable time ago string
 */
function getTimeAgo(utcDate) {
  if (!utcDate) return 'N/A';
  
  const date = convertUTCToLocal(utcDate);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);
  
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  // For older dates, show the actual date
  return formatLocalDateOnly(utcDate);
}

/**
 * Log timezone information for debugging
 */
function logTimezoneInfo() {
  const timezone = getUserTimezone();
  const now = new Date();
  const offset = -now.getTimezoneOffset() / 60; // Convert to hours
  
  console.log('🌍 Timezone Information:');
  console.log(`   Timezone: ${timezone}`);
  console.log(`   UTC Offset: ${offset >= 0 ? '+' : ''}${offset} hours`);
  console.log(`   Local Time: ${now.toLocaleString()}`);
  console.log(`   UTC Time: ${now.toUTCString()}`);
  console.log(`   Today (local): ${getTodayDateString()}`);
}

// Export functions for use in other files
// Note: In browser environment, these will be available globally
if (typeof window !== 'undefined') {
  window.TimezoneUtils = {
    getUserTimezone,
    convertUTCToLocal,
    getLocalMidnight,
    getLocalEndOfDay,
    isToday,
    getTodayDateString,
    formatLocalDate,
    formatLocalTime,
    formatLocalDateOnly,
    isPracticeDateToday,
    getTimeAgo,
    logTimezoneInfo
  };
}
