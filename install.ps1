# TechCommerce Platform - Automatic Installer for Windows
# Version: 3.0 - Complete Installation with Email & Hosting
# Author: TechCommerce Team
# Run as Administrator

$Host.UI.RawUI.WindowTitle = "TechCommerce Platform Installer v3.0"

# Colors
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Info { Write-ColorOutput Cyan $args }
function Write-Warning { Write-ColorOutput Yellow $args }
function Write-Error { Write-ColorOutput Red $args }
function Write-Section { 
    Write-ColorOutput Magenta "`n══════════════════════════════════════════════════════════════"
    Write-ColorOutput Magenta "  $args"
    Write-ColorOutput Magenta "══════════════════════════════════════════════════════════════`n"
}

# Logo
Clear-Host
Write-ColorOutput Cyan @"
╔══════════════════════════════════════════════════════════════════╗
║                                                                    ║
║   ████████╗███████╗██████╗  ██████╗ ███████╗                      ║
║   ╚══██╔══╝██╔════╝██╔══██╗██╔═══██╗██╔════╝                      ║
║      ██║   █████╗  ██████╔╝██║   ██║███████╗                      ║
║      ██║   ██╔══╝  ██╔══██╗██║   ██║╚════██║                      ║
║      ██║   ███████╗██║  ██║╚██████╔╝███████║                      ║
║      ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝                      ║
║                                                                    ║
║   Ecommerce + CRM + ERP + Email Server Platform                   ║
║   Instalador Automático v3.0                                      ║
║                                                                    ║
╚══════════════════════════════════════════════════════════════════╝
"@

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning "Recomendado executar como Administrador para instalação completa de serviços"
    Write-Host "Prima Enter para continuar ou Ctrl+C para cancelar..."
    Read-Host
}

# ==================== CHECK REQUIREMENTS ====================
Write-Section "Verificação de Requisitos"

# Check Node.js
try {
    $nodeVersion = node -v
    Write-Success "Node.js $nodeVersion instalado"
    $nodeInstalled = $true
} catch {
    Write-Warning "Node.js não encontrado"
    $nodeInstalled = $false
}

# Check npm/bun
try {
    $npmVersion = npm -v
    Write-Success "npm $npmVersion instalado"
    $pkgManager = "npm"
} catch {
    try {
        $bunVersion = bun -v
        Write-Success "Bun $bunVersion instalado"
        $pkgManager = "bun"
    } catch {
        Write-Warning "Nem npm nem bun encontrado"
        $pkgManager = $null
    }
}

# Check Git
try {
    $gitVersion = git --version
    Write-Success "Git instalado"
} catch {
    Write-Warning "Git não encontrado"
}

# Offer to install missing dependencies
if (-not $nodeInstalled -or -not $pkgManager) {
    Write-Warning "`nAlgumas dependências estão em falta."
    $installDeps = Read-Host "Deseja instalar automaticamente? (y/n)"
    
    if ($installDeps -eq 'y' -or $installDeps -eq 'Y') {
        Write-Info "`nInstalando dependências...`n"
        
        # Install Node.js using winget
        if (-not $nodeInstalled) {
            Write-Info "Instalando Node.js 20..."
            try {
                winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
            } catch {
                Write-Warning "winget não disponível. Por favor instale Node.js manualmente de https://nodejs.org"
            }
        }
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
}

# Get server IP (for display purposes on Windows)
try {
    $serverIp = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing -TimeoutSec 5).Content
    Write-Info "IP público detectado: $serverIp"
} catch {
    $serverIp = "SEU_IP"
}

# ==================== COMPANY CONFIGURATION ====================
Write-Section "Configuração da Empresa"

