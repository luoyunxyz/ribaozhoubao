export function toDateOnly(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseInputDate(value, endOfDay = false) {
  if (!value) return null;
  const normalized = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(`${normalized}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+08:00`);
  }
  const withT = normalized.replace(' ', 'T');
  const date = new Date(withT);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date;
}

export function getDateRange(query = {}, mode = 'today') {
  const now = new Date();
  let startDate = query.startDate;
  let endDate = query.endDate;

  if (!startDate && !endDate) {
    if (mode === 'last7days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      startDate = toDateOnly(start);
      endDate = toDateOnly(now);
    } else {
      startDate = toDateOnly(now);
      endDate = toDateOnly(now);
    }
  } else if (startDate && !endDate) {
    endDate = startDate;
  } else if (!startDate && endDate) {
    startDate = endDate;
  }

  return {
    start: parseInputDate(startDate, false),
    end: parseInputDate(endDate, true),
    startDate,
    endDate
  };
}

export function secondsBetween(startTime, endTime) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return Math.max(0, Math.round((end - start) / 1000));
}
