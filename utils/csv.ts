/**
 * CSV Export Utility
 * Handles generation of CSV files with proper escaping and formatting
 */

/**
 * Escapes a CSV field value by:
 * - Wrapping in quotes if it contains comma, quote, or newline
 * - Doubling any quotes inside the value
 */
function escapeCSVField(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)
  
  // Check if field needs escaping
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    // Double any quotes and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  
  return stringValue
}

/**
 * Generates a CSV string from an array of objects
 * @param data Array of objects to convert to CSV
 * @param fields Array of field names to include (in order). If not provided, uses all keys from first object
 * @param headers Optional custom headers. If not provided, uses field names
 * @returns CSV string
 */
export function generateCSV<T extends Record<string, any>>(
  data: T[],
  fields?: (keyof T)[],
  headers?: string[]
): string {
  if (data.length === 0) {
    return ''
  }

  // Determine fields to export
  const exportFields = fields || (Object.keys(data[0]) as (keyof T)[])
  
  // Determine headers
  const exportHeaders = headers || exportFields.map(f => String(f))
  
  // Build CSV rows
  const rows: string[] = []
  
  // Add header row
  rows.push(exportHeaders.map(h => escapeCSVField(h)).join(','))
  
  // Add data rows
  for (const item of data) {
    const row = exportFields.map(field => {
      const value = item[field]
      
      // Format dates
      if (value instanceof Date) {
        return escapeCSVField(value.toISOString())
      }
      
      // Format objects/arrays as JSON
      if (typeof value === 'object' && value !== null) {
        return escapeCSVField(JSON.stringify(value))
      }
      
      return escapeCSVField(value)
    })
    
    rows.push(row.join(','))
  }
  
  return rows.join('\n')
}

/**
 * Triggers a browser download of CSV content
 * @param filename Name of the file to download
 * @param content CSV content string
 */
export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    // Create a link to the file
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/**
 * Formats a date for CSV export
 */
export function formatDateForCSV(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString()
}

/**
 * Flattens nested objects for CSV export
 * Example: { user: { name: 'John' } } => { 'user.name': 'John' }
 */
export function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {}
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key]
      const newKey = prefix ? `${prefix}.${key}` : key
      
      if (value !== null && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
        Object.assign(flattened, flattenObject(value, newKey))
      } else {
        flattened[newKey] = value
      }
    }
  }
  
  return flattened
}
