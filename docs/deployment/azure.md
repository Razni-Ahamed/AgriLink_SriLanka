# Deploying AgriLink to Azure (student subscription)

- **Database:** Neon Postgres (already in use).
- **API:** Azure App Service, Linux, F1 (free) — `dotnet publish` output zip-deployed.
- **Frontend:** Azure Static Web Apps, Free plan.

Names below are placeholders; App Service and Static Web Apps names must be globally unique.

## One-time setup

```powershell
az login
az group create -n agrilink-rg -l southeastasia          # pick any region your subscription allows
az appservice plan create -n agrilink-plan -g agrilink-rg --is-linux --sku F1
az webapp create -n <api-name> -g agrilink-rg -p agrilink-plan --runtime "DOTNETCORE:8.0"
```

Configuration is environment variables (App Service "app settings"). Use a **new** JWT key and admin
password for production — do not reuse the ones in `appsettings.Development.json`.

```powershell
az webapp config appsettings set -g agrilink-rg -n <api-name> --settings `
  "ASPNETCORE_ENVIRONMENT=Production" `
  "ConnectionStrings__DefaultConnection=<neon connection string>" `
  "Jwt__Key=<random 64+ chars>" "Jwt__Issuer=AgriLinkApi" "Jwt__Audience=AgriLinkClient" `
  "AdminSeed__Email=<admin email>" "AdminSeed__Password=<strong password>" "AdminSeed__FullName=AgriLink Administrator" `
  "Cloudinary__CloudName=<...>" "Cloudinary__ApiKey=<...>" "Cloudinary__ApiSecret=<...>" `
  "Cors__AllowedOrigins=http://localhost:5173" `
  "Swagger__Enabled=true"
```

Migrations run automatically on startup.

## Deploy / redeploy the API

```powershell
.\deploy\publish-backend.ps1 -ResourceGroup agrilink-rg -AppName <api-name>
```

The script bundles `ml/models/*/model.onnx` + `model.json` (gitignored, so this must run from a machine
that has them). Check `https://<api-name>.azurewebsites.net/swagger`.

## Deploy the frontend

```powershell
az staticwebapp create -n <web-name> -g agrilink-rg -l eastasia --sku Free
$token = az staticwebapp secrets list -n <web-name> -g agrilink-rg --query "properties.apiKey" -o tsv
$host_ = az staticwebapp show -n <web-name> -g agrilink-rg --query "defaultHostname" -o tsv

cd frontend
$env:VITE_API_BASE_URL = "https://<api-name>.azurewebsites.net"
npm ci; npm run build
npx @azure/static-web-apps-cli deploy ./dist --deployment-token $token --env production
```

`public/staticwebapp.config.json` makes deep links (`/farms/1`) fall back to `index.html`.

## Finish: allow the frontend origin

```powershell
az webapp config appsettings set -g agrilink-rg -n <api-name> --settings "Cors__AllowedOrigins=https://$host_"
```

## Notes

- F1 has no Always On: the API sleeps when idle and the first request after that is slow. Open it a few
  minutes before a demo.
- F1 allows 60 CPU-minutes/day; heavy photo classification during a demo is fine, load testing is not.
- Never commit `appsettings.Development.json`; the publish excludes it.
