# TechCommerce Platform

Enterprise-grade Ecommerce + CRM + ERP platform for IT companies with built-in Hosting and VPS management.

## Features

### Customer Storefront
- Modern, responsive design
- Product catalog with categories and brands
- Advanced search and filtering
- Product detail pages with images and specifications
- Shopping cart with persistence (localStorage)
- Checkout flow with multiple payment methods
- Repair service request form
- Contact page
- Newsletter subscription

### E-Commerce
- Product catalog with categories, brands, and variants
- Inventory management with multi-warehouse support
- Shopping cart and wishlist
- Product reviews and questions
- Flash sales and promotions
- SEO optimization

### Order Management
- Order creation and tracking
- Multiple payment methods (Stripe, PayPal, MB Way, Multibanco, Ifthenpay)
- Shipping integration
- Order status workflow
- Invoice generation

### Repair Center
- Repair sheet management
- Device tracking with serial/IMEI
- QR code and barcode generation
- Status tracking for customers
- Photo uploads
- Technician assignment

### CRM
- Customer management
- Leads and opportunities
- Follow-ups and notes
- Customer history

### ERP
- Invoice management
- Proformas and credit notes
- Supplier management
- Purchase orders
- Financial reporting

### Support
- Ticketing system with departments
- SLA tracking
- Email notifications
- Internal notes

### Warranty Management
- Product warranties
- Service warranties
- Warranty claims
- Expiration tracking

### RMA
- Return merchandise authorization
- Approval workflow
- Credit note generation

### 🆕 Hosting Management (Built-in)
**Sistema próprio de gestão de hosting - sem dependências de terceiros!**

- **Suporte a múltiplos tipos de sites:**
  - Node.js applications
  - PHP websites (com PHP-FPM)
  - Static sites (HTML/CSS/JS)
  - Python applications (Flask/Django)
  - Reverse proxy

- **SSL Automático:**
  - Let's Encrypt integration
  - Renovação automática
  - HTTPS forçado

- **Gestão de Processos:**
  - Auto-start on boot
  - Auto-restart on crash
  - Resource monitoring (CPU/RAM)

- **Bases de Dados:**
  - MySQL/MariaDB
  - PostgreSQL
  - MongoDB
  - Redis

- **Backups Automáticos:**
  - Backups agendados
  - Backups manuais
  - Restore fácil

- **FTP/SFTP:**
  - Contas isoladas por cliente
  - Quotas de disco
  - Chroot jail (segurança)

### 🆕 VPS Management (Datalix Integration)
- Integration with Datalix.eu API
- VPS provisioning
- Power management (start/stop/restart)
- Password reset
- Metrics monitoring
- Plan management

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (development) / MySQL / PostgreSQL (production)
- **Hosting**: Caddy (reverse proxy), PM2 (process management)
- **Cache**: Redis
- **Deployment**: Docker, Nginx

## Installation

### Automatic Installation (Recommended)

#### Linux/macOS:
```bash
chmod +x install.sh
./install.sh
```

#### Windows (PowerShell as Administrator):
```powershell
Set-ExecutionPolicy RemoteSigned
.\install.ps1
```

The installer will:
1. Check and install dependencies (Node.js, Bun)
2. Ask for database type (SQLite, MySQL, MariaDB, PostgreSQL)
3. Configure database connection
4. Ask for company information
5. Create admin account
6. Configure SMTP
7. Enable payment methods
8. Build and start the application

### Manual Installation

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Initialize database
bun run db:push

# Start development server
bun run dev
```

### Production Deployment

```bash
# Build and start with Docker
docker-compose up -d

# Or build manually
bun run build
bun run start
```

## Hosting Service Setup

To enable the built-in hosting management:

```bash
# Install required system packages
sudo apt install caddy mysql-server redis-server

# Start the hosting daemon
bun run scripts/hosting-daemon.ts

# Or use PM2 for production
pm2 start scripts/hosting-daemon.ts --name hosting-service
pm2 save
```

### Hosting Configuration

Set these environment variables:

```env
HOSTING_CONFIG_PATH=/etc/techcommerce/hosting
HOSTING_SITES_PATH=/var/www
HOSTING_LOGS_PATH=/var/log/techcommerce
HOSTING_BACKUPS_PATH=/var/backups/techcommerce
CADDY_CONFIG_PATH=/etc/caddy
```

## Configuration

### Environment Variables

See `.env.example` for all configuration options:

- Database connection (SQLite, MySQL, MariaDB, PostgreSQL)
- Redis URL
- SMTP settings (orders and support)
- Payment gateway credentials
- Datalix API credentials (VPS)
- Security settings

### Installation Wizard

On first access, the platform will guide you through:
1. Company information
2. Database configuration
3. SMTP for orders
4. SMTP for support
5. Payment methods
6. Admin account creation

## API Documentation

See `API_DOCUMENTATION.md` for complete API reference.

### Main API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/settings` | System configuration |
| `/api/products` | Product management |
| `/api/orders` | Order management |
| `/api/customers` | Customer management |
| `/api/hosting` | Hosting management |
| `/api/vps` | VPS management |
| `/api/repairs` | Repair tracking |
| `/api/tickets` | Support tickets |

## Multi-Language Support

Supported languages:
- English (en)
- Portuguese (pt)
- Spanish (es)
- French (fr)

## Security

- JWT-based authentication
- Role-based access control (RBAC)
- Two-factor authentication (2FA)
- CSRF protection
- Rate limiting
- Audit logging
- Activity logging

## Payment Methods

- Stripe (Credit/Debit cards)
- PayPal
- MB Way (Portugal)
- Multibanco (Portugal)
- Ifthenpay (Portugal)
- Bank Transfer

## Legal Pages (Portugal Compliant)

The platform includes all required legal pages:
- Termos e Condições
- Política de Privacidade (RGPD)
- Livro de Reclamações (link oficial)
- Resolução de Litígios (CNIACC, ODR)
- Política de Cookies
- Política de Garantia
- Política de Devoluções

## Project Structure

```
techcommerce/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── legal/         # Legal pages
│   │   └── page.tsx       # Main application
│   ├── components/ui/     # UI components (shadcn)
│   └── lib/
│       ├── hosting/       # Hosting management system
│       ├── datalix.ts     # Datalix API client
│       └── aapanel.ts     # aaPanel API client (optional)
├── scripts/
│   └── hosting-daemon.ts  # Background hosting service
├── install.sh             # Linux/macOS installer
├── install.ps1            # Windows installer
├── docker-compose.yml     # Docker configuration
└── Dockerfile             # Production container
```

## License

MIT License

## Support

For issues and feature requests, please use the GitHub issue tracker.
