import { format, parseISO, differenceInMinutes } from 'date-fns';

export const formatTime = (timeString: string): string => {
  return format(new Date(`2024-01-01T${timeString}`), 'HH:mm');
};

export const formatDateTime = (dateString: string): string => {
  return format(parseISO(dateString), 'dd/MM/yyyy HH:mm');
};

export const formatDate = (dateString: string): string => {
  return format(parseISO(dateString), 'dd/MM/yyyy');
};

export const getCurrentTime = (): string => {
  return format(new Date(), 'HH:mm:ss');
};

export const getCurrentDate = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const calculateLateMinutes = (expectedTime: string, actualTime: string): number => {
  const expected = new Date(`2024-01-01T${expectedTime}`);
  const actual = new Date(`2024-01-01T${actualTime}`);
  
  const diff = differenceInMinutes(actual, expected);
  return diff > 0 ? diff : 0;
};

export const calculatePenalty = (lateMinutes: number, penaltyPerHour: number): number => {
  if (lateMinutes === 0) return 0;
  return Math.ceil((lateMinutes / 60) * penaltyPerHour);
};