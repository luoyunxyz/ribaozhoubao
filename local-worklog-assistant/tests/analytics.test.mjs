import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAppUsage, calculateHeatMap, generateReportContent } from '../src/analytics.mjs';

const records = [
  {
    startTime: '2026-05-28T01:00:00.000Z',
    endTime: '2026-05-28T02:00:00.000Z',
    appName: 'Code',
    category: '开发',
    summary: '写代码'
  },
  {
    startTime: '2026-05-28T03:00:00.000Z',
    endTime: '2026-05-28T03:30:00.000Z',
    appName: 'Chrome',
    category: '资料/浏览',
    summary: '查资料'
  },
  {
    startTime: '2026-05-28T04:00:00.000Z',
    endTime: '2026-05-28T04:10:00.000Z',
    appName: 'Code',
    category: '开发',
    summary: '调试'
  }
];

test('calculateAppUsage aggregates and sorts by duration', () => {
  const usage = calculateAppUsage(records);
  assert.equal(usage[0].appName, 'Code');
  assert.equal(usage[0].totalDurationSec, 4200);
});

test('calculateHeatMap creates 24 hourly buckets', () => {
  const heat = calculateHeatMap(records, new Date('2026-05-28T00:00:00.000Z'), new Date('2026-05-28T23:59:59.999Z'));
  assert.equal(heat[0].hourlyCounts.length, 24);
  assert.equal(heat[0].totalRecords, 3);
  assert.equal(heat[0].topCategory, '开发');
});

test('generateReportContent returns markdown report', () => {
  const appUsage = calculateAppUsage(records);
  const heatMap = calculateHeatMap(records, new Date('2026-05-28T00:00:00.000Z'), new Date('2026-05-28T23:59:59.999Z'));
  const content = generateReportContent({ startDate: '2026-05-28', endDate: '2026-05-28', records, appUsage, heatMap });
  assert.match(content, /# 2026-05-28 日报/);
  assert.match(content, /应用使用排行/);
});