Write-ColorOutput Yellow "Informações da Empresa`n"
$companyName = Read-Host "Nome da empresa"
$companyVat = Read-Host "NIF"
$companyAddress = Read-Host "Morada"
$companyPostal = Read-Host "Código Postal"
$companyCity = Read-Host "Cidade"
$companyCountry = if (($tmp = Read-Host "País [Portugal]")) { $tmp } else { "Portugal" }
$companyPhone = Read-Host "Telefone"
$companyEmail = Read-Host "Email"
$companyWebsite = Read-Host "Website (ex: https://empresa.pt)"

# ==================== DATABASE CONFIGURATION ====================
Write-Section "Configuração da Base de Dados"

Write-ColorOutput Yellow "Base de Dados`n"
Write-Host "Opções disponíveis:"
Write-Host "  1) SQLite (desenvolvimento)"
Write-Host "  2) MySQL"
Write-Host "  3) MariaDB"
Write-Host "  4) PostgreSQL"
$dbChoice = Read-Host "Escolha a base de dados [1-4]"

switch ($dbChoice) {
    "1" {
        $dbType = "sqlite"
        $databaseUrl = "file:./db/techcommerce.db"
    }
    "2" {
        $dbType = "mysql"
        $dbHost = if (($tmp = Read-Host "MySQL Host [localhost]")) { $tmp } else { "localhost" }
        $dbPort = if (($tmp = Read-Host "MySQL Port [3306]")) { $tmp } else { "3306" }
        $dbName = if (($tmp = Read-Host "MySQL Database [techcommerce]")) { $tmp } else { "techcommerce" }
        $dbUser = Read-Host "MySQL User"
        $dbPassword = Read-Host "MySQL Password" -AsSecureString
        $dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))
        $databaseUrl = "mysql://${dbUser}:${dbPasswordPlain}@${dbHost}:${dbPort}/${dbName}"
    }
    "3" {
        $dbType = "mariadb"
        $dbHost = if (($tmp = Read-Host "MariaDB Host [localhost]")) { $tmp } else { "localhost" }
        $dbPort = if (($tmp = Read-Host "MariaDB Port [3306]")) { $tmp } else { "3306" }
        $dbName = if (($tmp = Read-Host "MariaDB Database [techcommerce]")) { $tmp } else { "techcommerce" }
        $dbUser = Read-Host "MariaDB User"
        $dbPassword = Read-Host "MariaDB Password" -AsSecureString
        $dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))
        $databaseUrl = "mysql://${dbUser}:${dbPasswordPlain}@${dbHost}:${dbPort}/${dbName}"
    }
    "4" {
        $dbType = "postgresql"
        $dbHost = if (($tmp = Read-Host "PostgreSQL Host [localhost]")) { $tmp } else { "localhost" }
        $dbPort = if (($tmp = Read-Host "PostgreSQL Port [5432]")) { $tmp } else { "5432" }
        $dbName = if (($tmp = Read-Host "PostgreSQL Database [techcommerce]")) { $tmp } else { "techcommerce" }
        $dbUser = Read-Host "PostgreSQL User"
        $dbPassword = Read-Host "PostgreSQL Password" -AsSecureString
        $dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))
        $databaseUrl = "postgresql://${dbUser}:${dbPasswordPlain}@${dbHost}:${dbPort}/${dbName}"
    }
    default {
        Write-Error "Opção inválida"
        exit 1
    }
}

# ==================== ADMIN ACCOUNT ====================
Write-Section "Conta de Administrador"

Write-ColorOutput Yellow "Conta de Administrador`n"
$adminUsername = if (($tmp = Read-Host "Username admin [admin]")) { $tmp } else { "admin" }
$adminEmail = Read-Host "Email admin"
$adminPassword = Read-Host "Password admin" -AsSecureString

# ==================== SMTP CONFIGURATION ====================
Write-Section "Configuração SMTP"

Write-ColorOutput Yellow "SMTP para Notificações`n"
$configureSmtp = Read-Host "Configurar SMTP? (y/n) [y]"
$configureSmtp = if (-not $configureSmtp) { "y" } else { $configureSmtp }

