import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `${inrFormatter.format(Math.round(amount / 10000000))} Cr`;
  }
  if (amount >= 100000) {
    return `${inrFormatter.format(Math.round(amount / 100000))} L`;
  }
  if (amount >= 1000) {
    return inrFormatter.format(amount);
  }
  if (Number.isInteger(amount)) {
    return `₹${amount}`;
  }
  return `₹${amount.toFixed(2)}`;
}

export function formatPricePerUnit(amount: number, unit: string): string {
  return `${formatCurrency(amount)}/${unit ?? 'kg'}`;
}

export function formatDate(date: string | Date, includeTime = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  };
  return d.toLocaleDateString('en-IN', opts);
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${Number.isInteger(kg) ? kg : kg.toFixed(2)} kg`;
  }
  return `${grams} g`;
}

export function formatQuantity(quantity: number, unit: string): string {
  return `${quantity} ${unit}`;
}

export function truncateText(text: string, maxLength = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

export function generateOrderNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `VK${y}${m}${d}${random}`;
}

export function generateSettlementNumber(): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `VK-STL-${random}`;
}

export function generateBatchNumber(): string {
  const ts = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `VK-${ts}-${random}`;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function getGreeting(lang: 'en' | 'ta' = 'en'): string {
  const hour = new Date().getHours();
  if (lang === 'ta') {
    if (hour < 12) return 'காலை வணக்கம்';
    if (hour < 17) return 'மதிய வணக்கம்';
    return 'மாலை வணக்கம்';
  }
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

export function isValidPincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode);
}

export function isValidUPIId(upiId: string): boolean {
  return /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId);
}

export function maskPhone(phone: string): string {
  if (phone.length !== 10) return phone;
  return `${phone.slice(0, 3)}XXXX${phone.slice(7)}`;
}

export function maskAccount(account: string): string {
  if (account.length <= 4) return '****';
  return `****${account.slice(-4)}`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isToday(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

export function isTomorrow(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear()
  );
}

export function getSafeText(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function generateMockImageUrl(seed: string): string {
  return `https://images.unsplash.com/photo-1567306226416-0f26cb8f0d78?w=400&q=80&seed=${encodeURIComponent(seed)}`;
}

export function getCategorySlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}