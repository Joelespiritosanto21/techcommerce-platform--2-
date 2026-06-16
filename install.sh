#!/bin/bash

# TechCommerce Platform - Automatic Installer
# Version: 2.0
# Author: TechCommerce Team

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logo
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ████████╗███████╗██████╗  ██████╗ ███████╗             ║"
echo "║   ╚══██╔══╝██╔════╝██╔══██╗██╔═══██╗██╔════╝             ║"
echo "║      ██║   █████╗  ██████╔╝██║   ██║███████╗             ║"
echo "║      ██║   ██╔══╝  ██╔══██╗██║   ██║╚════██║             ║"
echo "║      ██║   ███████╗██║  ██║╚██████╔╝███████║             ║"
echo "║      ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝             ║"
echo "║                                                           ║"
echo "║   Ecommerce + CRM + ERP Platform                         ║"
echo "║   Instalador Automático v2.0                             ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Functions
print_step() {
    echo -e "\n${GREEN}▶${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 não está instalado"
        return 1
    fi
    return 0
}

# Check requirements
print_step "Verificando requisitos..."

REQUIREMENTS_MET=true

# Check Node.js
if check_command node; then
    NODE_VERSION=$(node -v)
    print_success "Node.js $NODE_VERSION instalado"
else
    print_warning "Node.js não encontrado"
    REQUIREMENTS_MET=false
fi

# Check Bun or npm
if check_command bun; then
    PKG_MANAGER="bun"
    print_success "Bun instalado"
elif check_command npm; then
    PKG_MANAGER="npm"
    print_success "npm instalado"
else
    print_warning "Nem bun nem npm encontrado"
    REQUIREMENTS_MET=false
fi

# Check for database clients
print_info "Verificando clientes de base de dados..."
DB_OPTIONS=""

if check_command mysql; then
    print_success "MySQL client disponível"
    DB_OPTIONS="$DB_OPTIONS mysql"
fi

if check_command psql; then
    print_success "PostgreSQL client disponível"
    DB_OPTIONS="$DB_OPTIONS postgresql"
fi

if check_command mariadb; then
    print_success "MariaDB client disponível"
    DB_OPTIONS="$DB_OPTIONS mariadb"
fi

if [ -z "$DB_OPTIONS" ]; then
    print_warning "Nenhum cliente de BD encontrado. SQLite será usado (desenvolvimento apenas)"
fi

# Check Docker
if check_command docker; then
    print_success "Docker instalado (opção de deployment disponível)"
    DOCKER_AVAILABLE=true
else
    DOCKER_AVAILABLE=false
fi

if [ "$REQUIREMENTS_MET" = false ]; then
    print_error "Alguns requisitos não foram atendidos. Deseja instalar as dependências em falta?"
    read -p "Instalar dependências automaticamente? (y/n): " INSTALL_DEPS
    
    if [ "$INSTALL_DEPS" = "y" ] || [ "$INSTALL_DEPS" = "Y" ]; then
        print_step "Instalando dependências..."
        
        # Detect OS
        if [ -f /etc/debian_version ]; then
            OS="debian"
            PKG_INSTALL="apt-get install -y"
        elif [ -f /etc/redhat-release ]; then
            OS="redhat"
            PKG_INSTALL="yum install -y"
        elif [ -f /etc/arch-release ]; then
            OS="arch"
            PKG_INSTALL="pacman -S --noconfirm"
        else
            print_error "Sistema operativo não suportado para instalação automática"
            exit 1
        fi
        
        # Install Node.js if missing
        if ! check_command node; then
            print_info "Instalando Node.js 20..."
            if [ "$OS" = "debian" ]; then
                curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
                $PKG_INSTALL nodejs
            elif [ "$OS" = "redhat" ]; then
                curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
                $PKG_INSTALL nodejs
            fi
        fi
        
        # Install Bun if missing
        if ! check_command bun; then
            print_info "Instalando Bun..."
            curl -fsSL https://bun.sh/install | bash
            export PATH="$HOME/.bun/bin:$PATH"
        fi
        
        print_success "Dependências instaladas!"
    else
        print_error "Instalação cancelada. Por favor, instale as dependências em falta."
        exit 1
    fi
