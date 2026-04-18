import ExcelJS from 'exceljs';
import { DocumentSettings } from '@/components/AppSettingsContext';

export interface ExcelExportData {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: any[][];
  colWidths?: number[];
}

export const exportToExcel = async (
  data: ExcelExportData,
  settings: DocumentSettings,
  fileName: string
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  // --- HEADER SECTION ---
  // A1: Institute Name
  worksheet.mergeCells('A1', String.fromCharCode(64 + data.headers.length) + '1');
  const instCell = worksheet.getCell('A1');
  instCell.value = settings.instituteName.toUpperCase();
  instCell.font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
  instCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // A2: Department Name
  worksheet.mergeCells('A2', String.fromCharCode(64 + data.headers.length) + '2');
  const deptCell = worksheet.getCell('A2');
  deptCell.value = settings.departmentName.toUpperCase();
  deptCell.font = { bold: true, size: 11, color: { argb: 'FF475569' } };
  deptCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // A3: Report Title
  worksheet.mergeCells('A3', String.fromCharCode(64 + data.headers.length) + '3');
  const titleCell = worksheet.getCell('A3');
  titleCell.value = data.title.toUpperCase();
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }
  };
  titleCell.font = { bold: true, size: 10, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // A4: Subtitle if any
  if (data.subtitle) {
    worksheet.mergeCells('A4', String.fromCharCode(64 + data.headers.length) + '4');
    const subCell = worksheet.getCell('A4');
    subCell.value = data.subtitle;
    subCell.font = { italic: true, size: 9 };
    subCell.alignment = { horizontal: 'center' };
  }

  const startRow = data.subtitle ? 6 : 5;

  // --- TABLE HEADERS ---
  const headerRow = worksheet.getRow(startRow);
  headerRow.values = data.headers;
  headerRow.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // --- DATA ROWS ---
  data.rows.forEach((row, i) => {
    const r = worksheet.getRow(startRow + 1 + i);
    r.values = row;
    r.font = { size: 9 };
    r.alignment = { vertical: 'middle', wrapText: true };
    
    if (settings.showGridlines) {
      row.forEach((_, colIdx) => {
        const cell = r.getCell(colIdx + 1);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
  });

  // Apply borders to header row if gridlines enabled
  if (settings.showGridlines) {
     data.headers.forEach((_, colIdx) => {
        const cell = headerRow.getCell(colIdx + 1);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
     });
  }

  // Set column widths
  if (data.colWidths) {
    data.colWidths.forEach((w, i) => {
      worksheet.getColumn(i + 1).width = w;
    });
  } else {
    worksheet.columns.forEach(col => { col.width = 15; });
  }

  // --- FOOTER SECTION ---
  const lastDataRow = startRow + data.rows.length + 3;
  
  // Signature Left
  const sigLeftCell = worksheet.getCell(`A${lastDataRow}`);
  sigLeftCell.value = settings.footerLine1;
  sigLeftCell.font = { bold: true, size: 9 };
  sigLeftCell.border = { top: { style: 'medium' } };
  sigLeftCell.alignment = { horizontal: 'center' };

  // Signature Right
  const lastCol = String.fromCharCode(64 + data.headers.length);
  const sigRightCell = worksheet.getCell(`${lastCol}${lastDataRow}`);
  sigRightCell.value = settings.footerLine2;
  sigRightCell.font = { bold: true, size: 9 };
  sigRightCell.border = { top: { style: 'medium' } };
  sigRightCell.alignment = { horizontal: 'center' };

  // --- DOWNLOAD ---
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

export const exportUsingTemplate = async (
  templateBase64: string,
  dataMap: Record<string, any>,
  fileName: string,
  options?: { isMultipleEntry?: boolean; tableData?: any[]; tableMappings?: { field: string; column: string }[]; startRow?: number }
) => {
  const workbook = new ExcelJS.Workbook();
  
  // Convert base64 to buffer
  const binaryString = window.atob(templateBase64.split(',')[1] || templateBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  await workbook.xlsx.load(bytes.buffer);
  const worksheet = workbook.getWorksheet(1); // Assume first sheet

  if (!worksheet) {
    throw new Error('Template worksheet not found');
  }

  // Populate single fields
  Object.entries(dataMap).forEach(([cellAddress, value]) => {
    // Only populate if it doesn't look like a column placeholder (or if we strictly know it's a fixed cell)
    const cell = worksheet.getCell(cellAddress);
    cell.value = value;
  });

  // Populate table data if provided
  if (options?.isMultipleEntry && options.tableData && options.tableMappings && options.startRow) {
    options.tableData.forEach((row, rowIndex) => {
      const currentRow = options.startRow! + rowIndex;
      options.tableMappings!.forEach(mapping => {
        // mapping.column is e.g. "B" or "C"
        const cellAddress = `${mapping.column}${currentRow}`;
        const cell = worksheet.getCell(cellAddress);
        cell.value = row[mapping.field];
        
        // Copy style from the first row of table if possible, or just keep default
        if (rowIndex > 0) {
          const firstCell = worksheet.getCell(`${mapping.column}${options.startRow}`);
          cell.style = JSON.parse(JSON.stringify(firstCell.style));
        }
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

export const prepareTemplateData = (
  rawData: Record<string, any>,
  mappings: { field: string; cell: string }[]
): Record<string, any> => {
  const cellData: Record<string, any> = {};
  
  mappings.forEach(m => {
    if (rawData[m.field] !== undefined) {
      cellData[m.cell] = rawData[m.field];
    }
  });
  
  return cellData;
};
