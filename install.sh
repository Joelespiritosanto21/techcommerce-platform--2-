#!/bin/bash

# TechCommerce Platform - Automatic Installer
# Version: 3.0 - Complete Installation with Email Server
# Author: TechCommerce Team

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logo
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                    ║"
echo "║   ████████╗███████╗██████╗  ██████╗ ███████╗                      ║"
echo "║   ╚══██╔══╝██╔════╝██╔══██╗██╔═══██╗██╔════╝                      ║"
echo "║      ██║   █████╗  ██████╔╝██║   ██║███████╗                      ║"
echo "║      ██║   ██╔══╝  ██╔══██╗██║   ██║╚════██║                      ║"
echo "║      ██║   ███████╗██║  ██║╚██████╔╝███████║                      ║"
echo "║      ╚═╝   ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝                      ║"
echo "║                                                                    ║"
echo "║   Ecommerce + CRM + ERP + Email Server Platform                   ║"
echo "║   Instalador Automático v3.0                                      ║"
echo "║                                                                    ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
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

print_section() {
    echo -e "\n${PURPLE}══════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}══════════════════════════════════════════════════════════════${NC}\n"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 não está instalado"
        return 1
    fi
    return 0
}

get_server_ip() {
    curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || hostname -I | awk '{print $1}'
}

# Detect OS
detect_os() {
    if [ -f /etc/debian_version ]; then
        OS="debian"
        PKG_UPDATE="apt-get update"
        PKG_INSTALL="apt-get install -y"
        PKG_MANAGER="apt-get"
    elif [ -f /etc/redhat-release ]; then
        OS="redhat"
        PKG_UPDATE="yum update -y"
        PKG_INSTALL="yum install -y"
        PKG_MANAGER="yum"
    elif [ -f /etc/arch-release ]; then
        OS="arch"
        PKG_UPDATE="pacman -Sy"
        PKG_INSTALL="pacman -S --noconfirm"
        PKG_MANAGER="pacman"
    else
        print_error "Sistema operativo não suportado"
        exit 1
    fi
    print_info "Sistema operativo detectado: $OS"
}

# ==================== CHECK REQUIREMENTS ====================
print_section "Verificação de Requisitos"

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
    PKG_MANAGER_APP="bun"
    print_success "Bun instalado"
elif check_command npm; then
    PKG_MANAGER_APP="npm"
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

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    IS_ROOT=true
    print_info "Executando como root - pode instalar serviços"
else
    IS_ROOT=false
    print_warning "Não executando como root - alguns serviços podem não ser instalados"
fi

# ==================== INSTALL DEPENDENCIES ====================
if [ "$REQUIREMENTS_MET" = false ]; then
    print_error "Alguns requisitos não foram atendidos. Deseja instalar as dependências em falta?"
    read -p "Instalar dependências automaticamente? (y/n): " INSTALL_DEPS
    
    if [ "$INSTALL_DEPS" = "y" ] || [ "$INSTALL_DEPS" = "Y" ]; then
        detect_os
        print_step "Instalando dependências..."
        
        $PKG_UPDATE
        
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
        
        PKG_MANAGER_APP="bun"
        print_success "Dependências instaladas!"
    else
        print_error "Instalação cancelada. Por favor, instale as dependências em falta."
        exit 1
    fi
fi

# ==================== COMPANY CONFIGURATION ====================
print_section "Configuração da Empresa"

echo -e "${YELLOW}Informações da Empresa${NC}"
read -p "Nome da empresa: " COMPANY_NAME
read -p "NIF: " COMPANY_VAT
read -p "Morada: " COMPANY_ADDRESS
read -p "Código Postal: " COMPANY_POSTAL
read -p "Cidade: " COMPANY_CITY
read -p "País [Portugal]: " COMPANY_COUNTRY
COMPANY_COUNTRY=${COMPANY_COUNTRY:-Portugal}
read -p "Telefone: " COMPANY_PHONE
read -p "Email: " COMPANY_EMAIL
read -p "Website (ex: https://empresa.pt): " COMPANY_WEBSITE