if ($configureSmtp -eq 'y' -or $configureSmtp -eq 'Y') {
    $smtpOrdersHost = Read-Host "SMTP Host"
    $smtpOrdersPort = if (($tmp = Read-Host "SMTP Port [587]")) { $tmp } else { "587" }
    $smtpOrdersUser = Read-Host "SMTP User"
    $smtpOrdersPassword = Read-Host "SMTP Password" -AsSecureString
} else {
    $smtpOrdersHost = ""
    $smtpOrdersPort = "587"
    $smtpOrdersUser = ""
}

# ==================== PAYMENT METHODS ====================
Write-Section "Métodos de Pagamento"

Write-ColorOutput Yellow "Métodos de Pagamento`n"
$enableStripe = Read-Host "Ativar Stripe? (y/n) [n]"
$enablePaypal = Read-Host "Ativar PayPal? (y/n) [n]"
$enableMbway = Read-Host "Ativar MB Way? (y/n) [n]"
$enableMultibanco = Read-Host "Ativar Multibanco? (y/n) [n]"

# ==================== VPS/HOSTING SERVICES ====================
Write-Section "Serviços de Hosting"

Write-ColorOutput Yellow "Integrações de Serviços`n"
$enableDatalix = Read-Host "Integrar Datalix (VPS)? (y/n) [n]"

if ($enableDatalix -eq 'y' -or $enableDatalix -eq 'Y') {
    $datalixApiUrl = Read-Host "Datalix API URL [https://api.datalix.eu]"
    $datalixApiUrl = if (-not $datalixApiUrl) { "https://api.datalix.eu" } else { $datalixApiUrl }
    $datalixApiKey = Read-Host "Datalix API Key"
}

# ==================== EMAIL SERVER ====================
Write-Section "Servidor de Email"

Write-ColorOutput Yellow "Servidor de Email Próprio`n"
Write-Host "NOTA: O servidor de email completo requer Linux (Postfix + Dovecot)."
Write-Host "Em Windows, pode configurar SMTP externo para envio de emails."
Write-Host ""

$installMailServer = Read-Host "Configurar serviço de email? (y/n) [n]"

if ($installMailServer -eq 'y' -or $installMailServer -eq 'Y') {
    $mailServerEnabled = $true
    $mailHostname = Read-Host "Hostname do servidor de email [mail.$($companyWebsite -replace 'https?://','' -replace '/.*','')]"
    $mailDomain = Read-Host "Domínio principal de email [$($companyWebsite -replace 'https?://','' -replace '/.*','')]"
    $mailMaxAccounts = Read-Host "Número máximo de contas por domínio [10]"
    $mailMaxStorage = Read-Host "Armazenamento máximo por domínio (GB) [10]"
    
    $mailHostname = if (-not $mailHostname) { "mail.$($companyWebsite -replace 'https?://','' -replace '/.*','')" } else { $mailHostname }
    $mailDomain = if (-not $mailDomain) { $companyWebsite -replace 'https?://','' -replace '/.*','' } else { $mailDomain }
    $mailMaxAccounts = if (-not $mailMaxAccounts) { "10" } else { $mailMaxAccounts }
    $mailMaxStorage = if (-not $mailMaxStorage) { "10" } else { $mailMaxStorage }
    
    Write-Host "`nFuncionalidades de Segurança"
    $mailSpam = Read-Host "Ativar filtro de Spam? (y/n) [y]"
    $mailAntivirus = Read-Host "Ativar Antivírus? (y/n) [y]"
    $mailGreylisting = Read-Host "Ativar Greylisting? (y/n) [y]"
    
    $mailSpam = if ($mailSpam -eq 'n') { "n" } else { "y" }
    $mailAntivirus = if ($mailAntivirus -eq 'n') { "n" } else { "y" }
    $mailGreylisting = if ($mailGreylisting -eq 'n') { "n" } else { "y" }
} else {
    $mailServerEnabled = $false
}

# ==================== HOSTING SERVER ====================
Write-Section "Sistema de Hosting"

