import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { WorklogDatabase } from '../src/db.mjs';
import { createAppServer } from '../src/server.mjs';

async function withServer(fn) {
  const db = new WorklogDatabase(join(tmpdir(), `worklog-${randomUUID()}.sqlite`));
  db.insertActivity({
    startTime: '2026-05-28T01:00:00.000Z',
    endTime: '2026-05-28T02:00:00.000Z',
    appName: 'Code',
    windowTitle: 'test',
    category: '开发',
    summary: '写代码'
  });
  const server = createAppServer({ database: db, collector: { timer: null, lastSample: null }, port: 0 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('GET / returns markdown docs', async () => {
  await withServer(async (base) => {
    const text = await fetch(`${base}/`).then((res) => res.text());
    assert.match(text, /本地工作记录助手 API 文档/);
  });
});

test('GET /api/app-usage returns sorted usage', async () => {
  await withServer(async (base) => {
    const json = await fetch(`${base}/api/app-usage?startDate=2026-05-28&endDate=2026-05-28`).then((res) => res.json());
    assert.equal(json.code, 0);
    assert.equal(json.data[0].appName, 'Code');
  });
});

test('POST /api/report/generate creates report', async () => {
  await withServer(async (base) => {
    const json = await fetch(`${base}/api/report/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: '2026-05-28', endDate: '2026-05-28' })
    }).then((res) => res.json());
    assert.equal(json.code, 0);
    assert.match(json.data.content, /日报/);
  });
});
