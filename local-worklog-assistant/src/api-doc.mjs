export function apiMarkdown(port = 8088) {
  return `# 本地工作记录助手 API 文档

> 服务地址：http://127.0.0.1:${port}
> 文档版本：0.1.0

## 通用约定

所有业务接口返回 JSON：

\`\`\`json
{
  "code": 0,
  "message": "success",
  "data": null
}
\`\`\`

日期参数支持 \`YYYY-MM-DD\`。未传日期时，时间线、报告和应用统计默认今天，热力图默认最近 7 天。

## 接口列表

### 1. 获取 API 文档

- **请求**：\`GET /\`
- **说明**：返回本文档。

### 2. 查询工作时间线

- **请求**：\`GET /api/timeline\`
- **参数**：\`startDate\`、\`endDate\`
- **示例**：\`GET /api/timeline?startDate=2026-05-28&endDate=2026-05-28\`

### 3. 查询工作报告

- **请求**：\`GET /api/report\`
- **参数**：\`startDate\`、\`endDate\`
- **示例**：\`GET /api/report?startDate=2026-05-28&endDate=2026-05-28\`

### 4. 生成工作报告

- **请求**：\`POST /api/report/generate\`
- **JSON 参数**：\`type\`、\`startDate\`、\`endDate\`

### 5. 查询时段热力图

- **请求**：\`GET /api/heat-map\`
- **参数**：\`startDate\`、\`endDate\`

### 6. 查询应用使用时长

- **请求**：\`GET /api/app-usage\`
- **参数**：\`startDate\`、\`endDate\`

### 7. 查询运行状态

- **请求**：\`GET /api/status\`
- **说明**：返回数据库路径、采集器状态和最近采样。
`;
}
