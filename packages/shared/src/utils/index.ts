import { format, parseISO, addHours, isBefore, isAfter } from 'date-fns';

// Date utilities
export const formatMatchDate = (dateString: string): string => {
  return format(parseISO(dateString), 'PPP'); // Only date, no time
};

export const formatMatchTime = (dateString: string): string => {
  return format(parseISO(dateString), 'p');
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} mins`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
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