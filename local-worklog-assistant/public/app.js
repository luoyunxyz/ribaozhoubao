const state = {
  view: 'dashboard',
  timeline: [],
  reports: [],
  heatmap: [],
  usage: [],
  status: null
};

const titles = {
  dashboard: ['首页', '自动记录电脑活动，生成可复盘的工作记录。'],
  timeline: ['工作时间线', '按时间倒序查看、筛选和修正工作记录。'],
  reports: ['工作报告', '生成、预览和复制 Markdown 日报。'],
  heatmap: ['时段热力图', '查看每天 24 小时活跃分布。'],
  usage: ['应用统计', '查看应用使用时长排行。'],
  settings: ['设置', '查看本地数据、采集和 API 配置。']
};

document.querySelectorAll('.nav').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});
document.querySelector('#reloadBtn').addEventListener('click', load);

initDates();
setView('dashboard');

function initDates() {
  const today = localDateOnly(new Date());
  document.querySelector('#startDate').value = today;
  document.querySelector('#endDate').value = today;
}

async function setView(view) {
  state.view = view;
  document.querySelectorAll('.nav').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  document.querySelector('#pageTitle').textContent = titles[view][0];
  document.querySelector('#pageSub').textContent = titles[view][1];
  await load();
}

function query() {
  const startDate = document.querySelector('#startDate').value;
  const endDate = document.querySelector('#endDate').value;
  return `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
}

async function api(path, options) {
  const response = await fetch(path, options);
  const json = await response.json();
  if (json.code !== 0) throw new Error(json.message || '请求失败');
  return json.data;
}

async function load() {
  const content = document.querySelector('#content');
  content.innerHTML = '<div class="empty">加载中...</div>';
  try {
    if (state.view === 'dashboard') {
      const [timeline, usage, heatmap, status] = await Promise.all([
        api(`/api/timeline?${query()}`),
        api(`/api/app-usage?${query()}`),
        api(`/api/heat-map?${query()}`),
        api('/api/status')
      ]);
      state.timeline = timeline;
      state.usage = usage;
      state.heatmap = heatmap;
      state.status = status;
      renderDashboard();
    } else if (state.view === 'timeline') {
      state.timeline = await api(`/api/timeline?${query()}`);
      renderTimeline();
    } else if (state.view === 'reports') {
      state.reports = await api(`/api/report?${query()}`);
      renderReports();
    } else if (state.view === 'heatmap') {
      state.heatmap = await api(`/api/heat-map?${query()}`);
      renderHeatmap();
    } else if (state.view === 'usage') {
      state.usage = await api(`/api/app-usage?${query()}`);
      renderUsage();
    } else {
      state.status = await api('/api/status');
      renderSettings();
    }
  } catch (error) {
    content.innerHTML = `<div class="empty">加载失败：${escapeHtml(error.message)}</div>`;
  }
}

function renderDashboard() {
  const today = state.heatmap[state.heatmap.length - 1] || {};
  const current = state.status?.lastSample;
  const topCategory = today.topCategory || topCategoryFromTimeline(state.timeline);
  document.querySelector('#content').innerHTML = `
    <div class="grid">
      ${metricCard('今日专注', `${today.focusMinutes || 0} 分钟`, '基于非闲置记录估算')}
      ${metricCard('记录数量', `${state.timeline.length} 条`, '当前日期范围内')}
      ${metricCard('当前应用', current?.appName || '暂无', current?.windowTitle || '等待采集')}
      ${metricCard('主要分类', topCategory || '暂无', '按记录数量估算')}
    </div>
    <div class="grid" style="margin-top:16px">
      <button onclick="generateReport('daily')">生成日报</button>
      <button onclick="setView('timeline')">查看时间线</button>
      <button onclick="setView('heatmap')">查看热力图</button>
      <button onclick="setView('usage')">查看应用统计</button>
    </div>
    <h2>最近记录</h2>
    ${renderTimelineList(state.timeline.slice(0, 5))}
  `;
}

function renderTimeline() {
  document.querySelector('#content').innerHTML = state.timeline.length
    ? `<div class="list">${state.timeline.map(renderTimelineItem).join('')}</div>`
    : '<div class="empty">当前日期范围暂无时间线记录。</div>';
}

function renderTimelineList(records) {
  return records.length ? `<div class="list">${records.map(renderTimelineItem).join('')}</div>` : '<div class="empty">暂无最近记录。</div>';
}

function renderTimelineItem(record) {
  return `
    <article class="card timeline-item">
      <div class="meta">${formatDateTime(record.startTime)} - ${formatDateTime(record.endTime)} · ${escapeHtml(record.appName)}</div>
      <span class="badge">${escapeHtml(record.category)}</span>
      <h3>${escapeHtml(record.summary)}</h3>
      <p>${escapeHtml(record.windowTitle || '无窗口标题')}</p>
      <details>
        <summary>编辑分类和摘要</summary>
        <div class="grid">
          <input id="cat-${record.id}" value="${escapeAttr(record.category)}" />
          <input id="sum-${record.id}" value="${escapeAttr(record.summary)}" />
          <button onclick="saveRecord('${record.id}')">保存</button>
        </div>
      </details>
    </article>
  `;
}

async function saveRecord(id) {
  await api(`/api/timeline/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: document.querySelector(`#cat-${CSS.escape(id)}`).value,
      summary: document.querySelector(`#sum-${CSS.escape(id)}`).value
    })
  });
  await load();
}

