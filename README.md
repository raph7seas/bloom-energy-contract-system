# Bloom Energy Contract Learning & Rules Management System

## 🚀 Overview

An AI-powered contract management platform designed specifically for Bloom Energy's fuel cell power purchase agreements. The system learns from historical contracts, extracts business rules, and streamlines the contract creation process from days to minutes.

### Key Benefits
- **⚡ Speed**: Reduce contract creation time from 3 days to 30 minutes
- **🎯 Accuracy**: Achieve 95% accuracy in rule extraction and validation
- **💰 Cost-Effective**: Cut contract processing costs from $500 to $50 per contract
- **🧠 Intelligence**: AI-powered pattern recognition and learning from historical data

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express.js + Prisma ORM
- **Database**: PostgreSQL
- **AI/ML**: Anthropic Claude API + Custom Rule Engine
- **Authentication**: JWT with role-based access control
- **File Processing**: Multi-format document support (PDF, DOCX, TXT, Images)

### System Components
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Database      │
│   Dashboard     │◄──►│   Services       │◄──►│   PostgreSQL    │
│   (Port 4002)   │    │   (Port 3001)    │    │   (Port 5432)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Contract      │    │   AI Engine      │    │   Audit System  │
│   Management    │    │   Rule Engine    │    │   Version Ctrl  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ContractRulesEngine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Configure your `.env` file with:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/bloom_contracts"
   JWT_SECRET="your-super-secret-jwt-key"
   ANTHROPIC_API_KEY="your-anthropic-api-key"
   NODE_ENV="development"
   ```

4. **Set up the database**
   ```bash
   # Start PostgreSQL (if using Docker)
   docker-compose up -d postgres
   
   # Run migrations
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start the development servers**
   ```bash
   # Start backend API (Terminal 1)
   npm run server:dev
   
   # Start frontend (Terminal 2)
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:4002
   - Backend API: http://localhost:3001
   - API Health: http://localhost:3001/api/health

## 📡 API Documentation

### Core Endpoints

#### Contracts
- `GET /api/contracts` - List all contracts
- `POST /api/contracts` - Create new contract
- `GET /api/contracts/:id` - Get contract details
- `PUT /api/contracts/:id` - Update contract
- `DELETE /api/contracts/:id` - Delete contract

#### AI Services
- `POST /api/ai/chat` - AI assistant interaction
- `GET /api/ai/health` - AI service status
- `GET /api/ai/analytics` - Usage analytics
- `POST /api/ai/analyze` - Contract analysis

#### Rule Management
- `GET /api/rules` - List learned rules
- `POST /api/rules/extract/:contractId` - Extract rules from contract
- `POST /api/rules/validate/:contractId` - Validate contract against rules
- `GET /api/rules/statistics` - Rule statistics

#### File Upload
- `POST /api/uploads/single` - Upload single file
- `POST /api/uploads/multiple` - Upload multiple files
- `GET /api/uploads/:id/content` - Get extracted content

#### Audit & Version Control
- `GET /api/audit/trail/:entityType/:entityId` - Get audit trail
- `GET /api/audit/versions/:entityType/:entityId` - Get version history
- `POST /api/audit/rollback/:versionId` - Rollback to version

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

## 🔧 Development

### Project Structure
```
ContractRulesEngine/
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── main.tsx           # Application entry point
│   └── index.css          # Global styles
├── server/                 # Backend source
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   └── server.js      # Server entry point
│   └── prisma/            # Database schema
├── public/                 # Static assets
└── uploads/               # File upload storage
```

### Development Commands
```bash
# Frontend development
npm run dev              # Start Vite dev server
npm run build           # Build for production
npm run preview         # Preview production build

# Backend development
npm run server:dev      # Start backend with nodemon
npm run server:start    # Start backend in production

# Database
npx prisma studio       # Open database GUI
npx prisma migrate dev  # Run migrations
npx prisma generate     # Generate Prisma client

