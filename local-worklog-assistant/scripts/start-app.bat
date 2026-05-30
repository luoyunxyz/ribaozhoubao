@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0\.."
set OPEN_BROWSER=1
set PORT=8088

set CODEX_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe
if exist "%CODEX_NODE%" (
  "%CODEX_NODE%" src\main.mjs
) else (
  node src\main.mjs
)