# Get server IP
SERVER_IP=$(get_server_ip)
print_info "IP do servidor detectado: $SERVER_IP"

# ==================== DATABASE CONFIGURATION ====================
print_section "Configuração da Base de Dados"

echo -e "${YELLOW}Base de Dados${NC}"
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

# ==================== ADMIN ACCOUNT ====================
print_section "Conta de Administrador"

echo -e "${YELLOW}Conta de Administrador${NC}"
read -p "Username admin [admin]: " ADMIN_USERNAME
read -p "Email admin: " ADMIN_EMAIL
read -s -p "Password admin: " ADMIN_PASSWORD
echo
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}

# ==================== SMTP CONFIGURATION ====================
print_section "Configuração SMTP (Encomendas)"

echo -e "${YELLOW}SMTP para Notificações${NC}"
read -p "Configurar SMTP? (y/n) [y]: " CONFIGURE_SMTP
CONFIGURE_SMTP=${CONFIGURE_SMTP:-y}

if [ "$CONFIGURE_SMTP" = "y" ] || [ "$CONFIGURE_SMTP" = "Y" ]; then
    read -p "SMTP Host: " SMTP_ORDERS_HOST
    read -p "SMTP Port [587]: " SMTP_ORDERS_PORT
    read -p "SMTP User: " SMTP_ORDERS_USER
    read -s -p "SMTP Password: " SMTP_ORDERS_PASSWORD
    echo
    SMTP_ORDERS_PORT=${SMTP_ORDERS_PORT:-587}
else
    SMTP_ORDERS_HOST=""
    SMTP_ORDERS_PORT="587"
    SMTP_ORDERS_USER=""
    SMTP_ORDERS_PASSWORD=""
fi

# ==================== PAYMENT METHODS ====================
print_section "Métodos de Pagamento"

echo -e "${YELLOW}Métodos de Pagamento${NC}"
read -p "Ativar Stripe? (y/n) [n]: " ENABLE_STRIPE
read -p "Ativar PayPal? (y/n) [n]: " ENABLE_PAYPAL
read -p "Ativar MB Way? (y/n) [n]: " ENABLE_MBWAY
read -p "Ativar Multibanco? (y/n) [n]: " ENABLE_MULTIBANCO

# ==================== VPS/HOSTING SERVICES ====================
print_section "Serviços de Hosting"

echo -e "${YELLOW}Integrações de Serviços${NC}"
read -p "Integrar Datalix (VPS)? (y/n) [n]: " ENABLE_DATALIX

