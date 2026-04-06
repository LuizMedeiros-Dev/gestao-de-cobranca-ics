import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateString: string) {
  if (!dateString) return '-';
  try {
    // Handle ISO strings or SQLite DATETIME (YYYY-MM-DD HH:MM:SS)
    const datePart = dateString.split(' ')[0].split('T')[0];
    const [year, month, day] = datePart.split('-');
    if (!year || !month || !day) return dateString;
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
}
