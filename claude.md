# CLAUDE.md - Claude Code Session Guide

# MCP Servers
## Figma Dev Mode MCP Rules
  - The Figma Dev Mode MCP Server provides an assets endpoint which can serve image and SVG assets
  - IMPORTANT: If the Figma Dev Mode MCP Server returns a localhost source for an image or an SVG, use that image or SVG source directly
  - IMPORTANT: DO NOT import/add new icon packages, all the assets should be in the Figma payload
  - IMPORTANT: do NOT use or create placeholders if a localhost source is provided

## ⚡ IMPORTANT - START EVERY SESSION WITH THIS

**Always read PLANNING.md at the start of every new conversation, check TASKS.md before starting your work, mark completed tasks to TASKS.md immediately, and add newly discovered tasks to TASKS.md when found.**

---

## 🎯 Project Overview

You are working on the **Bloom Energy Contract Learning & Rules Management System** - an AI-powered platform for creating, managing, and learning from energy service contracts. This system extracts business rules from contracts and exports them to a centralized management platform.

### Core Purpose
1. **Contract Operations**: Create and manage energy service agreements in minutes instead of days
2. **Rules Intelligence**: Extract and export business rules to the management platform
3. **Learning System**: Continuously improve from historical contracts

### Key Metrics
- Reduce contract creation time from 3 days to 30 minutes
- Achieve 95% accuracy in rule extraction
- Cut costs from $500 to $50 per contract

---

## 🏗️ Current Implementation Status

### ✅ Completed Features
- [x] 7-tab contract configuration interface
- [x] Basic validation system
- [x] Local storage persistence
- [x] Contract generation (JSON export)
- [x] Contract library with search/filter
- [x] Template system
- [x] Comparison tool (up to 4 contracts)
- [x] AI Assistant interface (UI only)
- [x] Document upload UI
- [x] Stats dashboard
- [x] Bloom Energy logo integration

### 🚧 In Progress / To Do
- [ ] PostgreSQL integration
- [ ] AWS deployment
- [ ] Full Anthropic API integration
- [ ] AWS Textract integration
- [ ] Rule extraction engine
- [ ] Pattern recognition system
- [ ] Version control
- [ ] Audit trail
- [ ] Management platform API
- [ ] Webhook system
- [ ] Real-time sync

---

## 💻 Technical Stack

### Frontend (Current Implementation)
```javascript
{
  framework: 'React 18+',
  ui: 'Shadcn/ui',
  styling: 'Tailwind CSS',
  icons: 'Lucide React',
  state: 'React hooks + localStorage',
  validation: 'Inline validation',
  build: 'Vite (assumed)',
  charts: 'Recharts (ready to use)'
}
```

### Backend (To Be Implemented)
```javascript
{
  runtime: 'Node.js 20+',
  framework: 'Express.js or NestJS',
  database: 'PostgreSQL (AWS RDS)',
  cache: 'Redis (ElastiCache)',
  storage: 'AWS S3',
  ai: 'Anthropic Claude API',
  ocr: 'AWS Textract'
}
```

---

## 📁 Project Structure

```
bloom-energy-contract-system/
├── src/
│   ├── components/
│   │   ├── BloomContractLearningSystem.jsx  # Main component
│   │   └── ui/                              # Shadcn components
│   ├── services/
│   │   ├── contractService.js               # Contract operations
│   │   ├── aiService.js                     # AI integration
│   │   └── rulesService.js                  # Rules extraction
│   ├── utils/
│   │   ├── validation.js                    # Validation logic
│   │   └── calculations.js                  # Financial calculations
│   └── store/
│       └── contractStore.js                 # State management
├── PLANNING.md                               # Project planning document
├── TASKS.md                                  # Task tracking
├── CLAUDE.md                                 # This file
└── README.md                                 # Project documentation
```

---

## 🔑 Key Components & Features

