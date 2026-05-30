const RULES = [
  { category: '开发', patterns: ['code', 'vscode', 'visual studio', 'android studio', 'intellij', 'idea', 'webstorm', 'terminal', 'powershell', 'cmd', 'codex'] },
  { category: '资料/浏览', patterns: ['chrome', 'edge', 'msedge', 'firefox', 'browser', 'docs', 'notion'] },
  { category: '沟通/会议', patterns: ['wechat', '微信', 'qq', '飞书', 'lark', 'teams', 'zoom', 'meeting'] },
  { category: '文档', patterns: ['word', 'excel', 'powerpoint', 'wps', 'obsidian', 'typora'] }
];

export function classifyActivity({ appName = '', windowTitle = '' } = {}) {
  const text = `${appName} ${windowTitle}`.toLowerCase();
  if (!text.trim()) return '闲置';
  for (const rule of RULES) {
    if (rule.patterns.some((pattern) => text.includes(pattern.toLowerCase()))) {
      return rule.category;
    }
  }
  return '其他';
}

export function buildSummary({ appName = '', windowTitle = '', category = '' } = {}) {
  if (category === '闲置') return '未检测到明显前台活动';
  const title = windowTitle ? `：${windowTitle}` : '';
  return `使用 ${appName || '未知应用'}${title}`;
}