Write-ColorOutput Yellow "Sistema de Hosting Próprio`n"
Write-Host "NOTA: O sistema de hosting completo requer Linux (Nginx/Apache)."
Write-Host "Em Windows, pode usar IIS ou Docker para hosting."
Write-Host ""

$installHosting = Read-Host "Configurar sistema de hosting? (y/n) [n]"

if ($installHosting -eq 'y' -or $installHosting -eq 'Y') {
    $hostingServerEnabled = $true
    
    Write-Host "`nWeb Server"
    Write-Host "  1) IIS (Windows nativo)"
    Write-Host "  2) Nginx (via Docker)"
    Write-Host "  3) Apache (via Docker)"
    $webServerChoice = Read-Host "Escolha o web server [1]"
    
    switch ($webServerChoice) {
        "2" { $hostingWebServer = "nginx" }
        "3" { $hostingWebServer = "apache" }
        default { $hostingWebServer = "iis" }
    }
    
    $phpVersions = Read-Host "Versões PHP a suportar (separadas por vírgula) [8.1,8.2,8.3]"
    $phpVersions = if (-not $phpVersions) { "8.1,8.2,8.3" } else { $phpVersions }
    
    $nodeVersions = Read-Host "Versões Node.js a suportar (separadas por vírgula) [18,20,22]"
    $nodeVersions = if (-not $nodeVersions) { "18,20,22" } else { $nodeVersions }
    
    $hostingBackup = Read-Host "Ativar backups automáticos? (y/n) [y]"
    $hostingBackup = if ($hostingBackup -eq 'n') { "n" } else { "y" }
    
    if ($hostingBackup -eq 'y') {
        $hostingBackupPath = Read-Host "Caminho para backups [C:\backups\hosting]"
        $hostingBackupPath = if (-not $hostingBackupPath) { "C:\backups\hosting" } else { $hostingBackupPath }
    }
} else {
    $hostingServerEnabled = $false
}

# ==================== DNS CONFIGURATION ====================
Write-Section "Configuração DNS"

Write-ColorOutput Yellow "Gestão de DNS`n"
$configureDns = Read-Host "Integrar com provider DNS? (y/n) [n]"

if ($configureDns -eq 'y' -or $configureDns -eq 'Y') {
    Write-Host "  1) Cloudflare"
    Write-Host "  2) Route53 (AWS)"
    Write-Host "  3) DigitalOcean"
    Write-Host "  4) Azure DNS"
    Write-Host "  5) Custom API"
    $dnsProviderChoice = Read-Host "Escolha o provider DNS [1]"
    
    switch ($dnsProviderChoice) {
        "1" { $dnsProvider = "cloudflare" }
        "2" { $dnsProvider = "route53" }
        "3" { $dnsProvider = "digitalocean" }
        "4" { $dnsProvider = "azure" }
        default { $dnsProvider = "custom" }
    }
    
    $dnsApiKey = Read-Host "DNS API Key"
    $dnsApiSecret = Read-Host "DNS API Secret"
} else {
    $dnsProvider = ""
    $dnsApiKey = ""
    $dnsApiSecret = ""
}

# ==================== INSTALLATION ====================
Write-Section "Instalação"

Write-Info "Iniciando instalação...`n"

# Install dependencies
Write-Info "Instalando dependências..."
if ($pkgManager -eq "bun") {
    bun install
} else {
    npm install
}
Write-Success "Dependências instaladas"

# Generate secret
$nextauthSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

# Create .env file
Write-Info "Criando configuração..."
$envContent = @"
# TechCommerce Platform Configuration
# Generated automatically by installer v3.0

# Application
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Database
DATABASE_URL="$databaseUrl"

# Security
NEXTAUTH_SECRET="$nextauthSecret"
NEXTAUTH_URL="$companyWebsite"

