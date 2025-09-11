# Bloom Energy Contract Learning & Rules Management System
## Complete Project Documentation

**Last Updated:** September 7, 2025  
**Version:** 1.0.0  
**Status:** Active Development - Database & Backend Complete

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [API Documentation](#api-documentation)
6. [Setup & Installation](#setup--installation)
7. [Development Workflow](#development-workflow)
8. [Frontend Components](#frontend-components)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Contributing](#contributing)

---

## 🎯 Project Overview

The Bloom Energy Contract Learning & Rules Management System is an AI-powered platform designed to revolutionize energy service contract creation and management. The system transforms a manual 3-day contract creation process into a streamlined 30-minute AI-assisted workflow while extracting and learning business rules for enterprise-wide standardization.

### Core Objectives
- **Accelerate Contract Creation**: Reduce time from 72 hours to 30 minutes
- **Standardize Operations**: Extract and enforce consistent business rules
- **Enable Intelligence**: Learn from every contract to improve future agreements
- **Reduce Costs**: Cut per-contract cost from $500 to $50
- **Integrate Systems**: Connect with Bloom Configurator and Management Platform

### Key Features Implemented ✅
- 7-tab contract configuration interface with validation
- Contract library with advanced search and filtering
- Template system for rapid contract creation
- Comparison tool for analyzing multiple contracts
- AI Assistant interface (UI complete, backend integration pending)
- Document upload system with progress tracking
- Comprehensive analytics dashboard
- PostgreSQL database with full schema
- RESTful API with CRUD operations

### Features In Development 🚧
- Full Anthropic Claude API integration
- AWS Textract for document processing
- Rules extraction and pattern recognition engine
- Real-time learning system
- Management platform integration
- AWS deployment infrastructure

---

## 🏗️ Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer (React)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   7-Tab     │ │   Library   │ │    AI Assistant     │   │
│  │ Interface   │ │  & Search   │ │    & Analytics      │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Express.js)                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │  Contract   │ │   Health    │ │      Future:        │   │
│  │   Routes    │ │   Monitor   │ │   AI & Upload       │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer (PostgreSQL)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Contracts  │  Parameters  │  Templates │  AI Data  │   │
│  │  Uploads    │  Audit Logs  │  Rules     │  Stats    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

```
bloom-energy-contract-system/
├── src/                        # React Frontend
│   ├── components/            # UI Components
│   │   └── BloomContractSystem.tsx
│   ├── types/                 # TypeScript Definitions
│   ├── hooks/                 # Custom React Hooks
│   └── utils/                 # Helper Functions
├── server/                    # Express Backend
│   └── src/
│       ├── app.js            # Express Application
│       ├── server.js         # Server Entry Point
│       └── routes/           # API Routes
├── prisma/                   # Database Schema & Migrations
│   ├── schema.prisma        # Database Schema
│   └── migrations/          # Database Migrations
├── generated/               # Generated Prisma Client
└── docs/                   # Project Documentation
```

---

## 💻 Technology Stack

### Frontend Stack ✅ Complete
```javascript
{
  framework: 'React 18.2+',
  bundler: 'Vite 5.0',
  language: 'TypeScript',
  ui_library: 'Shadcn/ui',
  styling: 'Tailwind CSS 3.4',
  icons: 'Lucide React',
  state_management: 'React Hooks + Local Storage',
  charts: 'Recharts',
  validation: 'Inline validation'
}
```

### Backend Stack ✅ Complete
```javascript
{
  runtime: 'Node.js 20+',
  framework: 'Express.js 5.1',
  database: 'PostgreSQL 15',
  orm: 'Prisma 6.15',
  language: 'JavaScript (ES Modules)',
  middleware: ['CORS', 'Helmet', 'Express JSON'],
  development: 'Nodemon for auto-restart'
}
```

### AI/ML Stack 🚧 Planned
```javascript
{
  ai_provider: 'Anthropic Claude API',
  ocr: 'AWS Textract',
  document_processing: 'Custom extraction engine',
  learning_system: 'Pattern recognition algorithms',
  confidence_scoring: 'Statistical analysis'
}
```

---

## 🗄️ Database Schema

### Core Tables Overview

| Table | Purpose | Status |
|-------|---------|--------|
| `contracts` | Main contract data | ✅ Complete |
| `financial_parameters` | Financial terms & rates | ✅ Complete |
| `technical_parameters` | Technical specifications | ✅ Complete |
| `operating_parameters` | Operating conditions | ✅ Complete |
| `contract_templates` | Reusable contract templates | ✅ Complete |
| `uploaded_files` | Document upload tracking | ✅ Complete |
| `ai_messages` | AI chat history | ✅ Complete |
| `learned_rules` | Extracted business rules | ✅ Complete |
| `audit_logs` | Change tracking | ✅ Complete |
| `system_stats` | Analytics data | ✅ Complete |

### Key Relationships

```sql
-- Contract with related parameters (1:1)
Contract → FinancialParams
Contract → TechnicalParams  
Contract → OperatingParams

-- Contract with files and templates (1:many)
Contract → UploadedFiles
Contract → ContractTemplates (many:many)

-- Audit trail (1:many)
Contract → AuditLogs
```

### Sample Data Models

#### Contract Model
```javascript
{
  id: "uuid",
  name: "string",
  client: "string", 
  site: "string",
  capacity: "float",        // kW capacity
  term: "integer",          // Contract term in years
  systemType: "enum",       // PP, MG, AMG, OG
  effectiveDate: "datetime",
  status: "enum",           // DRAFT, ACTIVE, EXPIRED, etc.
  totalValue: "float",
  yearlyRate: "float",
  notes: "text",
  tags: "string[]",
  
  // Relationships
  financial: FinancialParams,
  technical: TechnicalParams,
  operating: OperatingParams,
  uploads: UploadedFile[],
  templates: ContractTemplate[]
}
```

#### Business Rules Model
```javascript
{
  capacityRange: { min: 325, max: 3900 },    // kW multiples of 325
  termRange: { min: 5, max: 20 },           // Years
  systemTypes: ['PP', 'MG', 'AMG', 'OG'],
  voltageOptions: ['208V', '480V', '4.16kV', '13.2kV', '34.5kV'],
  componentOptions: ['RI', 'AC', 'UC', 'BESS', 'Solar'],
  escalationRange: { min: 2.0, max: 5.0 }   // Annual percentage
}
```

---

## 🚀 API Documentation

### Base URL
- **Development**: `http://localhost:3001`
- **Production**: TBD

### Authentication
- **Current**: None (development)
- **Planned**: JWT with role-based access control

### Core Endpoints

#### Health & System Status
```http
GET /api/health
GET /api/health/system
```

#### Contract Management
```http
GET    /api/contracts                    # List contracts with pagination/filtering
POST   /api/contracts                    # Create new contract
GET    /api/contracts/:id                # Get specific contract
PUT    /api/contracts/:id                # Update contract
DELETE /api/contracts/:id                # Delete contract
GET    /api/contracts/stats/overview     # Get contract statistics
```

### Request/Response Examples

#### Create Contract
```bash
POST /api/contracts
Content-Type: application/json

{
  "name": "Acme Corp Energy Agreement",
  "client": "Acme Corporation",
  "site": "Manufacturing Plant - Zone A",
  "capacity": 975,
  "term": 15,
  "systemType": "POWER_PURCHASE_STANDARD",
  "effectiveDate": "2025-03-01",
  "status": "DRAFT",
  "financial": {
    "baseRate": 0.135,
    "escalation": 2.75,
    "microgridAdder": 0.015
  },
  "technical": {
    "voltage": "V_4_16K",
    "servers": 3,
    "components": ["RI", "AC", "UC", "BESS"]
  },
  "operating": {
    "outputWarranty": 96.0,
    "efficiency": 89.2,
    "minDemand": 300,
    "maxDemand": 975,
    "criticalOutput": 850
  }
}
```

#### List Contracts with Filtering
```bash
GET /api/contracts?page=1&limit=10&status=ACTIVE&systemType=POWER_PURCHASE_STANDARD&search=acme

Response:
{
  "contracts": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

### Error Handling

```javascript
// Standard Error Response
{
  "error": "Error type",
  "message": "Detailed error message",
  "stack": "Development only - error stack trace"
}

// Common HTTP Status Codes
200 - Success
201 - Created
400 - Bad Request (validation errors)
404 - Not Found
500 - Internal Server Error
503 - Service Unavailable (database issues)
```

---

## ⚙️ Setup & Installation

### Prerequisites

- **Node.js** 20+ LTS
- **PostgreSQL** 15+
- **npm** 10+
- **Git** 2.40+

### Initial Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd bloom-energy-contract-system
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   ```bash
   # Install PostgreSQL (macOS)
   brew install postgresql@15
   brew services start postgresql@15
   
   # Create database
   createdb bloom_contracts
   ```

4. **Environment Configuration**
   ```bash
   # .env file is already configured for local development
   DATABASE_URL="postgresql://[username]@localhost:5432/bloom_contracts?schema=public"
   NODE_ENV="development"
   PORT=3001
   ```

5. **Database Migration**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

6. **Verify Setup**
   ```bash
   # Test database connection
   npm run server:dev
   curl http://localhost:3001/api/health
   ```

### Development Commands

```bash
# Frontend Development
npm run dev                    # Start Vite dev server (port 5173)

# Backend Development  
npm run server:dev             # Start Express server (port 3001)
npm run dev:full              # Run both frontend & backend

# Database Operations
npm run db:generate           # Generate Prisma client
npm run db:migrate            # Run migrations
npm run db:reset              # Reset database
npm run db:studio            # Open Prisma Studio

# Build & Deploy
npm run build                 # Build for production
npm run preview              # Preview production build
```

---

## 🔄 Development Workflow

### Git Workflow
```
main
  └── develop (current)
       ├── feature/backend-integration    ✅ Complete
       ├── feature/ai-integration        🚧 Next
       └── feature/document-processing   📅 Future
```

### Code Organization Principles

1. **Component Structure**: Small, focused components under 200 lines
2. **Type Safety**: Comprehensive TypeScript definitions in `src/types/`
3. **API Layer**: RESTful endpoints with consistent error handling
4. **Database**: Normalized schema with proper relationships
5. **Validation**: Both frontend and backend validation
6. **Error Handling**: Graceful degradation with user feedback

### Testing Strategy (Planned)

```
Unit Tests        ████████████ 80% coverage target
Integration Tests ████████     60% coverage target  
E2E Tests        ████         20% coverage (critical paths)
```

### Performance Targets

- **API Response Time**: p95 < 200ms
- **Database Queries**: < 100ms
- **Frontend Load Time**: < 2.5s
- **Bundle Size**: < 500KB (current: needs optimization)

---

## 🎨 Frontend Components

### Main Application Structure

```typescript
// BloomContractSystem.tsx - Main component with tabs
const tabs = [
  { id: 'create', label: 'Create', icon: Plus },
  { id: 'basic', label: 'Basic Info', required: true },
  { id: 'system', label: 'System Config', required: true },
  { id: 'financial', label: 'Financial', required: true },
  { id: 'operating', label: 'Operating', required: true },
  { id: 'technical', label: 'Technical', required: true },
  { id: 'summary', label: 'Summary', readonly: true }
];
```

### Key UI Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Mode**: Consistent with Bloom Energy branding
- **Form Validation**: Real-time validation with clear error messages
- **Progress Tracking**: Visual indicators for completion status
- **Search & Filtering**: Advanced filtering with real-time results
- **Drag & Drop**: File upload with progress tracking
- **Comparison Tool**: Side-by-side contract comparison (up to 4)

### State Management Pattern

```typescript
// Local state for UI components
const [formData, setFormData] = useState<ContractFormData>({...});
const [validationErrors, setValidationErrors] = useState<ValidationError>({});

// LocalStorage persistence (will migrate to API)
const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Storage failed:', error);
  }
};
```

---

## 🧪 Testing

### Current Testing Status
- **Backend API**: ✅ Manual testing complete
- **Database Operations**: ✅ CRUD operations verified
- **Frontend Components**: 🚧 Manual testing only
- **Integration**: 🚧 API integration pending
- **E2E**: ❌ Not implemented

### Test Data

```javascript
// Sample test contract created via API
{
  "name": "Test Contract 001",
  "client": "Acme Corp",
  "site": "Headquarters - Building A", 
  "capacity": 650,
  "term": 10,
  "systemType": "POWER_PURCHASE_STANDARD"
}
```

### API Testing Commands

```bash
# Health check
curl http://localhost:3001/api/health

# Create contract
curl -X POST http://localhost:3001/api/contracts \
  -H "Content-Type: application/json" \
  -d @test-contract.json

# List contracts
curl http://localhost:3001/api/contracts

# Get statistics
curl http://localhost:3001/api/contracts/stats/overview
```

---

## 🚀 Deployment

### Current Status: Local Development Only

### Planned AWS Infrastructure

```yaml
# Infrastructure Stack (Planned)
compute:
  - ECS Fargate (containerized applications)
  - Lambda (serverless functions)

storage:
  - RDS PostgreSQL (Multi-AZ)
  - S3 (document storage)
  - ElastiCache Redis (caching)

networking:
  - ALB (load balancer)
  - API Gateway
  - CloudFront CDN
  - Route 53 DNS

security:
  - Cognito (authentication)
  - Secrets Manager
  - KMS (encryption)
  - WAF (web application firewall)
```

### Environment Variables

```bash
# Development (.env)
DATABASE_URL="postgresql://rapha@localhost:5432/bloom_contracts"
NODE_ENV="development"
PORT=3001
ANTHROPIC_API_KEY=""          # For future AI integration
UPLOAD_DIR="./uploads"        # Local file storage

# Production (Planned)
DATABASE_URL="postgresql://user:pass@rds-endpoint:5432/bloom_contracts"
NODE_ENV="production" 
PORT=80
ANTHROPIC_API_KEY="sk-ant-..."
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
S3_BUCKET="bloom-contracts-prod"
```

---

## 🤝 Contributing

### Development Guidelines

1. **Code Style**: Follow existing patterns and ESLint rules
2. **Commits**: Use conventional commit messages
3. **Testing**: Write tests for new functionality
4. **Documentation**: Update docs with any changes
5. **Security**: Never commit secrets or API keys

### Commit Message Format
```
feat: Add contract validation for financial tab
fix: Resolve database connection timeout issue
refactor: Optimize Prisma queries for better performance
docs: Update API documentation with new endpoints
```

### Pull Request Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Update documentation
4. Submit PR with detailed description
5. Code review and approval
6. Merge to `develop`

---

## 📊 Current Project Status

### Completed ✅
- **Database Infrastructure**: PostgreSQL with comprehensive schema
- **Backend API**: Express server with CRUD operations
- **Frontend UI**: Complete 7-tab interface with validation
- **Contract Library**: Search, filter, comparison tools
- **Template System**: Reusable contract templates
- **Analytics Dashboard**: Statistics and metrics display
- **File Upload UI**: Drag-drop interface with progress

### In Progress 🚧
- **API Integration**: Connect frontend to backend
- **AI Integration**: Anthropic Claude API implementation
- **Document Processing**: AWS Textract integration

### Planned 📅
- **Rules Engine**: Pattern recognition and extraction
- **Learning System**: Continuous improvement algorithms
- **Management Platform**: External system integration
- **AWS Deployment**: Production infrastructure
- **Security**: Authentication and authorization
- **Testing**: Comprehensive test suite

### Key Metrics (Target vs Current)
| Metric | Target | Current | Status |
|--------|---------|---------|---------|
| Contract Creation Time | 30 min | N/A | 📅 Pending integration |
| Rule Extraction Accuracy | 95% | N/A | 📅 Not implemented |
| System Availability | 99.9% | N/A | 📅 Not deployed |
| User Adoption | 80% | N/A | 📅 Not deployed |

---

## 📚 Additional Resources

### Internal Documentation
- [PLANNING.md](./PLANNING.md) - Detailed project planning and architecture
- [TASKS.md](./TASKS.md) - Task tracking and milestone management
- [CLAUDE.md](./CLAUDE.md) - Development guidelines and patterns

### External Resources
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Shadcn/ui Components](https://ui.shadcn.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Anthropic API](https://docs.anthropic.com)

### Support & Contact

- **Technical Issues**: Check existing documentation first
- **Feature Requests**: Update TASKS.md with new requirements
- **Security Concerns**: Follow responsible disclosure practices

---

**Last Updated**: September 7, 2025 by Claude Code Assistant  
**Next Review**: When AI integration milestone is complete  
**Project Status**: Active Development - Backend Foundation Complete

---

*This documentation is maintained automatically and should be updated with each major milestone completion.*