fi

# Configuration
print_step "Configuração da Instalação"
echo "================================"

# Company Info
echo -e "\n${YELLOW}Informações da Empresa${NC}"
read -p "Nome da empresa: " COMPANY_NAME
read -p "NIF: " COMPANY_VAT
read -p "Morada: " COMPANY_ADDRESS
read -p "Código Postal: " COMPANY_POSTAL
read -p "Cidade: " COMPANY_CITY
read -p "País [Portugal]: " COMPANY_COUNTRY
COMPANY_COUNTRY=${COMPANY_COUNTRY:-Portugal}
read -p "Telefone: " COMPANY_PHONE
read -p "Email: " COMPANY_EMAIL
read -p "Website: " COMPANY_WEBSITE

# Database Selection
echo -e "\n${YELLOW}Base de Dados${NC}"
echo "Opções disponíveis:"
echo "  1) SQLite (desenvolvimento)"
echo "  2) MySQL"
echo "  3) MariaDB"
echo "  4) PostgreSQL"
read -p "Escolha a base de dados [1-4]: " DB_CHOICE

case $DB_CHOICE in
    1)
        DB_TYPE="sqlite"
        DATABASE_URL="file:./db/techcommerce.db"
        ;;
    2)
        DB_TYPE="mysql"
        read -p "MySQL Host [localhost]: " DB_HOST
        read -p "MySQL Port [3306]: " DB_PORT
        read -p "MySQL Database [techcommerce]: " DB_NAME
        read -p "MySQL User: " DB_USER
        read -s -p "MySQL Password: " DB_PASSWORD
        echo
        DB_HOST=${DB_HOST:-localhost}
        DB_PORT=${DB_PORT:-3306}
        DB_NAME=${DB_NAME:-techcommerce}
        DATABASE_URL="mysql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
        ;;
    3)
        DB_TYPE="mariadb"
        read -p "MariaDB Host [localhost]: " DB_HOST
        read -p "MariaDB Port [3306]: " DB_PORT
        read -p "MariaDB Database [techcommerce]: " DB_NAME
        read -p "MariaDB User: " DB_USER
        read -s -p "MariaDB Password: " DB_PASSWORD
        echo
        DB_HOST=${DB_HOST:-localhost}
        DB_PORT=${DB_PORT:-3306}
        DB_NAME=${DB_NAME:-techcommerce}
        DATABASE_URL="mysql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
        ;;
    4)
        DB_TYPE="postgresql"
        read -p "PostgreSQL Host [localhost]: " DB_HOST
        read -p "PostgreSQL Port [5432]: " DB_PORT
        read -p "PostgreSQL Database [techcommerce]: " DB_NAME
        read -p "PostgreSQL User: " DB_USER
        read -s -p "PostgreSQL Password: " DB_PASSWORD
        echo
        DB_HOST=${DB_HOST:-localhost}
        DB_PORT=${DB_PORT:-5432}
        DB_NAME=${DB_NAME:-techcommerce}
        DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
        ;;
    *)
        print_error "Opção inválida"
        exit 1
        ;;
esac

# Admin Account
echo -e "\n${YELLOW}Conta de Administrador${NC}"
read -p "Username admin [admin]: " ADMIN_USERNAME
read -p "Email admin: " ADMIN_EMAIL
read -s -p "Password admin: " ADMIN_PASSWORD
echo
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}

# SMTP Configuration
echo -e "\n${YELLOW}Configuração SMTP (Encomendas)${NC}"
read -p "SMTP Host: " SMTP_ORDERS_HOST
read -p "SMTP Port [587]: " SMTP_ORDERS_PORT
read -p "SMTP User: " SMTP_ORDERS_USER
read -s -p "SMTP Password: " SMTP_ORDERS_PASSWORD
echo
SMTP_ORDERS_PORT=${SMTP_ORDERS_PORT:-587}