# Company Info
COMPANY_NAME="$companyName"
COMPANY_VAT="$companyVat"
COMPANY_ADDRESS="$companyAddress"
COMPANY_POSTAL="$companyPostal"
COMPANY_CITY="$companyCity"
COMPANY_COUNTRY="$companyCountry"
COMPANY_PHONE="$companyPhone"
COMPANY_EMAIL="$companyEmail"
COMPANY_WEBSITE="$companyWebsite"
SERVER_IP="$serverIp"

# SMTP Orders
SMTP_ORDERS_HOST="$smtpOrdersHost"
SMTP_ORDERS_PORT="$smtpOrdersPort"
SMTP_ORDERS_USER="$smtpOrdersUser"

# Admin
ADMIN_USERNAME="$adminUsername"
ADMIN_EMAIL="$adminEmail"

# Payment Methods
ENABLE_STRIPE=$enableStripe
ENABLE_PAYPAL=$enablePaypal
ENABLE_MBWAY=$enableMbway
ENABLE_MULTIBANCO=$enableMultibanco

# Datalix (VPS)
ENABLE_DATALIX=$enableDatalix
DATALIX_API_URL="$datalixApiUrl"
DATALIX_API_KEY="$datalixApiKey"

# Email Server
MAIL_SERVER_ENABLED=$mailServerEnabled
MAIL_HOSTNAME="$mailHostname"
MAIL_DOMAIN="$mailDomain"
MAIL_MAX_ACCOUNTS=$mailMaxAccounts
MAIL_MAX_STORAGE=$mailMaxStorage
MAIL_SPAM_ENABLED=$mailSpam
MAIL_ANTIVIRUS_ENABLED=$mailAntivirus
MAIL_GREYLISTING_ENABLED=$mailGreylisting

# Hosting Server
HOSTING_SERVER_ENABLED=$hostingServerEnabled
HOSTING_WEB_SERVER="$hostingWebServer"
HOSTING_PHP_VERSIONS="$phpVersions"
HOSTING_NODE_VERSIONS="$nodeVersions"
HOSTING_BACKUP_ENABLED=$hostingBackup
HOSTING_BACKUP_PATH="$hostingBackupPath"

# DNS
DNS_ENABLED=$configureDns
DNS_PROVIDER="$dnsProvider"
DNS_API_KEY="$dnsApiKey"
DNS_API_SECRET="$dnsApiSecret"
"@

Set-Content -Path ".env" -Value $envContent -Encoding UTF8
Write-Success "Ficheiro .env criado"

# Update Prisma schema
Write-Info "Configurando base de dados..."
$schemaPath = "prisma/schema.prisma"
$schemaContent = Get-Content $schemaPath -Raw

if ($dbType -eq "postgresql") {
    $schemaContent = $schemaContent -replace 'provider = "sqlite"', 'provider = "postgresql"'
} elseif ($dbType -eq "mysql" -or $dbType -eq "mariadb") {
    $schemaContent = $schemaContent -replace 'provider = "sqlite"', 'provider = "mysql"'
}

Set-Content -Path $schemaPath -Value $schemaContent

# Generate Prisma client
Write-Info "Gerando schema da base de dados..."
if ($pkgManager -eq "bun") {
    bun run db:generate
    bun run db:push
} else {
    npm run db:generate
    npm run db:push
}
Write-Success "Schema da base de dados criado"

# Build application
Write-Info "Compilando aplicação..."
if ($pkgManager -eq "bun") {
    bun run build
} else {
    npm run build
}
Write-Success "Aplicação compilada"

