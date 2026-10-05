import { IFileParser, ParsedTabularData, ParserOptions } from './types';

export class JsonParser implements IFileParser {
  public readonly extension = 'json';

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

    let records: Record<string, unknown>[] = [];

    // Check if JSON Lines format
    if (cleanText.includes('\n') && !cleanText.startsWith('[') && !cleanText.startsWith('{')) {
      const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      try {
        records = lines.map((line) => JSON.parse(line));
      } catch {
        // Fall back to standard JSON parse
      }
    }

    if (records.length === 0) {
      try {
        const parsed = JSON.parse(cleanText);
        if (Array.isArray(parsed)) {
          records = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          // Look for common array wrapper keys
          const candidateKey = ['data', 'records', 'items', 'rows', 'results', 'datasets'].find(
            (k) => Array.isArray(parsed[k])
          );
          if (candidateKey) {
            records = parsed[candidateKey];
          } else {
            // Single record object
            records = [parsed];
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`JSON parsing error: ${msg}`);
      }
    }

    if (!Array.isArray(records) || records.length === 0) {
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        totalColumns: 0,
      };
    }

    // Extract all unique keys across all records to build a comprehensive header list
    const headerSet = new Set<string>();
    const maxScanRows = Math.min(records.length, 500);
    for (let i = 0; i < maxScanRows; i++) {
      const item = records[i];
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        Object.keys(item).forEach((k) => headerSet.add(k));
      }
    }

    const headers = Array.from(headerSet);
    const maxRows = options?.maxRows ? Math.min(records.length, options.maxRows) : records.length;

    const normalizedRows: Record<string, unknown>[] = [];
    for (let i = 0; i < maxRows; i++) {
      const raw = records[i];
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const row: Record<string, unknown> = {};
        headers.forEach((h) => {
          const val = raw[h];
          row[h] = val === undefined ? null : val;
        });
        normalizedRows.push(row);
      }
    }

    return {
      headers,
      rows: normalizedRows,
      totalRows: normalizedRows.length,
      totalColumns: headers.length,
    };
  }
}
