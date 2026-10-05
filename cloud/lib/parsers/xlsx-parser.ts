import * as XLSX from 'xlsx';
import { IFileParser, ParsedTabularData, ParserOptions } from './types';

export class XlsxParser implements IFileParser {
  public readonly extension = 'xlsx';

  async parse(
    buffer: Buffer | Uint8Array | string,
    options?: ParserOptions
  ): Promise<ParsedTabularData> {
    const rawBuffer =
      typeof buffer === 'string'
        ? Buffer.from(buffer, 'base64')
        : Buffer.isBuffer(buffer)
        ? buffer
        : Buffer.from(buffer);

    if (rawBuffer.length === 0) {
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        totalColumns: 0,
      };
    }

    const workbook = XLSX.read(rawBuffer, { type: 'buffer', cellDates: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel workbook contains no valid sheets.');
    }

    const targetSheetName =
      options?.sheetName && workbook.SheetNames.includes(options.sheetName)
        ? options.sheetName
        : workbook.SheetNames[options?.sheetIndex ?? 0];

    const worksheet = workbook.Sheets[targetSheetName];
    if (!worksheet) {
      throw new Error(`Sheet "${targetSheetName}" not found in workbook.`);
    }

    // Convert sheet to JSON array of arrays to safely extract headers
    const rawRows = (XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // First get array of arrays to safely extract headers
      defval: null,
      blankrows: false,
    }) as unknown) as unknown[][];

    if (!rawRows || rawRows.length === 0) {
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        totalColumns: 0,
        sheetName: targetSheetName,
      };
    }

    // Extract headers from first non-empty row
    const rawHeaders = (rawRows[0] || []).map((h, i) =>
      h !== null && h !== undefined && String(h).trim() !== ''
        ? String(h).trim()
        : `Column_${i + 1}`
    );

    const dataRows = rawRows.slice(1);
    const maxRows = options?.maxRows ? Math.min(dataRows.length, options.maxRows) : dataRows.length;

    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < maxRows; i++) {
      const rowArr = dataRows[i] || [];
      const rowObj: Record<string, unknown> = {};
      rawHeaders.forEach((header, colIdx) => {
        const val = rowArr[colIdx];
        rowObj[header] = val === undefined ? null : val;
      });
      rows.push(rowObj);
    }

    return {
      headers: rawHeaders,
      rows,
      totalRows: rows.length,
      totalColumns: rawHeaders.length,
      sheetName: targetSheetName,
    };
  }
}
