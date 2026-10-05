/**
 * Comprehensive Day 2 Test Suite for TraceImpact Cloud
 * Tests all ingestion, parsing, schema inference, profiling, quality scoring, and security logic.
 */

import { parseFileContent } from '../lib/parsers';
import { inferColumnType, inferValueType } from '../lib/profiling/schema-inference';
import { profileTabularData } from '../lib/profiling/profiler';
import { calculateQualityScore } from '../lib/quality/quality-scorer';
import { generateStorageKey, sanitizeFilename } from '../lib/storage/key-generator';
import { datasetRepository } from '../lib/db/dataset-repository';
import { ingestDatasetFile } from '../lib/ingestion/ingestion-service';
import * as XLSX from 'xlsx';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ ${testName}${detail ? `: ${detail}` : ''}`);
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('TRACEIMPACT CLOUD — DAY 2 VERIFICATION TEST SUITE');
  console.log('==================================================\n');

  // 1. FILE PARSING TESTS
  console.log('--- 1. File Parsing Tests ---');

  // CSV
  const sampleCsv = `id,name,age,salary,is_active,created_at\n1,Alice,29,75000.50,true,2024-01-15\n2,Bob,34,82000.00,false,2024-02-20\n3,Charlie,42,95000.00,true,2024-03-10`;
  const csvParsed = await parseFileContent(sampleCsv, 'csv');
  assert(csvParsed.totalRows === 3, 'CSV Parser: Correct row count');
  assert(csvParsed.headers.length === 6, 'CSV Parser: Correct column count');
  assert(csvParsed.rows[0].name === 'Alice', 'CSV Parser: Correct row value extraction');

  // JSON Array
  const sampleJson = JSON.stringify([
    { product_id: 'P101', category: 'Electronics', price: 299.99, stock: 15 },
    { product_id: 'P102', category: 'Appliances', price: 499.50, stock: 8 },
  ]);
  const jsonParsed = await parseFileContent(sampleJson, 'json');
  assert(jsonParsed.totalRows === 2, 'JSON Parser: Correct row count');
  assert(jsonParsed.headers.includes('product_id'), 'JSON Parser: Correct headers inferred');

  // TXT Delimited (Tab and Pipe)
  const sampleTabTxt = `department\theadcount\tbudget\nEngineering\t45\t1200000\nMarketing\t20\t500000`;
  const txtParsed = await parseFileContent(sampleTabTxt, 'txt');
  assert(txtParsed.totalRows === 2, 'TXT Parser: Tab delimiter detection');
  assert(txtParsed.headers[0] === 'department', 'TXT Parser: Header extraction');

  const samplePipeTxt = `country|code|population\nUSA|US|330000000\nGermany|DE|83000000`;
  const pipeParsed = await parseFileContent(samplePipeTxt, 'txt');
  assert(pipeParsed.totalRows === 2, 'TXT Parser: Pipe delimiter detection');

  // XLSX
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([
    { order_id: 1001, customer: 'John Doe', amount: 150.75 },
    { order_id: 1002, customer: 'Jane Smith', amount: 240.00 },
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Sales');
  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const xlsxParsed = await parseFileContent(xlsxBuffer, 'xlsx');
  assert(xlsxParsed.totalRows === 2, 'XLSX Parser: Workbook parsing');
  assert(xlsxParsed.headers.includes('order_id'), 'XLSX Parser: Header detection');

  // 2. SCHEMA INFERENCE TESTS
  console.log('\n--- 2. Schema Inference Tests ---');
  assert(inferValueType(42).detectedType === 'integer', 'Inference: Integer number');
  assert(inferValueType('12345').detectedType === 'integer', 'Inference: Integer string');
  assert(inferValueType('99.95').detectedType === 'float', 'Inference: Float string');
  assert(inferValueType('$1,250.50').detectedType === 'float', 'Inference: Formatted currency float');
  assert(inferValueType('true').detectedType === 'boolean', 'Inference: Boolean string');
  assert(inferValueType('2024-05-12').detectedType === 'date', 'Inference: Date string');
  assert(inferValueType('2024-05-12T14:30:00Z').detectedType === 'datetime', 'Inference: Datetime string');
  assert(inferValueType('N/A').detectedType === 'null', 'Inference: Null literal "N/A"');
  assert(inferValueType('   ').detectedType === 'null', 'Inference: Whitespace null');

  const colInference = inferColumnType(['10', '20', '30', 'invalid_string']);
  assert(colInference.inferredType === 'integer', 'Inference: Dominant integer with string anomaly');
  assert(colInference.typeBreakdown.string === 1, 'Inference: Records string anomaly in breakdown');

  // 3. PROFILING & DATA QUALITY TESTS
  console.log('\n--- 3. Profiling & Data Quality Engine Tests ---');
  const messyData = [
    { id: '1', status: 'Active', age: '25', score: '90' },
    { id: '2', status: 'active', age: '30', score: '85' },
    { id: '3', status: 'ACTIVE', age: 'N/A', score: '88' }, // Null spike & casing variation
    { id: '3', status: 'Active', age: '40', score: '92' }, // Duplicate ID & casing variation
  ];

  const headers = ['id', 'status', 'age', 'score'];
  const profileResult = await profileTabularData(headers, messyData);

  assert(profileResult.rowCount === 4, 'Profiler: Row count correct');
  assert(profileResult.columnCount === 4, 'Profiler: Column count correct');
  assert(profileResult.columns.find((c) => c.name === 'age')?.nullCount === 1, 'Profiler: Missing value detected in column "age"');

  const issues = profileResult.qualityIssues;
  assert(issues.some((i) => i.issueType === 'inconsistent_casing'), 'DQ Engine: Detects inconsistent categorical casing');
  assert(issues.some((i) => i.issueType === 'identifier_duplicate'), 'DQ Engine: Detects duplicate identifier keys');

  // Score Calculation
  const scoreResult = calculateQualityScore({
    rowCount: profileResult.rowCount,
    columnCount: profileResult.columnCount,
    totalMissingCells: profileResult.totalMissingCells,
    duplicateRowCount: profileResult.duplicateRowCount,
    qualityIssues: profileResult.qualityIssues,
  });

  assert(scoreResult.qualityScore >= 0 && scoreResult.qualityScore <= 100, 'Quality Scorer: Score within [0, 100]');
  assert(scoreResult.scoreBreakdown.baseScore === 100, 'Quality Scorer: Base score 100');
  assert(scoreResult.scoreBreakdown.consistencyPenalty > 0, 'Quality Scorer: Applied consistency penalty');

  // 4. STORAGE & SECURITY TESTS
  console.log('\n--- 4. Storage & Security Tests ---');
  const sanitized = sanitizeFilename('../../etc/passwd.csv');
  assert(!sanitized.includes('..') && !sanitized.includes('/'), 'Security: Filename path traversal removed');

  const storageKey = generateStorageKey({
    workspaceId: 'ws_tenant_1',
    datasetId: 'ds_99',
    filename: 'sales_2024.csv',
  });
  assert(storageKey.startsWith('workspaces/ws_tenant_1/datasets/ds_99/raw/'), 'Security: Storage key adheres to tenant boundary');

  // Multi-tenant Isolation in Repository
  const record1 = {
    id: 'ds_test_1',
    workspaceId: 'workspace_a',
    name: 'Workspace A Data',
    status: 'ready' as const,
    rowCount: 10,
    columnCount: 2,
    qualityScore: 95,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    file: {
      id: 'f1',
      originalName: 'test.csv',
      extension: 'csv' as const,
      sizeBytes: 100,
      mimeType: 'text/csv',
      storageKey: 'key_1',
    },
  };

  await datasetRepository.createDataset(record1);
  const fetchedInTenant = await datasetRepository.getDatasetById('ds_test_1', 'workspace_a');
  const fetchedCrossTenant = await datasetRepository.getDatasetById('ds_test_1', 'workspace_b');

  assert(fetchedInTenant !== null, 'Security: Accessible in own workspace');
  assert(fetchedCrossTenant === null, 'Security: Cross-workspace access blocked (Tenant Isolation)');

  // 5. END-TO-END INGESTION PIPELINE
  console.log('\n--- 5. End-to-End Ingestion Service Test ---');
  const e2eCsv = `sku,title,category,price,in_stock\nA001,Laptop,Computers,999.99,true\nA002,Mouse,Accessories,29.99,true\nA003,Monitor,Displays,199.50,false`;
  const e2eResult = await ingestDatasetFile({
    workspaceId: 'default-workspace',
    datasetName: 'E2E Inventory',
    originalFilename: 'inventory.csv',
    extension: 'csv',
    mimeType: 'text/csv',
    fileBuffer: Buffer.from(e2eCsv),
  });

  assert(e2eResult.success === true, 'E2E Ingestion: Ingestion completes with success: true');
  assert(e2eResult.status === 'ready', 'E2E Ingestion: Dataset status is "ready"');
  assert(e2eResult.dataset?.rowCount === 3, 'E2E Ingestion: Record row count matches');
  assert(e2eResult.dataset?.columnCount === 5, 'E2E Ingestion: Record column count matches');
  assert(e2eResult.dataset?.qualityScore !== null && e2eResult.dataset!.qualityScore! > 90, 'E2E Ingestion: High quality score for clean dataset');

  // Summary
  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
