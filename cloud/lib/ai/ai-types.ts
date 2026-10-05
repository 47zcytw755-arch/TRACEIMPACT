import { ColumnProfile, SupportedFileType } from '@/types';
import type { EChartsOption } from 'echarts';

export type QueryOperation =
  | 'count'
  | 'sum'
  | 'average'
  | 'minimum'
  | 'maximum'
  | 'group_by'
  | 'filter'
  | 'sort'
  | 'top_n'
  | 'sample';

export type FilterOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'contains' | 'in' | 'is_null' | 'is_not_null';

export interface QueryFilter {
  column: string;
  operator: FilterOperator;
  value: string | number | boolean | (string | number)[];
}

export interface QueryMeasure {
  field: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  alias?: string;
}

export interface QuerySort {
  column: string;
  direction: 'ASC' | 'DESC';
}

export interface StructuredQueryIntent {
  datasetId: string;
  operation: QueryOperation;
  targetTable: string;
  dimensions: string[];
  measures: QueryMeasure[];
  filters: QueryFilter[];
  sort: QuerySort[];
  limit: number;
  rawQuestion: string;
  confidence: number;
  explanation: string;
}

export interface DatasetAIContext {
  datasetId: string;
  workspaceId: string;
  name: string;
  rowCount: number;
  columnCount: number;
  format: SupportedFileType;
  columns: ColumnProfile[];
  sampleRows: Record<string, unknown>[];
  qualityScore: number;
}

export interface GeneratedSQLQuery {
  sql: string;
  parameters: (string | number | boolean)[];
  tableName: string;
  selectedColumns: string[];
  isAggregated: boolean;
}

export interface SQLValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedSql?: string;
  allowedClauses: string[];
}

export interface QueryExecutionResult {
  queryId: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  truncated: boolean;
  sqlExecuted: string;
  parametersUsed: (string | number | boolean)[];
}

export interface ChartVisualizationSuggestion {
  type: 'kpi' | 'bar' | 'line' | 'table';
  title: string;
  options?: EChartsOption;
  kpiValue?: string | number;
  kpiSubtitle?: string;
}

export interface AIChatResponse {
  answer: string;
  query: {
    intent: StructuredQueryIntent;
    sql: string;
    parameters: (string | number | boolean)[];
  };
  result: {
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
  };
  visualization?: ChartVisualizationSuggestion;
  metadata: {
    executionTimeMs: number;
    evidenceRowsCount: number;
    provider: string;
    model: string;
  };
}

export interface AIProvider {
  name: string;
  generateQueryIntent(question: string, context: DatasetAIContext): Promise<StructuredQueryIntent>;
  generateAnswer(
    question: string,
    intent: StructuredQueryIntent,
    result: QueryExecutionResult,
    context: DatasetAIContext
  ): Promise<string>;
}
