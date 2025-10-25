/**
 * Utility functions for date formatting and calculations
 */

/**
 * Converts an absolute timestamp to a relative time string
 * @param dateString - The date string to convert
 * @returns Relative time string (e.g., "just now", "5 minutes ago", "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return 'N/A';
  
  try {
    const timestamp = dateString.includes('Z') ? dateString : `${dateString}Z`;
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    if (diffMs < 0) {
      return 'Just now'; // Future date
    }
    
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
    
    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
    
  } catch (error) {
    // If parsing fails, return the original string
    return dateString;
  }
}

/**
 * Calculates dynamic posted date based on scraped time and current viewing time
 * @param relativeTimeString - The original relative time string (e.g., "22 hours ago")
 * @param scrapedAt - When the job was scraped from LinkedIn
 * @returns Updated relative time string based on current time
 */
export function calculateDynamicPostedDate(relativeTimeString: string, scrapedAt: string | undefined): string {
  if (!scrapedAt) return relativeTimeString; // Fallback to original if no scraped time
  
  try {
    // Parse the relative time string (e.g., "22 hours ago", "3 days ago")
    const match = relativeTimeString.match(/(\d+)\s+(hour|day|week|month|minute|second)s?\s+ago/i);
    if (!match) return relativeTimeString;
    
    const [, amount, unit] = match;
    const amountNum = parseInt(amount);
    
    // Calculate the actual posting time based on when it was scraped
    const scrapedTime = new Date(scrapedAt.includes('Z') ? scrapedAt : `${scrapedAt}Z`);
    let postingTime: Date;
    
      switch (unit.toLowerCase()) {
        case 'minute':
          postingTime = new Date(scrapedTime.getTime() - (amountNum * 60 * 1000));
          break;
        case 'hour':
          postingTime = new Date(scrapedTime.getTime() - (amountNum * 60 * 60 * 1000));
          break;
        case 'day':
          postingTime = new Date(scrapedTime.getTime() - (amountNum * 24 * 60 * 60 * 1000));
          break;
        case 'week':
          postingTime = new Date(scrapedTime.getTime() - (amountNum * 7 * 24 * 60 * 60 * 1000));
          break;
        case 'month':
          postingTime = new Date(scrapedTime.getTime() - (amountNum * 30 * 24 * 60 * 60 * 1000));
          break;
        default:
          return relativeTimeString;
      }
    
    // Calculate the new relative time from posting time to now
    const now = new Date();
    const diffMs = now.getTime() - postingTime.getTime();
    
    if (diffMs < 0) {
      return 'Just now'; // Job was posted in the future (shouldn't happen)
    }
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
    
  } catch (error) {
    // If calculation fails, return the original string
    return relativeTimeString;
  }
}

/**
 * Formats a date string for display
 * @param dateString - The date string to format
 * @param scrapedAt - When the job was scraped (for dynamic posted date calculation)
 * @returns Formatted date string
 */
export function formatDate(dateString: string | undefined, scrapedAt?: string): string {
  if (!dateString) return 'N/A';
  
  // Check if it's a relative date (e.g., "1 hour ago", "2 days ago")
  if (dateString.includes('ago') || dateString.includes('day') || dateString.includes('hour') || dateString.includes('week') || dateString.includes('month')) {
    return calculateDynamicPostedDate(dateString, scrapedAt);
  }
  
  // Handle absolute timestamps
  try {
    const timestamp = dateString.includes('Z') ? dateString : `${dateString}Z`;
    return new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    // If parsing fails, return the original string
    return dateString;
  }
}
