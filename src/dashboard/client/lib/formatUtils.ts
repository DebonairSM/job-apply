// Utility functions for formatting data in the dashboard

/**
 * Format a rank value for display with 1 decimal place
 * @param rank The rank value to format
 * @returns Formatted string (e.g., "87.3") or "N/A" if undefined
 */
export function formatRank(rank: number | undefined | null): string {
  if (rank === undefined || rank === null) return 'N/A';
  return rank.toFixed(1);
}

