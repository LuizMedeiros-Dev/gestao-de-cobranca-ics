import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? date : date.toISOString();
    // Handle ISO strings or SQLite DATETIME (YYYY-MM-DD HH:MM:SS)
    const datePart = d.split(' ')[0].split('T')[0];
    const [year, month, day] = datePart.split('-');
    if (!year || !month || !day) return d;
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(date);
  }
}
