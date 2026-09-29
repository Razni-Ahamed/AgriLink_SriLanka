# Points the Azure API's Planner agent at the laptop's language model (once, or after changing the
# ngrok domain or key). The key is read from the file start-llm-planner.ps1 created and never printed.
# Usage: .\deploy\connect-llm-planner.ps1 -ResourceGroup agrilink-rg -AppName agrilink-api-sl -Domain <your-name>.ngrok-free.app
#        .\deploy\connect-llm-planner.ps1 -ResourceGroup agrilink-rg -AppName agrilink-api-sl -Disable
param(
    [Parameter(Mandatory)] [string] $ResourceGroup,
    [Parameter(Mandatory)] [string] $AppName,
    [string] $Domain,
    [string] $Identifier = 'qwen3.8-27b',
    [switch] $Disable
)

$ErrorActionPreference = 'Stop'

if ($Disable) {
    az webapp config appsettings set -g $ResourceGroup -n $AppName --settings 'Llm__Enabled=false' --output none
    Write-Host 'The Planner is back to rules only.'
    return
}

if (-not $Domain) { throw 'Pass -Domain (your ngrok domain), or -Disable.' }
$keyFile = Join-Path $env:USERPROFILE '.agrilink\llm-key.txt'
if (-not (Test-Path $keyFile)) { throw 'No key yet: run .\deploy\start-llm-planner.ps1 first.' }
$key = (Get-Content $keyFile -Raw).Trim()

az webapp config appsettings set -g $ResourceGroup -n $AppName --output none --settings `
    'Llm__Enabled=true' "Llm__BaseUrl=https://$Domain/v1" "Llm__Model=$Identifier" "Llm__ApiKey=$key"
Write-Host "The Planner now asks https://$Domain first and falls back to the rules when it is offline. The API restarts once."