# Testing
npm run test           # Run tests
npm run test:coverage  # Run tests with coverage
```

### Environment Configuration

#### Development (.env)
```env
NODE_ENV=development
DATABASE_URL="postgresql://localhost:5432/bloom_contracts"
JWT_SECRET="development-jwt-secret-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
PORT=3001
UPLOAD_DIR="./uploads"
```

#### Production (.env.production)
```env
NODE_ENV=production
DATABASE_URL="postgresql://prod-db-url"
JWT_SECRET="production-super-secure-key"
ANTHROPIC_API_KEY="production-api-key"
PORT=3001
```

## 🚀 Deployment

### Local Docker Deployment
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### AWS Deployment (Coming Soon)
- Infrastructure as Code with CDK/Terraform
- ECS for container orchestration
- RDS for PostgreSQL database
- S3 for file storage
- CloudFront for CDN

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (USER, ADMIN, MANAGER)
- Session management with refresh tokens
- Password hashing with bcrypt

### Security Features
- Request validation and sanitization
- SQL injection protection
- XSS prevention
- CORS configuration
- Rate limiting
- Security headers (helmet.js)
- Input validation with Joi

### Audit Trail
- Complete change tracking for all entities
- Version control with rollback capabilities
- Integrity verification with cryptographic hashing
- User activity monitoring

## 📊 Features

### Contract Management
- **Multi-tab Creation**: 7-step guided contract creation
- **Template System**: Reusable contract templates
- **Validation Engine**: Business logic validation
- **Comparison Tool**: Side-by-side contract comparison
- **Search & Filter**: Advanced contract discovery

### AI-Powered Intelligence
- **Smart Assistant**: Natural language contract queries
- **Rule Extraction**: Automatic pattern recognition
- **Contract Analysis**: AI-powered optimization suggestions
- **Cost Comparison**: Financial analysis and projections
- **Term Suggestions**: Context-aware recommendations

### Document Processing
- **Multi-format Support**: PDF, DOCX, TXT, Images
- **Text Extraction**: Advanced OCR and parsing
- **Content Analysis**: Automatic categorization
- **File Management**: Secure upload and storage

### Business Rules Engine
- **Pattern Recognition**: ML-based rule extraction
- **Confidence Scoring**: Statistical reliability metrics
- **Rule Validation**: Contract compliance checking
- **Learning System**: Continuous improvement from data

### System Features
- **Dashboard Analytics**: Real-time system metrics
- **Health Monitoring**: Service status tracking
- **Error Handling**: Comprehensive error management
- **Logging**: Detailed request/response logging
- **Performance**: Optimized for high throughput

## 🧪 Testing

### Running Tests
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Test Data
```bash
# Seed development database
npm run seed:dev

# Create test contracts
npm run create:test-data
```

## 📈 Monitoring & Analytics

### Health Checks
- `GET /api/health` - Overall system health
- `GET /api/ai/health` - AI service status
- `GET /api/audit/health` - Audit system status
- `GET /api/rules/health/check` - Rule engine status

### Metrics
- Request/response times
- Error rates and types
- Database performance
- AI service usage
- File processing statistics

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style
- ESLint + Prettier for code formatting
- TypeScript for type safety
- Conventional commits for git messages
- Clean Architecture principles

## 📝 License

This project is proprietary to Bloom Energy Corporation.

## 🆘 Support

### Troubleshooting
- Check server logs: `docker-compose logs server`
- Verify database connection: `npx prisma studio`
- Test API endpoints: `curl http://localhost:3001/api/health`

### Common Issues
1. **Port conflicts**: Change ports in .env file
2. **Database connection**: Verify PostgreSQL is running
3. **Permission errors**: Check file system permissions
4. **API key issues**: Verify Anthropic API key is valid

### Getting Help
- Review documentation in `/docs`
- Check GitHub issues
- Contact development team

---

## 🎯 Current Status

### ✅ Completed Features
- [x] Full-stack application architecture
- [x] PostgreSQL database with comprehensive schema
- [x] JWT authentication with role-based access
- [x] File upload and document processing
- [x] AI-powered contract analysis
- [x] Rule extraction engine with ML capabilities
- [x] Comprehensive audit trail and version control
- [x] Advanced validation and error handling
- [x] RESTful API with full CRUD operations
- [x] React dashboard with modern UI

### 🚧 Development Roadmap
- [ ] Advanced AI model integration
- [ ] Real-time collaboration features
- [ ] Mobile application
- [ ] Advanced analytics dashboard
- [ ] Workflow automation
- [ ] Third-party integrations
- [ ] Performance optimization
- [ ] Security enhancements

---

**Built with ❤️ for Bloom Energy by the Contract Management Team**