### 1. Contract Creation Tabs
```javascript
// Tab structure with validation states
const tabs = [
  { id: 'create', label: 'Create', icon: Plus },
  { id: 'basic', label: 'Basic', required: true },
  { id: 'system', label: 'System', required: true },
  { id: 'financial', label: 'Financial', required: true },
  { id: 'operating', label: 'Operating', required: true },
  { id: 'technical', label: 'Technical', required: true },
  { id: 'summary', label: 'Summary', readonly: true }
];
```

### 2. Contract Data Model
```javascript
const contractSchema = {
  id: 'BEC-${uniqueId}',
  client: { name, industry, site },
  system: {
    solutionType: 'PP|MG|AMG|OG',
    capacity: 'multiples of 325kW',
    reliability: '3-9s to 5-9s'
  },
  financial: {
    baseRate: Number,
    escalation: 2.0-5.0,
    term: [5,10,15,20]
  },
  technical: {
    voltage: ['480V','4.16kV','13.2kV','34.5kV'],
    components: ['RI','AC','UC','BESS']
  }
};
```

### 3. Learning System Rules
```javascript
const learnedRules = {
  capacityRange: { min: 200, max: 2000 },
  termRange: { min: 5, max: 20 },
  systemTypes: ['PP', 'MG', 'AMG', 'OG'],
  voltageOptions: ['208V', '480V', '4.16kV', '13.2kV', '34.5kV'],
  componentOptions: ['RI', 'AC', 'UC', 'BESS', 'Solar'],
  escalationRange: { min: 2.0, max: 5.0 }
};
```

---

## 🔧 Working with the Codebase

### Adding New Features
1. Check `TASKS.md` for the specific task
2. Review existing patterns in the codebase
3. Follow the 7-tab structure for new contract fields
4. Update validation rules
5. Persist new data to localStorage
6. Update the learning rules if applicable
7. Mark task complete in `TASKS.md`

### Common Patterns

#### Validation Pattern
```javascript
const validateContract = () => {
  const errors = {};
  
  if (!customerName) errors.customerName = "Customer name is required";
  if (guaranteedCriticalOutput > ratedCapacity) {
    errors.criticalOutput = "Critical output cannot exceed rated capacity";
  }
  
  setValidationErrors(errors);
  return Object.keys(errors).length === 0;
};
```

#### AI Integration Pattern
```javascript
const handleAiSubmit = async () => {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: aiInput }]
      })
    });
    const data = await response.json();
    // Process response
  } catch (error) {
    // Fallback to mock response
  }
};
```

#### LocalStorage Pattern
```javascript
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

const loadFromLocalStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
};
```

---

## 🚀 Development Workflow

### Starting a New Feature
1. Read `PLANNING.md` for project context
2. Check `TASKS.md` for your assigned task
3. Review related components in the codebase
4. Implement the feature following existing patterns
5. Test thoroughly with edge cases
6. Update `TASKS.md` with completion status
7. Add any newly discovered tasks to `TASKS.md`

### Testing Checklist
- [ ] All form validations work correctly
- [ ] Data persists to localStorage
- [ ] UI updates reflect state changes
- [ ] Contract generation produces valid JSON
- [ ] Search and filter functions work
- [ ] AI recommendations apply correctly
- [ ] No console errors in browser

### Common Tasks

#### Add a New Contract Field
1. Add field to state in main component
2. Add UI element to appropriate tab
3. Add validation rule if required
4. Include in contract generation
5. Update summary display
6. Add to contract data model

#### Integrate a New API
1. Create service file in `/services`
2. Add environment variables for API keys
3. Implement error handling and fallbacks
4. Add loading states to UI
5. Update relevant components

#### Fix a Bug
1. Reproduce the issue
2. Check browser console for errors
3. Review component state and props
4. Check localStorage data
5. Fix and test edge cases
6. Update `TASKS.md`

---

## 🐛 Common Issues & Solutions

