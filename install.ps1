# TechCommerce Platform - Automatic Installer for Windows
# Version: 2.0
# Author: TechCommerce Team
# Run as Administrator

$Host.UI.RawUI.WindowTitle = "TechCommerce Platform Installer"

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

# Logo
Clear-Host
Write-ColorOutput Cyan @"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ████████╗███████╗██████╗  ██████╗ ███████╗             ║
║   ╚══██╔══╝██╔════╝██╔══██╗██╔═══██╗██╔════╝             ║
║      ██║   █████╗  ██████╔╝██║   ██║███████╗             ║
║      ██║   ██╔══╝  ██╔══██╗██║   ██║╚════██║             ║
║      ██║   ███████╗██║  ██║╚██████╔╝███████║             ║
║      ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝             ║
║                                                           ║
║   Ecommerce + CRM + ERP Platform                         ║
║   Instalador Automatico v2.0                             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
"@

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning "Recomendado executar como Administrador"
    Write-Host "Prima Enter para continuar ou Ctrl+C para cancelar..."
    Read-Host
}

# Check requirements
Write-Info "`n▶ Verificando requisitos...`n"

# Check Node.js
try {
    $nodeVersion = node -v
    Write-Success "Node.js $nodeVersion instalado"
    $nodeInstalled = $true
} catch {
    Write-Warning "Node.js nao encontrado"
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
    Write-Warning "Git nao encontrado"
}

# Offer to install missing dependencies
if (-not $nodeInstalled -or -not $pkgManager) {
    Write-Warning "`nAlgumas dependencias estao em falta."
    $installDeps = Read-Host "Deseja instalar automaticamente? (y/n)"
    
    if ($installDeps -eq 'y' -or $installDeps -eq 'Y') {
        Write-Info "`nInstalando dependencias...`n"
        
        # Install Node.js using winget or Chocolatey
        if (-not $nodeInstalled) {
            Write-Info "Instalando Node.js 20..."
            try {
                winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
            } catch {
                Write-Warning "winget nao disponivel. Por favor instale Node.js manualmente de https://nodejs.org"
            }
        }
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
}

# Configuration
Write-Info "`n▶ Configuracao da Instalacao`n"
Write-Host "================================"

# Company Info
Write-ColorOutput Yellow "`nInformacoes da Empresa`n"
$companyName = Read-Host "Nome da empresa"
$companyVat = Read-Host "NIF"
$companyAddress = Read-Host "Morada"
$companyPostal = Read-Host "Codigo Postal"
$companyCity = Read-Host "Cidade"
$companyCountry = if (($tmp = Read-Host "Pais [Portugal]")) { $tmp } else { "Portugal" }
$companyPhone = Read-Host "Telefone"
$companyEmail = Read-Host "Email"
$companyWebsite = Read-Host "Website"

# Database Selection
Write-ColorOutput Yellow "`nBase de Dados`n"
Write-Host "Opcoes disponiveis:"
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
        Write-Error "Opcao invalida"
        exit 1
    }
}

# Admin Account
Write-ColorOutput Yellow "`nConta de Administrador`n"
$adminUsername = if (($tmp = Read-Host "Username admin [admin]")) { $tmp } else { "admin" }
$adminEmail = Read-Host "Email admin"
$adminPassword = Read-Host "Password admin" -AsSecureString

# SMTP Configuration
Write-ColorOutput Yellow "`nConfiguracao SMTP (Encomendas)`n"
$smtpOrdersHost = Read-Host "SMTP Host"
$smtpOrdersPort = if (($tmp = Read-Host "SMTP Port [587]")) { $tmp } else { "587" }
$smtpOrdersUser = Read-Host "SMTP User"
$smtpOrdersPassword = Read-Host "SMTP Password" -AsSecureString

# Payment Methods
Write-ColorOutput Yellow "`nMetodos de Pagamento`n"
$enableStripe = Read-Host "Ativar Stripe? (y/n) [n]"
$enablePaypal = Read-Host "Ativar PayPal? (y/n) [n]"
$enableMbway = Read-Host "Ativar MB Way? (y/n) [n]"
$enableMultibanco = Read-Host "Ativar Multibanco? (y/n) [n]"

# VPS/Hosting Integration
Write-ColorOutput Yellow "`nIntegracoes de Servicos`n"
$enableDatalix = Read-Host "Integrar Datalix (VPS)? (y/n) [n]"
$enableAapanel = Read-Host "Integrar aaPanel (Hosting)? (y/n) [n]"

# Installation
Write-Info "`n▶ Iniciando instalacao...`n"
Write-Host "================================"

# Install dependencies
Write-Info "Instalando dependencias..."
if ($pkgManager -eq "bun") {
    bun install
} else {
    npm install
}
Write-Success "Dependencias instaladas"

# Generate secret
$nextauthSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })

# Create .env file
Write-Info "Criando configuracao..."
$envContent = @"
# TechCommerce Platform Configuration
# Generated automatically by installer

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

# SMTP Orders
SMTP_ORDERS_HOST="$smtpOrdersHost"
SMTP_ORDERS_PORT="$smtpOrdersPort"
SMTP_ORDERS_USER="$smtpOrdersUser"

# Admin
ADMIN_USERNAME="$adminUsername"
ADMIN_EMAIL="$adminEmail"
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
Write-Info "Compilando aplicacao..."
if ($pkgManager -eq "bun") {
    bun run build
} else {
    npm run build
}
Write-Success "Aplicacao compilada"

# Done
Write-Success "`nInstalacao concluida!`n"
Write-ColorOutput Green @"
╔═══════════════════════════════════════════════════════════╗
║                 INSTALACAO CONCLUIDA!                    ║
╚═══════════════════════════════════════════════════════════╝
"@

Write-Host "`nPara iniciar a aplicacao:"
Write-Host "  $pkgManager run start`n"
Write-Host "Para desenvolvimento:"
Write-Host "  $pkgManager run dev`n"
Write-Host "Aceda ao wizard de instalacao em:"
Write-Host "  $companyWebsite`n"
Write-Host "Complete a configuracao inicial para criar a conta de administrador.`n"

# Offer to start the application
$startNow = Read-Host "Deseja iniciar a aplicacao agora? (y/n)"
if ($startNow -eq 'y' -or $startNow -eq 'Y') {
    Write-Info "Iniciando aplicacao..."
    Start-Process -FilePath $pkgManager -ArgumentList "run", "dev" -NoNewWindow
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:3000"
}