async function generateReport(type) {
  const report = await api('/api/report/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      startDate: document.querySelector('#startDate').value,
      endDate: document.querySelector('#endDate').value
    })
  });
  state.view = 'reports';
  document.querySelectorAll('.nav').forEach((button) => button.classList.toggle('active', button.dataset.view === 'reports'));
  document.querySelector('#pageTitle').textContent = titles.reports[0];
  document.querySelector('#pageSub').textContent = titles.reports[1];
  state.reports = [report];
  renderReports();
}

function renderReports() {
  document.querySelector('#content').innerHTML = `
    <div class="grid">
      <button onclick="generateReport('daily')">生成日报</button>
      <button onclick="generateReport('weekly')">生成周报</button>
      <button onclick="generateReport('monthly')">生成月报</button>
    </div>
    <div class="list" style="margin-top:16px">
      ${state.reports.length ? state.reports.map(renderReport).join('') : '<div class="empty">当前日期范围暂无报告，点击上方按钮生成。</div>'}
    </div>
  `;
}

function renderReport(report) {
  return `
    <article class="card">
      <div class="meta">${escapeHtml(report.title)} · ${escapeHtml(report.status)}</div>
      <button onclick="copyText(${JSON.stringify(report.content)})">复制 Markdown</button>
      <pre class="report-content">${escapeHtml(report.content)}</pre>
    </article>
  `;
}

function renderHeatmap() {
  document.querySelector('#content').innerHTML = state.heatmap.length
    ? state.heatmap.map((day) => `
      <div class="heat-row">
        <strong>${day.date}</strong>
        ${day.hourlyCounts.map((count) => `<div title="${count}" class="heat-cell" style="background:rgba(37,99,235,${Math.min(0.15 + count * 0.15, 1)})"></div>`).join('')}
        <span>${day.focusMinutes} 分钟 · ${day.activePeriod}</span>
      </div>
    `).join('')
    : '<div class="empty">暂无热力图数据。</div>';
}

function renderUsage() {
  const max = Math.max(1, ...state.usage.map((item) => item.totalDurationSec));
  document.querySelector('#content').innerHTML = state.usage.length
    ? `<div class="list">${state.usage.map((item) => `
      <article class="card">
        <div class="meta">${formatDateTime(item.firstUsedAt)} - ${formatDateTime(item.lastUsedAt)}</div>
        <h3>${escapeHtml(item.appName)}</h3>
        <div class="bar" style="width:${Math.max(4, item.totalDurationSec / max * 100)}%"></div>
        <p>${formatDuration(item.totalDurationSec)}</p>
      </article>
    `).join('')}</div>`
    : '<div class="empty">当前日期范围暂无应用使用记录。</div>';
}

function renderSettings() {
  document.querySelector('#content').innerHTML = `
    <div class="grid">
      ${metricCard('数据库路径', state.status.dbPath, 'SQLite 本地保存')}
      ${metricCard('采集状态', state.status.collectorRunning ? '运行中' : '已停止', '默认每 30 秒采集一次')}
      ${metricCard('API 服务', location.origin, '本地 Agent 查询地址')}
      ${metricCard('最近采样', state.status.lastSample?.appName || '暂无', state.status.lastSample?.windowTitle || '')}
    </div>
    <div class="card" style="margin-top:16px">
      <h3>隐私说明</h3>
      <p>当前 MVP 只采集前台应用名和窗口标题，不采集截图内容。数据保存在本机 SQLite 文件。</p>
    </div>
  `;
}

function metricCard(title, value, subtitle) {
  return `<article class="card"><div class="meta">${escapeHtml(title)}</div><div class="metric">${escapeHtml(value)}</div><p>${escapeHtml(subtitle || '')}</p></article>`;
}

function topCategoryFromTimeline(records) {
  const map = new Map();
  for (const record of records) map.set(record.category, (map.get(record.category) || 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(sec) {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  if (sec < 60) return `${sec} 秒`;
  return hours ? `${hours} 小时 ${minutes} 分钟` : `${minutes} 分钟`;
}

function localDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function copyText(text) {
  navigator.clipboard.writeText(text);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

window.setView = setView;
window.generateReport = generateReport;
window.saveRecord = saveRecord;
window.copyText = copyText;
