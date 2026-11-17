# Starts Docker infra + auth-service, event-service, api-gateway in separate windows
$root = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { "D:\ticketflow" }

if (-not $env:DB_PASSWORD) {
    $secure = Read-Host "Postgres password" -AsSecureString
    $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}

docker compose -f "$root\docker-compose.yml" up -d

foreach ($svc in "auth-service", "event-service", "api-gateway") {
    Start-Process powershell -ArgumentList "-NoExit", "-Command",
        "cd '$root\services\$svc'; .\mvnw.cmd spring-boot:run"
    Start-Sleep -Seconds 15
}