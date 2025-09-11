# PLANNING.md - Bloom Energy Contract Learning System

## 🎯 Project Vision

### Mission Statement
Build an intelligent contract management platform that transforms Bloom Energy's contract creation process from a 3-day manual effort to a 30-minute AI-powered workflow, while simultaneously extracting and learning business rules for enterprise-wide standardization.

### Core Objectives
1. **Accelerate Contract Creation**: Reduce time from 72 hours to 30 minutes
2. **Standardize Operations**: Extract and enforce consistent business rules
3. **Enable Intelligence**: Learn from every contract to improve future agreements
4. **Reduce Costs**: Cut per-contract cost from $500 to $50
5. **Integrate Systems**: Connect with Bloom Configurator and Management Platform

### Success Metrics
- **Efficiency**: 90% reduction in contract creation time
- **Accuracy**: 95% rule extraction accuracy
- **Adoption**: 80% user adoption within 6 months
- **Scale**: Support 500+ contracts per month
- **ROI**: 31% return on investment Year 1

---

## 🏗️ System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend Layer                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   React SPA │ │  Shadcn UI  │ │   Contract Builder   │   │
│  │   (Vite)    │ │  Components │ │    (7 Tabs)         │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   REST API  │ │   GraphQL   │ │    WebSockets       │   │
│  │  (Express)  │ │   (Apollo)  │ │    (Socket.io)      │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Microservices Layer                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Contract     │  Learning    │  Rules      │   AI     │   │
│  │  Service      │  Service     │  Service    │  Service │   │
│  │  (Node.js)    │  (Python)    │  (Node.js)  │  (Node)  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Data Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PostgreSQL  │  Redis Cache │  S3 Storage │  Vector  │   │
│  │  (RDS)       │  (ElastiCache)│  (Documents)│  DB      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Integrations                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Anthropic  │  AWS Textract │  Management │  Bloom   │   │
│  │  Claude API │  (OCR)        │  Platform   │  Config  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture
```
bloom-energy-contract-system/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/      # UI Components
│   │   ├── pages/          # Page Components
│   │   ├── services/       # API Services
│   │   ├── hooks/          # Custom Hooks
│   │   ├── utils/          # Utilities
│   │   └── store/          # State Management
│   └── public/
│
├── backend/                 # Node.js Services
│   ├── api-gateway/        # API Gateway Service
│   ├── contract-service/   # Contract Management
│   ├── rules-service/      # Rules Engine
│   ├── ai-service/         # AI Integration
│   └── shared/             # Shared Libraries
│
├── ml-services/            # Python ML Services
│   ├── learning-engine/    # Pattern Recognition
│   ├── extraction/         # Data Extraction
│   └── models/             # ML Models
│
├── infrastructure/         # IaC (Terraform/CDK)
│   ├── aws/               # AWS Resources
│   ├── kubernetes/        # K8s Configs
│   └── docker/            # Dockerfiles
│
└── docs/                   # Documentation
```

---

## 💻 Technology Stack

### Frontend Stack
```javascript
{
  // Core Framework
  framework: 'React 18.2+',
  bundler: 'Vite 5.0',
  language: 'JavaScript/TypeScript',
  
  // UI & Styling
  ui_library: 'Shadcn/ui',
  styling: 'Tailwind CSS 3.4',
  icons: 'Lucide React',
  animations: 'Framer Motion',
  
  // State & Data
  state_management: 'Zustand 4.4',
  data_fetching: 'TanStack Query 5.0',
  forms: 'React Hook Form 7.48',
  validation: 'Zod 3.22',
  
  // Utilities
  charts: 'Recharts 2.10',
  dates: 'date-fns 3.0',
  tables: 'TanStack Table 8.11',
  pdf: 'react-pdf 7.6',
  
  // Development
  testing: 'Vitest + React Testing Library',
  linting: 'ESLint 8.55',
  formatting: 'Prettier 3.1'
}
```

