# Starts the Planner agent's language model on this laptop and opens it to the Azure API through
# ngrok. Run before a demo; leave the window open. See docs/deployment/llm-planner.md.
# Usage: .\deploy\start-llm-planner.ps1 -Domain <your-name>.ngrok-free.dev
[CmdletBinding(PositionalBinding = $false)]
param(
    [Parameter(Mandatory)] [string] $Domain,
    [string] $Model = 'qwen/qwen3.8-27b',
    [string] $Identifier = 'qwen3.8-27b'
)

$ErrorActionPreference = 'Stop'
$secrets = Join-Path $env:USERPROFILE '.agrilink'
$keyFile = Join-Path $secrets 'llm-key.txt'
$policyFile = Join-Path $secrets 'ngrok-llm-policy.yml'

if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) { throw 'ngrok is not installed (see docs/deployment/llm-planner.md).' }
$lms = Join-Path $env:USERPROFILE '.lmstudio\bin\lms.exe'
if (-not (Test-Path $lms)) { throw 'LM Studio''s lms command was not found.' }

# The shared secret the Azure API sends as "Authorization: Bearer <key>". Created once, kept outside
# the repository; connect-llm-planner.ps1 copies it into the App Service settings.
New-Item -ItemType Directory -Force $secrets | Out-Null
if (-not (Test-Path $keyFile)) {
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    Set-Content -Path $keyFile -Value (($bytes | ForEach-Object { $_.ToString('x2') }) -join '') -NoNewline -Encoding ascii
}
$key = (Get-Content $keyFile -Raw).Trim()

# The tunnel's own rules: only the one endpoint the planner uses, only with the key, and a rate
# limit so a leaked address can't tie up the GPU.
@"
on_http_request:
  - expressions:
      - "req.method != 'POST' || req.url.path != '/v1/chat/completions'"
    actions:
      - type: custom-response
        config:
          status_code: 404
          body: Not found
  - expressions:
      - "!('authorization' in req.headers) || req.headers['authorization'][0] != 'Bearer $key'"
    actions:
      - type: custom-response
        config:
          status_code: 401
          body: Unauthorized
  - actions:
      - type: rate-limit
        config:
          name: planner
          algorithm: sliding_window
          capacity: 30
          rate: 60s
          bucket_key:
            - conn.client_ip
"@ | Set-Content -Path $policyFile -Encoding ascii

# lms and ngrok report progress on stderr, which Windows PowerShell 5.1 treats as a fatal error
# under 'Stop' once output is redirected; check their exit codes instead.
$ErrorActionPreference = 'Continue'

Write-Host 'Starting LM Studio''s server...'
& $lms server start 2>&1 | ForEach-Object { "$_" } | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'LM Studio''s server did not start.' }

# Loading it a second time would put two copies on the GPU.
if ((& $lms ps 2>&1 | Out-String) -match "(?m)^\s*$([regex]::Escape($Identifier))\s") {
    Write-Host "$Identifier is already loaded."
} else {
    Write-Host 'Loading the model onto the GPU...'
    & $lms load $Model --identifier $Identifier --context-length 8192 --gpu max -y 2>&1 | ForEach-Object { "$_" } | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "Could not load $Model." }
}

Write-Host "Opening https://$Domain -> http://localhost:1234 (Ctrl+C stops it; the API then plans with the rules)."
ngrok http 1234 --url "https://$Domain" --traffic-policy-file $policyFile
