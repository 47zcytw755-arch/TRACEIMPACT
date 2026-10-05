import Papa from 'papaparse';
import { IFileParser, ParsedTabularData, ParserOptions } from './types';

export class TxtParser implements IFileParser {
  public readonly extension = 'txt';

  /**
   * Sniff the most likely delimiter from the first few lines of text
   */
  private detectDelimiter(text: string): string {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 10);
    if (lines.length === 0) return ',';

    const delimiters = ['\t', '|', ';', ','];
    const delimiterScores = delimiters.map((delim) => {
      const counts = lines.map((line) => line.split(delim).length - 1);
      const firstCount = counts[0] || 0;
      // Bonus if delimiter is consistent across lines
      const isConsistent = counts.every((c) => c === firstCount && c > 0);
      const totalCount = counts.reduce((acc, c) => acc + c, 0);
      return { delim, totalCount, isConsistent, score: totalCount * (isConsistent ? 3 : 1) };
    });

    delimiterScores.sort((a, b) => b.score - a.score);
    return delimiterScores[0]?.score > 0 ? delimiterScores[0].delim : ',';
  }

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

    const detectedDelimiter = options?.delimiter || this.detectDelimiter(cleanText);

    const parsed = Papa.parse<Record<string, unknown>>(cleanText, {
      header: options?.hasHeader ?? true,
      skipEmptyLines: 'greedy',
      delimiter: detectedDelimiter,
      preview: options?.maxRows,
      transformHeader: (header: string) => header.trim(),
    });

    const headers = parsed.meta.fields ? parsed.meta.fields.filter(Boolean) : [];
    const rows = (parsed.data || []) as Record<string, unknown>[];

    return {
      headers,
      rows,
      totalRows: rows.length,
      totalColumns: headers.length,
      delimiter: detectedDelimiter,
    };
  }
}