if [ "$ENABLE_DATALIX" = "y" ] || [ "$ENABLE_DATALIX" = "Y" ]; then
    read -p "Datalix API URL [https://api.datalix.eu]: " DATALIX_API_URL
    read -p "Datalix API Key: " DATALIX_API_KEY
    DATALIX_API_URL=${DATALIX_API_URL:-https://api.datalix.eu}
fi

# ==================== EMAIL SERVER ====================
print_section "Servidor de Email"

echo -e "${YELLOW}Servidor de Email Próprio (Postfix + Dovecot)${NC}"
echo "O servidor de email permite criar contas de email personalizadas para os seus clientes."
read -p "Instalar servidor de email? (y/n) [n]: " INSTALL_MAIL_SERVER

if [ "$INSTALL_MAIL_SERVER" = "y" ] || [ "$INSTALL_MAIL_SERVER" = "Y" ]; then
    if [ "$IS_ROOT" = true ]; then
        MAIL_SERVER_ENABLED=true
        read -p "Hostname do servidor de email [mail.$(echo $COMPANY_WEBSITE | sed 's|https\?://||' | cut -d'/' -f1)]: " MAIL_HOSTNAME
        MAIL_HOSTNAME=${MAIL_HOSTNAME:-mail.$(echo $COMPANY_WEBSITE | sed 's|https\?://||' | cut -d'/' -f1)}
        
        read -p "Domínio principal de email [$(echo $COMPANY_WEBSITE | sed 's|https\?://||' | cut -d'/' -f1)]: " MAIL_DOMAIN
        MAIL_DOMAIN=${MAIL_DOMAIN:-$(echo $COMPANY_WEBSITE | sed 's|https\?://||' | cut -d'/' -f1)}
        
        read -p "Número máximo de contas por domínio [10]: " MAIL_MAX_ACCOUNTS
        MAIL_MAX_ACCOUNTS=${MAIL_MAX_ACCOUNTS:-10}
        
        read -p "Armazenamento máximo por domínio (GB) [10]: " MAIL_MAX_STORAGE
        MAIL_MAX_STORAGE=${MAIL_MAX_STORAGE:-10}
        
        echo -e "\n${CYAN}Funcionalidades de Segurança${NC}"
        read -p "Ativar SpamAssassin? (y/n) [y]: " MAIL_SPAM
        read -p "Ativar Antivirus (ClamAV)? (y/n) [y]: " MAIL_ANTIVIRUS
        read -p "Ativar Greylisting? (y/n) [y]: " MAIL_GREYLISTING
        
        MAIL_SPAM=${MAIL_SPAM:-y}
        MAIL_ANTIVIRUS=${MAIL_ANTIVIRUS:-y}
        MAIL_GREYLISTING=${MAIL_GREYLISTING:-y}
    else
        print_warning "Necessita de executar como root para instalar o servidor de email"
        MAIL_SERVER_ENABLED=false
    fi
else
    MAIL_SERVER_ENABLED=false
fi

# ==================== HOSTING SERVER ====================
print_section "Servidor de Hosting"

echo -e "${YELLOW}Sistema de Hosting Próprio${NC}"
echo "Permite alojar websites PHP, Node.js, Python, etc."
read -p "Instalar sistema de hosting? (y/n) [n]: " INSTALL_HOSTING

if [ "$INSTALL_HOSTING" = "y" ] || [ "$INSTALL_HOSTING" = "Y" ]; then
    if [ "$IS_ROOT" = true ]; then
        HOSTING_SERVER_ENABLED=true
        
        echo -e "\n${CYAN}Web Server${NC}"
        echo "  1) Nginx (recomendado)"
        echo "  2) Apache"
        read -p "Escolha o web server [1]: " WEB_SERVER_CHOICE
        
        case $WEB_SERVER_CHOICE in
            2) HOSTING_WEB_SERVER="apache" ;;
            *) HOSTING_WEB_SERVER="nginx" ;;
        esac
        
        echo -e "\n${CYAN}Versões PHP${NC}"
        read -p "Versões PHP a instalar (separadas por vírgula) [8.1,8.2,8.3]: " PHP_VERSIONS
        PHP_VERSIONS=${PHP_VERSIONS:-8.1,8.2,8.3}
        
        echo -e "\n${CYAN}Versões Node.js${NC}"
        read -p "Versões Node.js a instalar (separadas por vírgula) [18,20,22]: " NODE_VERSIONS
        NODE_VERSIONS=${NODE_VERSIONS:-18,20,22}
        
        echo -e "\n${CYAN}Certificados SSL${NC}"
        echo "  1) Let's Encrypt (gratuito, automático)"
        echo "  2) Custom (manual)"
        read -p "Escolha o provider SSL [1]: " SSL_CHOICE
        
        case $SSL_CHOICE in
            2) HOSTING_SSL_PROVIDER="custom" ;;
            *) HOSTING_SSL_PROVIDER="letsencrypt" ;;
        esac
        
        read -p "Ativar backups automáticos? (y/n) [y]: " HOSTING_BACKUP
        HOSTING_BACKUP=${HOSTING_BACKUP:-y}
        
        if [ "$HOSTING_BACKUP" = "y" ]; then
            read -p "Caminho para backups [/var/backups/hosting]: " HOSTING_BACKUP_PATH
            HOSTING_BACKUP_PATH=${HOSTING_BACKUP_PATH:-/var/backups/hosting}
        fi
    else
        print_warning "Necessita de executar como root para instalar o servidor de hosting"
        HOSTING_SERVER_ENABLED=false
    fi
else
    HOSTING_SERVER_ENABLED=false
fi

# ==================== DNS CONFIGURATION ====================
print_section "Configuração DNS"

