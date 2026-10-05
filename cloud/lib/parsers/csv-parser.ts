import Papa from 'papaparse';
import { IFileParser, ParsedTabularData, ParserOptions } from './types';

export class CsvParser implements IFileParser {
  public readonly extension = 'csv';

  async parse(
    buffer: Buffer | Uint8Array | string,
    options?: ParserOptions
  ): Promise<ParsedTabularData> {
    const textContent =
      typeof buffer === 'string'
        ? buffer
        : Buffer.isBuffer(buffer)
        ? buffer.toString('utf-8')
        : Buffer.from(buffer).toString('utf-8');

    const cleanText = textContent.trim();
    if (!cleanText) {
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        totalColumns: 0,
      };
    }

    const parsed = Papa.parse<Record<string, unknown>>(cleanText, {
      header: options?.hasHeader ?? true,
      skipEmptyLines: 'greedy',
      delimiter: options?.delimiter,
      preview: options?.maxRows,
      transformHeader: (header: string) => header.trim(),
    });

    if (parsed.errors && parsed.errors.length > 0) {
      const fatalErrors = parsed.errors.filter(
        (e) => e.type === 'Quotes' || e.code === 'UndetectableDelimiter'
      );
      if (fatalErrors.length > 0 && parsed.data.length === 0) {
        throw new Error(`CSV parsing error: ${fatalErrors[0].message}`);
      }
    }

    const headers = parsed.meta.fields ? parsed.meta.fields.filter(Boolean) : [];
    const rows = (parsed.data || []) as Record<string, unknown>[];

    return {
      headers,
      rows,
      totalRows: rows.length,
      totalColumns: headers.length,
      delimiter: parsed.meta.delimiter,
    };
  }
}
