# 本地工作记录助手 MVP

这是一个“小黑日报类”的本地工作记录助手 MVP。它会定时采集 Windows 当前前台窗口，自动沉淀工作时间线，并提供日报、热力图、应用使用时长统计和本地 HTTP API。

## 启动

本机如果 `node` 可用：

```powershell
npm start
```

如果系统 `node.exe` 被拦截，可以使用 Codex 自带 Node：

```powershell
& "C:\Users\22594\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "C:\Users\22594\Documents\New project\local-worklog-assistant\src\main.mjs"
```

启动后打开：

```text
http://127.0.0.1:8088/app
```

如果 8088 被占用：

```powershell
$env:PORT="18088"
& "C:\Users\22594\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" ".\src\main.mjs"
```

## 数据位置

默认 SQLite 数据库：

```text
%USERPROFILE%\.local-worklog-assistant\worklog.sqlite
```

可通过环境变量覆盖：

```powershell
$env:WORKLOG_DB="D:\data\worklog.sqlite"
```

## API

- `GET /`：Markdown API 文档
- `GET /api/timeline`
- `GET /api/report`
- `POST /api/report/generate`
- `GET /api/heat-map`
- `GET /api/app-usage`
- `GET /api/status`

统一 JSON 响应：

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

## 测试

```powershell
& "C:\Users\22594\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests/*.test.mjs
```
