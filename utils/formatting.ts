/**
 * Format a date to a readable string
 * @param date - Date object or ISO string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format a date to a short date string (no time)
 * @param date - Date object or ISO string
 * @returns Formatted date string
 */
export function formatDateShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Format a date to a relative time string (e.g., "2 hours ago")
 * @param date - Date object or ISO string
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  } else {
    return formatDateShort(dateObj);
  }
}

/**
 * Format a currency amount
 * @param amount - Amount in cents or dollars
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Trust score category and color mapping
 */
export interface TrustScoreFormat {
  value: number;
  category: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  color: string;
  bgColor: string;
}

/**
 * Format a trust score with category and color
 * @param score - Trust score (0-100)
 * @returns Formatted trust score object
 */
export function formatTrustScore(score: number): TrustScoreFormat {
  const value = Math.round(score);

  if (value >= 80) {
    return {
      value,
      category: 'Excellent',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
    };
  } else if (value >= 60) {
    return {
      value,
      category: 'Good',
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
    };
  } else if (value >= 40) {
    return {
      value,
      category: 'Fair',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100',
    };
  } else {
    return {
      value,
      category: 'Poor',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
    };
  }
}

/**
 * Truncate text to a maximum length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to append (default: '...')
 * @returns Truncated text
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = '...'
): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Format a percentage
 * @param value - Value between 0 and 1
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number with thousand separators
 * @param value - Number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a phone number
 * @param phone - Phone number string
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX for 10-digit US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Format as +X (XXX) XXX-XXXX for 11-digit numbers
  if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return original if format is unknown
  return phone;
}

/**
 * Format ride status with color
 */
export interface StatusFormat {
  label: string;
  color: string;
  bgColor: string;
}

/**
 * Format ride status
 * @param status - Ride status
 * @returns Formatted status object
 */
export function formatRideStatus(status: string): StatusFormat {
  const statusMap: Record<string, StatusFormat> = {
    active: {
      label: 'Active',
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
    },
    matched: {
      label: 'Matched',
      color: 'text-purple-700',
      bgColor: 'bg-purple-100',
    },
    confirmed: {
      label: 'Confirmed',
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-100',
    },
    ongoing: {
      label: 'Ongoing',
      color: 'text-cyan-700',
      bgColor: 'bg-cyan-100',
    },
    completed: {
      label: 'Completed',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
    },
    cancelled: {
      label: 'Cancelled',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
    },
    expired: {
      label: 'Expired',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
    },
  };

  return statusMap[status] || {
    label: status,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  };
}

/**
 * Format report status
 * @param status - Report status
 * @returns Formatted status object
 */
export function formatReportStatus(status: string): StatusFormat {
  const statusMap: Record<string, StatusFormat> = {
    pending: {
      label: 'Pending',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100',
    },
    resolved: {
      label: 'Resolved',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
    },
    escalated: {
      label: 'Escalated',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
    },
  };

  return statusMap[status] || {
    label: status,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  };
}