# ==================== WINDOWS SPECIFIC SETUP ====================
if ($isAdmin) {
    # Install IIS if hosting is enabled and IIS is selected
    if ($hostingServerEnabled -and $hostingWebServer -eq "iis") {
        Write-Info "Configurando IIS..."
        try {
            Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -All -NoRestart
            Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer -All -NoRestart
            Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures -All -NoRestart
            Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpCompression -All -NoRestart
            Write-Success "IIS instalado"
        } catch {
            Write-Warning "Não foi possível instalar IIS automaticamente"
        }
    }
    
    # Create backup directory
    if ($hostingBackup -eq 'y' -and $hostingBackupPath) {
        New-Item -ItemType Directory -Force -Path $hostingBackupPath | Out-Null
        Write-Success "Diretório de backups criado: $hostingBackupPath"
    }
    
    # Create scheduled task for backups
    if ($hostingBackup -eq 'y') {
        $backupScript = @"
`$date = Get-Date -Format 'yyyyMMdd'
`$backupDir = "$hostingBackupPath"
Compress-Archive -Path "C:\inetpub\wwwroot\*" -DestinationPath "`$backupDir\backup-`$date.zip" -Force
Get-ChildItem `$backupDir -Filter "*.zip" | Where-Object { `$_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force
"@
        $scriptPath = "$hostingBackupPath\backup.ps1"
        Set-Content -Path $scriptPath -Value $backupScript
        
        $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
        $trigger = New-ScheduledTaskTrigger -Daily -At 2am
        Register-ScheduledTask -TaskName "TechCommerceBackup" -Action $action -Trigger $trigger -RunLevel Highest -Force | Out-Null
        
        Write-Success "Tarefa de backup agendada criada"
    }
}

# ==================== COMPLETION ====================
Write-Section "Instalação Concluída!"

Write-ColorOutput Green @"
╔══════════════════════════════════════════════════════════════════╗
║                    INSTALAÇÃO CONCLUÍDA!                        ║
╚══════════════════════════════════════════════════════════════════╝
"@

Write-Host "`nPara iniciar a aplicação:"
Write-Host "  $pkgManager run start`n"
Write-Host "Para desenvolvimento:"
Write-Host "  $pkgManager run dev`n"
Write-Host "Aceda ao painel em:"
Write-Host "  $companyWebsite`n"

if ($mailServerEnabled) {
    Write-ColorOutput Magenta "══════════════════════════════════════════════════════════════"
    Write-ColorOutput Magenta "  Configuração de Email"
    Write-ColorOutput Magenta "══════════════════════════════════════════════════════════════`n"
    Write-Host "NOTA: Para servidor de email completo (Postfix + Dovecot),"
    Write-Host "      use um servidor Linux ou WSL2.`n"
    Write-Host "Registos DNS necessários para $($mailDomain):"
    Write-Host "  MX     @              $($mailHostname)    (prioridade 10)"
    Write-Host "  A      mail           $serverIp"
    Write-Host "  TXT    @              v=spf1 mx a ip4:$serverIp ~all"
    Write-Host "  TXT    _dmarc         v=DMARC1; p=quarantine`n"
}

if ($hostingServerEnabled) {
    Write-ColorOutput Magenta "══════════════════════════════════════════════════════════════"
    Write-ColorOutput Magenta "  Configuração de Hosting"
    Write-ColorOutput Magenta "══════════════════════════════════════════════════════════════`n"
    Write-Host "Web Server:        $hostingWebServer"
    Write-Host "Versões PHP:       $phpVersions"
    Write-Host "Versões Node.js:   $nodeVersions"
    
    if ($hostingBackup -eq 'y') {
        Write-Host "Backups:           $hostingBackupPath"
    }
    Write-Host ""
}

Write-Host "Próximos passos:"
Write-Host "  1. Configure os registos DNS (se aplicável)"
Write-Host "  2. Configure os certificados SSL"
Write-Host "  3. Aceda ao painel administrativo"
Write-Host "  4. Configure os métodos de pagamento"
Write-Host "  5. Adicione produtos e serviços"
Write-Host ""

# Offer to start the application
$startNow = Read-Host "Deseja iniciar a aplicação agora? (y/n)"
if ($startNow -eq 'y' -or $startNow -eq 'Y') {
    Write-Info "Iniciando aplicação..."
    Start-Process -FilePath $pkgManager -ArgumentList "run", "dev" -NoNewWindow
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:3000"
}
