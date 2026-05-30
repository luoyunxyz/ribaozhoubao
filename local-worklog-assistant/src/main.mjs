import { spawn } from 'node:child_process';
import { WorklogDatabase, defaultDbPath } from './db.mjs';
import { ActivityCollector } from './collector.mjs';
import { createAppServer } from './server.mjs';

const port = Number(process.env.PORT || 8088);
const intervalMs = Number(process.env.COLLECT_INTERVAL_MS || 30000);
const database = new WorklogDatabase(defaultDbPath());
const collector = new ActivityCollector(database, intervalMs);
const server = createAppServer({ database, collector, port });

collector.start();

server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${port}/app`;
  console.log(`Local Worklog Assistant running at ${url}`);
  console.log(`SQLite database: ${database.dbPath}`);
  if (process.env.OPEN_BROWSER !== '0') {
    spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  }
});

function shutdown() {
  collector.stop();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
