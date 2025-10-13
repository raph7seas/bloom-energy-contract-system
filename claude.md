# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Bloom Energy Contract Learning & Rules Management System - an AI-powered platform for creating, managing, and learning from energy service contracts. The system extracts business rules from contracts and exports them to a centralized management platform.

## Commands

### Development
```bash
# Start full stack development
npm run dev:full         # Runs both frontend (port 4000) and backend (port 4003)

# Frontend only
npm run dev             # Vite dev server on port 4000
npm run build          # Build production frontend
npm run preview        # Preview production build

# Backend only
npm run server:dev     # Nodemon dev server on port 4003
npm run server:start   # Production server

# Type checking
npm run lint           # TypeScript check
npm run type-check     # TypeScript no-emit check
```

### Database
```bash
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run database migrations
npm run db:reset       # Reset database
npm run db:studio      # Open Prisma Studio GUI
npm run db:seed        # Seed database with test data
npm run db:setup       # Full setup: migrate + seed
```

### Testing
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
npm run test:frontend      # Frontend tests only
npm run test:backend       # Backend tests only
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
```

### Data Migration
```bash
npm run migrate:localStorage  # Migrate localStorage data to PostgreSQL
```

## Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Shadcn/ui
- **Backend**: Node.js + Express + Prisma ORM
- **Database**: PostgreSQL
- **AI**: Anthropic Claude API (with OpenAI fallback)
- **Auth**: JWT with role-based access control
- **File Processing**: Multi-format support (PDF, DOCX, TXT, Images)
- **Real-time**: Socket.io for notifications

### Project Structure
```
ContractRulesEngine/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   │   └── BloomContractLearningSystem.jsx  # Main component (7-tab interface)
│   ├── main.tsx           # Application entry
│   └── index.css          # Global styles
├── server/                 # Backend Node.js application
│   └── src/
│       ├── routes/        # API endpoints
│       ├── services/      # Business logic
│       ├── middleware/    # Express middleware
│       └── server.js      # Server entry (port 4003)
├── prisma/                # Database schema
│   └── schema.prisma      # Prisma models
├── generated/             # Generated Prisma client
└── uploads/              # File upload storage
```

### Key API Endpoints

#### Contracts
- `GET /api/contracts` - List contracts with filters
- `POST /api/contracts` - Create contract
- `GET /api/contracts/:id` - Get contract details
- `PUT /api/contracts/:id` - Update contract
- `DELETE /api/contracts/:id` - Delete contract

#### AI Services
- `POST /api/ai/chat` - AI assistant chat
- `POST /api/ai/analyze` - Contract analysis
- `GET /api/ai/health` - Service status
- `GET /api/ai/analytics` - Usage analytics

#### Rules Engine
- `GET /api/rules` - List learned rules
- `POST /api/rules/extract/:contractId` - Extract rules
- `POST /api/rules/validate/:contractId` - Validate against rules
- `GET /api/rules/statistics` - Rule statistics

#### File Processing
- `POST /api/uploads/single` - Single file upload
- `POST /api/uploads/multiple` - Multiple files
- `GET /api/uploads/:id/content` - Get extracted content

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - User profile

## Key Implementation Details

### Contract Data Model
The contract system uses a 7-tab configuration interface:
1. **Create** - Start new contract or from template
2. **Basic** - Client info, site, term
3. **System** - Solution type (PP/MG/AMG/OG), capacity (325kW multiples)
4. **Financial** - Base rate, escalation (2-5%), payment terms
5. **Operating** - Output warranty, efficiency, demand response
6. **Technical** - Voltage levels, components (RI/AC/UC/BESS)
7. **Summary** - Review and generate contract

### Prisma Models
- **Contract** - Core contract with relationships to params
- **FinancialParams** - Financial configuration
- **TechnicalParams** - Technical specifications
- **OperatingParams** - Operating parameters
- **ContractTemplate** - Reusable templates
- **ExtractedRule** - Business rules from contracts
- **User** - Authentication and authorization

### AI Integration
- **Primary**: AWS Bedrock (Anthropic Claude via AWS)
  - Model: `anthropic.claude-3-5-sonnet-20241022-v2:0`
  - Region: `us-west-2`
  - Requires: Bedrock model access enabled in AWS Console
- **Fallback**: Direct Anthropic Claude API (`claude-3-5-sonnet`)
- **Alternative Models**:
  - Claude 3.5 Haiku: `anthropic.claude-3-5-haiku-20241022-v1:0`
  - Claude Sonnet 4.5: `anthropic.claude-sonnet-4-5-v2:0`
- **Caching**: Redis for response caching
- **Features**: Contract analysis, optimization, rule extraction, document processing
- **Backend Service**: [server/src/services/bedrockService.js](server/src/services/bedrockService.js)
- **AI Manager**: [server/src/services/aiService.js](server/src/services/aiService.js)

### Validation Rules
- Capacity: Must be multiples of 325kW (325-3900kW range)
- Escalation: 2.0-5.0% annual range
- Term: 5, 10, 15, or 20 years
- Voltage: 208V, 480V, 4.16kV, 13.2kV, 34.5kV
- Solution Types: PP (Power Purchase), MG (Microgrid), AMG (Advanced Microgrid), OG (Onsite Generation)

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bloom_contracts"

# Server
JWT_SECRET="your-jwt-secret"
PORT=4003
UPLOAD_DIR="./uploads"
NODE_ENV="development"

# AI Provider Configuration
DEFAULT_AI_PROVIDER="bedrock"  # Options: "bedrock", "anthropic", "openai"

# AWS Bedrock (Primary)
AWS_REGION="us-west-2"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_SESSION_TOKEN="your-aws-session-token"  # For SSO temporary credentials
BEDROCK_MODEL_ID="anthropic.claude-3-5-sonnet-20241022-v2:0"
BEDROCK_MAX_TOKENS="2000"
BEDROCK_TEMPERATURE="0.5"
BEDROCK_TOP_K="250"
BEDROCK_TOP_P="1"

# Anthropic Direct API (Fallback)
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"

# OpenAI (Optional)
OPENAI_API_KEY="sk-..."
```

