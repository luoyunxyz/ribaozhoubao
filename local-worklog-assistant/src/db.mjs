import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export function defaultDbPath() {
  return process.env.WORKLOG_DB || join(homedir(), '.local-worklog-assistant', 'worklog.sqlite');
}

export class WorklogDatabase {
  constructor(dbPath = defaultDbPath()) {
    this.dbPath = dbPath;
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.migrate();
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS activity_records (
        id TEXT PRIMARY KEY,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        app_name TEXT NOT NULL,
        window_title TEXT NOT NULL,
        category TEXT NOT NULL,
        summary TEXT NOT NULL,
        details_json TEXT,
        confidence REAL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        style TEXT NOT NULL,
        status TEXT NOT NULL,
        language TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  upsertSetting(key, value) {
    this.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, JSON.stringify(value));
  }

  getSetting(key, fallback = null) {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? JSON.parse(row.value) : fallback;
  }

  insertActivity(record) {
    const now = new Date().toISOString();
    const payload = {
      id: record.id || randomUUID(),
      start_time: record.startTime,
      end_time: record.endTime,
      app_name: record.appName || '',
      window_title: record.windowTitle || '',
      category: record.category || '其他',
      summary: record.summary || '',
      details_json: JSON.stringify(record.details || null),
      confidence: record.confidence ?? 0.8,
      source: record.source || 'foreground-window',
      created_at: record.createdAt || now,
      updated_at: record.updatedAt || now
    };
    this.db.prepare(`
      INSERT INTO activity_records
      (id, start_time, end_time, app_name, window_title, category, summary, details_json, confidence, source, created_at, updated_at)
      VALUES (@id, @start_time, @end_time, @app_name, @window_title, @category, @summary, @details_json, @confidence, @source, @created_at, @updated_at)
    `).run(payload);
    return this.mapActivityRow(payload);
  }

  updateActivityEnd(id, endTime, summary = null) {
    const updatedAt = new Date().toISOString();
    this.db.prepare('UPDATE activity_records SET end_time = ?, summary = COALESCE(?, summary), updated_at = ? WHERE id = ?')
      .run(endTime, summary, updatedAt, id);
  }

  updateActivity(id, patch = {}) {
    const existing = this.db.prepare('SELECT * FROM activity_records WHERE id = ?').get(id);
    if (!existing) return null;
    const next = {
      category: patch.category ?? existing.category,
      summary: patch.summary ?? existing.summary,
      updated_at: new Date().toISOString(),
      id
    };
    this.db.prepare('UPDATE activity_records SET category = @category, summary = @summary, updated_at = @updated_at WHERE id = @id').run(next);
    return this.getActivity(id);
  }

  getActivity(id) {
    const row = this.db.prepare('SELECT * FROM activity_records WHERE id = ?').get(id);
    return row ? this.mapActivityRow(row) : null;
  }

  listActivities(start, end) {
    const rows = this.db.prepare(`
      SELECT * FROM activity_records
      WHERE start_time <= ? AND end_time >= ?
      ORDER BY start_time DESC
    `).all(end.toISOString(), start.toISOString());
    return rows.map((row) => this.mapActivityRow(row));
  }

  insertReport(report) {
    const now = new Date().toISOString();
    const payload = {
      id: report.id || randomUUID(),
      type: report.type || 'daily',
      title: report.title,
      content: report.content,
      start_date: report.startDate,
      end_date: report.endDate,
      style: report.style || 'standard',
      status: report.status || 'completed',
      language: report.language || 'zh-CN',
      created_at: now,
      updated_at: now
    };
    this.db.prepare(`
      INSERT INTO reports
      (id, type, title, content, start_date, end_date, style, status, language, created_at, updated_at)
      VALUES (@id, @type, @title, @content, @start_date, @end_date, @style, @status, @language, @created_at, @updated_at)
    `).run(payload);
    return this.mapReportRow(payload);
  }

  listReports(startDate, endDate) {
    const rows = this.db.prepare(`
      SELECT * FROM reports
      WHERE start_date <= ? AND end_date >= ?
      ORDER BY created_at DESC
    `).all(endDate, startDate);
    return rows.map((row) => this.mapReportRow(row));
  }

  mapActivityRow(row) {
    return {
      id: row.id,
      startTime: row.start_time,
      endTime: row.end_time,
      appName: row.app_name,
      windowTitle: row.window_title,
      category: row.category,
      summary: row.summary,
      details: row.details_json ? JSON.parse(row.details_json) : null,
      confidence: row.confidence,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapReportRow(row) {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      startDate: row.start_date,
      endDate: row.end_date,
      style: row.style,
      status: row.status,
      language: row.language,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
