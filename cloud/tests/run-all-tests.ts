/**
 * Master Test Runner for TraceImpact Cloud
 * Runs all Day 2, Day 3, and Day 4 verification test suites.
 */

import { runDay3Tests } from './day3-test-suite';
import { runDay4Tests } from './day4-test-suite';
import { runDay5Tests } from './day5-test-suite';
import { runDay6Tests } from './day6-test-suite';
import { runDay7Tests } from './day7-test-suite';
import { runDay8Tests } from './day8-test-suite';
import { runUploadLargeFilesTests } from './upload-large-files-test-suite';

async function runMasterSuite() {
  console.log('====================================================');
  console.log('TRACEIMPACT CLOUD — FULL PLATFORM VERIFICATION SUITE');
  console.log('====================================================');

  // 1. Run Day 2 Ingestion & Profiling Suite
  const { execSync } = await import('child_process');
  console.log('\nRunning Day 2 Ingestion & Profiling Test Suite...');
  execSync('npx tsx tests/day2-test-suite.ts', { stdio: 'inherit' });

  // 2. Run Day 3 Dashboard Intelligence Suite
  console.log('\nRunning Day 3 Dashboard Intelligence Test Suite...');
  await runDay3Tests();

  // 3. Run Day 4 AI Chat & Controlled SQL Suite
  console.log('\nRunning Day 4 Controlled AI & Safe SQL Test Suite...');
  await runDay4Tests();

  // 4. Run Day 5 Auth, Workspaces, RBAC & Audit Suite
  console.log('\nRunning Day 5 Auth, Workspaces, RBAC & Audit Test Suite...');
  await runDay5Tests();

  // 5. Run Day 6 Production Hardening & Persistence Suite
  console.log('\nRunning Day 6 Production Hardening & Persistence Test Suite...');
  await runDay6Tests();

  // 6. Run Day 7 Production Integration & E2E Suite
  console.log('\nRunning Day 7 Production Integration & E2E Test Suite...');
  await runDay7Tests();

  // 7. Run Day 8 Final QA & Security Audit Suite
  console.log('\nRunning Day 8 Final QA & Security Audit Test Suite...');
  await runDay8Tests();

  // 8. Run Multi-File & Large-File Streaming Upload Suite
  console.log('\nRunning Multi-File & Large-File Streaming Upload Test Suite...');
  await runUploadLargeFilesTests();

  console.log('====================================================');
  console.log('ALL VERIFICATION TEST SUITES PASSED!');
  console.log('====================================================\n');
}

runMasterSuite().catch((err) => {
  console.error('Master test suite failed:', err);
  process.exit(1);
});