### Issue: Contract not saving
```javascript
// Check localStorage quota
if (e.name === 'QuotaExceededError') {
  // Clear old data or notify user
}
```

### Issue: AI responses not working
```javascript
// Always implement fallback
if (!response.ok) {
  return generateMockResponse(input);
}
```

### Issue: Validation errors not showing
```javascript
// Ensure state updates trigger re-render
setValidationErrors({...validationErrors, [field]: error});
```

---

## 📊 Important Business Logic

### Capacity Constraints
- Must be in multiples of 325 kW
- Range: 325 kW to 3900 kW
- Based on Bloom Energy Configurator specifications

### Financial Calculations
```javascript
// Yearly rate escalation
const escalationMultiplier = Math.pow(1 + annualEscalation / 100, year);
const yearlyRate = baseRate * escalationMultiplier;

// Total contract value
const totalValue = ratedCapacity * sumOfYearlyRates * 12;
```

### Rule Confidence Scoring
- Extract from multiple contracts
- Calculate occurrence frequency
- Set confidence threshold at 0.7
- Flag anomalies below 0.5

---

## 🔗 Integration Points

### Management Platform API (To Be Implemented)
```javascript
// Export rules endpoint
POST /api/rules/export
{
  ruleSet: extractedRules,
  confidence: confidenceScores,
  sourceContracts: contractIds
}

// Validation endpoint
POST /api/validate
{
  contract: contractData,
  rules: applicableRules
}
```

### Bloom Configurator Integration
- System types: PP, MG, AMG, OG
- Installation types: PES, Ground, Stacked
- Reliability levels: 3-9s through 5-9s
- Component compatibility matrix

---

## 📝 Code Style Guidelines

### React Components
- Use functional components with hooks
- Keep components under 200 lines
- Extract complex logic to custom hooks
- Use descriptive variable names

### State Management
- Use local state for UI-only state
- Use context or store for shared state
- Persist critical data to localStorage
- Clear stale data periodically

### Error Handling
- Always provide user feedback
- Log errors to console in development
- Implement graceful degradation
- Provide fallback UI components

---

## 🔄 Git Workflow

### Branch Naming
- `feature/contract-validation`
- `fix/ai-response-error`
- `refactor/rules-extraction`
- `docs/update-readme`

### Commit Messages
- `feat: Add contract validation for financial tab`
- `fix: Resolve AI response parsing error`
- `refactor: Optimize rule extraction algorithm`
- `docs: Update API documentation`

---

## 📋 Checklist Before Completing Task

- [ ] Feature works as specified in `TASKS.md`
- [ ] No console errors or warnings
- [ ] Data persists correctly
- [ ] UI is responsive and accessible
- [ ] Edge cases handled
- [ ] Loading states implemented
- [ ] Error states handled
- [ ] Task marked complete in `TASKS.md`
- [ ] New tasks added to `TASKS.md` if discovered
- [ ] Code follows project patterns

---

## 🆘 Getting Help

1. Review the PRD for business requirements
2. Check existing code for similar patterns
3. Look for TODO comments in codebase
4. Review error messages carefully
5. Check browser DevTools for issues
6. Test with different data scenarios

---

## 🎯 Priority Focus Areas

1. **Immediate**: Fix any breaking bugs
2. **High**: Complete PostgreSQL integration
3. **High**: Implement full AI integration
4. **Medium**: Add rule extraction engine
5. **Medium**: Deploy to AWS
6. **Low**: Add advanced analytics

---

## 📚 Resources

- [Shadcn/ui Documentation](https://ui.shadcn.com)
- [React Hook Form](https://react-hook-form.com)
- [Anthropic API Docs](https://docs.anthropic.com)
- [AWS Textract](https://aws.amazon.com/textract)
- [PostgreSQL with Node.js](https://node-postgres.com)

---

**Remember: Always start by reading PLANNING.md, check TASKS.md for your work, and maintain task tracking throughout your session!**