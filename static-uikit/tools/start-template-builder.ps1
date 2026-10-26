param(
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

$staticRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$pythonCommand = Get-Command python -ErrorAction Stop

# Ask the operating system for a free loopback port. The listener is closed
# immediately before starting http.server; no existing service is touched.
$listener = [System.Net.Sockets.TcpListener]::new(
  [System.Net.IPAddress]::Loopback,
  0
)
$listener.Start()
$port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
$listener.Stop()

$server = Start-Process `
  -FilePath $pythonCommand.Source `
  -ArgumentList @(
    '-m', 'http.server', [string]$port,
    '--bind', '127.0.0.1',
    '--directory', $staticRoot
  ) `
  -WindowStyle Hidden `
  -PassThru

Start-Sleep -Milliseconds 500
$verified = Get-Process -Id $server.Id -ErrorAction SilentlyContinue
if (-not $verified -or $verified.ProcessName -notlike 'python*') {
  throw 'The local HTTP server did not start.'
}

$url = "http://127.0.0.1:$port/tools/document-template-builder.html"
$recordPath = Join-Path $env:TEMP ("crm-document-template-builder-{0}.txt" -f $server.Id)
@(
  "PID=$($server.Id)"
  "PORT=$port"
  "ROOT=$staticRoot"
  "URL=$url"
  "STOP=Stop-Process -Id $($server.Id)"
) | Set-Content -LiteralPath $recordPath -Encoding UTF8

if (-not $NoBrowser) {
  Start-Process $url
}

Write-Host ''
Write-Host 'CRM PDF Template Builder started.' -ForegroundColor Green
Write-Host "URL: $url"
Write-Host "Server PID: $($server.Id)"
Write-Host "Launch record: $recordPath"
Write-Host ''
Write-Host 'To stop only this server, run:' -ForegroundColor Yellow
Write-Host "  Stop-Process -Id $($server.Id)"
Write-Host 'The launcher never stops existing Python, browser, or console processes.'
