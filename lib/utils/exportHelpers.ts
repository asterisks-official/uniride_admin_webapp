/**
 * Export helper functions for triggering CSV downloads from API endpoints
 */

import { getIdToken } from './apiClient';

/**
 * Triggers a CSV export download from the specified API endpoint
 * @param endpoint - The API endpoint to call (e.g., '/api/export/users.csv')
 * @param filename - Optional custom filename for the download
 */
export async function triggerCSVExport(endpoint: string, filename?: string): Promise<void> {
  try {
    // Get the auth token
    const token = await getIdToken();
    
    if (!token) {
      throw new Error('Authentication required');
    }

    // Fetch the CSV data
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error?.message || 'Export failed');
    }

    // Get the CSV content
    const csvContent = await response.text();
    
    // Determine filename from response headers or use provided/default
    const contentDisposition = response.headers.get('Content-Disposition');
    let downloadFilename = filename;
    
    if (!downloadFilename && contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        downloadFilename = filenameMatch[1];
      }
    }
    
    if (!downloadFilename) {
      downloadFilename = `export-${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', downloadFilename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}
