import { format, parseISO, addHours, isBefore, isAfter, isToday, isTomorrow, differenceInCalendarDays, startOfDay } from 'date-fns';

// Helper to get ordinal suffix for dates (1st, 2nd, 3rd, etc.)
const getOrdinalSuffix = (day: number): string => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// Date utilities
export const formatMatchDate = (dateString: string): string => {
  const date = parseISO(dateString);
  const now = new Date();
  
  // Check if today
  if (isToday(date)) {
    return 'Today';
  }
  
  // Check if tomorrow
  if (isTomorrow(date)) {
    return 'Tomorrow';
  }
  
  // Check if within the next 7 days
  const daysUntil = differenceInCalendarDays(date, startOfDay(now));
  if (daysUntil > 0 && daysUntil <= 6) {
    return format(date, 'EEEE'); // Full day name (Monday, Tuesday, etc.)
  }
  
  // For dates more than a week away (or in the past), show "17th Dec 2025" format
  const day = date.getDate();
  const ordinal = getOrdinalSuffix(day);
  return `${day}${ordinal} ${format(date, 'MMM yyyy')}`;
};

// Format match title - combines date and description
// If no description: "Tomorrow" or "Thursday" or "17th Dec 2025"
// If description: "Thursday - Training with Lads"
const MAX_DESCRIPTION_LENGTH = 40;

export const formatMatchTitle = (dateString: string, description?: string): string => {
  const dateStr = formatMatchDate(dateString);
  
  if (!description || description.trim() === '') {
    return dateStr;
  }
  
  // Truncate description if too long
  let truncatedDesc = description.trim();
  if (truncatedDesc.length > MAX_DESCRIPTION_LENGTH) {
    truncatedDesc = truncatedDesc.substring(0, MAX_DESCRIPTION_LENGTH).trim() + '...';
  }
  
  return `${dateStr} - ${truncatedDesc}`;
};

export const formatMatchTime = (dateString: string): string => {
  return format(parseISO(dateString), 'p');
};

export const formatDuration = (minutes: number): string => {
  // Handle invalid or missing duration - default to 90 minutes
  const validMinutes = !minutes || isNaN(minutes) || minutes <= 0 ? 90 : minutes;
  
  if (validMinutes < 60) {
    return `${validMinutes}mins`;
  }
  const hours = Math.floor(validMinutes / 60);
  const remainingMinutes = validMinutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
};

export const formatMatchDateTime = (dateString: string, durationMinutes: number): string => {
  const startTime = formatMatchTime(dateString);
  const duration = formatDuration(durationMinutes);
  return `${startTime} (${duration})`;
};

export const isMatchUpcoming = (dateString: string): boolean => {
  return isAfter(parseISO(dateString), new Date());
};

export const isMatchInPast = (dateString: string): boolean => {
  return isBefore(parseISO(dateString), new Date());
};

export const addReminderTime = (dateString: string, hours: number): string => {
  return addHours(parseISO(dateString), -hours).toISOString();
};

// Phone utilities
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  return cleaned;
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

// URL utilities
export const generateMatchShareUrl = (baseUrl: string, matchId: string): string => {
  return `${baseUrl}/join/${matchId}`;
};

export const generateMatchUrl = (baseUrl: string, matchId: string): string => {
  return `${baseUrl}/match/${matchId}`;
};

// String utilities
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export const capitalizeFirst = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Array utilities
export const getAvailableSpots = (maxPlayers: number, currentPlayers: number): number => {
  return Math.max(0, maxPlayers - currentPlayers);
};

export const isMatchFull = (maxPlayers: number, currentPlayers: number): boolean => {
  return currentPlayers >= maxPlayers;
};

// Error utilities
export const createErrorResponse = (message: string): { error: string } => {
  return { error: message };
};

export const createSuccessResponse = <T>(data: T, message?: string): { data: T; message?: string } => {
  return { data, ...(message && { message }) };
};

// Calendar utilities
interface CalendarEventData {
  title: string
  description?: string
  location: string
  dateTime: string
  durationMinutes: number
}

/**
 * Generate a Google Calendar URL with pre-filled event details
 * This opens Google Calendar in a new tab with the event ready to save
 */
export const generateGoogleCalendarUrl = (event: CalendarEventData): string => {
  const startDate = new Date(event.dateTime)
  const endDate = new Date(startDate.getTime() + event.durationMinutes * 60 * 1000)
  
  // Format dates for Google Calendar (YYYYMMDDTHHmmssZ format)
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  }
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    location: event.location,
    details: event.description || `Padel match at ${event.location}`
  })
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generate an Apple Calendar / iCal file content
 */
export const generateICalContent = (event: CalendarEventData): string => {
  const startDate = new Date(event.dateTime)
  const endDate = new Date(startDate.getTime() + event.durationMinutes * 60 * 1000)
  
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  }
  
  const uid = `padel-${Date.now()}@padelparrot.com`
  
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PadelParrot//Match//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.location}`,
    `DESCRIPTION:${event.description || `Padel match at ${event.location}`}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')
} 