echo -e "${YELLOW}Gestão de DNS${NC}"
read -p "Integrar com provider DNS? (y/n) [n]: " CONFIGURE_DNS

if [ "$CONFIGURE_DNS" = "y" ] || [ "$CONFIGURE_DNS" = "Y" ]; then
    echo "  1) Cloudflare"
    echo "  2) Route53 (AWS)"
    echo "  3) DigitalOcean"
    echo "  4) Custom API"
    read -p "Escolha o provider DNS [1]: " DNS_PROVIDER_CHOICE
    
    case $DNS_PROVIDER_CHOICE in
        1) DNS_PROVIDER="cloudflare" ;;
        2) DNS_PROVIDER="route53" ;;
        3) DNS_PROVIDER="digitalocean" ;;
        4) DNS_PROVIDER="custom" ;;
        *) DNS_PROVIDER="cloudflare" ;;
    esac
    
    read -p "DNS API Key: " DNS_API_KEY
    read -p "DNS API Secret: " DNS_API_SECRET
else
    DNS_PROVIDER=""
    DNS_API_KEY=""
    DNS_API_SECRET=""
fi

# ==================== INSTALLATION ====================
print_section "Instalação"

print_step "Iniciando instalação..."

# Install dependencies
print_info "Instalando dependências..."
if [ "$PKG_MANAGER_APP" = "bun" ]; then
    bun install
else
    npm install
fi
print_success "Dependências instaladas"

# Create .env file
print_info "Criando configuração..."
cat > .env << EOF
# TechCommerce Platform Configuration
# Generated automatically by installer v3.0

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
SERVER_IP="${SERVER_IP}"

# SMTP Orders
SMTP_ORDERS_HOST="${SMTP_ORDERS_HOST}"
SMTP_ORDERS_PORT="${SMTP_ORDERS_PORT}"
SMTP_ORDERS_USER="${SMTP_ORDERS_USER}"
SMTP_ORDERS_PASSWORD="${SMTP_ORDERS_PASSWORD}"

# Admin
ADMIN_USERNAME="${ADMIN_USERNAME}"
ADMIN_EMAIL="${ADMIN_EMAIL}"

# Payment Methods
ENABLE_STRIPE=${ENABLE_STRIPE}
ENABLE_PAYPAL=${ENABLE_PAYPAL}
ENABLE_MBWAY=${ENABLE_MBWAY}
ENABLE_MULTIBANCO=${ENABLE_MULTIBANCO}

# Datalix (VPS)
ENABLE_DATALIX=${ENABLE_DATALIX}
DATALIX_API_URL="${DATALIX_API_URL:-}"
DATALIX_API_KEY="${DATALIX_API_KEY:-}"

# Email Server
MAIL_SERVER_ENABLED=${MAIL_SERVER_ENABLED:-false}
MAIL_HOSTNAME="${MAIL_HOSTNAME:-}"
MAIL_DOMAIN="${MAIL_DOMAIN:-}"
MAIL_MAX_ACCOUNTS=${MAIL_MAX_ACCOUNTS:-10}
MAIL_MAX_STORAGE=${MAIL_MAX_STORAGE:-10}
MAIL_SPAM_ENABLED=${MAIL_SPAM:-y}
MAIL_ANTIVIRUS_ENABLED=${MAIL_ANTIVIRUS:-y}
MAIL_GREYLISTING_ENABLED=${MAIL_GREYLISTING:-y}

# Hosting Server
HOSTING_SERVER_ENABLED=${HOSTING_SERVER_ENABLED:-false}
HOSTING_WEB_SERVER="${HOSTING_WEB_SERVER:-nginx}"
HOSTING_PHP_VERSIONS="${PHP_VERSIONS:-}"
HOSTING_NODE_VERSIONS="${NODE_VERSIONS:-}"
HOSTING_SSL_PROVIDER="${HOSTING_SSL_PROVIDER:-letsencrypt}"
HOSTING_BACKUP_ENABLED=${HOSTING_BACKUP:-n}
HOSTING_BACKUP_PATH="${HOSTING_BACKUP_PATH:-}"

