$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32Window {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@

$handle = [Win32Window]::GetForegroundWindow()
$builder = New-Object System.Text.StringBuilder 1024
[void][Win32Window]::GetWindowText($handle, $builder, $builder.Capacity)
$processId = 0
[void][Win32Window]::GetWindowThreadProcessId($handle, [ref]$processId)

$processName = "unknown"
try {
  $processName = (Get-Process -Id $processId -ErrorAction Stop).ProcessName
} catch {}

[ordered]@{
  appName = $processName
  windowTitle = $builder.ToString()
  processId = $processId
} | ConvertTo-Json -Compress | Write-Output
