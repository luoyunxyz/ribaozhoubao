import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { getDateRange, toDateOnly } from './dates.mjs';
import { calculateAppUsage, calculateHeatMap, generateReportContent } from './analytics.mjs';
import { apiMarkdown } from './api-doc.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = normalize(join(__dirname, '..', 'public'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

export function createAppServer({ database, collector, port = 8088 }) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://127.0.0.1:${port}`);
      if (request.method === 'GET' && url.pathname === '/') {
        return sendText(response, apiMarkdown(port), 'text/markdown; charset=utf-8');
      }
      if (url.pathname === '/app' || url.pathname.startsWith('/assets/')) {
        return serveStatic(url.pathname, response);
      }
      if (url.pathname.startsWith('/api/')) {
        return await handleApi({ request, response, url, database, collector });
      }
      return notFound(response);
    } catch (error) {
      return sendJson(response, { code: 500, message: error.message, data: null }, 500);
    }
  });
}

async function handleApi({ request, response, url, database, collector }) {
  if (request.method === 'GET' && url.pathname === '/api/status') {
    return sendJson(response, ok({
      dbPath: database.dbPath,
      collectorRunning: Boolean(collector?.timer),
      lastSample: collector?.lastSample || null
    }));
  }

  if (request.method === 'GET' && url.pathname === '/api/timeline') {
    collector?.flushCurrent?.();
    const range = getDateRange(Object.fromEntries(url.searchParams), 'today');
    return sendJson(response, ok(database.listActivities(range.start, range.end)));
  }

  if (request.method === 'PATCH' && url.pathname.startsWith('/api/timeline/')) {
    const id = decodeURIComponent(url.pathname.replace('/api/timeline/', ''));
    const patch = await readJsonBody(request);
    const updated = database.updateActivity(id, patch);
    return updated ? sendJson(response, ok(updated)) : sendJson(response, { code: 404, message: 'record not found', data: null }, 404);
  }

  if (request.method === 'GET' && url.pathname === '/api/app-usage') {
    collector?.flushCurrent?.();
    const range = getDateRange(Object.fromEntries(url.searchParams), 'today');
    return sendJson(response, ok(calculateAppUsage(database.listActivities(range.start, range.end))));
  }

  if (request.method === 'GET' && url.pathname === '/api/heat-map') {
    collector?.flushCurrent?.();
    const range = getDateRange(Object.fromEntries(url.searchParams), 'last7days');
    const records = database.listActivities(range.start, range.end);
    return sendJson(response, ok(calculateHeatMap(records, range.start, range.end)));
  }

  if (request.method === 'GET' && url.pathname === '/api/report') {
    const range = getDateRange(Object.fromEntries(url.searchParams), 'today');
    return sendJson(response, ok(database.listReports(range.startDate, range.endDate)));
  }

  if (request.method === 'POST' && url.pathname === '/api/report/generate') {
    collector?.flushCurrent?.();
    const body = await readJsonBody(request);
    const range = getDateRange(body, 'today');
    const records = database.listActivities(range.start, range.end).reverse();
    const appUsage = calculateAppUsage(records);
    const heatMap = calculateHeatMap(records, range.start, range.end);
    const type = body.type || 'daily';
    const report = database.insertReport({
      type,
      title: `${range.startDate} ${type === 'weekly' ? '周报' : type === 'monthly' ? '月报' : '日报'}`,
      content: generateReportContent({ type, startDate: range.startDate, endDate: range.endDate, records, appUsage, heatMap }),
      startDate: range.startDate,
      endDate: range.endDate
    });
    return sendJson(response, ok(report));
  }

  return notFound(response);
}

async function serveStatic(pathname, response) {
  const relative = pathname === '/app' ? 'index.html' : pathname.replace('/assets/', '');
  const filePath = normalize(join(publicDir, relative));
  if (!filePath.startsWith(publicDir)) return notFound(response);
  const content = await readFile(filePath);
  response.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
  response.end(content);
}

function ok(data) {
  return { code: 0, message: 'success', data };
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function sendText(response, text, contentType) {
  response.writeHead(200, { 'Content-Type': contentType });
  response.end(text);
}

function notFound(response) {
  return sendJson(response, { code: 404, message: 'not found', data: null }, 404);
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
