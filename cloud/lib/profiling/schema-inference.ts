import { ColumnInferredType } from '@/types';

export interface TypeInferenceSampleResult {
  detectedType: ColumnInferredType;
  normalizedValue: unknown;
  isNull: boolean;
}

/**
 * Checks if a value is considered empty / null in tabular data
 */
export function isNullOrEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return true;
    const lower = trimmed.toLowerCase();
    return (
      lower === 'null' ||
      lower === 'none' ||
      lower === 'n/a' ||
      lower === 'na' ||
      lower === 'nan' ||
      lower === '-' ||
      lower === '.'
    );
  }
  return false;
}

/**
 * Infer single value type
 */
export function inferValueType(value: unknown): TypeInferenceSampleResult {
  if (isNullOrEmpty(value)) {
    return { detectedType: 'null', normalizedValue: null, isNull: true };
  }

  // Native Boolean
  if (typeof value === 'boolean') {
    return { detectedType: 'boolean', normalizedValue: value, isNull: false };
  }

  // Native Date
  if (value instanceof Date && !isNaN(value.getTime())) {
    const hasTime = value.getHours() !== 0 || value.getMinutes() !== 0 || value.getSeconds() !== 0;
    return {
      detectedType: hasTime ? 'datetime' : 'date',
      normalizedValue: value.toISOString(),
      isNull: false,
    };
  }

  // Native Number
  if (typeof value === 'number') {
    if (isNaN(value)) return { detectedType: 'null', normalizedValue: null, isNull: true };
    const isInt = Number.isInteger(value);
    return {
      detectedType: isInt ? 'integer' : 'float',
      normalizedValue: value,
      isNull: false,
    };
  }

  // String parsing & heuristics
  const strVal = String(value).trim();

  // Boolean string
  const lowerStr = strVal.toLowerCase();
  if (lowerStr === 'true' || lowerStr === 'false') {
    return {
      detectedType: 'boolean',
      normalizedValue: lowerStr === 'true',
      isNull: false,
    };
  }

  // Number / Float / Integer string (strip currency signs or standard commas e.g. "$1,234.50")
  const cleanNumericStr = strVal.replace(/^[$€£¥]/, '').replace(/,/g, '').trim();
  if (/^-?\d+$/.test(cleanNumericStr)) {
    const num = parseInt(cleanNumericStr, 10);
    if (!isNaN(num) && Math.abs(num) <= Number.MAX_SAFE_INTEGER) {
      return { detectedType: 'integer', normalizedValue: num, isNull: false };
    }
  }

  if (/^-?\d+\.\d+([eE][+-]?\d+)?$/.test(cleanNumericStr)) {
    const num = parseFloat(cleanNumericStr);
    if (!isNaN(num)) {
      return { detectedType: 'float', normalizedValue: num, isNull: false };
    }
  }

  // Date / Datetime pattern checking
  // ISO 8601 Datetime: YYYY-MM-DDTHH:mm:ss...
  if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/.test(strVal)) {
    const timestamp = Date.parse(strVal);
    if (!isNaN(timestamp)) {
      return { detectedType: 'datetime', normalizedValue: new Date(timestamp).toISOString(), isNull: false };
    }
  }

  // Standard Date: YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(strVal)) {
    const timestamp = Date.parse(strVal);
    if (!isNaN(timestamp)) {
      return { detectedType: 'date', normalizedValue: new Date(timestamp).toISOString().split('T')[0], isNull: false };
    }
  }

  // Common Date: MM/DD/YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(strVal)) {
    const timestamp = Date.parse(strVal);
    if (!isNaN(timestamp)) {
      return { detectedType: 'date', normalizedValue: strVal, isNull: false };
    }
  }

  return { detectedType: 'string', normalizedValue: strVal, isNull: false };
}

/**
 * Determine column dominant type from an array of raw values
 */
export function inferColumnType(values: unknown[]): {
  inferredType: ColumnInferredType;
  typeBreakdown: Record<ColumnInferredType, number>;
  nullCount: number;
  totalCount: number;
} {
  const typeBreakdown: Record<ColumnInferredType, number> = {
    string: 0,
    integer: 0,
    float: 0,
    boolean: 0,
    date: 0,
    datetime: 0,
    null: 0,
  };

  let nullCount = 0;

  values.forEach((v) => {
    const res = inferValueType(v);
    typeBreakdown[res.detectedType]++;
    if (res.isNull) nullCount++;
  });

  const totalCount = values.length;
  const nonNullCount = totalCount - nullCount;

  if (nonNullCount === 0) {
    return {
      inferredType: 'null',
      typeBreakdown,
      nullCount,
      totalCount,
    };
  }

  // If mostly numeric, check integer vs float (>=70% numeric)
  const numericCount = typeBreakdown.integer + typeBreakdown.float;
  if (numericCount / nonNullCount >= 0.7) {
    return {
      inferredType: typeBreakdown.float > 0 ? 'float' : 'integer',
      typeBreakdown,
      nullCount,
      totalCount,
    };
  }

  // Check boolean (>=70% boolean)
  if (typeBreakdown.boolean / nonNullCount >= 0.7) {
    return {
      inferredType: 'boolean',
      typeBreakdown,
      nullCount,
      totalCount,
    };
  }

  // Check datetime / date (>=70% date/datetime)
  const dateCount = typeBreakdown.date + typeBreakdown.datetime;
  if (dateCount / nonNullCount >= 0.7) {
    return {
      inferredType: typeBreakdown.datetime > 0 ? 'datetime' : 'date',
      typeBreakdown,
      nullCount,
      totalCount,
    };
  }

  // Fallback to string
  return {
    inferredType: 'string',
    typeBreakdown,
    nullCount,
    totalCount,
  };
}
