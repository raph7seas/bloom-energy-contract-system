# Technology Stack Documentation

## Bloom Energy Contract Learning & Rules Management System

### Overview
An AI-powered platform for creating, managing, and learning from energy service contracts. The system extracts business rules from contracts and provides intelligent contract analysis.

---

## Frontend Technology

### Core Framework
- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
  - Development: `http://localhost:5173` (Vite dev server proxies to backend)
  - Production: Static files served from port 4000

### UI Framework
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Reusable component library
- **Radix UI** - Accessible component primitives

### State Management
- **React Context API** - Global state management
- **React Hooks** - Local state management
  - useState, useEffect, useCallback, useMemo

### Key Frontend Libraries
- **React Router** - Client-side routing
- **Axios / Fetch API** - HTTP requests
- **LocalStorage** - Offline data persistence fallback

---

## Backend Technology

### Runtime & Framework
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
  - Port: `4000` (production)
  - Port: `4003` (development - legacy config)

### Database
- **PostgreSQL** - Primary database
  - Connection via Prisma ORM
  - Fallback mode when Prisma client not generated

### ORM
- **Prisma** - Modern database toolkit
  - Schema: `prisma/schema.prisma`
  - Migrations: `prisma/migrations/`
  - Client: Auto-generated TypeScript types

### AI/ML Integration
- **Anthropic Claude API** - Primary AI provider
  - Model: `claude-sonnet-4-5-20250929` (Claude Sonnet 4.5)
  - Max tokens: 5000 for extraction
  - Features: Contract analysis, rule extraction, optimization
  - Rate limit: 30,000 input tokens/minute
- **OpenAI GPT-4** - Fallback AI provider

### Document Processing
- **pdf-parse** - PDF text extraction
- **Custom document chunker** - Handles large documents (120KB+)
  - Extracts key sections: Performance Specs, Financial Terms, Pricing
  - Reduces document size for AI processing (e.g., 120KB → 58KB)

### Authentication & Security
- **JWT (JSON Web Tokens)** - Token-based authentication
  - Access token expiry: 15 minutes
  - Refresh tokens for session management
- **bcrypt** - Password hashing
- **Helmet.js** - Security headers
- **Rate limiting** - API endpoint protection

### Real-time Communication
- **Socket.io** - WebSocket for real-time notifications
  - Upload progress tracking
  - Document processing status updates

### File Storage
- **Local file system** - Upload storage
  - Directory: `./uploads/`
  - Support: PDF, DOCX, TXT, Images

### Caching
- **Redis** (optional) - Response caching
  - AI response caching for performance
  - Optional in development mode

---

## Development Tools

### Build & Development
- **npm** - Package manager
- **Nodemon** - Auto-restart on file changes
- **dotenv** - Environment variable management

### Code Quality
- **ESLint** - JavaScript/TypeScript linting
- **TypeScript Compiler** - Type checking

### Testing
- **Jest** - Unit testing framework
- **React Testing Library** - Component testing
- **Supertest** - API endpoint testing

---

## Architecture Patterns

### Frontend Architecture
```
src/
├── components/          # React components
│   ├── auth/           # Login, registration
│   ├── contract/       # Contract forms, tabs
│   ├── documents/      # Document upload, analysis
│   ├── library/        # Contract library views
│   ├── rules/          # Rules display
│   └── ui/             # Reusable UI components
├── contexts/           # React Context providers
├── hooks/              # Custom React hooks
├── services/           # API service layer
├── types/              # TypeScript types
└── utils/              # Helper functions
```

### Backend Architecture
```
server/src/
├── routes/             # API endpoints
│   ├── auth.js        # Authentication
│   ├── documents.js   # Document analysis
│   ├── uploads.js     # File uploads
│   └── contracts.js   # Contract CRUD
├── services/          # Business logic
│   ├── aiService.js   # AI integration
│   ├── documentProcessingService.js
│   ├── textractService.js
│   └── notificationService.js
├── middleware/        # Express middleware
│   ├── auth.js        # JWT verification
│   ├── audit.js       # Logging
│   └── validation.js  # Input validation
└── server.js          # Entry point
```

### Database Schema (Prisma)
- **Contract** - Core contract entity
- **FinancialParams** - Financial configuration
- **TechnicalParams** - Technical specifications
- **OperatingParams** - Operating parameters
- **ContractTemplate** - Reusable templates
- **ExtractedRule** - Business rules from contracts
- **User** - Authentication and RBAC

---

## API Architecture

### RESTful Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/me` - Check authentication

#### Contracts
- `GET /api/contracts` - List contracts (with filters)
- `POST /api/contracts` - Create contract
- `GET /api/contracts/:id` - Get contract details
- `PUT /api/contracts/:id` - Update contract
- `DELETE /api/contracts/:id` - Delete contract

#### AI Services
- `POST /api/ai/chat` - AI assistant chat
- `POST /api/ai/analyze` - Contract analysis
- `GET /api/ai/health` - Service status
- `GET /api/ai/analytics` - Usage analytics

#### File Processing
- `POST /api/uploads/single` - Single file upload
- `POST /api/uploads/multiple` - Multiple file upload (up to 50 files)
- `GET /api/uploads/:id/content` - Get extracted content
- `PUT /api/uploads/:id/analysis` - Update analysis
- `POST /api/uploads/:id/convert-to-contract` - Convert to contract

#### Document Analysis
- `POST /api/documents/analyze/:contractId` - Analyze documents
- AI extracts: capacity, efficiency, pricing, availability, term

#### Rules Engine
- `GET /api/rules` - List learned rules
- `POST /api/rules/extract/:contractId` - Extract rules
- `POST /api/rules/validate/:contractId` - Validate against rules
- `GET /api/rules/statistics` - Rule statistics