# Payment Methods
echo -e "\n${YELLOW}Métodos de Pagamento${NC}"
read -p "Ativar Stripe? (y/n) [n]: " ENABLE_STRIPE
read -p "Ativar PayPal? (y/n) [n]: " ENABLE_PAYPAL
read -p "Ativar MB Way? (y/n) [n]: " ENABLE_MBWAY
read -p "Ativar Multibanco? (y/n) [n]: " ENABLE_MULTIBANCO

# VPS/Hosting Integration
echo -e "\n${YELLOW}Integrações de Serviços${NC}"
read -p "Integrar Datalix (VPS)? (y/n) [n]: " ENABLE_DATALIX
read -p "Integrar aaPanel (Hosting)? (y/n) [n]: " ENABLE_AAPANEL

# Installation
print_step "Iniciando instalação..."
echo "================================"

# Install dependencies
print_info "Instalando dependências..."
if [ "$PKG_MANAGER" = "bun" ]; then
    bun install
else
    npm install
fi
print_success "Dependências instaladas"

# Create .env file
print_info "Criando configuração..."
cat > .env << EOF
# TechCommerce Platform Configuration
# Generated automatically by installer

# Application
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Database
DATABASE_URL="${DATABASE_URL}"

# Security
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="${COMPANY_WEBSITE:-http://localhost:3000}"

# Company Info
COMPANY_NAME="${COMPANY_NAME}"
COMPANY_VAT="${COMPANY_VAT}"
COMPANY_ADDRESS="${COMPANY_ADDRESS}"
COMPANY_POSTAL="${COMPANY_POSTAL}"
COMPANY_CITY="${COMPANY_CITY}"
COMPANY_COUNTRY="${COMPANY_COUNTRY}"
COMPANY_PHONE="${COMPANY_PHONE}"
COMPANY_EMAIL="${COMPANY_EMAIL}"
COMPANY_WEBSITE="${COMPANY_WEBSITE}"

# SMTP Orders
SMTP_ORDERS_HOST="${SMTP_ORDERS_HOST}"
SMTP_ORDERS_PORT="${SMTP_ORDERS_PORT}"
SMTP_ORDERS_USER="${SMTP_ORDERS_USER}"
SMTP_ORDERS_PASSWORD="${SMTP_ORDERS_PASSWORD}"

# Admin
ADMIN_USERNAME="${ADMIN_USERNAME}"
ADMIN_EMAIL="${ADMIN_EMAIL}"
EOF

print_success "Ficheiro .env criado"

# Update Prisma schema for database type
print_info "Configurando base de dados..."
if [ "$DB_TYPE" = "postgresql" ]; then
    sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
elif [ "$DB_TYPE" = "mysql" ] || [ "$DB_TYPE" = "mariadb" ]; then
    sed -i 's/provider = "sqlite"/provider = "mysql"/' prisma/schema.prisma
fi

# Generate Prisma client and push schema
print_info "Gerando schema da base de dados..."
if [ "$PKG_MANAGER" = "bun" ]; then
    bun run db:generate
    bun run db:push
else
    npm run db:generate
    npm run db:push
fi
print_success "Schema da base de dados criado"

# Build application
print_info "Compilando aplicação..."
if [ "$PKG_MANAGER" = "bun" ]; then
    bun run build
else
    npm run build
fi
print_success "Aplicação compilada"

# Create admin user
print_info "Criando utilizador administrador..."
# This will be done via the installation wizard on first run

print_success "Instalação concluída!"
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                 INSTALAÇÃO CONCLUÍDA!                    ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Para iniciar a aplicação:"
echo "  $PKG_MANAGER run start"
echo ""
echo "Para desenvolvimento:"
echo "  $PKG_MANAGER run dev"
echo ""
echo "Aceda ao wizard de instalação em:"
echo "  ${COMPANY_WEBSITE:-http://localhost:3000}"
echo ""
echo "Complete a configuração inicial para criar a conta de administrador."
echo ""
