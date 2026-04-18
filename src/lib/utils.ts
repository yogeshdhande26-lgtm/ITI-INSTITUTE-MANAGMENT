import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeFormatDate(dateVal: any, formatStr: string) {
  if (!dateVal) return '-';
  try {
    let date: Date;
    if (typeof dateVal.toDate === 'function') {
      date = dateVal.toDate();
    } else {
      date = new Date(dateVal);
    }
    
    if (isNaN(date.getTime())) return '-';
    return format(date, formatStr);
  } catch (e) {
    return '-';
  }
}