### AWS Bedrock Setup

**Prerequisites:**
1. AWS account with SSO access to Bloom Energy account
2. Bedrock model access enabled for your IAM role

**Getting AWS Credentials:**
1. Login to AWS SSO: `https://d-926752529b.awsapps.com/start/#`
2. Select account: `BE_SMARTFACTORY_DEV (384680562925)`
3. Select role: `SSOAWS-7Seas-Vendor-Admins`
4. Click "Command line or programmatic access"
5. Copy environment variables to `.env` file

**Enabling Bedrock Model Access:**
1. Go to AWS Bedrock Console: https://console.aws.amazon.com/bedrock/
2. Select region: **us-west-2** (top-right corner)
3. Click **"Model access"** in left sidebar
4. Click **"Manage model access"**
5. Enable these models:
   - ✅ Anthropic Claude 3.5 Sonnet
   - ✅ Anthropic Claude 3.5 Haiku
   - ✅ Anthropic Claude Sonnet 4.5
6. Submit request (usually instant approval)

**Testing Bedrock Connection:**
```bash
# Test with Node.js
node test-bedrock-quick.js

# Test with Python
python3 test-bedrock-python.py

# Test through backend API
python3 test-backend-api.py
```

**Common Issues:**
- `ExpiredTokenException`: AWS SSO credentials expired - get new ones from SSO
- `AccessDeniedException`: Bedrock model access not enabled - contact AWS admin
- Server shows "anthropic" provider: Check `.env` has `DEFAULT_AI_PROVIDER="bedrock"`

## Development Guidelines

### Frontend Development
- Components use functional React with hooks
- State management via React hooks + Context
- Form validation with inline validation
- LocalStorage fallback for offline mode
- Responsive design with Tailwind CSS

### Backend Development
- RESTful API design principles
- Middleware for auth, validation, error handling
- Service layer for business logic
- Prisma for type-safe database access
- Comprehensive error handling with custom error classes

### Security Practices
- JWT tokens with 15-minute expiry
- Refresh tokens for session management
- Input validation with Joi schemas
- SQL injection prevention via Prisma
- XSS protection with helmet.js
- Rate limiting on API endpoints
- File upload validation and sanitization

### Testing Strategy
- Unit tests for services and utilities
- Integration tests for API endpoints
- Frontend component testing with React Testing Library
- Mock data for consistent testing
- Coverage targets: 80% for critical paths

## Common Development Tasks

### Add a New Contract Field
1. Update Prisma schema in `prisma/schema.prisma`
2. Run `npm run db:migrate` to update database
3. Update validation in `server/src/services/validationService.js`
4. Add field to frontend tab in `src/components/BloomContractLearningSystem.jsx`
5. Update contract generation logic

### Create a New API Endpoint
1. Add route in `server/src/routes/`
2. Create service in `server/src/services/`
3. Add validation middleware if needed
4. Update API documentation
5. Write tests for endpoint

### Implement a New AI Feature
1. Add endpoint in `server/src/routes/ai.js`
2. Update AI service in `server/src/services/aiService.js`
3. Add caching logic if appropriate
4. Implement fallback for API failures
5. Track usage for analytics

## Performance Considerations
- Frontend bundle optimization with Vite
- API response caching with Redis
- Database query optimization with Prisma
- Lazy loading for large datasets
- WebSocket for real-time updates

## Deployment Notes
- Frontend serves from port 4000 (Vite)
- Backend API on port 4003 (Express)
- PostgreSQL database required
- Redis for caching (optional in dev)
- File uploads stored in `./uploads`