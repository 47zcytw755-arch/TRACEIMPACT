import { SupportedFileType } from '@/types';
import { IFileParser, ParsedTabularData, ParserOptions } from './types';
import { CsvParser } from './csv-parser';
import { XlsxParser } from './xlsx-parser';
import { JsonParser } from './json-parser';
import { TxtParser } from './txt-parser';

const parsers: Record<SupportedFileType, IFileParser> = {
  csv: new CsvParser(),
  xlsx: new XlsxParser(),
  json: new JsonParser(),
  txt: new TxtParser(),
};

/**
 * Main parser entry point. Parses file content by extension into normalized tabular data.
 */
export async function parseFileContent(
  buffer: Buffer | Uint8Array | string,
  extension: SupportedFileType,
  options?: ParserOptions
): Promise<ParsedTabularData> {
  const parser = parsers[extension];
  if (!parser) {
    throw new Error(`Unsupported file extension "${extension}". Allowed: csv, xlsx, json, txt.`);
  }

  return parser.parse(buffer, options);
}

export * from './types';
export * from './csv-parser';
export * from './xlsx-parser';
export * from './json-parser';
export * from './txt-parser';