### Backend Stack
```javascript
{
  // Core Runtime
  runtime: 'Node.js 20 LTS',
  framework: 'Express.js 4.18',
  language: 'TypeScript 5.3',
  
  // API Layer
  rest: 'Express + express-validator',
  graphql: 'Apollo Server 4.9',
  websockets: 'Socket.io 4.6',
  documentation: 'Swagger/OpenAPI 3.0',
  
  // Database
  primary_db: 'PostgreSQL 15',
  orm: 'Prisma 5.7',
  cache: 'Redis 7.2',
  search: 'Elasticsearch 8.11',
  
  // Message Queue
  queue: 'Bull (Redis-based)',
  events: 'AWS EventBridge',
  
  // Security
  auth: 'JWT + AWS Cognito',
  encryption: 'bcrypt + AWS KMS',
  rate_limiting: 'express-rate-limit',
  
  // Development
  testing: 'Jest + Supertest',
  logging: 'Winston + Morgan',
  monitoring: 'DataDog APM'
}
```

### AI/ML Stack
```python
{
  # Core
  'language': 'Python 3.11',
  'framework': 'FastAPI',
  
  # ML Libraries
  'nlp': 'spaCy 3.7',
  'ml': 'scikit-learn 1.3',
  'deep_learning': 'PyTorch 2.1',
  
  # Document Processing
  'ocr': 'AWS Textract SDK',
  'pdf': 'PyPDF2 + pdfplumber',
  'parsing': 'Beautiful Soup 4',
  
  # AI Services
  'llm': 'Anthropic Claude SDK',
  'embeddings': 'sentence-transformers',
  'vector_db': 'Pinecone/Weaviate'
}
```

### Infrastructure Stack
```yaml
cloud_provider: AWS
region: us-east-1

compute:
  containers: ECS Fargate
  serverless: Lambda
  orchestration: EKS (optional)

storage:
  database: RDS PostgreSQL (Multi-AZ)
  cache: ElastiCache Redis
  files: S3
  cdn: CloudFront

networking:
  load_balancer: ALB
  api_gateway: AWS API Gateway
  dns: Route 53
  vpc: Custom VPC with private subnets

security:
  auth: Cognito
  secrets: Secrets Manager
  encryption: KMS
  certificates: ACM
  waf: AWS WAF

monitoring:
  logs: CloudWatch Logs
  metrics: CloudWatch Metrics
  tracing: X-Ray
  apm: DataDog

ci_cd:
  vcs: GitHub
  ci: GitHub Actions
  cd: AWS CodeDeploy
  registry: ECR
```

---

## 🛠️ Required Tools & Setup

### Development Environment

#### Essential Tools
```bash
# Version Control
git --version                    # >= 2.40
gh --version                      # GitHub CLI >= 2.40

# Runtime & Package Managers
node --version                    # >= 20.0.0 LTS
npm --version                     # >= 10.0.0
python --version                  # >= 3.11

# Database
psql --version                    # PostgreSQL >= 15
redis-cli --version              # Redis >= 7.2

# Cloud & Containers
aws --version                     # AWS CLI >= 2.14
docker --version                  # Docker >= 24.0
docker-compose --version         # >= 2.23

# Code Editors (one of)
code --version                    # VS Code >= 1.85
```

#### VS Code Extensions
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "graphql.vscode-graphql",
    "ms-python.python",
    "ms-azuretools.vscode-docker",
    "amazonwebservices.aws-toolkit-vscode",
    "github.copilot",
    "antfu.shadcn-ui"
  ]
}
```

### Project Dependencies

#### Frontend Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "recharts": "^2.10.0",
    "date-fns": "^3.0.0",
    "lucide-react": "^0.300.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "cmdk": "^0.2.0",
    "@radix-ui/react-*": "latest"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "vitest": "^1.1.0",
    "@testing-library/react": "^14.1.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  }
}
```

#### Backend Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "@apollo/server": "^4.9.0",
    "socket.io": "^4.6.0",
    "prisma": "^5.7.0",
    "@prisma/client": "^5.7.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "aws-sdk": "^2.1500.0",
    "bull": "^4.11.0",
    "redis": "^4.6.0",
    "winston": "^3.11.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.0",
    "multer": "^1.4.5",
    "@anthropic-ai/sdk": "^0.17.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.0",
    "nodemon": "^3.0.0",
    "jest": "^29.7.0",
    "supertest": "^6.3.0",
    "ts-node": "^10.9.0"
  }
}
```

---

## 🚀 Setup Instructions

### 1. Clone and Initialize
```bash
# Clone repository
git clone https://github.com/bloom-energy/contract-learning-system.git
cd contract-learning-system

