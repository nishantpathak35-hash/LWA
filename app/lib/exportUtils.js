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
 * Download a structured multi-sheet Excel workbook (.xls XML SpreadsheetML format).
 * Opens natively in Microsoft Excel, Google Sheets, LibreOffice and Numbers with native tabs.
 * @param {string} filename - Output file name
 * @param {Array<{ sheetName: string, columns: Array<{label: string, key: string, formatter?: Function}>, rows: Array<Object> }>} sheets
 */
export function exportToMultiSheetExcel(filename, sheets) {
  if (!sheets || !sheets.length) {
    alert('No sheet data available to export.');
    return;
  }

  const escapeXml = (unsafe) => {
    if (unsafe == null) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  let xml = `<?xml version="1.0" encoding="utf-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${escapeXml(filename)}</Title>
  <Author>PTS HRMS</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="NumberCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="BoldCell">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
  </Style>
 </Styles>`;

  sheets.forEach(({ sheetName, columns, rows }) => {
    const cleanSheetName = (sheetName || 'Sheet').replace(/[:\/\\\?*\[\]]/g, '_').slice(0, 31);
    xml += `
 <Worksheet ss:Name="${escapeXml(cleanSheetName)}">
  <Table>`;

    // Header Row
    xml += `
   <Row ss:StyleID="Header">`;
    columns.forEach(col => {
      xml += `
    <Cell><Data ss:Type="String">${escapeXml(col.label)}</Data></Cell>`;
    });
    xml += `
   </Row>`;

    // Data Rows
    (rows || []).forEach(row => {
      xml += `
   <Row>`;
      columns.forEach(col => {
        let val = row[col.key];
        if (col.formatter && typeof col.formatter === 'function') {
          val = col.formatter(val, row);
        }
        if (val === null || val === undefined) {
          val = '';
        } else if (typeof val === 'object') {
          val = JSON.stringify(val);
        }

        const isNum = typeof val === 'number' || (!isNaN(Number(val)) && val !== '' && !String(val).startsWith('0') && typeof val !== 'boolean');
        if (isNum && typeof val !== 'string') {
          xml += `
    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${val}</Data></Cell>`;
        } else {
          xml += `
    <Cell><Data ss:Type="String">${escapeXml(val)}</Data></Cell>`;
        }
      });
      xml += `
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>`;
  });

  xml += `
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const outName = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  link.setAttribute('download', outName);
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
