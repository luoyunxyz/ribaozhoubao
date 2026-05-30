import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { classifyActivity, buildSummary } from './classifier.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(__dirname, 'window-info-win32.ps1');

export function getForegroundWindowInfo() {
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], { timeout: 5000 }, (error, stdout) => {
      if (error) {
        resolve({ appName: 'unknown', windowTitle: '', error: error.message });
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve({ appName: 'unknown', windowTitle: stdout.trim() });
      }
    });
  });
}

export class ActivityCollector {
  constructor(database, intervalMs = 30000) {
    this.database = database;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.currentRecordId = null;
    this.currentSignature = null;
    this.lastSample = null;
  }

  start() {
    if (this.timer) return;
    this.sample();
    this.timer = setInterval(() => this.sample(), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  flushCurrent(endTime = new Date().toISOString()) {
    if (!this.currentRecordId || !this.lastSample) return;
    this.database.updateActivityEnd(
      this.currentRecordId,
      endTime,
      buildSummary({ ...this.lastSample, category: this.lastSample.category })
    );
  }

  async sample() {
    const info = await getForegroundWindowInfo();
    const now = new Date().toISOString();
    const category = classifyActivity(info);
    const signature = `${info.appName || ''}|${info.windowTitle || ''}|${category}`;
    this.lastSample = { ...info, category, sampledAt: now };

    if (this.currentRecordId && signature === this.currentSignature) {
      this.database.updateActivityEnd(this.currentRecordId, now, buildSummary({ ...info, category }));
      return;
    }

    const record = this.database.insertActivity({
      startTime: now,
      endTime: now,
      appName: info.appName || 'unknown',
      windowTitle: info.windowTitle || '',
      category,
      summary: buildSummary({ ...info, category }),
      details: { processId: info.processId || null },
      confidence: 0.8,
      source: 'foreground-window'
    });
    this.currentRecordId = record.id;
    this.currentSignature = signature;
  }
}
