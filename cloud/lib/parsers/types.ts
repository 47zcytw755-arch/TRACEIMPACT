import { SupportedFileType } from '@/types';

export interface ParsedTabularData {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  totalColumns: number;
  delimiter?: string;
  sheetName?: string;
  metadata?: {
    encoding?: string;
    lineCount?: number;
    rawHeaderLine?: string;
  };
}

export interface ParserOptions {
  maxRows?: number;
  sheetIndex?: number;
  sheetName?: string;
  delimiter?: string;
  hasHeader?: boolean;
}

export interface IFileParser {
  extension: SupportedFileType;
  parse(buffer: Buffer | Uint8Array | string, options?: ParserOptions): Promise<ParsedTabularData>;
}
