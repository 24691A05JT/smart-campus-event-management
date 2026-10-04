const assert = require('assert');
const { parseTimeToMinutes, isTimeBefore, doTimesOverlap } = require('../src/utils/timeUtils');

let testsPassed = 0;
let testsFailed = 0;

function runTest(testName, testFn) {
  try {
    testFn();
    console.log(`  ✅ [PASS] ${testName}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}: ${err.message}`);
    testsFailed++;
  }
}

function runAllEventUnitTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING EVENT TIME UTILITY & CONFLICT UNIT TESTS');
  console.log('==================================================\n');

  // Test 1: parseTimeToMinutes for 12-hour AM/PM formats
  runTest('parseTimeToMinutes - 10:00 AM converts to 600 minutes', () => {
    assert.strictEqual(parseTimeToMinutes('10:00 AM'), 600);
  });

  runTest('parseTimeToMinutes - 01:30 PM converts to 810 minutes', () => {
    assert.strictEqual(parseTimeToMinutes('01:30 PM'), 810);
  });

  runTest('parseTimeToMinutes - 12:00 PM (noon) converts to 720 minutes', () => {
    assert.strictEqual(parseTimeToMinutes('12:00 PM'), 720);
  });

  runTest('parseTimeToMinutes - 12:30 AM (midnight) converts to 30 minutes', () => {
    assert.strictEqual(parseTimeToMinutes('12:30 AM'), 30);
  });

  // Test 2: parseTimeToMinutes for 24-hour formats
  runTest('parseTimeToMinutes - 14:30 (24-hour) converts to 870 minutes', () => {
    assert.strictEqual(parseTimeToMinutes('14:30'), 870);
  });

  // Test 3: isTimeBefore validation
  runTest('isTimeBefore - 09:00 AM is before 11:00 AM', () => {
    assert.strictEqual(isTimeBefore('09:00 AM', '11:00 AM'), true);
  });

  runTest('isTimeBefore - 02:00 PM is NOT before 10:00 AM', () => {
    assert.strictEqual(isTimeBefore('02:00 PM', '10:00 AM'), false);
  });

  runTest('isTimeBefore - 10:00 AM is NOT before 10:00 AM (same time)', () => {
    assert.strictEqual(isTimeBefore('10:00 AM', '10:00 AM'), false);
  });

  // Test 4: doTimesOverlap checks
  runTest('doTimesOverlap - Overlapping intervals (10:00-12:00 and 11:00-13:00)', () => {
    assert.strictEqual(doTimesOverlap('10:00 AM', '12:00 PM', '11:00 AM', '01:00 PM'), true);
  });

  runTest('doTimesOverlap - Non-overlapping contiguous intervals (10:00-12:00 and 12:00-14:00)', () => {
    assert.strictEqual(doTimesOverlap('10:00 AM', '12:00 PM', '12:00 PM', '02:00 PM'), false);
  });

  runTest('doTimesOverlap - Non-overlapping separate intervals (09:00-10:00 and 14:00-16:00)', () => {
    assert.strictEqual(doTimesOverlap('09:00 AM', '10:00 AM', '02:00 PM', '04:00 PM'), false);
  });

  runTest('doTimesOverlap - Completely enclosed interval (10:00-16:00 and 11:00-12:00)', () => {
    assert.strictEqual(doTimesOverlap('10:00 AM', '04:00 PM', '11:00 AM', '12:00 PM'), true);
  });

  console.log('\n==================================================');
  console.log(`📊 EVENT UNIT TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('==================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllEventUnitTests();
