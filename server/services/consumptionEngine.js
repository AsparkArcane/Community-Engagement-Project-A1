const Holiday = require('../models/Holiday');
const TimetableEntry = require('../models/TimetableEntry');
const RoomAppliance = require('../models/RoomAppliance');
const Room = require('../models/Room');
const { getHolidaysForMonth } = require('../utils/mumbaiHolidays');

/**
 * Determine day type for fallback mode (no timetable).
 * Rules:
 *  - Saturday and Sunday are OFF
 *  - Holidays are OFF
 *  - If timetable day exists => lecture
 *  - Otherwise => phantom
 */
async function getDayType(date, holidaySet, timetableDays) {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return 'off';

  const dateStr = date.toISOString().split('T')[0];
  if (holidaySet.has(dateStr)) return 'off';

  if (timetableDays.has(dayOfWeek)) return 'lecture';
  return 'phantom';
}

function parseHourMinute(text) {
  if (!text || typeof text !== 'string' || !text.includes(':')) return 0;
  const [h, m] = text.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return (h * 60) + m;
}

function getEntryDurationHours(entry) {
  const startMinutes = parseHourMinute(entry.startTime);
  const endMinutes = parseHourMinute(entry.endTime);
  let duration = endMinutes - startMinutes;
  if (duration < 0) duration += 24 * 60;
  return +(duration / 60).toFixed(2);
}

/**
 * Compute daily kWh.
 * If scheduledHours > 0, timetable-derived usage is applied for non always-on appliances.
 * Otherwise, manual usageHours fallback is used with legacy buffer behavior.
 */
function computeDailyKWh(appliances, dayType, scheduledHours = 0) {
  if (dayType === 'off') return 0;

  const bufferHours = dayType === 'lecture' ? 1 : 0.5;
  let totalWh = 0;

  for (const ra of appliances) {
    const powerW = ra.overridePowerW || ra.applianceLibraryId.powerW;
    const qty = ra.quantity;
    const baseUsageHours = Number(ra.usageHours) || 0;

    const isAlwaysOn =
      ra.applianceLibraryId.category === 'security' ||
      ra.applianceLibraryId.category === 'networking' ||
      baseUsageHours >= 20;

    let hours = 0;
    if (isAlwaysOn) {
      hours = baseUsageHours > 0 ? baseUsageHours : 24;
    } else if (scheduledHours > 0) {
      hours = Math.min(scheduledHours, 24);
    } else {
      hours = Math.min(baseUsageHours + bufferHours, 24);
    }

    totalWh += powerW * qty * hours;
  }

  return +(totalWh / 1000).toFixed(4);
}

async function computeRoomConsumption(roomId, month, year) {
  const room = await Room.findById(roomId).populate('departmentId');
  if (!room) return null;
  const dept = room.departmentId;

  const appliances = await RoomAppliance.find({ roomId, isActive: true })
    .populate('applianceLibraryId', 'name powerW category');

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const holidayDocs = await Holiday.find({ date: { $gte: startDate, $lt: endDate } });
  let holidaySet = new Set(holidayDocs.map(h => h.date.toISOString().split('T')[0]));

  if (holidaySet.size === 0) {
    const staticHolidays = getHolidaysForMonth(month, year);
    holidaySet = new Set(staticHolidays.map(h => h.date));
  }

  const timetables = await TimetableEntry.find({ roomId });
  const hasTimetable = timetables.length > 0;
  const timetableDays = new Set(timetables.map(t => t.dayOfWeek));
  const timetableHoursByDay = new Map();

  for (const entry of timetables) {
    const prev = timetableHoursByDay.get(entry.dayOfWeek) || 0;
    timetableHoursByDay.set(entry.dayOfWeek, +(prev + getEntryDurationHours(entry)).toFixed(2));
  }

  const dailyData = [];
  let totalKWh = 0;
  let lectureDays = 0;
  let phantomDays = 0;
  let offDays = 0;
  let scheduledHoursTotal = 0;

  for (let day = 1; day <= new Date(year, month, 0).getDate(); day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();

    let dayType = 'off';
    let scheduledHours = 0;

    if (hasTimetable) {
      const dateStr = date.toISOString().split('T')[0];
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidaySet.has(dateStr);

      if (!isWeekend && !isHoliday) {
        scheduledHours = timetableHoursByDay.get(dayOfWeek) || 0;
      }

      dayType = scheduledHours > 0 ? 'lecture' : 'off';
    } else {
      dayType = await getDayType(date, holidaySet, timetableDays);
    }

    const kWh = computeDailyKWh(appliances, dayType, scheduledHours);
    totalKWh += kWh;
    scheduledHoursTotal += scheduledHours;

    dailyData.push({
      date: date.toISOString().split('T')[0],
      dayType,
      kWh,
      scheduledHours
    });

    if (dayType === 'lecture') lectureDays += 1;
    else if (dayType === 'phantom') phantomDays += 1;
    else offDays += 1;
  }

  const tariff = dept?.tariffPerUnit || 7.5;
  const daysInMonth = new Date(year, month, 0).getDate();
  const solarGenKWh = (room.installedSolarKW || 0) * 4 * daysInMonth;
  const netKWh = Math.max(0, totalKWh - solarGenKWh);
  const totalCost = +(netKWh * tariff).toFixed(2);

  const applianceBreakdown = appliances.map(ra => {
    const powerW = ra.overridePowerW || ra.applianceLibraryId.powerW;
    const baseUsageHours = Number(ra.usageHours) || 0;
    const isAlwaysOn =
      ra.applianceLibraryId.category === 'security' ||
      ra.applianceLibraryId.category === 'networking' ||
      baseUsageHours >= 20;

    let kWh = 0;
    let effectiveUsageHours = baseUsageHours;

    if (hasTimetable && !isAlwaysOn) {
      effectiveUsageHours = lectureDays > 0 ? +(scheduledHoursTotal / lectureDays).toFixed(2) : 0;
      kWh = +((powerW * ra.quantity * scheduledHoursTotal) / 1000).toFixed(2);
    } else {
      const workingDays = lectureDays + phantomDays;
      kWh = +((powerW * ra.quantity * baseUsageHours * workingDays) / 1000).toFixed(2);
    }

    return {
      name: ra.applianceLibraryId.name,
      category: ra.applianceLibraryId.category,
      powerW,
      quantity: ra.quantity,
      usageHours: effectiveUsageHours,
      kWh,
      cost: +(kWh * tariff).toFixed(2)
    };
  });

  return {
    roomId,
    roomName: room.name,
    month,
    year,
    tariff,
    installedSolarKW: room.installedSolarKW || 0,
    solarGenKWh: +solarGenKWh.toFixed(2),
    grossKWh: +totalKWh.toFixed(3),
    totalKWh: +netKWh.toFixed(3),
    totalCost,
    usesTimetableHours: hasTimetable,
    workingDays: lectureDays + phantomDays,
    lectureDays,
    phantomDays,
    offDays,
    scheduledHoursTotal: +scheduledHoursTotal.toFixed(2),
    dailyData,
    applianceBreakdown
  };
}

module.exports = { computeRoomConsumption };