---

## Key Features & Technologies

### Multi-Document Upload
- **Technology**: Chunked uploads, FormData, WebSocket notifications
- **Capacity**: Up to 50 files, 100MB each
- **Processing**: Parallel document processing with AI queue

### AI-Powered Extraction
- **Technology**: Anthropic Claude API, custom regex fallback
- **Extracts**:
  - System capacity (kW)
  - Efficiency warranty (%)
  - Base rate ($/kWh)
  - Annual escalation (%)
  - Availability guarantee (%)
  - Contract term (years)
  - Parties (buyer, seller, financial owner)

### Document Chunking
- **Technology**: Custom text extraction and section identification
- **Process**:
  1. PDF extraction via pdf-parse
  2. Section identification (Performance Specs, Financial Terms, Pricing)
  3. Smart chunking to fit AI token limits
  4. Preserves critical sections

### Regex Fallback Extraction
- **Purpose**: When AI fails to extract values
- **Technology**: Ultra-flexible regex patterns
- **Searches**: Full document text (120KB+)
- **Patterns**: 6+ variations per field type

### Contract Validation
- **Capacity**: Must be multiples of 325kW (325-3900kW)
- **Escalation**: 2.0-5.0% annual range
- **Term**: 5, 10, 15, or 20 years
- **Voltage**: 208V, 480V, 4.16kV, 13.2kV, 34.5kV
- **Solution Types**: PP, MG, AMG, OG

---

## Environment Configuration

### Required Environment Variables
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bloom_contracts"

# Authentication
JWT_SECRET="your-jwt-secret"

# AI Services
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
DEFAULT_AI_PROVIDER="anthropic"

# Server
PORT=4000
NODE_ENV="development"

# File Storage
UPLOAD_DIR="./uploads"

# Optional
REDIS_URL="redis://localhost:6379"
```

---

## Development Workflow

### Start Development
```bash
# Full stack (frontend + backend)
npm run dev:full

# Frontend only (Vite)
npm run dev

# Backend only (Nodemon)
npm run server:dev
```

### Database Management
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Reset database
npm run db:reset

# Open Prisma Studio GUI
npm run db:studio

# Setup (migrate + seed)
npm run db:setup
```

### Testing
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Build & Deploy
```bash
# Build frontend
npm run build

# Preview production build
npm run preview

# Start production server
npm run server:start
```

---

## Performance Optimizations

### Frontend
- **Vite**: Fast HMR (Hot Module Replacement)
- **Code splitting**: Dynamic imports
- **Lazy loading**: Components and routes
- **Memoization**: useMemo, useCallback

### Backend
- **Redis caching**: AI response caching
- **Database indexing**: Prisma query optimization
- **Request queuing**: AI request queue to prevent rate limits
- **Document chunking**: Reduces AI token usage

### AI Integration
- **Token optimization**: Smart document chunking
- **Response caching**: Redis cache for repeated queries
- **Fallback extraction**: Regex when AI fails
- **Rate limiting**: Queue system to respect API limits

---

## Security Features

### Authentication
- JWT with short expiry (15 minutes)
- Refresh token rotation
- Password hashing with bcrypt
- Role-based access control (RBAC)

### Input Validation
- Joi schema validation
- File type validation
- File size limits
- XSS protection

### API Security
- Helmet.js security headers
- Rate limiting per endpoint
- CORS configuration
- SQL injection prevention (Prisma)

### File Upload Security
- File type whitelist (PDF, DOCX, TXT, images)
- File size limits (100MB per file)
- Sanitized filenames
- Isolated upload directory

---

## Monitoring & Logging

### Logging
- **Console logging**: Emoji-based log levels
  - 🔍 Debug logs
  - ✅ Success logs
  - ⚠️ Warning logs
  - ❌ Error logs
  - 📊 Data logs

### Audit Trail
- User actions logged
- Document processing tracked
- AI requests monitored
- Contract changes versioned

### Health Checks
- `GET /api/ai/health` - AI service status
- Database connection status
- Redis connection status (if enabled)

---

## Known Limitations

### Rate Limits
- **Anthropic API**: 30,000 input tokens/minute
- **OpenAI API**: Varies by plan
- **Solution**: Request queue with retry logic

### File Size
- **Max file size**: 100MB per file
- **Max files**: 50 files per upload
- **Solution**: Chunked uploads, progress tracking

### Document Processing
- **Large documents**: Chunked to fit AI token limits
- **Complex tables**: May require regex fallback
- **Handwritten text**: OCR not currently implemented

---

## Future Enhancements

### Planned Features
- AWS Textract integration for enhanced OCR
- Real-time collaboration on contracts
- Advanced rules engine with machine learning
- Contract comparison tool
- Bulk operations dashboard
- Integration with external management platforms

### Technology Improvements
- GraphQL API layer
- Microservices architecture
- Kubernetes deployment
- Enhanced caching with Redis Cluster
- Real-time analytics dashboard

---

## Support & Resources

### Documentation
- `PROJECT_DOCUMENTATION.md` - Full project documentation
- `CLAUDE.md` - Claude Code integration guide
- `README.md` - Quick start guide

### Key Commands
- Start development: `npm run dev:full`
- Run tests: `npm test`
- Database setup: `npm run db:setup`
- View logs: `tail -f server-live.log`

### Troubleshooting
- Check server logs: `server-live.log`
- Verify environment variables: `.env`
- Check database connection: `npm run db:studio`
- Verify AI API keys: Test with `curl` or Postman

---

**Last Updated**: October 2, 2025
**Version**: 1.0.0
**Maintainer**: Bloom Energy Development Team
