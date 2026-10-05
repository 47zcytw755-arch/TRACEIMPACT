import { DatasetAIContext, StructuredQueryIntent, QueryOperation, QueryMeasure, QueryFilter, QuerySort } from './ai-types';

/**
 * Parses a user question against dataset schema into a structured analytical query intent.
 * Employs deterministic semantic pattern matching as a primary reliable engine or fallback.
 */
export function parseQueryIntentDeterministically(
  question: string,
  context: DatasetAIContext
): StructuredQueryIntent {
  const q = question.toLowerCase().trim();
  const columns = context.columns;

  let operation: QueryOperation = 'sample';
  const dimensions: string[] = [];
  const measures: QueryMeasure[] = [];
  const filters: QueryFilter[] = [];
  const sort: QuerySort[] = [];
  let limit = 20;

  // 1. Identify Target Numeric & Categorical Columns mentioned in question
  const mentionedCols = columns.filter((col) => {
    const colLower = col.name.toLowerCase();
    return q.includes(colLower) || q.includes(colLower.replace(/_/g, ' '));
  });

  const numericCols = columns.filter(
    (c) => c.inferredType === 'integer' || c.inferredType === 'float'
  );
  const categoricalCols = columns.filter((c) => c.inferredType === 'string');
  const dateCols = columns.filter((c) => c.inferredType === 'date' || c.inferredType === 'datetime');

  // Primary measure and dimension candidates
  const targetNumeric =
    mentionedCols.find((c) => c.inferredType === 'integer' || c.inferredType === 'float') ||
    numericCols[0];
  const targetCategory =
    mentionedCols.find((c) => c.inferredType === 'string' && c.uniqueCount <= 50) ||
    categoricalCols.find((c) => c.uniqueCount <= 50);
  const targetDate =
    mentionedCols.find((c) => c.inferredType === 'date' || c.inferredType === 'datetime') ||
    dateCols[0];

  // 2. Pattern Matching for Operations
  if (
    /(how many|total count|count of|number of (records|rows|items|orders|transactions|users))/i.test(q)
  ) {
    operation = 'count';
    if (/(by|per|across|group by)\s+([a-z0-9_]+)/i.test(q) && targetCategory) {
      operation = 'group_by';
      dimensions.push(targetCategory.name);
      measures.push({ field: '*', aggregation: 'count', alias: 'total_count' });
      sort.push({ column: 'total_count', direction: 'DESC' });
    } else {
      measures.push({ field: '*', aggregation: 'count', alias: 'total_count' });
    }
  } else if (/(average|mean|avg)\s+/i.test(q)) {
    operation = 'average';
    if (targetNumeric) {
      measures.push({ field: targetNumeric.name, aggregation: 'avg', alias: `avg_${targetNumeric.name}` });
      if (/(by|per|across|group by)/i.test(q) && targetCategory) {
        operation = 'group_by';
        dimensions.push(targetCategory.name);
        sort.push({ column: `avg_${targetNumeric.name}`, direction: 'DESC' });
      }
    }
  } else if (/(sum of|total\s+(revenue|sales|amount|price|cost|quantity|volume)|sum)\s+/i.test(q)) {
    operation = 'sum';
    if (targetNumeric) {
      measures.push({ field: targetNumeric.name, aggregation: 'sum', alias: `total_${targetNumeric.name}` });
      if (/(by|per|across|group by)/i.test(q) && targetCategory) {
        operation = 'group_by';
        dimensions.push(targetCategory.name);
        sort.push({ column: `total_${targetNumeric.name}`, direction: 'DESC' });
      }
    }
  } else if (/(highest|max|maximum|most expensive|top revenue|peak)\s+/i.test(q)) {
    operation = 'maximum';
    if (targetNumeric) {
      if (targetCategory && /(by|per|which|what)\s+/i.test(q)) {
        operation = 'group_by';
        dimensions.push(targetCategory.name);
        measures.push({ field: targetNumeric.name, aggregation: 'sum', alias: `total_${targetNumeric.name}` });
        sort.push({ column: `total_${targetNumeric.name}`, direction: 'DESC' });
        limit = 5;
      } else {
        measures.push({ field: targetNumeric.name, aggregation: 'max', alias: `max_${targetNumeric.name}` });
      }
    }
  } else if (/(lowest|min|minimum|least|cheapest|bottom)\s+/i.test(q)) {
    operation = 'minimum';
    if (targetNumeric) {
      if (targetCategory && /(by|per|which|what)\s+/i.test(q)) {
        operation = 'group_by';
        dimensions.push(targetCategory.name);
        measures.push({ field: targetNumeric.name, aggregation: 'sum', alias: `total_${targetNumeric.name}` });
        sort.push({ column: `total_${targetNumeric.name}`, direction: 'ASC' });
        limit = 5;
      } else {
        measures.push({ field: targetNumeric.name, aggregation: 'min', alias: `min_${targetNumeric.name}` });
      }
    }
  } else if (/(top|first|best)\s+(\d+)/i.test(q)) {
    const match = q.match(/(?:top|first|best)\s+(\d+)/i);
    if (match) limit = parseInt(match[1], 10);
    operation = 'top_n';
    if (targetCategory && targetNumeric) {
      dimensions.push(targetCategory.name);
      measures.push({ field: targetNumeric.name, aggregation: 'sum', alias: `total_${targetNumeric.name}` });
      sort.push({ column: `total_${targetNumeric.name}`, direction: 'DESC' });
    } else if (targetNumeric) {
      sort.push({ column: targetNumeric.name, direction: 'DESC' });
    }
  } else if (/(trend|over time|monthly|daily|by date|timeline)/i.test(q) && targetDate) {
    operation = 'group_by';
    dimensions.push(targetDate.name);
    if (targetNumeric) {
      measures.push({ field: targetNumeric.name, aggregation: 'sum', alias: `total_${targetNumeric.name}` });
    } else {
      measures.push({ field: '*', aggregation: 'count', alias: 'record_count' });
    }
    sort.push({ column: targetDate.name, direction: 'ASC' });
  } else if (targetCategory && /(by|per|across|breakdown by)\s+/i.test(q)) {
    operation = 'group_by';
    dimensions.push(targetCategory.name);
    if (targetNumeric) {
      measures.push({ field: targetNumeric.name, aggregation: 'sum', alias: `total_${targetNumeric.name}` });
      sort.push({ column: `total_${targetNumeric.name}`, direction: 'DESC' });
    } else {
      measures.push({ field: '*', aggregation: 'count', alias: 'count' });
      sort.push({ column: 'count', direction: 'DESC' });
    }
  } else {
    // Default fallback: Sample overview
    operation = 'sample';
    limit = 10;
  }

  // 3. Simple Filters Extraction (e.g. "where status is delivered", "for electronics", etc.)
  for (const catCol of categoricalCols) {
    for (const sample of catCol.sampleValues || []) {
      if (sample && sample.length > 2 && q.includes(sample.toLowerCase())) {
        filters.push({
          column: catCol.name,
          operator: '=',
          value: sample,
        });
        break;
      }
    }
  }

  return {
    datasetId: context.datasetId,
    targetTable: 'dataset',
    operation,
    dimensions,
    measures,
    filters,
    sort,
    limit: Math.min(Math.max(limit, 1), 100), // Enforce upper limit of 100
    rawQuestion: question,
    confidence: measures.length > 0 || dimensions.length > 0 ? 0.95 : 0.75,
    explanation: `Extracted ${operation} intent on [${measures.map((m) => m.field).join(', ') || 'records'}]${
      dimensions.length ? ` grouped by [${dimensions.join(', ')}]` : ''
    }.`,
  };
}

/**
 * Validates a StructuredQueryIntent against the dataset context schema.
 */
export function validateStructuredIntent(
  intent: StructuredQueryIntent,
  context: DatasetAIContext
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validColNames = new Set(context.columns.map((c) => c.name));

  for (const dim of intent.dimensions) {
    if (!validColNames.has(dim)) {
      errors.push(`Unknown dimension column "${dim}" does not exist in dataset schema.`);
    }
  }

  for (const measure of intent.measures) {
    if (measure.field !== '*' && !validColNames.has(measure.field)) {
      errors.push(`Unknown measure column "${measure.field}" does not exist in dataset schema.`);
    }
  }

  for (const filter of intent.filters) {
    if (!validColNames.has(filter.column)) {
      errors.push(`Unknown filter column "${filter.column}" does not exist in dataset schema.`);
    }
  }

  for (const s of intent.sort) {
    const isAlias = intent.measures.some((m) => m.alias === s.column);
    if (!validColNames.has(s.column) && !isAlias) {
      errors.push(`Unknown sort column or alias "${s.column}".`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
