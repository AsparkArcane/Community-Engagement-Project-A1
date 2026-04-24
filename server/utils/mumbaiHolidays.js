/**
 * Static Mumbai/Maharashtra Public Holidays Database
 * No dependency on Google Calendar API
 */

const MUMBAI_HOLIDAYS = [
  // 2024
  { date: '2024-01-26', name: 'Republic Day', type: 'national' },
  { date: '2024-03-08', name: 'Maha Shivaratri', type: 'religious' },
  { date: '2024-03-25', name: 'Holi', type: 'religious' },
  { date: '2024-04-11', name: 'Eid ul-Fitr', type: 'religious' },
  { date: '2024-04-17', name: 'Ram Navami', type: 'religious' },
  { date: '2024-04-21', name: 'Mahavir Jayanti', type: 'religious' },
  { date: '2024-05-23', name: 'Buddha Purnima', type: 'religious' },
  { date: '2024-08-15', name: 'Independence Day', type: 'national' },
  { date: '2024-08-26', name: 'Janmashtami', type: 'religious' },
  { date: '2024-09-16', name: 'Milad un-Nabi', type: 'religious' },
  { date: '2024-10-02', name: 'Gandhi Jayanti', type: 'national' },
  { date: '2024-10-12', name: 'Dussehra', type: 'religious' },
  { date: '2024-10-31', name: 'Diwali', type: 'religious' },
  { date: '2024-11-01', name: 'Diwali (Day 2)', type: 'religious' },
  { date: '2024-11-15', name: 'Guru Nanak Jayanti', type: 'religious' },
  { date: '2024-12-25', name: 'Christmas', type: 'religious' },

  // 2025
  { date: '2025-01-26', name: 'Republic Day', type: 'national' },
  { date: '2025-03-14', name: 'Holi', type: 'religious' },
  { date: '2025-03-30', name: 'Eid ul-Fitr', type: 'religious' },
  { date: '2025-03-31', name: 'Good Friday', type: 'religious' },
  { date: '2025-04-06', name: 'Ram Navami', type: 'religious' },
  { date: '2025-04-10', name: 'Mahavir Jayanti', type: 'religious' },
  { date: '2025-05-12', name: 'Buddha Purnima', type: 'religious' },
  { date: '2025-06-08', name: 'Eid ul-Adha', type: 'religious' },
  { date: '2025-07-17', name: 'Muharram', type: 'religious' },
  { date: '2025-08-15', name: 'Independence Day', type: 'national' },
  { date: '2025-08-16', name: 'Janmashtami', type: 'religious' },
  { date: '2025-09-16', name: 'Milad un-Nabi', type: 'religious' },
  { date: '2025-10-02', name: 'Gandhi Jayanti', type: 'national' },
  { date: '2025-10-02', name: 'Dussehra', type: 'religious' },
  { date: '2025-10-20', name: 'Diwali', type: 'religious' },
  { date: '2025-10-21', name: 'Diwali (Day 2)', type: 'religious' },
  { date: '2025-11-05', name: 'Guru Nanak Jayanti', type: 'religious' },
  { date: '2025-12-25', name: 'Christmas', type: 'religious' },

  // 2026
  { date: '2026-01-26', name: 'Republic Day', type: 'national' },
  { date: '2026-03-04', name: 'Holi', type: 'religious' },
  { date: '2026-03-19', name: 'Eid ul-Fitr', type: 'religious' },
  { date: '2026-03-25', name: 'Ram Navami', type: 'religious' },
  { date: '2026-03-29', name: 'Good Friday', type: 'religious' },
  { date: '2026-03-30', name: 'Mahavir Jayanti', type: 'religious' },
  { date: '2026-05-01', name: 'Buddha Purnima', type: 'religious' },
  { date: '2026-05-28', name: 'Eid ul-Adha', type: 'religious' },
  { date: '2026-07-07', name: 'Muharram', type: 'religious' },
  { date: '2026-08-15', name: 'Independence Day', type: 'national' },
  { date: '2026-09-04', name: 'Janmashtami', type: 'religious' },
  { date: '2026-09-05', name: 'Milad un-Nabi', type: 'religious' },
  { date: '2026-10-02', name: 'Gandhi Jayanti', type: 'national' },
  { date: '2026-10-09', name: 'Dussehra', type: 'religious' },
  { date: '2026-10-29', name: 'Diwali', type: 'religious' },
  { date: '2026-10-30', name: 'Diwali (Day 2)', type: 'religious' },
  { date: '2026-11-25', name: 'Guru Nanak Jayanti', type: 'religious' },
  { date: '2026-12-25', name: 'Christmas', type: 'religious' }
];

/**
 * Get holidays for a specific month/year
 */
function getHolidaysForMonth(month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  
  return MUMBAI_HOLIDAYS.filter(h => {
    const hDate = new Date(h.date);
    return hDate >= startDate && hDate < endDate;
  });
}

/**
 * Check if a date is a holiday
 */
function isHoliday(date) {
  const dateStr = date.toISOString().split('T')[0];
  return MUMBAI_HOLIDAYS.some(h => h.date === dateStr);
}

/**
 * Get holiday details for a specific date
 */
function getHolidayDetails(date) {
  const dateStr = date.toISOString().split('T')[0];
  return MUMBAI_HOLIDAYS.find(h => h.date === dateStr) || null;
}

module.exports = {
  MUMBAI_HOLIDAYS,
  getHolidaysForMonth,
  isHoliday,
  getHolidayDetails
};