# Install dependencies
npm install           # Frontend
cd backend && npm install  # Backend
cd ../ml-services && pip install -r requirements.txt
```

### 2. Environment Configuration
```bash
# Create .env files
cp .env.example .env
cp backend/.env.example backend/.env

# Required environment variables
DATABASE_URL="postgresql://user:password@localhost:5432/bloom_contracts"
REDIS_URL="redis://localhost:6379"
ANTHROPIC_API_KEY="sk-ant-..."
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
JWT_SECRET="..."
```

### 3. Database Setup
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run migrations
cd backend && npx prisma migrate dev

# Seed initial data
npm run seed
```

### 4. Start Development Servers
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Redis
redis-server

# Terminal 4: ML Services (optional)
cd ml-services && uvicorn main:app --reload
```

---

## 📋 Development Workflow

### Git Flow
```
main
  └── develop
       ├── feature/contract-builder
       ├── feature/ai-integration
       ├── feature/rules-extraction
       └── fix/validation-error
```

### Code Organization Principles
1. **Separation of Concerns**: UI, Business Logic, Data Access
2. **DRY (Don't Repeat Yourself)**: Extract common functionality
3. **SOLID Principles**: Especially Single Responsibility
4. **Component Modularity**: Small, focused components
5. **Type Safety**: Use TypeScript where possible

### Testing Strategy
```
Unit Tests        ████████████ 80% coverage
Integration Tests ████████     60% coverage  
E2E Tests        ████         20% coverage (critical paths)
```

### Performance Targets
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **API Response Time**: p95 < 200ms
- **Database Queries**: < 100ms

---

## 🔐 Security Considerations

### Authentication & Authorization
- JWT tokens with 15-minute expiry
- Refresh tokens with 7-day expiry
- Role-based access control (RBAC)
- Multi-factor authentication via Cognito

### Data Protection
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- PII data masking in logs
- Regular security audits

### API Security
- Rate limiting (100 req/min per user)
- Input validation with Zod schemas
- SQL injection prevention via Prisma
- XSS protection with helmet.js

---

## 📊 Monitoring & Observability

### Key Metrics to Track
```javascript
{
  business: {
    contracts_created_per_hour: Number,
    average_creation_time: Duration,
    rule_extraction_success_rate: Percentage,
    ai_query_response_time: Duration
  },
  
  technical: {
    api_latency_p95: Duration,
    database_connection_pool: Number,
    cache_hit_rate: Percentage,
    error_rate: Percentage
  },
  
  infrastructure: {
    cpu_utilization: Percentage,
    memory_usage: Percentage,
    disk_iops: Number,
    network_throughput: Mbps
  }
}
```

### Logging Strategy
- **Application Logs**: Winston to CloudWatch
- **Access Logs**: Morgan to S3
- **Error Logs**: Sentry for error tracking
- **Audit Logs**: Database with encryption

---

## 🎯 Immediate Priorities

### Phase 1: Core Completion (Current)
1. ✅ Complete UI implementation
2. ⏳ PostgreSQL integration
3. ⏳ Full AI integration
4. ⏳ Document upload processing

### Phase 2: Intelligence (Next)
1. Rule extraction engine
2. Pattern recognition
3. Learning system
4. Confidence scoring

### Phase 3: Integration (Future)
1. Management Platform API
2. Bloom Configurator sync
3. Webhook system
4. Real-time updates

---

## 📚 Resources & Documentation

### Internal Documentation
- [API Specification](./docs/api.md)
- [Database Schema](./docs/database.md)
- [Deployment Guide](./docs/deployment.md)
- [Security Protocols](./docs/security.md)

### External Resources
- [React Documentation](https://react.dev)
- [Shadcn/ui Components](https://ui.shadcn.com)
- [Anthropic API](https://docs.anthropic.com)
- [AWS Best Practices](https://aws.amazon.com/architecture/well-architected)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)

---

## 🤝 Team Contacts

| Role | Name | GitHub | Slack |
|------|------|--------|-------|
| Tech Lead | - | @lead | #tech-lead |
| Frontend Dev | - | @frontend | #frontend |
| Backend Dev | - | @backend | #backend |
| ML Engineer | - | @ml-eng | #ml |
| DevOps | - | @devops | #infrastructure |
| Product Owner | - | @product | #product |

---

**Last Updated**: January 2025  
**Next Review**: February 2025  
**Status**: Active Development
