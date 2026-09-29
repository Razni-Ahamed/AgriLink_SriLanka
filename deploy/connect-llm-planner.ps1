# Points the Azure API's Planner agent at the laptop's language model (once, or after changing the
# ngrok domain or key). The key is read from the file start-llm-planner.ps1 created and never printed.
# Usage: .\deploy\connect-llm-planner.ps1 -ResourceGroup agrilink-rg -AppName agrilink-api-sl -Domain <your-name>.ngrok-free.dev
#        .\deploy\connect-llm-planner.ps1 -ResourceGroup agrilink-rg -AppName agrilink-api-sl -Disable
[CmdletBinding(PositionalBinding = $false)]
param(
    [Parameter(Mandatory)] [string] $ResourceGroup,
    [Parameter(Mandatory)] [string] $AppName,
    [string] $Domain,
    [string] $Identifier = 'qwen3.8-27b',
    [switch] $Disable
)

$ErrorActionPreference = 'Stop'

# az reports notices on stderr, which Windows PowerShell 5.1 treats as fatal under 'Stop'.
function Set-AppSettings([string[]] $Settings) {
    $ErrorActionPreference = 'Continue'
    az webapp config appsettings set -g $ResourceGroup -n $AppName --output none --settings @Settings
    if ($LASTEXITCODE -ne 0) { throw 'Could not update the App Service settings (are you signed in with az login?).' }
}

if ($Disable) {
    Set-AppSettings @('Llm__Enabled=false')
    Write-Host 'The Planner is back to rules only.'
    return
}

if (-not $Domain) { throw 'Pass -Domain (your ngrok domain), or -Disable.' }
$keyFile = Join-Path $env:USERPROFILE '.agrilink\llm-key.txt'
if (-not (Test-Path $keyFile)) { throw 'No key yet: run .\deploy\start-llm-planner.ps1 first.' }
$key = (Get-Content $keyFile -Raw).Trim()

Set-AppSettings @('Llm__Enabled=true', "Llm__BaseUrl=https://$Domain/v1", "Llm__Model=$Identifier", "Llm__ApiKey=$key")
Write-Host "The Planner now asks https://$Domain first and falls back to the rules when it is offline. The API restarts once."