# DNS
DNS_ENABLED=${CONFIGURE_DNS:-n}
DNS_PROVIDER="${DNS_PROVIDER:-}"
DNS_API_KEY="${DNS_API_KEY:-}"
DNS_API_SECRET="${DNS_API_SECRET:-}"
EOF

print_success "Ficheiro .env criado"

# Update Prisma schema for database type
print_info "Configurando base de dados..."
if [ "$DB_TYPE" = "postgresql" ]; then
    sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
elif [ "$DB_TYPE" = "mysql" ] || [ "$DB_TYPE" = "mariadb" ]; then
    sed -i 's/provider = "sqlite"/provider = "mysql"/' prisma/schema.prisma
fi

# Create database if it doesn't exist (PostgreSQL/MySQL)
if [ "$DB_TYPE" = "postgresql" ]; then
    print_info "Verificando se a base de dados PostgreSQL existe..."
    DB_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")
    
    if [ "$DB_EXISTS" != "1" ]; then
        print_info "Criando base de dados PostgreSQL '$DB_NAME'..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\" ENCODING 'UTF8'" || {
            print_warning "Não foi possível criar a base de dados automaticamente"
            print_info "Por favor, crie a base de dados manualmente: CREATE DATABASE $DB_NAME;"
        }
    else
        print_success "Base de dados PostgreSQL '$DB_NAME' já existe"
    fi
elif [ "$DB_TYPE" = "mysql" ] || [ "$DB_TYPE" = "mariadb" ]; then
    print_info "Verificando se a base de dados MySQL/MariaDB existe..."
    DB_EXISTS=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SHOW DATABASES LIKE '$DB_NAME'" 2>/dev/null | grep "$DB_NAME" || echo "")
    
    if [ -z "$DB_EXISTS" ]; then
        print_info "Criando base de dados MySQL/MariaDB '$DB_NAME'..."
        mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" || {
            print_warning "Não foi possível criar a base de dados automaticamente"
            print_info "Por favor, crie a base de dados manualmente: CREATE DATABASE $DB_NAME;"
        }
    else
        print_success "Base de dados MySQL/MariaDB '$DB_NAME' já existe"
    fi
fi

# Generate Prisma client and push schema
print_info "Gerando schema da base de dados..."
if [ "$PKG_MANAGER_APP" = "bun" ]; then
    bun run db:generate
    bun run db:push
else
    npm run db:generate
    npm run db:push
fi
print_success "Schema da base de dados criado"

# ==================== INSTALL SERVER SERVICES ====================
if [ "$IS_ROOT" = true ]; then
    
    # Install Email Server
    if [ "$MAIL_SERVER_ENABLED" = true ]; then
        print_step "Instalando servidor de email..."
        
        detect_os
        $PKG_UPDATE
        
        # Install Postfix, Dovecot, and related packages
        if [ "$OS" = "debian" ]; then
            DEBIAN_FRONTEND=noninteractive $PKG_INSTALL postfix postfix-mysql dovecot-core dovecot-imapd dovecot-pop3d dovecot-lmtpd dovecot-mysql
            
            if [ "$MAIL_SPAM" = "y" ]; then
                $PKG_INSTALL spamassassin spamc
            fi
            
            if [ "$MAIL_ANTIVIRUS" = "y" ]; then
                $PKG_INSTALL clamav clamav-daemon
            fi
            
            $PKG_INSTALL opendkim opendkim-tools
        elif [ "$OS" = "redhat" ]; then
            $PKG_INSTALL postfix dovecot
            
            if [ "$MAIL_SPAM" = "y" ]; then
                $PKG_INSTALL spamassassin
            fi
            
            if [ "$MAIL_ANTIVIRUS" = "y" ]; then
                $PKG_INSTALL clamav clamav-update
            fi
            
            $PKG_INSTALL opendkim
        fi
        
        # Configure Postfix
        print_info "Configurando Postfix..."
        postconf -e "myhostname = $MAIL_HOSTNAME"
        postconf -e "mydomain = $MAIL_DOMAIN"
        postconf -e "myorigin = \$mydomain"
        postconf -e "inet_interfaces = all"
        postconf -e "inet_protocols = all"
        postconf -e "mydestination = localhost"
        postconf -e "home_mailbox = Maildir/"
        postconf -e "smtpd_tls_cert_file = /etc/ssl/certs/ssl-cert-snakeoil.pem"
        postconf -e "smtpd_tls_key_file = /etc/ssl/private/ssl-cert-snakeoil.key"
        postconf -e "smtpd_use_tls = yes"
        postconf -e "smtpd_sasl_auth_enable = yes"
        postconf -e "smtpd_sasl_type = dovecot"
        postconf -e "smtpd_sasl_path = private/auth"
        
        # Create vmail user and directories
        useradd -r -d /var/vmail -s /sbin/nologin vmail 2>/dev/null || true
        mkdir -p /var/vmail/domains
        chown -R vmail:vmail /var/vmail
        
        # Configure Dovecot
        print_info "Configurando Dovecot..."
        cat > /etc/dovecot/conf.d/99-techcommerce.conf << DOVECOT_EOF
