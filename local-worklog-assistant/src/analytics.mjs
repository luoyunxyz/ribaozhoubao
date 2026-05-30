import { secondsBetween, toDateOnly } from './dates.mjs';

export function calculateAppUsage(records) {
  const map = new Map();
  for (const record of records) {
    const key = record.appName || '未知应用';
    const seconds = secondsBetween(record.startTime, record.endTime);
    const existing = map.get(key) || {
      appName: key,
      totalDurationSec: 0,
      firstUsedAt: record.startTime,
      lastUsedAt: record.endTime
    };
    existing.totalDurationSec += seconds;
    if (new Date(record.startTime) < new Date(existing.firstUsedAt)) existing.firstUsedAt = record.startTime;
    if (new Date(record.endTime) > new Date(existing.lastUsedAt)) existing.lastUsedAt = record.endTime;
    map.set(key, existing);
  }
  return [...map.values()].sort((a, b) => b.totalDurationSec - a.totalDurationSec);
}

export function calculateHeatMap(records, start, end) {
  const dayMap = new Map();
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = toDateOnly(d);
    dayMap.set(date, {
      date,
      hourlyCounts: Array(24).fill(0),
      focusMinutes: 0,
      totalRecords: 0,
      topCategory: '暂无',
      activePeriod: '暂无',
      _categories: new Map(),
      _firstHour: null,
      _lastHour: null
    });
  }

  for (const record of records) {
    const startTime = new Date(record.startTime);
    const date = toDateOnly(startTime);
    const bucket = dayMap.get(date);
    if (!bucket) continue;
    const hour = startTime.getHours();
    bucket.hourlyCounts[hour] += 1;
    if (record.category !== '闲置') {
      bucket.focusMinutes += Math.max(1, Math.round(secondsBetween(record.startTime, record.endTime) / 60));
      bucket.totalRecords += 1;
      bucket._categories.set(record.category, (bucket._categories.get(record.category) || 0) + 1);
      bucket._firstHour = bucket._firstHour === null ? hour : Math.min(bucket._firstHour, hour);
      bucket._lastHour = bucket._lastHour === null ? hour : Math.max(bucket._lastHour, hour);
    }
  }

  return [...dayMap.values()].map((bucket) => {
    const top = [...bucket._categories.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      date: bucket.date,
      hourlyCounts: bucket.hourlyCounts,
      focusMinutes: bucket.focusMinutes,
      totalRecords: bucket.totalRecords,
      topCategory: top ? top[0] : '暂无',
      activePeriod: bucket._firstHour === null
        ? '暂无'
        : `${String(bucket._firstHour).padStart(2, '0')}:00 - ${String(bucket._lastHour).padStart(2, '0')}:59`
    };
  });
}

export function generateReportContent({ type = 'daily', startDate, endDate, records, appUsage, heatMap }) {
  const titleType = type === 'weekly' ? '周报' : type === 'monthly' ? '月报' : '日报';
  const categoryMap = new Map();
  for (const record of records) {
    categoryMap.set(record.category, (categoryMap.get(record.category) || 0) + 1);
  }

  const categorySummary = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => `- ${category}：${count} 条记录`)
    .join('\n') || '- 暂无记录';

  const topApps = appUsage.slice(0, 5)
    .map((item, index) => `${index + 1}. ${item.appName}：${formatDuration(item.totalDurationSec)}`)
    .join('\n') || '暂无应用使用记录';

  const timeline = records.slice(0, 12)
    .map((record) => `- ${formatTime(record.startTime)} ${record.category}：${record.summary}`)
    .join('\n') || '- 暂无工作记录';

  const totalFocus = heatMap.reduce((sum, item) => sum + item.focusMinutes, 0);

  return `# ${startDate} ${titleType}

## 概览

- 时间范围：${startDate} 至 ${endDate}
- 工作记录：${records.length} 条
- 估算专注时长：${totalFocus} 分钟

## 工作分类

${categorySummary}

## 主要工作时间线

${timeline}

## 应用使用排行

${topApps}

## 后续建议

- 复盘高频应用是否符合今天的主要目标。
- 对摘要不准确的时间线记录进行手动修正。
`;
}

export function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`;
  return `${minutes} 分钟`;
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
