# Publishes the API for Linux (with the ONNX models from ml/models) and zip-deploys it to Azure App Service.
# Usage: .\deploy\publish-backend.ps1 -ResourceGroup agrilink-rg -AppName <your-app-name>
# Needs the Azure CLI and `az login`. Provisioning (one time) is described in docs/deployment/azure.md.
param(
    [Parameter(Mandatory)] [string] $ResourceGroup,
    [Parameter(Mandatory)] [string] $AppName
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$out = Join-Path $env:TEMP 'agrilink-publish'
$zip = Join-Path $env:TEMP 'agrilink-api.zip'

if (-not (Test-Path (Join-Path $root 'ml/models/tomato/model.onnx'))) {
    throw 'ml/models is missing the trained models (gitignored); the deployed API would have no photo classification.'
}

Remove-Item $out, $zip -Recurse -Force -ErrorAction SilentlyContinue
dotnet publish (Join-Path $root 'backend/AgriLink.API') -c Release -r linux-x64 --self-contained false -o $out
if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed' }

# tar (not Compress-Archive): Windows PowerShell 5.1 writes backslash paths that Linux extracts wrongly.
tar -a -c -f $zip -C $out .
if ($LASTEXITCODE -ne 0) { throw 'zip failed' }

# az prints a harmless build-automation notice on stderr, which Windows PowerShell 5.1 would treat as fatal.
$ErrorActionPreference = 'Continue'
az webapp deploy --resource-group $ResourceGroup --name $AppName --src-path $zip --type zip
if ($LASTEXITCODE -ne 0) { throw 'deploy failed' }