mail_location = maildir:/var/vmail/domains/%d/%n/Maildir
mail_uid = vmail
mail_gid = vmail

ssl = required

auth_mechanisms = plain login

passdb {
  driver = passwd-file
  args = /etc/dovecot/users
}

userdb {
  driver = static
  args = uid=vmail gid=vmail home=/var/vmail/domains/%d/%n
}

service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0666
    user = postfix
    group = postfix
  }
}

protocol imap {
  imap_client_workarounds = delay-newmail tb-extra-mailbox-sep
}

protocol pop3 {
  pop3_client_workarounds = outlook-no-nuls oe-ns-eoh
}
DOVECOT_EOF

        # Create users file
        touch /etc/dovecot/users
        
        # Enable services
        systemctl enable postfix dovecot
        systemctl restart postfix dovecot
        
        # Open firewall ports
        if command -v ufw &> /dev/null; then
            ufw allow 25/tcp
            ufw allow 587/tcp
            ufw allow 465/tcp
            ufw allow 143/tcp
            ufw allow 993/tcp
            ufw allow 110/tcp
            ufw allow 995/tcp
        fi
        
        print_success "Servidor de email instalado"
    fi
    
    # Install Hosting Server
    if [ "$HOSTING_SERVER_ENABLED" = true ]; then
        print_step "Instalando servidor de hosting..."
        
        detect_os
        
        if [ "$HOSTING_WEB_SERVER" = "nginx" ]; then
            $PKG_INSTALL nginx
            
            # Install PHP versions
            if [ -n "$PHP_VERSIONS" ]; then
                IFS=',' read -ra PHP_VERS <<< "$PHP_VERSIONS"
                for ver in "${PHP_VERS[@]}"; do
                    ver=$(echo "$ver" | tr -d ' ')
                    if [ "$OS" = "debian" ]; then
                        $PKG_INSTALL php${ver} php${ver}-fpm php${ver}-mysql php${ver}-curl php${ver}-gd php${ver}-mbstring php${ver}-xml php${ver}-zip
                    fi
                done
            fi
            
            # Create directories
            mkdir -p /var/www/sites
            mkdir -p /etc/nginx/sites-available
            mkdir -p /etc/nginx/sites-enabled
            
            # Configure Nginx
            cat > /etc/nginx/nginx.conf << 'NGINX_EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    gzip on;
    gzip_disable "msie6";
    
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
NGINX_EOF
            
            systemctl enable nginx
            systemctl restart nginx
            
        else
            $PKG_INSTALL apache2 libapache2-mod-php
            
            # Enable modules
            a2enmod rewrite ssl proxy proxy_http
            
            systemctl enable apache2
            systemctl restart apache2
        fi
        
        # Install Node.js versions using nvm for hosting
        if [ -n "$NODE_VERSIONS" ]; then
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
            
            IFS=',' read -ra NODE_VERS <<< "$NODE_VERSIONS"
            for ver in "${NODE_VERS[@]}"; do
                ver=$(echo "$ver" | tr -d ' ')
                nvm install $ver
            done
        fi
        
        # Install SSL certificates (Let's Encrypt)
        if [ "$HOSTING_SSL_PROVIDER" = "letsencrypt" ]; then
            $PKG_INSTALL certbot python3-certbot-nginx
            
            # Setup auto-renewal
            (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
        fi
        
        # Setup backups
        if [ "$HOSTING_BACKUP" = "y" ]; then
            mkdir -p "$HOSTING_BACKUP_PATH"
            
            # Create backup script
            cat > /usr/local/bin/backup-sites.sh << 'BACKUP_EOF'
#!/bin/bash
BACKUP_DIR="${HOSTING_BACKUP_PATH}"
DATE=$(date +%Y%m%d)

# Backup websites
tar -czf $BACKUP_DIR/sites-$DATE.tar.gz /var/www/sites

# Backup databases
mysqldump --all-databases > $BACKUP_DIR/databases-$DATE.sql

# Remove old backups (30 days)
find $BACKUP_DIR -type f -mtime +30 -delete
BACKUP_EOF
            
            chmod +x /usr/local/bin/backup-sites.sh
            
            # Setup daily backup
            (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-sites.sh") | crontab -
        fi
        
        # Open firewall ports
        if command -v ufw &> /dev/null; then
            ufw allow 80/tcp
            ufw allow 443/tcp
            ufw allow 21/tcp  # FTP
        fi
        
        print_success "Servidor de hosting instalado"
    fi
fi

# Build application
print_info "Compilando aplicação..."
if [ "$PKG_MANAGER_APP" = "bun" ]; then
    bun run build
else
    npm run build
fi
print_success "Aplicação compilada"

# ==================== COMPLETION ====================
print_section "Instalação Concluída!"

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    INSTALAÇÃO CONCLUÍDA!                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Para iniciar a aplicação:${NC}"
echo "  $PKG_MANAGER_APP run start"
echo ""
echo -e "${CYAN}Para desenvolvimento:${NC}"
echo "  $PKG_MANAGER_APP run dev"
echo ""
echo -e "${CYAN}Aceda ao painel em:${NC}"
echo "  ${COMPANY_WEBSITE:-http://localhost:3000}"
echo ""

if [ "$MAIL_SERVER_ENABLED" = true ]; then
    echo -e "${PURPLE}══════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}  Configuração de Email${NC}"
    echo -e "${PURPLE}══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Registos DNS necessários para ${MAIL_DOMAIN}:${NC}"
    echo ""
    echo "  MX     @              ${MAIL_HOSTNAME}    (prioridade 10)"
    echo "  A      mail           ${SERVER_IP}"
    echo "  TXT    @              v=spf1 mx a ip4:${SERVER_IP} ~all"
    echo "  TXT    _dmarc         v=DMARC1; p=quarantine; rua=mailto:dmarc@${MAIL_DOMAIN}"
    echo ""
    echo -e "${CYAN}Portas de email:${NC}"
    echo "  SMTP:     25, 587, 465"
    echo "  IMAP:     143, 993"
    echo "  POP3:     110, 995"
    echo ""
fi

if [ "$HOSTING_SERVER_ENABLED" = true ]; then
    echo -e "${PURPLE}══════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}  Configuração de Hosting${NC}"
    echo -e "${PURPLE}══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}Web Server:${NC}        ${HOSTING_WEB_SERVER}"
    echo -e "${CYAN}Versões PHP:${NC}       ${PHP_VERSIONS}"
    echo -e "${CYAN}Versões Node.js:${NC}   ${NODE_VERSIONS}"
    echo -e "${CYAN}SSL Provider:${NC}      ${HOSTING_SSL_PROVIDER}"
    
    if [ "$HOSTING_BACKUP" = "y" ]; then
        echo -e "${CYAN}Backups:${NC}           ${HOSTING_BACKUP_PATH}"
    fi
    echo ""
fi

echo -e "${YELLOW}Próximos passos:${NC}"
echo "  1. Configure os registos DNS (se aplicável)"
echo "  2. Configure os certificados SSL: certbot --nginx"
echo "  3. Aceda ao painel administrativo"
echo "  4. Configure os métodos de pagamento"
echo "  5. Adicione produtos e serviços"
echo ""
