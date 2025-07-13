import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  if (!name) {
    return '';
  }
  
  const words = name.split(' ');
  if (words.length > 1) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length > 1) {
    return (words[0][0] + words[0][1]).toUpperCase();
  } else if (words.length === 1) {
    return words[0][0].toUpperCase();
  }
  return '';
} 