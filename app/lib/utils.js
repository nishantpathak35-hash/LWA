import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** ₹1,23,456 (Indian locale, no decimals) */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

/** ₹1,23,456.78 (Indian locale, with decimals) */
export function formatINR(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/** 12.34 L (Lakhs, 2 decimal places) */
export function formatLakhs(amount) {
  const lakhs = Number(amount || 0) / 100000;
  return lakhs.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' L';
}

/** 42.5% */
export function formatPercent(value, decimals = 1) {
  return Number(value || 0).toFixed(decimals) + '%';
}

/** "2 hours ago", "3 days ago", etc. */
export function formatTimeAgo(dateString) {
  if (!dateString) return 'N/A';
  try {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(dateString);
  } catch {
    return dateString;
  }
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

/** Convert number to Indian words: 250000 -> "Two Lakh Fifty Thousand Rupees Only" */
export function formatIndianWords(n) {
  const num = Math.round(Number(n) || 0);
  if (num <= 0) return '';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
                'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function twoD(x) {
    if (x < 20) return ones[x];
    return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '');
  }
  function threeD(x) {
    const h = Math.floor(x / 100), r = x % 100;
    return (h ? ones[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? twoD(r) : '');
  }

  let rem = num;
  let out = '';
  const crore = Math.floor(rem / 10000000); rem %= 10000000;
  const lakh  = Math.floor(rem / 100000);   rem %= 100000;
  const thou  = Math.floor(rem / 1000);     rem %= 1000;
  const hund  = rem;

  if (crore) out += threeD(crore) + ' Crore ';
  if (lakh)  out += twoD(lakh) + ' Lakh ';
  if (thou)  out += twoD(thou) + ' Thousand ';
  if (hund)  out += threeD(hund);

  return out.trim() ? out.trim() + ' Rupees Only' : '';
}

