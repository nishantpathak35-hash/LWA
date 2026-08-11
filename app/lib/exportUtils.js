/**
 * ERP-Grade Export & Data Table Utilities
 */

/**
 * Download array of objects or mapped column definitions as a formatted CSV file.
 * @param {string} filename - Output filename (e.g. 'Vendors_Directory.csv')
 * @param {Array<{label: string, key: string, formatter?: Function}>} columns - Column mapping schema
 * @param {Array<Object>} rows - Data objects
 */
export function exportToCSV(filename, columns, rows) {
  if (!rows || !rows.length) {
    alert('No data available to export.');
    return;
  }

  // 1. Build CSV Header
  const headerRow = columns.map(c => `"${(c.label || '').replace(/"/g, '""')}"`).join(',');

  // 2. Build Data Rows
  const csvLines = [headerRow];

  rows.forEach(row => {
    const line = columns.map(col => {
      let val = row[col.key];
      if (col.formatter && typeof col.formatter === 'function') {
        val = col.formatter(val, row);
      }
      if (val === null || val === undefined) {
        val = '';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      } else {
        val = String(val);
      }
      // Escape double quotes
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',');
    csvLines.push(line);
  });

  const csvString = csvLines.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generic sorter for array of objects.
 * Handles strings, numbers, dates, null/undefined values safely.
 */
export function sortData(data, sortField, sortDir = 'asc') {
  if (!data || !Array.isArray(data) || !sortField) return data;

  const dirMultiplier = sortDir.toLowerCase() === 'desc' ? -1 : 1;

  return [...data].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === null || valA === undefined) valA = '';
    if (valB === null || valB === undefined) valB = '';

    // Numeric comparison
    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean' && valA !== '' && valB !== '') {
      return (numA - numB) * dirMultiplier;
    }

    // Date comparison
    if (typeof valA === 'string' && typeof valB === 'string') {
      const dateA = Date.parse(valA);
      const dateB = Date.parse(valB);
      if (!isNaN(dateA) && !isNaN(dateB) && valA.length > 5 && valB.length > 5 && (valA.includes('-') || valA.includes('/'))) {
        return (dateA - dateB) * dirMultiplier;
      }
    }

    // String locale comparison
    return String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' }) * dirMultiplier;
  });
}
