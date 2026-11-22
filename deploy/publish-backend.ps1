# Publishes the API for Linux (with the ONNX models from ml/models) and zip-deploys it to Azure App Service.
# Usage: .\deploy\publish-backend.ps1 -ResourceGroup agrilink-rg -AppName <your-app-name>
# Needs the Azure CLI and `az login`. Provisioning (one time) is described in docs/deployment/azure.md.
#
# When the App Service setting Database__MigrateOnStartup is "false", the API no longer migrates and
# seeds the database on every start (that work used to delay the first request after a cold start),
# so this script does it once per deployment instead, before uploading: it runs the API with
# --migrate from this machine, using the App Service's own settings. See docs/deployment/cold-starts.md.
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
# ReadyToRun precompiles the API and its libraries, so a cold start spends less time in the JIT.
dotnet publish (Join-Path $root 'backend/AgriLink.API') -c Release -r linux-x64 --self-contained false -p:PublishReadyToRun=true -o $out
if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed' }

# tar (not Compress-Archive): Windows PowerShell 5.1 writes backslash paths that Linux extracts wrongly.
tar -a -c -f $zip -C $out .
if ($LASTEXITCODE -ne 0) { throw 'zip failed' }

# Database work at deploy time, only when the API is set not to do it at start-up.
# Out-String and foreach (not a pipeline) so Windows PowerShell 5.1 parses the JSON array correctly.
# No @() around ConvertFrom-Json: in 5.1 it returns the whole array as one object, so @() would make
# a one-item list holding every setting and the name/value checks below would see all of them at once.
$settingsJson = az webapp config appsettings list --resource-group $ResourceGroup --name $AppName -o json | Out-String
if ($LASTEXITCODE -ne 0) { throw 'reading the App Service settings failed' }
$settings = ConvertFrom-Json $settingsJson
$migrateOnStartup = $null
foreach ($setting in $settings) {
    if ($setting.name -eq 'Database__MigrateOnStartup') { $migrateOnStartup = $setting.value }
}
if ("$migrateOnStartup".Trim() -eq 'false') {
    Write-Host 'Database__MigrateOnStartup is false: applying migrations and seeding from here before deploying.'
    $saved = @{}
    try {
        # Only for the child process: the settings (connection string, Jwt, AdminSeed) live in App Service.
        foreach ($setting in $settings) {
            $saved[$setting.name] = [Environment]::GetEnvironmentVariable($setting.name)
            [Environment]::SetEnvironmentVariable($setting.name, $setting.value)
        }
        dotnet run --project (Join-Path $root 'backend/AgriLink.API') -c Release --no-launch-profile -- --migrate
        if ($LASTEXITCODE -ne 0) { throw 'database migration failed; nothing was deployed' }
    }
    finally {
        foreach ($name in $saved.Keys) { [Environment]::SetEnvironmentVariable($name, $saved[$name]) }
    }
}
else {
    Write-Host 'Database__MigrateOnStartup is not false: the API migrates and seeds the database when it starts.'
}

# az prints a harmless build-automation notice on stderr, which Windows PowerShell 5.1 would treat as fatal.
$ErrorActionPreference = 'Continue'
az webapp deploy --resource-group $ResourceGroup --name $AppName --src-path $zip --type zip
if ($LASTEXITCODE -ne 0) { throw 'deploy failed' }
