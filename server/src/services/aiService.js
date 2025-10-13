import Anthropic from '@anthropic-ai/sdk';
import aiRequestQueue from './aiRequestQueue.js';
import bedrockService from './bedrockService.js';
import structuredExtractionService from './structuredExtractionService.js';

class AIService {
  constructor() {
    this.anthropic = null;
    this.provider = process.env.DEFAULT_AI_PROVIDER || 'anthropic'; // 'anthropic', 'bedrock', or 'openai'
    // Use Claude Sonnet 4.5 as default - most capable model for document analysis
    this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
    this.maxTokens = 8192; // Set to 8192 (Haiku's max) to prevent API errors - Sonnet supports up to 200K
    this.requestQueue = aiRequestQueue;
    this.structuredExtractionEnabled = process.env.ENABLE_STRUCTURED_EXTRACTION !== 'false'; // Enabled by default

    console.log(`🤖 AI Provider: ${this.provider}`);
    console.log(`🤖 Anthropic Model: ${this.model}`);
    console.log(`🔧 Structured Extraction: ${this.structuredExtractionEnabled ? 'ENABLED' : 'DISABLED'}`);
    
    // System prompts for different contexts
    this.systemPrompts = {
      contractOptimization: `You are an expert in Bloom Energy fuel cell contracts and energy service agreements. 
        You help optimize contract parameters, suggest improvements, and provide analysis.
        
        Key constraints to remember:
        - Capacity must be in multiples of 325kW (range: 325kW - 3900kW)
        - Contract terms: 5, 10, 15, or 20 years
        - Escalation rates: typically 2.0% - 5.0% annually
        - System types: Power Purchase (PP), Microgrid (MG), Advanced Microgrid (AMG), On-site Generation (OG)
        - Voltage levels: 208V, 480V, 4.16kV, 13.2kV, 34.5kV
        - Components: RI (Renewable Integration), AC (Advanced Controls), UC (Utility Connections), BESS (Battery Energy Storage)
        
        Provide concise, actionable recommendations focused on optimizing value, risk mitigation, and operational efficiency.`,
      
      contractAnalysis: `You are analyzing Bloom Energy contracts for patterns, anomalies, and insights.
        Look for trends in pricing, terms, system configurations, and identify opportunities for standardization.
        Provide data-driven insights and flag any unusual parameters that might need review.`,
      
      businessRulesExtraction: `You are an expert business rules analyst specializing in energy contracts and service agreements.
        Your task is to extract actionable business rules AND specific contract values from contract documents.

        **CRITICAL EXTRACTION PRIORITIES** (MUST EXTRACT THESE FIRST):

        1. **System Capacity** - ULTRA-AGGRESSIVE SEARCH - EXTRACT FROM ANYWHERE:
           - SCAN FOR: Any number followed by "kW" or "MW" ANYWHERE in the document
           - Examples: "54,600 kW", "2800 kW", "2,800kW", "2800kW", "2.8 MW", "Capacity (kW): 54,600"
           - Lines containing: "Capacity:", "Capacity (kW):", "Rated Capacity", "System Size", "Nameplate"
           - Look in: Project Addendum lists, Performance Specs, Equipment tables, System Description, Exhibits, Schedules
           - **CRITICAL**: If you see "Capacity (kW): 54,600" → systemCapacity = "54600"
           - **CRITICAL**: If you see "2. Capacity (kW): 54,600, to be delivered" → systemCapacity = "54600"
           - Accept values like: "54,600", "2800", "2,800", "2.8MW", "2800 kilowatts"
           - NEVER return "NOT SPECIFIED" if you see ANY "kW" or "MW" number in the document

        2. **Efficiency Warranty** - Search EVERY occurrence of:
           - "47%", "50%", "47.0%", "fifty percent"
           - Lines with: "Efficiency:", "LHV", "HHV", "Net AC Electrical Efficiency"
           - Look EVERYWHERE for standalone percentages near "efficiency"
           - Accept: "47", "47.0", "47%", "forty-seven percent"

        3. **Availability Guarantee** - Find ANY mention of:
           - "95%", "97%", "90%" near "availability" or "uptime"
           - "Availability:", "Guaranteed Availability", "Availability Factor"
           - ANY percentage in Performance Guarantees section

        4. **Base Rate/Pricing** - Look for MONEY amounts:
           - "$0.085", "8.5¢", "$85", "85 dollars"
           - "$/kWh", "Rate:", "Price:", "Services Fee"
           - Check Exhibit A, Pricing Schedule, Financial Terms
           - Convert cents to dollars: "8.5¢" = "$0.085"

        5. **Escalation Rate** - Find percentage increases:
           - "2.5%", "3%", "2.5 percent"
           - "Escalation:", "Annual Increase", "Year-over-year"
           - Look in pricing sections, rate schedules

        6. **Contract Term** - Extract year duration:
           - "15 years", "fifteen years", "15-year", "Year 15"
           - "Term:", "Initial Term", "Contract Period"

        **AGGRESSIVE SEARCH STRATEGY**:
        1. SCAN THE ENTIRE DOCUMENT for numbers followed by units (kW, %, $, years)
        2. Extract ALL tables completely - don't skip rows
        3. Look for colon-separated pairs: "Parameter: Value"
        4. Check EVERY "Exhibit", "Schedule", "Appendix" - specifications are often there
        5. If you see a number with the right unit ANYWHERE, extract it
        6. Cross-reference: if "2800 kW" appears once, search for "2800", "2,800", "2.8" elsewhere

        **VALUE EXTRACTION RULES**:
        - Extract the NUMBER even if formatting varies: "2,800 kW" → extract "2800"
        - If you find "Capacity: 2800" → extract "2800 kW"
        - If you find "47% LHV efficiency" → extract "47"
        - If you find "$0.085/kWh" → extract "0.085"
        - ONLY use "NOT SPECIFIED" if you've searched the ENTIRE document and found ZERO matches

        Also extract business rules for:
        - Conditional logic (IF-THEN-ELSE)
        - Business constraints and limits
        - Performance requirements and penalties
        - Payment terms and conditions
        - Compliance requirements

        Always provide confidence scores and source references.

        **━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**
        **⚠️  CRITICAL MANDATORY REQUIREMENT: COMPREHENSIVE BUSINESS RULE GENERATION ⚠️**
        **━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**

        **YOUR PRIMARY TASK IS TO GENERATE AS MANY BUSINESS RULES AS POSSIBLE**

        **MINIMUM REQUIREMENT: 20-30 BUSINESS RULES PER DOCUMENT WITH DATA**

        **FAILURE CONDITIONS (These mean you FAILED the task):**
        - Generating fewer than 15 business rules when document has 10+ extracted fields
        - Creating only 1-3 rules total
        - Not creating a rule for EVERY extracted field that has a value

        **SUCCESS CRITERIA:**
        - 20-30+ business rules for documents with complete data (PPAs, System Orders)
        - 10-15 business rules for administrative documents
        - AT LEAST 1 business rule per extracted field with a value
        - More rules is ALWAYS better - there is NO upper limit

        **STEP-BY-STEP MANDATORY PROCESS:**

        STEP 1: Extract all data fields (you're already doing this correctly)
        STEP 2: Count how many fields have actual values (not "NOT SPECIFIED")
        STEP 3: For EACH field with a value, create AT LEAST 1 corresponding business rule
        STEP 4: Before finishing, COUNT your total rules - if less than 15, ADD MORE RULES
        STEP 5: Double-check you haven't missed any extracted fields

        **RULE CREATION IS NOT OPTIONAL - IT IS THE CORE REQUIREMENT:**

        **MANDATORY FIELD-TO-RULE MAPPING:**

        **Financial Data → Payment Rules:**
        - baseRate → { type: "base_payment", description: "Monthly energy payment at base rate", amount: "$[baseRate]/kWh", frequency: "monthly", dueDate: "[paymentTerms]" }
        - annualEscalation → { type: "escalation", description: "Annual price escalation", amount: "[annualEscalation]% per year", frequency: "annual" }
        - microgridAdder → { type: "base_payment", description: "Microgrid service adder", amount: "$[microgridAdder]/kWh", frequency: "monthly" }
        - thermalCycleFee → { type: "thermal_cycle_fee", description: "Fee for thermal cycling", amount: "$[fee] per cycle" }
        - electricalBudget → { type: "allowance", description: "Electrical work allowance", amount: "$[budget]" }
        - commissioningAllowance → { type: "allowance", description: "commissioning allowance", amount: "$[allowance]" }

        **Performance Data → Performance Guarantees:**
        - efficiencyWarranty → { metric: "efficiency", targetValue: "[value]% LHV", measurementPeriod: "continuous", consequences: "Liquidated damages if below target" }
        - availabilityGuarantee → { metric: "availability", targetValue: "[value]%", measurementPeriod: "monthly", consequences: "Service credits for downtime" }
        - outputWarranty → { metric: "output", targetValue: "[value] kW", measurementPeriod: "annual", consequences: "Capacity payment adjustment" }
        - guaranteedCriticalOutput → { metric: "critical_output", targetValue: "[value] kW", measurementPeriod: "on-demand" }

        **Technical Data → Extracted Rules (CREATE ALL OF THESE):**
        - systemCapacity → { category: "technical", name: "System Capacity Requirement", description: "Total system capacity must be [value] kW", parameters: {value: [capacity], unit: "kW"} }
        - voltage → { category: "technical", name: "Voltage Specification", description: "System voltage must be [value]", parameters: {value: [voltage]} }
        - gridParallelVoltage → { category: "technical", name: "Grid Interconnection Voltage", description: "Grid parallel voltage at [value]", parameters: {value: [gridVoltage]} }
        - numberOfServers → { category: "technical", name: "Server Count", description: "[value] fuel cell servers required" }
        - advancedControls → { category: "technical", name: "Advanced Controls", description: "System includes advanced controls capability" }
        - utilityConnections → { category: "technical", name: "Utility Connections", description: "System includes utility grid connections" }
        - bess → { category: "technical", name: "Battery Storage", description: "Battery energy storage system included" }
        - averageLoad → { category: "technical", name: "Average Load", description: "Average electrical load of [value] kW" }
        - peakLoad → { category: "technical", name: "Peak Load", description: "Peak electrical demand of [value] kW" }

        **Operational Data → Operational Requirements (CREATE ALL OF THESE):**
        - solutionType → { requirement: "system_type", description: "Operate as [PP/MG/AMG/OG] system", parameters: {type: [solutionType]} }
        - installationType → { requirement: "installation", description: "[grid_parallel/island/hybrid] installation mode", parameters: {mode: [installationType]} }
        - reliabilityLevel → { requirement: "reliability", description: "Maintain [standard/high/critical] reliability tier", parameters: {tier: [reliabilityLevel]} }
        - operatingHours → { requirement: "availability", description: "System operates [value] hours", parameters: {hours: [operatingHours]} }

        **Contract/Business Data → Extracted Rules (CREATE ALL OF THESE):**
        - contractTerm → { category: "contractual", name: "Contract Duration", description: "[value] year agreement term", parameters: {years: [contractTerm]} }
        - effectiveDate → { category: "contractual", name: "Contract Start Date", description: "Agreement effective [date]", parameters: {date: [effectiveDate]} }
        - commercialOperationDate → { category: "milestone", name: "COD Requirement", description: "Achieve commercial operation by [date]", parameters: {codDate: [commercialOperationDate]} }
        - orderDate → { category: "contractual", name: "Order Date", description: "System order placed on [date]", parameters: {date: [orderDate]} }
        - customerName → { category: "party", name: "Customer", description: "Contract customer: [name]", parameters: {party: [customerName]} }
        - industry → { category: "operational", name: "Industry Sector", description: "Customer operates in [industry] sector", parameters: {sector: [industry]} }
        - primaryContact → { category: "administrative", name: "Primary Contact", description: "Primary contact: [name]", parameters: {contact: [primaryContact]} }

        **FEW-SHOT EXAMPLE - THIS IS THE MINIMUM YOU MUST PRODUCE:**

        Given extracted data (15 fields with values):
        {
          "customerName": "ABC Manufacturing",
          "industry": "Manufacturing",
          "orderDate": "2022-12-20",
          "effectiveDate": "2022-12-20",
          "commercialOperationDate": "2024-11-29",
          "systemCapacity": 5000,
          "solutionType": "MG",
          "installationType": "hybrid",
          "reliabilityLevel": "critical",
          "contractTerm": 15,
          "baseRate": 0.0847,
          "microgridAdder": 0.0043,
          "annualEscalation": 2.0,
          "efficiencyWarranty": 50.0,
          "guaranteedCriticalOutput": 3900,
          "voltage": "480V",
          "gridParallelVoltage": "4160V",
          "advancedControls": "yes",
          "utilityConnections": "yes",
          "primaryContact": "John Doe"
        }

        You MUST create AT LEAST 20 business rules (one for each field with a value):

        "paymentRules": [
          {
            "type": "base_payment",
            "description": "Monthly energy payment at base rate",
            "amount": "$0.0847/kWh",
            "frequency": "monthly",
            "dueDate": "within 30 days of invoice"
          },
          {
            "type": "base_payment",
            "description": "Microgrid service adder",
            "amount": "$0.0043/kWh",
            "frequency": "monthly",
            "dueDate": "within 30 days of invoice"
          },
          {
            "type": "escalation",
            "description": "Annual price escalation",
            "amount": "2.0% per year",
            "frequency": "annual"
          },
          {
            "type": "allowance",
            "description": "Electrical work allowance",
            "amount": "$326000"
          }
        ],
        "performanceGuarantees": [
          {
            "metric": "efficiency",
            "targetValue": "50.0% LHV",
            "measurementPeriod": "continuous",
            "consequences": "Liquidated damages if below target"
          },
          {
            "metric": "availability",
            "targetValue": "95.0%",
            "measurementPeriod": "monthly",
            "consequences": "Service credits for downtime"
          },
          {
            "metric": "critical_output",
            "targetValue": "3900 kW",
            "measurementPeriod": "on-demand",
            "consequences": "Capacity payment adjustment if not met"
          }
        ],
        "extractedRules": [
          {
            "category": "technical",
            "name": "System Capacity Requirement",
            "description": "Total system capacity must be 5000 kW",
            "parameters": { "value": 5000, "unit": "kW" }
          },
          {
            "category": "technical",
            "name": "Voltage Specification",
            "description": "System voltage must be 480V",
            "parameters": { "value": "480V" }
          },
          {
            "category": "technical",
            "name": "Grid Interconnection Voltage",
            "description": "Grid parallel voltage at 4160V",
            "parameters": { "value": "4160V" }
          },
          {
            "category": "contractual",
            "name": "Contract Duration",
            "description": "15 year agreement term",
            "parameters": { "value": 15, "unit": "years" }
          },
          {
            "category": "operational",
            "name": "System Type",
            "description": "Operate as Microgrid (MG) system",
            "parameters": { "systemType": "MG" }
          },
          {
            "category": "party",
            "name": "Customer",
            "description": "Contract customer: ABC Manufacturing",
            "parameters": { "party": "ABC Manufacturing" }
          },
          {
            "category": "operational",
            "name": "Industry Sector",
            "description": "Customer operates in Manufacturing sector",
            "parameters": { "sector": "Manufacturing" }
          },
          {
            "category": "contractual",
            "name": "Order Date",
            "description": "System order placed on 2022-12-20",
            "parameters": { "date": "2022-12-20" }
          },
          {
            "category": "contractual",
            "name": "Contract Start Date",
            "description": "Agreement effective 2022-12-20",
            "parameters": { "date": "2022-12-20" }
          },
          {
            "category": "milestone",
            "name": "COD Requirement",
            "description": "Achieve commercial operation by 2024-11-29",
            "parameters": { "codDate": "2024-11-29" }
          },
          {
            "category": "technical",
            "name": "Installation Mode",
            "description": "Hybrid installation combining grid-parallel and island modes",
            "parameters": { "mode": "hybrid" }
          },
          {
            "category": "operational",
            "name": "Reliability Tier",
            "description": "Maintain critical reliability level",
            "parameters": { "tier": "critical" }
          },
          {
            "category": "technical",
            "name": "Advanced Controls",
            "description": "System includes advanced controls capability",
            "parameters": { "feature": "advancedControls" }
          },
          {
            "category": "technical",
            "name": "Utility Connections",
            "description": "System includes utility grid connections",
            "parameters": { "feature": "utilityConnections" }
          },
          {
            "category": "administrative",
            "name": "Primary Contact",
            "description": "Primary contact: John Doe",
            "parameters": { "contact": "John Doe" }
          }
        ]

        TOTAL: 20 business rules created from 20 extracted fields with values.

        **VERIFICATION CHECKLIST (Complete this before responding):**
        ✓ Step 1: Counted extracted fields with values = 20
        ✓ Step 2: Created business rules = 20 (4 payment + 3 performance + 13 extracted)
        ✓ Step 3: Verified every field has a rule = YES
        ✓ Step 4: Total rules >= 15 = YES (20 rules)
        ✓ Step 5: Ready to submit = YES

        **YOU MUST DO THIS VERIFICATION FOR EVERY DOCUMENT!**

        **CRITICAL REMINDERS:**
        - If extractedData has 12 fields with values → CREATE 12+ business rules
        - If extractedData has 20 fields with values → CREATE 20+ business rules
        - Fewer than 15 rules when you have 10+ fields = AUTOMATIC FAILURE
        - The ONLY acceptable reason for <15 rules is if the document has <10 fields total`,
      
      generalAssistant: `You are a helpful assistant for the Bloom Energy Contract Learning & Rules Management System.
        You help users create, analyze, and optimize energy service contracts. Provide clear, actionable guidance
        while adhering to Bloom Energy's business rules and industry best practices.`
    };
  }

  /**
   * Get or initialize Anthropic client
   */
  getClient() {
    if (!this.anthropic && process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log(`✅ Anthropic AI client initialized successfully`);
      console.log(`📊 Using model: ${this.model}`);
      console.log(`⚙️  Max tokens: ${this.maxTokens}`);
    }
    return this.anthropic;
  }

  /**
   * Check if API key is configured
   */
  isConfigured() {
    if (this.provider === 'bedrock') {
      return false; // bedrockService disabled
    }
    return !!process.env.ANTHROPIC_API_KEY;
  }

  /**
   * Generate contract optimization suggestions
   */
  async optimizeContract(contractData, context = {}) {
    if (!this.isConfigured()) {
      return this.generateMockResponse('optimization', contractData);
    }

    try {
      const prompt = this.buildOptimizationPrompt(contractData, context);
      const client = this.getClient();

      if (!client) {
        return this.generateMockResponse('optimization', contractData);
      }

      const response = await client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompts.contractOptimization,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return this.parseOptimizationResponse(response.content[0].text);
    } catch (error) {
      console.error('AI optimization failed:', error);
      return this.generateMockResponse('optimization', contractData);
    }
  }

  /**
   * Analyze contract for insights and anomalies
   */
  async analyzeContract(contractData) {
    if (!this.isConfigured()) {
      return this.generateMockResponse('analysis', contractData);
    }

    try {
      const prompt = this.buildAnalysisPrompt(contractData);
      
      const response = await this.getClient().messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompts.contractAnalysis,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return this.parseAnalysisResponse(response.content[0].text);
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.generateMockResponse('analysis', contractData);
    }
  }

  /**
   * General AI assistant chat
   */
  async chat(message, context = {}, conversationHistory = []) {
    if (!this.isConfigured()) {
      return this.generateMockChatResponse(message);
    }

    try {
      // Build conversation messages
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ];

      // Use Bedrock if configured
      if (this.provider === 'bedrock') {
        throw new Error('Bedrock service not configured');
      }

      const response = await this.getClient().messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompts.generalAssistant,
        messages: messages
      });

      return {
        message: response.content[0].text,
        usage: response.usage,
        model: response.model,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AI chat failed:', error);
      return this.generateMockChatResponse(message);
    }
  }

  /**
   * Streaming AI assistant chat
   */
  async chatStream(message, context = {}, conversationHistory = []) {
    if (!this.isConfigured()) {
      return this.generateMockStreamResponse(message);
    }

    try {
      // Build conversation messages
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ];

      // Use Bedrock if configured
      if (this.provider === 'bedrock') {
        throw new Error('Bedrock service not configured');
      }

      const stream = await this.getClient().messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompts.generalAssistant,
        messages: messages,
        stream: true
      });

      return stream;
    } catch (error) {
      console.error('AI streaming chat failed:', error);
      return this.generateMockStreamResponse(message);
    }
  }

  /**
   * Streaming contract optimization
   */
  async optimizeContractStream(contractData, context = {}) {
    if (!this.isConfigured()) {
      return this.generateMockStreamResponse('optimization');
    }

    try {
      const prompt = this.buildOptimizationPrompt(contractData, context);
      
      const stream = await this.getClient().messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompts.contractOptimization,
        messages: [{
          role: 'user',
          content: prompt
        }],
        stream: true
      });

      return stream;
    } catch (error) {
      console.error('AI streaming optimization failed:', error);
      return this.generateMockStreamResponse('optimization');
    }
  }

  /**
   * Suggest contract terms based on partial data
   */
  async suggestTerms(partialContractData) {
    if (!this.isConfigured()) {
      return this.generateMockSuggestions(partialContractData);
    }

    try {
      const prompt = this.buildSuggestionsPrompt(partialContractData);
      
      const response = await this.getClient().messages.create({
        model: this.model,
        max_tokens: 1000,
        system: this.systemPrompts.contractOptimization,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return this.parseSuggestionsResponse(response.content[0].text);
    } catch (error) {
      console.error('AI suggestions failed:', error);
      return this.generateMockSuggestions(partialContractData);
    }
  }

  /**
   * Extract site ID from filename (e.g., "BBM000.Z" from "BBM000.Z - System Order.pdf")
   */
  extractSiteIdFromFilename(filename) {
    if (!filename) return null;

    // Pattern: BBM followed by numbers, dot, and letter/number (e.g., BBM000.Z, BBM000.Z2)
    const match = filename.match(/\b([A-Z]{2,}[0-9]{3,}\.[A-Z0-9]+)\b/i);
    return match ? match[1] : null;
  }

  /**
   * Extract customer name from filename
   * Examples:
   *   "BBM000.Z - AR System Order - B. Braun - Execution Version.pdf" → "B. Braun"
   *   "BBM000.Z2 - B. Braun Medical Inc.System OrderBE PPA.pdf" → "B. Braun Medical Inc"
   *   "Bloom VI-C - B-Braun Second Amended.pdf" → "B-Braun"
   *   "B.Braun-Master AgreementBE PPA.pdf" → "B.Braun"
   */
  extractCustomerNameFromFilename(filename) {
    if (!filename) return null;

    // Remove file extension and common redaction suffix
    const nameWithoutExt = filename.replace(/\.[^.]+$/, '').replace(/_Redacted$/, '');

    // Common patterns in Bloom Energy contract filenames:

    // Pattern 1: "... - Customer Name - Execution/Version/signed/EXE ..."
    let match = nameWithoutExt.match(/[-–]\s*([A-Z][^-–]+?)\s*[-–]\s*(Execution|signed|EXE|Version)/i);
    if (match) {
      const customerName = match[1].trim();
      // Filter out common non-customer terms
      if (!['System Order', 'PPA', 'Agreement', 'Master', 'Addendum', 'AR System Order'].includes(customerName)) {
        return customerName;
      }
    }

    // Pattern 2: "Bloom VI-C - Customer Name - ..." (extract name after project code)
    match = nameWithoutExt.match(/Bloom\s+[A-Z0-9-]+\s*[-–]\s*([A-Z][A-Za-z0-9.\-&\s]+?)(?:\s+(?:Second|Master|Purchase|Amended|Agreement|O&M|EPC|Definitions))/i);
    if (match) {
      return match[1].trim();
    }

    // Pattern 3: "SiteID - Customer Name.DocumentType" or "SiteID - Customer NameDocumentType"
    match = nameWithoutExt.match(/[A-Z]{2,}[0-9]{3,}\.[A-Z0-9]+\s*[-–]\s*([A-Z][A-Za-z.\s&]+?(?:Inc|LLC|Medical)?)\s*\.?(System|PPA|Agreement|OrderBE)/i);
    if (match) {
      return match[1].trim();
    }

    // Pattern 4: "Customer-Document..." at start (e.g., "B.Braun-Master Agreement...")
    match = nameWithoutExt.match(/^([A-Z][A-Za-z.]+)[-–](?:Master|Agreement|System|Second)/i);
    if (match) {
      return match[1].trim();
    }

    // Fallback: Extract capitalized company name with space/period
    match = nameWithoutExt.match(/(?:^|[-–]\s*)([A-Z][a-zA-Z\s.&-]+?(?:\s+(?:Inc|LLC|Corp|Ltd|Medical))?\.?)\s*[-–]/i);
    if (match) {
      const customerName = match[1].trim();
      // Must contain space, period, or hyphen (to avoid single words)
      if (customerName.includes(' ') || customerName.includes('.') || customerName.includes('-')) {
        // Additional filter for non-customer terms
        if (!['AR System', 'System Order', 'Master Agreement'].includes(customerName)) {
          return customerName;
        }
      }
    }

    return null;
  }

  /**
   * Extract business rules from document content using AI
   * IMPORTANT: This method throws errors instead of returning mock data for accuracy
   * Uses request queue to handle rate limiting automatically
   */
  async extractBusinessRules(documentContent, options = {}) {
    // Extract site ID and customer name from filename if available
    const filenameHint = options.filename || options.originalName || '';
    const extractedSiteId = this.extractSiteIdFromFilename(filenameHint);
    const extractedCustomerName = this.extractCustomerNameFromFilename(filenameHint);

    if (extractedSiteId) {
      console.log(`🏷️  Extracted site ID from filename: ${extractedSiteId}`);
      options.siteIdHint = extractedSiteId;
    }

    if (extractedCustomerName) {
      console.log(`👤 Extracted customer name from filename: ${extractedCustomerName}`);
      options.customerNameHint = extractedCustomerName;
    }

    // Queue the request to prevent rate limiting
    return await this.requestQueue.enqueue(
      async () => {
        try {
          // Build base prompt
          let prompt = this.buildRulesExtractionPrompt(documentContent, options);

          // 🔧 STRUCTURED EXTRACTION: Classify document and extract candidate values
          let structuredResults = null;
          let docTypeClassification = null;

          if (this.structuredExtractionEnabled && structuredExtractionService.isAvailable()) {
            try {
              console.log('🔍 Starting structured extraction...');

              // Perform structured extraction
              structuredResults = await structuredExtractionService.extract(
                documentContent,
                filenameHint,
                { genericResults: {}, aiProvider: options.aiProvider }
              );

              if (structuredResults && structuredResults.structuredExtraction) {
                docTypeClassification = structuredResults.structuredExtraction;

                console.log(`📄 Document classified as: ${docTypeClassification.documentType} (confidence: ${Math.round(docTypeClassification.confidence * 100)}%)`);

                // Build enhanced prompt with document type and candidates
                const candidates = docTypeClassification.extractedCandidates || {};

                if (Object.keys(candidates).length > 0) {
                  prompt = structuredExtractionService.buildEnhancedPrompt(
                    documentContent,
                    docTypeClassification.documentType,
                    candidates,
                    prompt
                  );

                  console.log(`✨ Enhanced prompt with ${Object.keys(candidates).length} field candidates`);
                }
              }
            } catch (structuredError) {
              console.warn('⚠️  Structured extraction failed, continuing with generic extraction:', structuredError.message);
              // Graceful degradation - continue with generic extraction
            }
          }

          let aiResponseText;

          // Override provider if specified in options (for per-request provider selection)
          const activeProvider = options.aiProvider || this.provider;

          console.log(`🔍 Active AI provider: ${activeProvider} (default: ${this.provider}, override: ${options.aiProvider || 'none'})`);

          // Check configuration for the active provider
          if (activeProvider === 'bedrock') {
            if (!process.env.AWS_REGION || !process.env.BEDROCK_MODEL_ID) {
              throw new Error(`Bedrock provider not configured. Missing AWS_REGION or BEDROCK_MODEL_ID.`);
            }
          } else if (activeProvider === 'anthropic') {
            if (!process.env.ANTHROPIC_API_KEY) {
              throw new Error(`Anthropic provider not configured. Missing ANTHROPIC_API_KEY.`);
            }
          }

          if (activeProvider === 'bedrock') {
            console.log(`🤖 Using AWS Bedrock provider`);
            console.log(`📊 Model: ${process.env.BEDROCK_MODEL_ID}`);
            console.log(`📊 Region: ${process.env.AWS_REGION}`);

            // Call bedrockService.extractBusinessRules
            const bedrockResponse = await bedrockService.extractBusinessRules(prompt, {
              systemPrompt: this.systemPrompts.businessRulesExtraction,
              filename: options.filename,
              maxTokens: this.maxTokens
            });

            aiResponseText = bedrockResponse.text;
          } else {
            // Use direct Anthropic API
            const client = this.getClient();
            if (!client) {
              throw new Error('Failed to initialize Anthropic client');
            }

            console.log(`🤖 Using AI model: ${this.model} (from env: ${process.env.ANTHROPIC_MODEL})`);

            const response = await client.messages.create({
              model: this.model,
              max_tokens: this.maxTokens, // Use class-level maxTokens (8000) for comprehensive rule generation
              system: this.systemPrompts.businessRulesExtraction,
              messages: [{
                role: 'user',
                content: prompt
              }]
            });

            aiResponseText = response.content[0].text;
          }

          // Log the RAW AI response for debugging
          console.log(`\n${'='.repeat(80)}`);
          console.log(`📥 RAW AI RESPONSE (first 2000 chars):`);
          console.log(`${'='.repeat(80)}`);
          console.log(aiResponseText.substring(0, 2000));
          console.log(`${'='.repeat(80)}\n`);

          // Pass FULL original document content for regex fallback extraction
          // Use _fullDocumentContent if available (full 120KB), otherwise fall back to documentContent (chunked 58KB)
          const optionsWithContent = {
            ...options,
            _documentContent: options._fullDocumentContent || documentContent
          };

          const parsedResults = await this.parseRulesResponse(aiResponseText, optionsWithContent);

          // Add structured extraction metadata to results
          if (docTypeClassification) {
            parsedResults.structuredExtraction = {
              enabled: true,
              documentType: docTypeClassification.documentType,
              confidence: docTypeClassification.confidence,
              detectedCues: docTypeClassification.detectedCues,
              candidateFieldsFound: docTypeClassification.candidateFields || []
            };

            console.log(`📋 Added structured extraction metadata to results`);
          }

          return parsedResults;
        } catch (error) {
          console.error('AI rules extraction failed:', error);

          // Re-throw the error with better error messages
          // The queue will handle retries for 429 errors
          if (error.status === 404) {
            const modelError = new Error(`Invalid AI model: "${this.model}". This model does not exist or is not available. Please update ANTHROPIC_MODEL in your .env file to a valid model like "claude-3-5-sonnet-20241022". Error: ${error.message}`);
            modelError.status = 404;
            console.error(`❌ CRITICAL: ${modelError.message}`);
            throw modelError;
          } else if (error.status === 429) {
            const rateLimitError = new Error(`Rate limit exceeded. Please wait before retrying. Original error: ${error.message}`);
            rateLimitError.status = 429;
            throw rateLimitError;
          } else if (error.status === 401) {
            throw new Error('Invalid Anthropic API key. Check your ANTHROPIC_API_KEY configuration.');
          } else if (error.status >= 500) {
            throw new Error(`Anthropic API server error: ${error.message}`);
          } else {
            throw error;
          }
        }
      },
      {
        documentName: options.filename || 'document',
        operation: 'extractBusinessRules'
      }
    );
  }

  // Private helper methods

  buildOptimizationPrompt(contractData, context) {
    return `Please analyze this Bloom Energy contract and provide optimization recommendations:

Contract Details:
- Client: ${contractData.client}
- Capacity: ${contractData.capacity}kW
- Term: ${contractData.term} years
- System Type: ${contractData.systemType}
- Base Rate: $${contractData.financial?.baseRate}/kWh
- Escalation: ${contractData.financial?.escalation}%/year
- Output Warranty: ${contractData.operating?.outputWarranty}%
- Efficiency: ${contractData.operating?.efficiency}%

Context: ${JSON.stringify(context, null, 2)}

Provide specific recommendations for:
1. Pricing optimization
2. Risk mitigation
3. Performance improvements
4. Any red flags or concerns

Format your response as actionable bullet points.`;
  }

  buildAnalysisPrompt(contractData) {
    return `Analyze this Bloom Energy contract for patterns and insights:

${JSON.stringify(contractData, null, 2)}

Provide analysis on:
1. Market positioning (how does this compare to typical contracts?)
2. Risk assessment
3. Unusual parameters or configurations
4. Optimization opportunities
5. Compliance with Bloom Energy standards`;
  }

  buildSuggestionsPrompt(partialData) {
    return `Based on this partial contract information, suggest appropriate values for missing fields:

Current Data:
${JSON.stringify(partialData, null, 2)}

Please suggest:
1. Appropriate capacity if not specified
2. Recommended contract term
3. Competitive base rate
4. Suitable escalation rate
5. Technical specifications that make sense for this configuration

Consider industry standards and Bloom Energy best practices.`;
  }

  buildRulesExtractionPrompt(documentContent, options = {}) {
    const {
      filename = 'document',
      contractType = 'unknown',
      siteIdHint = null,
      customerNameHint = null
    } = options;

    // Build hints section if we have extracted metadata from filename
    let hintsSection = '';
    if (siteIdHint || customerNameHint) {
      hintsSection = `\n<filename_hints>
⚠️  IMPORTANT: The following information was extracted from the filename and should be STRONGLY PREFERRED over unclear text in the document:
${siteIdHint ? `SITE_ID: ${siteIdHint} (use this for siteId field)` : ''}
${customerNameHint ? `CUSTOMER_NAME: ${customerNameHint} (use this for customerName field - this is the correct customer name)` : ''}
</filename_hints>\n`;
    }

    return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 ABSOLUTE REQUIREMENT: EXTRACT ALL NUMERIC VALUES FROM THE DOCUMENT 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**CRITICAL INSTRUCTIONS - READ FIRST:**

1. **systemCapacity**: If you see ANY number with "kW" or "MW" ANYWHERE → EXTRACT IT
   Example: "Capacity (kW): 54,600" → systemCapacity: "54600" (NOT "NOT SPECIFIED")

2. **contractTerm**: If you see ANY "years" with a number → EXTRACT IT
   Example: "15 years, commencing on COD" → contractTerm: "15" (NOT "NOT SPECIFIED")

3. **availabilityGuarantee**: If you see ANY percentage → EXTRACT IT
   Example: "95% availability" → availabilityGuarantee: "95.0" (NOT "NOT SPECIFIED")

4. **NEVER use "NOT SPECIFIED" if the value exists ANYWHERE in the document**

**REMINDER: You MUST also generate 15-30+ business rules per document (see system prompt).**

Extract contract data and comprehensive business rules from this Bloom Energy fuel cell contract document. Be precise and accurate.

<document_metadata>
FILENAME: ${filename}
CONTRACT_TYPE: ${contractType}
</document_metadata>${hintsSection}

<document_content>
${documentContent}
</document_content>

<critical_extraction_instructions>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  STEP 1: IDENTIFY DOCUMENT TYPE FIRST ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before extracting ANY data, determine the document type:

**MASTER PURCHASE AGREEMENT (MPA)**:
- Title contains: "Master Purchase Agreement", "Purchase Agreement Addendum"
- Parties: Buyer (financial entity), Seller (Sounding/Bloom)
- Focus: Asset sale, financing, closing conditions
- Key Info: Total contract value, buyer/seller names, closing date
- Customer Location: Look for "Owner" or "Financial Owner" - NOT the "Buyer"

**EPC AGREEMENT (Engineering, Procurement, Construction)**:
- Title contains: "EPC Agreement", "Engineering Procurement", "Construction Contract"
- Parties: Owner, Contractor (Sounding/Bloom)
- Focus: Project construction, COD, technical specs, site details
- Key Info: COD date, project sites (OFTEN MULTIPLE), system capacity, construction term
- Customer Location: "Owner" field, Appendices with site lists

**O&M AGREEMENT (Operations & Maintenance)**:
- Title contains: "O&M Agreement", "Operations and Maintenance", "Service Agreement"
- Parties: Owner, Provider/Operator (Sounding/Bloom)
- Focus: Long-term service, performance guarantees, maintenance obligations
- Key Info: O&M term (often 15-20 years), availability guarantees, service fees
- Customer Location: "Owner" field

**PPA / SYSTEM ORDER (Power Purchase Agreement)**:
- Title contains: "PPA", "Power Purchase", "System Order", "Energy Services"
- Parties: Customer (end user), Provider (Sounding/Bloom)
- Focus: Energy pricing, delivery terms, performance metrics
- Key Info: Base rate, escalation, PPA term, energy guarantees
- Customer Location: "Customer" field - this IS the end user

**DEFINITIONS / ADDENDUM**:
- Title contains: "Definitions", "Addendum", "Amendment"
- Supporting document - extract what you can but expect less data

SET documentType IN YOUR RESPONSE based on this analysis.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  STEP 2: EXTRACT CUSTOMER NAME CORRECTLY ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CUSTOMER NAME EXTRACTION PRIORITY (use FIRST match found):

1. **ALWAYS use <filename_hints> CUSTOMER_NAME if provided** - This was extracted from filename and is most reliable

2. **For MPA documents**:
   - Search for "Owner" or "Financial Owner" in parties section
   - Look in recitals for end-user company name
   - Check Appendices for project owner/operator
   - AVOID using "Buyer" - that's often a financial entity like "Generate C&I Warehouse IV, LLC"

3. **For EPC/O&M documents**:
   - Use "Owner" field from parties section
   - Check project description/recitals for customer name
   - Look for company name associated with project sites

4. **For PPA/System Order**:
   - Use "Customer" field - this IS the end user
   - This is the most direct customer identification

5. **Last resort**: Use "Buyer" name but flag confidence as LOW

EXAMPLES OF CORRECT EXTRACTION:
- MPA parties shows "Buyer: Generate C&I Warehouse IV, LLC" and "Owner: B. Braun Medical Inc."
  → customerName = "B. Braun Medical Inc." (NOT Generate C&I)
- Filename hints show "CUSTOMER_NAME: B-Braun"
  → customerName = "B-Braun" (use this FIRST)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  STEP 3: DETECT FLEET/MULTI-SITE CONTRACTS ⚠━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SEARCH FOR MULTIPLE SITES:

**Indicators of fleet contract**:
- Plural terms: "Projects" (not "Project"), "Sites", "Facilities"
- Text like: "Fleet", "Portfolio", "Multiple locations"
- Appendices/Schedules titled: "Site List", "Project Sites", "Facility Locations"
- References to: "each Project", "applicable Project", "Projects as listed in Appendix"

**How to extract**:
1. Search Appendices, Schedules, Exhibits for site lists
2. Look for table with columns: Site Name, Site ID, Location, Capacity
3. Count distinct site names/IDs mentioned
4. Extract each site: name, ID, location if available

**Set in response**:
- isFleetContract: "yes" if 2+ sites found, "no" if single site
- totalSitesInFleet: actual count (e.g., "2", "5", "12")
- siteName: if single site, the name; if fleet, list primary sites or "Multiple sites - see site list"

**EXAMPLE**:
Document mentions: "Avocado Project" and "McDonald Project" in Appendix A
→ isFleetContract: "yes"
→ totalSitesInFleet: "2"
→ siteName: "Avocado Project, McDonald Project"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  STEP 4: EXTRACT CORRECT CONTRACT TERM ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**WHERE TO LOOK FOR CONTRACT TERM**:

1. **In tables labeled "Basic Terms" or "Key Terms"** - Look for row with:
   - "Initial Term" | "15 years, commencing on COD"
   - "Term" | "20 years"
   - "Service Term" | "15 years, Commencing at COD"

2. **In System Orders / PPAs / O&M Agreements** - ALWAYS check tables first!
   - Search for "Initial Term" field in tables
   - Extract JUST the number: "15 years, commencing on COD" → contractTerm: "15"

3. **In contract body text**:
   - "Term of this Agreement shall be [15] years"
   - "Initial Term of [20] years commencing on COD"
   - "Service period of [10] years from Effective Date"

**DIFFERENT DOCUMENTS HAVE DIFFERENT "TERMS"**:

**For MPA**: Usually NO multi-year term - it's an asset sale at closing
→ contractTerm: "NOT SPECIFIED" or "N/A - asset purchase"

**For EPC**: Construction period (months/years until COD)
→ contractTerm: Extract construction timeline if mentioned (e.g., "18 months", "2 years")

**For O&M / PPA / System Order**: Long-term service agreement
→ contractTerm: Extract JUST THE NUMBER from "Initial Term" field
→ "15 years, commencing on COD" → contractTerm: "15"
→ "20 years from Effective Date" → contractTerm: "20"

**CRITICAL EXTRACTION EXAMPLES**:

Example 1: System Order table shows:
| "Initial Term" | "15 years, Commencing at COD" |
→ contractTerm: "15"

Example 2: O&M Agreement table shows:
| "Service Term" | "20 years from Effective Date" |
→ contractTerm: "20"

Example 3: PPA text says:
"This Agreement shall have an initial term of ten (10) years"
→ contractTerm: "10"

Example 4: MPA document has no term mentioned
→ contractTerm: "NOT SPECIFIED"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GENERAL EXTRACTION RULES:

Extract the following information. If a value is not in the document, use "NOT SPECIFIED".

CRITICAL: For EVERY field you extract with a value (not "NOT SPECIFIED"), you MUST create at least ONE corresponding business rule in the appropriate category (paymentRules, performanceGuarantees, operationalRequirements, or extractedRules).
</critical_extraction_instructions>

<response_format>
⚠️  MANDATORY RESPONSE FORMAT - DO NOT DEVIATE ⚠️

Your response MUST be ONLY the JSON object below. No introductions, no explanations, no markdown formatting.

DO NOT write things like:
- "I'll analyze this document..."
- "Let me extract the information..."
- "Here is the structured response..."
- Markdown code blocks with triple backticks
- Any text before or after the JSON

START your response IMMEDIATELY with the opening { bracket.
END your response with the closing } bracket.

NOTHING ELSE. ONLY THE JSON OBJECT.
</response_format>

<output_schema>

{
  "documentSummary": {
    "contractType": "type of agreement",
    "parties": {
      "buyer": "buyer name",
      "seller": "seller name",
      "financialOwner": "financial owner if mentioned",
      "guarantors": ["guarantor names"],
      "lenders": ["lender names"],
      "operators": "operator name"
    },
    "effectiveDate": "YYYY-MM-DD or NOT SPECIFIED",
    "contractTerm": "years as number or NOT SPECIFIED",
    "totalContractValue": "estimated total value or NOT SPECIFIED",
    "commercialOperationDate": "COD date or NOT SPECIFIED"
  },
  "extractedData": {
    "customerName": "⚠️ CRITICAL: End-user customer name (NOT financial buyer). For MPAs: look for 'Owner' or check recitals for end-user (ignore 'Buyer' like 'Generate C&I'). For System Orders/PPAs: use 'Customer' field (e.g., 'Baked Bean Medical Inc.', 'B. Braun Medical Inc.'). ALWAYS use CUSTOMER_NAME from <filename_hints> if provided.",
    "industry": "customer industry (e.g., Healthcare, Manufacturing, Data Center)",
    "siteId": "site/project ID code (e.g., 'BBM000.Z', 'BBM000.Z2') - ALWAYS use the SITE_ID from <filename_hints> if provided",
    "projectCode": "project code or reference number",
    "fleetName": "fleet name if this is a fleet contract (e.g., 'Fleet A', 'Northeast Region')",
    "isFleetContract": "yes|no - is this a fleet/multi-site contract",
    "totalSitesInFleet": "number - total number of sites in fleet if mentioned",
    "siteLocation": "complete site address",
    "siteName": "site/facility name or identifier",
    "facilitySize": "facility square footage or size",
    "employees": "number of employees at site",
    "operatingHours": "operating hours (e.g., 24/7, business hours)",
    "orderDate": "YYYY-MM-DD",
    "effectiveDate": "YYYY-MM-DD",
    "primaryContact": "primary contact name",
    "contactEmail": "contact email address",
    "contactPhone": "contact phone number",
    "systemCapacity": "⚠️ ULTRA-CRITICAL: SCAN ENTIRE DOCUMENT for ANY number with 'kW' or 'MW'. Extract EXACT number. Examples: If doc says 'Capacity (kW): 54,600' → return '54600'. If '2,800 kW' → return '2800'. If '2.8 MW' → return '2800'. NEVER say 'NOT SPECIFIED' if you see ANY kW/MW number ANYWHERE.",
    "solutionType": "PP|MG|AMG|OG (Power Purchase, Microgrid, Advanced Microgrid, Onsite Generation)",
    "installationType": "grid_parallel|island|hybrid",
    "reliabilityLevel": "standard|high|critical",
    "contractTerm": "⚠️ CRITICAL: Search ENTIRE document for 'Initial Term' in tables - extract ONLY the number from values like '15 years, commencing on COD' → return '15'. For System Orders/PPAs/O&M, this field is ALWAYS in a table. Example: if table shows 'Initial Term | 15 years, Commencing at COD', you MUST extract '15'.",
    "baseRate": "exact rate per kWh (e.g., 0.0847)",
    "microgridAdder": "microgrid additional charge per kWh",
    "annualEscalation": "exact % (e.g., 2.5)",
    "thermalCycleFee": "thermal cycle fee amount",
    "electricalBudget": "electrical budget amount",
    "commissioningAllowance": "commissioning allowance amount",
    "efficiencyWarranty": "exact % (e.g., 50.0)",
    "availabilityGuarantee": "exact % (e.g., 95.0)",
    "outputWarranty": "exact % (e.g., 90.0)",
    "minDemand": "minimum demand kW",
    "maxDemand": "maximum demand kW",
    "guaranteedCriticalOutput": "guaranteed critical output kW",
    "environmentalCredits": "RECs or carbon credits mentioned",
    "voltage": "grid parallel voltage (e.g., 480V, 4.16kV, 13.2kV)",
    "gridParallelVoltage": "grid parallel voltage (e.g., 480V, 4.16kV)",
    "numberOfServers": "number of fuel cell servers",
    "renewableIntegration": "yes|no - renewable integration component",
    "advancedControls": "yes|no - advanced controls component",
    "utilityConnections": "yes|no - utility connections component",
    "bess": "yes|no - battery energy storage system",
    "solarIntegration": "yes|no - solar integration",
    "windIntegration": "yes|no - wind integration",
    "averageLoad": "average electrical load kW",
    "peakLoad": "peak electrical load kW",
    "baseLoad": "base electrical load kW",
    "loadFactor": "load factor % or ratio",
    "powerQualityRequirements": "power quality requirements or standards",
    "paymentFrequency": "monthly|quarterly|annual",
    "paymentTerms": "NET 30, etc.",
    "insuranceRequired": "insurance amounts/types",
    "additionalFields": {
      "description": "Any other contract-relevant data found in the document that doesn't fit the above categories",
      "fields": {}
    }
  },
  "extractedRules": [
    {
      "id": "rule_id",
      "category": "payment|performance|operational|compliance|termination|warranty",
      "subcategory": "specific type (e.g., late_fee, sla, maintenance, reporting)",
      "name": "rule name",
      "description": "what the rule does",
      "condition": "IF condition",
      "action": "THEN action",
      "parameters": {
        "value": "numeric or string value",
        "unit": "unit of measure",
        "frequency": "how often it applies",
        "threshold": "trigger point"
      },
      "priority": "critical|high|medium|low",
      "applicablePhase": "construction|operation|termination|all",
      "responsibleParty": "who must comply",
      "financialImpact": {
        "type": "cost|revenue|penalty",
        "amount": "dollar amount or percentage",
        "recurrence": "one-time|monthly|annual"
      },
      "confidence": 0.0-1.0,
      "sourceText": "exact quote from document",
      "sourceSection": "section name/number"
    }
  ],
  "paymentRules": [
    {
      "type": "base_payment|escalation|late_fee|deposit",
      "description": "payment rule description",
      "amount": "dollar amount or formula",
      "frequency": "monthly|quarterly|annual",
      "dueDate": "payment due terms",
      "penaltyForLate": "late payment penalty",
      "sourceText": "quote from document"
    }
  ],
  "performanceGuarantees": [
    {
      "metric": "availability|efficiency|capacity|response_time",
      "targetValue": "guaranteed level",
      "measurementPeriod": "how measured",
      "consequences": "what happens if not met",
      "testingProcedure": "how verified",
      "sourceText": "quote from document"
    }
  ],
  "operationalRequirements": [
    {
      "requirement": "maintenance|inspection|reporting|access",
      "frequency": "daily|weekly|monthly|annual",
      "responsibleParty": "buyer|seller",
      "procedure": "how to comply",
      "consequences": "what happens if not met",
      "sourceText": "quote from document"
    }
  ],
  "terminationClauses": [
    {
      "triggerCondition": "what causes termination",
      "noticeRequired": "days of notice",
      "penalties": "early termination fees",
      "obligationsAfter": "post-termination duties",
      "sourceText": "quote from document"
    }
  ],
  "complianceRequirements": [
    {
      "type": "environmental|safety|reporting|regulatory",
      "requirement": "what must be done",
      "standard": "regulation or standard",
      "frequency": "how often",
      "evidence": "what documentation required",
      "sourceText": "quote from document"
    }
  ],
  "riskFactors": [
    {
      "category": "financial|operational|legal|technical",
      "severity": "high|medium|low",
      "description": "risk description",
      "mitigation": "how addressed in contract"
    }
  ],
  "keyMilestones": [
    {
      "date": "YYYY-MM-DD or relative date",
      "description": "milestone description",
      "type": "cod|payment|inspection|renewal|termination"
    }
  ],
  "keyContractValues": {
    "systemCapacity": "capacity in kW",
    "baseRate": "rate per kWh",
    "annualEscalation": "escalation %",
    "efficiencyWarranty": "efficiency %",
    "availabilityGuarantee": "availability %",
    "contractTerm": "term in years"
  }
}

COMPREHENSIVE EXTRACTION GUIDELINES:

**PAYMENT RULES** - Extract ALL:
- Base payment rates and schedules
- Escalation formulas and timing
- Late payment penalties and interest rates
- Deposit requirements
- Invoice frequency and payment terms
- Change order pricing
- Tax treatment

**PERFORMANCE GUARANTEES** - Extract ALL:
- Availability/uptime targets (%)
- Efficiency warranties (% LHV/HHV)
- Capacity guarantees (kW)
- Response time SLAs
- Testing procedures
- Performance measurement periods
- Consequences for underperformance
- Liquidated damages formulas

**OPERATIONAL REQUIREMENTS** - Extract ALL:
- Maintenance schedules (preventive, corrective)
- Inspection requirements and frequency
- Reporting obligations (monthly, annual)
- Access rights for seller/operator
- Emergency response procedures
- Spare parts requirements
- Training obligations

**TERMINATION CLAUSES** - Extract ALL:
- Grounds for termination (default, convenience, force majeure)
- Notice periods required
- Early termination penalties
- Wind-down procedures
- Post-termination obligations
- Equipment disposition
- Final payment terms

**WARRANTIES & LIABILITIES** - Extract ALL:
- Equipment warranty periods
- Performance warranty terms
- Limitation of liability caps
- Insurance requirements (types, amounts)
- Indemnification provisions
- Intellectual property rights

**COMPLIANCE REQUIREMENTS** - Extract ALL:
- Environmental regulations (emissions, waste)
- Safety standards (OSHA, local codes)
- Reporting requirements (to authorities, to buyer)
- Permits and licenses required
- Audit rights
- Record retention requirements

**KEY DATES & MILESTONES** - Extract ALL:
- Effective date
- Commercial operation date (COD)
- Warranty expiration dates
- Renewal option dates
- Notice deadline dates
- Inspection/testing dates

**STAKEHOLDERS** - Identify ALL:
- Buyer/customer (with role)
- Seller/provider (with role)
- Financial owner/investor
- Guarantors
- Lenders/financing parties
- Operators/O&M providers
- Subcontractors mentioned

Key extraction tips:
- Extract EXACT values - don't round or estimate
- Include source section references
- Prioritize rules by financial/operational impact
- Flag unusual or non-standard terms
- Cross-reference related clauses
- Identify dependencies between rules

**CRITICAL FIELDS TO EXTRACT** (search thoroughly in all sections):

BASIC INFORMATION:
- Customer/Buyer name (look in parties, signature pages, headers)
- Industry type (healthcare, manufacturing, data center, commercial, etc.)
- Site location/address (full address if available)
- Facility details (size in sq ft, number of employees, operating hours/schedule)
- Contact information (primary contact name, email, phone)
- Order date and effective date

SYSTEM CONFIGURATION:
- System capacity in kW (exact value, often multiple of 325kW)
- Solution type: PP (Power Purchase), MG (Microgrid), AMG (Advanced Microgrid), OG (Onsite Generation)
- Installation type (grid-parallel, island mode, hybrid)
- Reliability level (standard, high-reliability, critical)
- Load profile: average load, peak load, base load, load factor, power quality requirements

FINANCIAL PARAMETERS:
- Base rate per kWh (e.g., $0.0833/kWh)
- Microgrid adder (additional charge for microgrid features)
- Annual escalation rate % (typically 2-5%)
- Thermal cycle fees
- Electrical budget/allowance
- Commissioning allowance
- Payment terms (NET 30, etc.)
- Payment frequency (monthly, quarterly, annual)

OPERATING PARAMETERS:
- Output warranty % (guaranteed output)
- Efficiency warranty % (LHV or HHV basis)
- Availability guarantee %
- Demand parameters: minimum demand, maximum demand, guaranteed critical output
- Environmental credits (RECs, carbon credits, environmental attributes)

TECHNICAL SPECIFICATIONS:
- Grid parallel voltage (208V, 480V, 4.16kV, 13.2kV, 34.5kV)
- Number of fuel cell servers/stacks
- System components:
  * Renewable Integration (RI) - yes/no
  * Advanced Controls (AC) - yes/no
  * Utility Connections (UC) - yes/no
  * Battery Energy Storage System (BESS) - yes/no
  * Solar Integration - yes/no
  * Wind Integration - yes/no

SEARCH LOCATIONS:
- Headers, cover pages, and recitals for parties and basic info
- Definitions section for technical terms and thresholds
- Schedules, exhibits, and appendices for detailed specifications
- Pricing schedules for financial terms
- Performance specifications for technical details
- Signature pages for contact information

**ADDITIONAL FIELDS EXTRACTION:**
If you encounter ANY contract-relevant information that doesn't fit into the predefined fields above, capture it in the "additionalFields.fields" object. Examples include:
- Special warranties or guarantees not covered above
- Unique pricing structures or incentives
- Project-specific milestones or deliverables
- Custom performance metrics
- Special regulatory requirements
- Training or knowledge transfer obligations
- Change management procedures
- Dispute resolution mechanisms
- Intellectual property terms
- Data ownership and privacy terms
- Service level agreements (SLAs) beyond standard metrics
- Backup/redundancy requirements
- Testing and acceptance criteria
- Transition or migration plans
- Any other field that appears important to the contract

Format additional fields as:
"additionalFields": {
  "description": "Brief summary of what additional data was found",
  "fields": {
    "fieldName1": "value1",
    "fieldName2": "value2",
    ...
  }
}

</output_schema>

**REMINDER: Follow the mandatory field-to-rule mapping in the system prompt. Generate 15-30+ business rules per document with good data.**`;
  }

  parseOptimizationResponse(text) {
    return {
      message: text,
      suggestions: this.extractSuggestions(text),
      actions: [
        {
          type: 'optimize_pricing',
          label: 'Apply Pricing Recommendations',
          data: this.extractPricingRecommendations(text)
        },
        {
          type: 'adjust_terms',
          label: 'Adjust Contract Terms',
          data: this.extractTermRecommendations(text)
        }
      ]
    };
  }

  parseAnalysisResponse(text) {
    return {
      message: text,
      insights: this.extractInsights(text),
      alerts: this.extractAlerts(text),
      score: this.calculateRiskScore(text)
    };
  }

  parseSuggestionsResponse(text) {
    return {
      message: text,
      suggestions: this.extractFieldSuggestions(text),
      confidence: 0.8
    };
  }

  extractSuggestions(text) {
    // Simple extraction - in production, would use more sophisticated parsing
    const suggestions = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      if (line.includes('recommend') || line.includes('suggest')) {
        suggestions.push(line.trim());
      }
    });
    
    return suggestions.slice(0, 5); // Top 5 suggestions
  }

  extractPricingRecommendations(text) {
    // Extract pricing-related recommendations
    return {
      baseRate: null,
      escalation: null,
      reasoning: 'Based on AI analysis'
    };
  }

  extractTermRecommendations(text) {
    // Extract term-related recommendations
    return {
      term: null,
      warranty: null,
      reasoning: 'Based on AI analysis'
    };
  }

  extractInsights(text) {
    return ['AI-generated insights based on contract analysis'];
  }

  extractAlerts(text) {
    return text.toLowerCase().includes('concern') || text.toLowerCase().includes('risk') 
      ? ['Potential issues identified in contract terms']
      : [];
  }

  calculateRiskScore(text) {
    // Simple risk scoring based on text analysis
    const riskWords = ['risk', 'concern', 'unusual', 'high', 'problem'];
    const riskCount = riskWords.reduce((count, word) => {
      return count + (text.toLowerCase().match(new RegExp(word, 'g')) || []).length;
    }, 0);
    
    return Math.min(riskCount * 10, 100); // Cap at 100
  }

  extractFieldSuggestions(text) {
    return {
      capacity: null,
      term: null,
      baseRate: null,
      escalation: null
    };
  }

  /**
   * Parse AI response for business rules extraction
   */
  parseRulesResponse(text, options = {}) {
    try {
      // Try to extract JSON from the response
      let parsedResponse;
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } catch (jsonError) {
          // JSON is malformed - try to repair it
          console.warn(`⚠️  Malformed JSON from AI, attempting repair: ${jsonError.message}`);
          console.log(`📄 First 500 chars of response: ${text.substring(0, 500)}...`);

          // Try to fix common JSON errors
          let repairedJson = jsonMatch[0]
            .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
            .replace(/\\n/g, '\\\\n') // Escape newlines in strings
            .replace(/\n/g, ' ') // Remove actual newlines
            .replace(/'/g, '"'); // Replace single quotes with double quotes

          try {
            parsedResponse = JSON.parse(repairedJson);
            console.log('✅ Successfully repaired malformed JSON');
          } catch (repairError) {
            // Still can't parse - extract data manually from the BROKEN JSON text
            console.error(`💥 Cannot repair JSON: ${repairError.message}`);
            console.log(`📄 AI response (first 1000 chars):\n${text.substring(0, 1000)}`);

            // CRITICAL FIX: Instead of using createStructuredResponse (which expects natural language),
            // manually extract key fields from the broken JSON text
            parsedResponse = this.extractFromBrokenJSON(jsonMatch[0], options);
          }
        }
      } else {
        // If no JSON found, create a structured response from the text
        parsedResponse = this.createStructuredResponse(text, options);
      }

      // Validate and normalize the response
      const normalized = this.normalizeRulesResponse(parsedResponse, options);

      // Log what was extracted for debugging
      if (normalized.extractedData) {
        const showValue = (val) => {
          if (!val) return 'NOT FOUND';
          if (val === 'NOT SPECIFIED') return 'NOT SPECIFIED';
          return val;
        };

        console.log(`📊 Extracted data from AI (${Object.keys(normalized.extractedData).length} total fields):`);
        console.log(`   🏢 Parties: buyer=${showValue(normalized.extractedData.buyer)}, seller=${showValue(normalized.extractedData.seller)}`);
        console.log(`   💰 Financial Owner: ${showValue(normalized.extractedData.financialOwner)}`);
        console.log(`   ⚡ System: capacity=${showValue(normalized.extractedData.systemCapacity)}, voltage=${showValue(normalized.extractedData.voltage)}`);
        console.log(`   📅 Term: ${showValue(normalized.extractedData.contractTerm)} years, COD=${showValue(normalized.extractedData.commercialOperationDate)}`);
        console.log(`   💵 Pricing: base=${showValue(normalized.extractedData.baseRate)}, escalation=${showValue(normalized.extractedData.annualEscalation)}%`);
        console.log(`   🎯 Performance: efficiency=${showValue(normalized.extractedData.efficiencyWarranty)}%, availability=${showValue(normalized.extractedData.availabilityGuarantee)}%`);
      }

      return normalized;

    } catch (error) {
      console.error('❌ CRITICAL: Failed to parse AI rules response:', error);
      console.log(`📄 Full AI response:\n${text}`);

      // DO NOT use mock data - throw error so user knows extraction failed
      throw new Error(`AI extraction failed: ${error.message}. Check logs for AI response.`);
    }
  }

  /**
   * Extract data from broken JSON by parsing text manually
   * This handles cases where JSON.parse fails but we can still extract field values
   */
  extractFromBrokenJSON(brokenJson, options) {
    console.log('🔧 Attempting to extract data from broken JSON manually...');

    // Helper to extract value after a field name
    const extractField = (fieldName) => {
      // Match: "fieldName": "value" or "fieldName": value
      const patterns = [
        new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*)"`, 'i'),  // String values
        new RegExp(`"${fieldName}"\\s*:\\s*([0-9.]+)`, 'i'),   // Numeric values
        new RegExp(`"${fieldName}"\\s*:\\s*(true|false)`, 'i') // Boolean values
      ];

      for (const pattern of patterns) {
        const match = brokenJson.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    // Extract nested fields from documentSummary
    const extractNestedField = (path) => {
      // For paths like "documentSummary.keyContractValues.systemCapacity"
      const parts = path.split('.');
      const lastPart = parts[parts.length - 1];
      return extractField(lastPart);
    };

    // Extract all key fields
    const documentSummary = {
      contractType: extractField('contractType') || 'Unknown',
      parties: {
        buyer: extractNestedField('parties.buyer'),
        seller: extractNestedField('parties.seller'),
        financialOwner: extractNestedField('parties.financialOwner')
      },
      effectiveDate: extractField('effectiveDate'),
      commercialOperationDate: extractField('commercialOperationDate'),
      contractTerm: extractField('contractTerm'),
      keyContractValues: {
        systemCapacity: extractNestedField('keyContractValues.systemCapacity'),
        baseRate: extractNestedField('keyContractValues.baseRate'),
        annualEscalation: extractNestedField('keyContractValues.annualEscalation'),
        efficiencyWarranty: extractNestedField('keyContractValues.efficiencyWarranty'),
        availabilityGuarantee: extractNestedField('keyContractValues.availabilityGuarantee'),
        voltage: extractNestedField('keyContractValues.voltage')
      }
    };

    console.log('✅ Extracted from broken JSON:', {
      buyer: documentSummary.parties.buyer,
      seller: documentSummary.parties.seller,
      term: documentSummary.contractTerm,
      capacity: documentSummary.keyContractValues.systemCapacity,
      efficiency: documentSummary.keyContractValues.efficiencyWarranty
    });

    return {
      documentSummary,
      extractedRules: [], // Can't reliably extract rules from broken JSON
      extractedData: {}, // Will be populated by normalizeRulesResponse from documentSummary
      riskFactors: [],
      anomalies: [],
      summary: {
        totalRulesExtracted: 0,
        confidenceScore: 0.7, // Medium confidence for manual parsing
        processingNotes: 'Extracted from malformed JSON using manual parsing'
      }
    };
  }

  /**
   * Create structured response from unstructured text
   */
  createStructuredResponse(text, options) {
    const { filename = 'document' } = options;

    // Extract basic information from text
    const rules = this.extractBasicRules(text);

    return {
      documentSummary: {
        contractType: this.detectContractType(text),
        parties: this.extractParties(text),
        effectiveDate: this.extractDates(text)[0] || 'Not specified',
        keyTerms: this.extractKeyTerms(text)
      },
      extractedRules: rules,
      extractedData: this.extractBasicData(text),
      riskFactors: this.extractRiskFactors(text),
      anomalies: [],
      summary: {
        totalRulesExtracted: rules.length,
        confidenceScore: 0.6, // Lower confidence for unstructured parsing
        processingNotes: 'Parsed from unstructured text response'
      }
    };
  }

  /**
   * CRITICAL: Regex-based fallback extraction when AI fails
   * This aggressively searches for values in the raw document text
   */
  regexExtractFallback(documentContent, currentData) {
    console.log('🔍 Running regex fallback extraction for missing values...');
    console.log(`🔍 DEBUG: documentContent type: ${typeof documentContent}`);
    console.log(`🔍 DEBUG: documentContent is truthy: ${!!documentContent}`);

    if (!documentContent || typeof documentContent !== 'string') {
      console.error(`❌ ERROR: Invalid document content passed to regex fallback!`);
      console.log(`   Type: ${typeof documentContent}, Value: ${documentContent}`);
      console.warn('⚠️  Regex extraction could not find any missing values');
      return currentData;
    }

    console.log(`📊 Document length: ${documentContent.length} characters`);
    console.log(`📄 First 500 chars: ${documentContent.substring(0, 500)}...`);

    const extracted = { ...currentData };
    let changesFound = 0;

    // 1. SYSTEM CAPACITY - Look for kW/MW values with ULTRA flexible patterns
    if (!extracted.systemCapacity || extracted.systemCapacity === 'NOT SPECIFIED' || extracted.systemCapacity === 'NOT FOUND') {
      console.log('🔎 Searching for capacity...');

      // ULTRA FLEXIBLE patterns - handle ANY format
      const capacityPatterns = [
        // Standard: "Capacity: 2800 kW", "System Size: 2,800kW"
        /(?:capacity|nameplate|rated|system\s*size|installed)[\s:]+(\d{1,2},?\d{3,4})\s*kW/gi,
        // Reverse: "2800 kW capacity", "2,800 kilowatts"
        /(\d{1,2},?\d{3,4})\s*(?:kW|kilowatts?)(?:\s+(?:capacity|system|nameplate|rated))?/gi,
        // MW format: "2.8 MW", "2.8MW"
        /(\d{1,2}[,.]\d{1,2})\s*MW/gi,
        // Just numbers with kW: "2800kW", "2,800 kW"
        /\b(\d{1,2},?\d{3,4})\s*kW\b/gi,
        // Multiline: "Capacity\n2800 kW" or "Capacity\n2,800\nkW"
        /(?:capacity|nameplate|rated)[\s\n:]+(\d{1,2},?\d{3,4})[\s\n]*kW/gi,
        // Table format: "| Capacity | 2800 kW |"
        /\|\s*(?:capacity|size)[\s|]+(\d{1,2},?\d{3,4})\s*kW/gi
      ];

      for (let i = 0; i < capacityPatterns.length; i++) {
        const pattern = capacityPatterns[i];
        const match = documentContent.match(pattern);
        if (match) {
          console.log(`✨ Pattern ${i + 1} matched: "${match[0]}"`);
          // Extract just the number from the match
          const numberMatch = match[0].match(/(\d{1,2},?\d{3,4})/);
          if (numberMatch) {
            const value = numberMatch[1].replace(/,/g, '');
            const unit = match[0].toUpperCase().includes('MW') ? 'MW' : 'kW';
            extracted.systemCapacity = unit === 'MW' ? `${parseFloat(value) * 1000} kW` : `${value} kW`;
            console.log(`✅ Regex found capacity: ${extracted.systemCapacity}`);
            changesFound++;
            break;
          }
        }
      }

      if (!extracted.systemCapacity || extracted.systemCapacity === 'NOT SPECIFIED') {
        console.log('❌ No capacity patterns matched');
        // Sample where we're looking
        const sample = documentContent.substring(0, 2000);
        const kwMatches = sample.match(/kW/gi);
        console.log(`📊 Found ${kwMatches ? kwMatches.length : 0} instances of "kW" in first 2000 chars`);
        if (kwMatches && kwMatches.length > 0) {
          console.log(`📄 Sample around first kW: ${sample.substring(sample.indexOf('kW') - 100, sample.indexOf('kW') + 100)}`);
        }
      }
    }

    // 2. EFFICIENCY WARRANTY - Look for percentage values
    if (!extracted.efficiencyWarranty || extracted.efficiencyWarranty === 'NOT SPECIFIED' || extracted.efficiencyWarranty === 'NOT FOUND') {
      const efficiencyPatterns = [
        /(?:efficiency|LHV|HHV|electrical efficiency)[\s:]+(\d{1,2}(?:\.\d{1,2})?)\s*%/i,
        /(\d{1,2}(?:\.\d{1,2})?)\s*%\s*(?:LHV|HHV|efficiency)/i,
        /(?:net AC electrical efficiency|guaranteed efficiency)[\s:]+(\d{1,2}(?:\.\d{1,2})?)/i
      ];

      for (const pattern of efficiencyPatterns) {
        const match = documentContent.match(pattern);
        if (match) {
          extracted.efficiencyWarranty = `${match[1]}%`;
          console.log(`✅ Regex found efficiency: ${extracted.efficiencyWarranty}`);
          changesFound++;
          break;
        }
      }
    }

    // 3. AVAILABILITY GUARANTEE - Look for availability percentages
    if (!extracted.availabilityGuarantee || extracted.availabilityGuarantee === 'NOT SPECIFIED' || extracted.availabilityGuarantee === 'NOT FOUND') {
      const availabilityPatterns = [
        /(?:availability|uptime|guaranteed availability)[\s:]+(\d{1,3}(?:\.\d{1,2})?)\s*%/i,
        /(\d{1,3}(?:\.\d{1,2})?)\s*%\s*(?:availability|uptime)/i,
        /(?:minimum availability|availability factor)[\s:]+(\d{1,3}(?:\.\d{1,2})?)/i
      ];

      for (const pattern of availabilityPatterns) {
        const match = documentContent.match(pattern);
        if (match) {
          const value = parseFloat(match[1]);
          if (value >= 85 && value <= 100) { // Sanity check for availability
            extracted.availabilityGuarantee = `${match[1]}%`;
            console.log(`✅ Regex found availability: ${extracted.availabilityGuarantee}`);
            changesFound++;
            break;
          }
        }
      }
    }

    // 4. BASE RATE - Look for pricing in $/kWh or cents/kWh
    if (!extracted.baseRate || extracted.baseRate === 'NOT SPECIFIED' || extracted.baseRate === 'NOT FOUND') {
      const ratePatterns = [
        /(?:base rate|energy charge|rate|price|services fee)[\s:]+\$?(\d+(?:\.\d{1,4})?)\s*(?:\/\s*)?kWh/i,
        /\$(\d+(?:\.\d{1,4})?)\s*(?:\/\s*)?kWh/i,
        /(\d+(?:\.\d{1,2})?)\s*¢\s*(?:\/\s*)?kWh/i, // Cents
        /(?:services fee|monthly rate|base rate)[\s:]+\$?(\d{1,3}(?:\.\d{1,4})?)/i,
        /(?:rate|price)[\s:]+(\d{1,3})\s*(?:per|\/)\s*kW/i // Format like "226 per kW"
      ];

      for (const pattern of ratePatterns) {
        const match = documentContent.match(pattern);
        if (match) {
          let value = parseFloat(match[1]);
          // If value in cents (> 1 and no decimal) or looks like monthly rate (> 50), convert
          if (match[0].includes('¢') || (value > 50 && value < 500 && !match[1].includes('.'))) {
            value = value / 100;
          }
          // If value still seems too high (> 1), it might be monthly $/kW, estimate $/kWh
          if (value > 1 && value < 500) {
            // Rough estimate: 226 $/kW-month ≈ 0.0847 $/kWh (assuming ~2800 hours/month)
            value = value / 2800;
          }
          extracted.baseRate = `${value.toFixed(4)}`;
          console.log(`✅ Regex found base rate: ${extracted.baseRate}`);
          changesFound++;
          break;
        }
      }
    }

    // 5. ANNUAL ESCALATION - Look for escalation percentages
    if (!extracted.annualEscalation || extracted.annualEscalation === 'NOT SPECIFIED' || extracted.annualEscalation === 'NOT FOUND') {
      const escalationPatterns = [
        /(?:escalation|annual increase|escalator)[\s:]+(\d{1,2}(?:\.\d{1,2})?)\s*%/i,
        /(\d{1,2}(?:\.\d{1,2})?)\s*%\s*(?:escalation|annual increase|per year|per annum)/i,
        /(?:price increase|rate adjustment)[\s:]+(\d{1,2}(?:\.\d{1,2})?)/i
      ];

      for (const pattern of escalationPatterns) {
        const match = documentContent.match(pattern);
        if (match) {
          const value = parseFloat(match[1]);
          if (value >= 0 && value <= 10) { // Sanity check for escalation
            extracted.annualEscalation = `${match[1]}%`;
            console.log(`✅ Regex found escalation: ${extracted.annualEscalation}`);
            changesFound++;
            break;
          }
        }
      }
    }

    // 6. CONTRACT TERM - Look for year duration
    if (!extracted.contractTerm || extracted.contractTerm === 'NOT SPECIFIED' || extracted.contractTerm === 'NOT FOUND') {
      const termPatterns = [
        /(?:initial term|contract term|term|contract period)[\s:]+(\d{1,2})\s*year/i,
        /(\d{1,2})\s*[-\s]year\s*(?:term|period|contract)/i,
        /(?:for a period of|duration of)[\s:]+(\d{1,2})\s*year/i
      ];

      for (const pattern of termPatterns) {
        const match = documentContent.match(pattern);
        if (match) {
          const value = parseInt(match[1]);
          if (value >= 5 && value <= 30) { // Sanity check for term
            extracted.contractTerm = value.toString();
            console.log(`✅ Regex found term: ${extracted.contractTerm} years`);
            changesFound++;
            break;
          }
        }
      }
    }

    if (changesFound > 0) {
      console.log(`✨ Regex extraction found ${changesFound} missing value(s)`);
    } else {
      console.log(`⚠️  Regex extraction could not find any missing values`);
    }

    return extracted;
  }

  /**
   * Normalize and validate rules response
   */
  normalizeRulesResponse(response, options) {
    // CRITICAL FIX: Merge documentSummary values into extractedData since AI returns data in documentSummary
    console.log('🔍 DEBUG: AI response structure:', {
      hasExtractedData: !!response.extractedData,
      hasDocSummary: !!response.documentSummary,
      hasKeyContractValues: !!response.documentSummary?.keyContractValues,
      keyValues: response.documentSummary?.keyContractValues
    });

    let extractedData = {
      ...(response.extractedData || {}),
      // Populate from documentSummary if extractedData is missing values
      buyer: response.extractedData?.buyer || response.documentSummary?.parties?.buyer,
      seller: response.extractedData?.seller || response.documentSummary?.parties?.seller,
      financialOwner: response.extractedData?.financialOwner || response.documentSummary?.parties?.financialOwner,
      contractTerm: response.extractedData?.contractTerm || response.documentSummary?.contractTerm || response.documentSummary?.keyContractValues?.contractTerm,
      systemCapacity: response.extractedData?.systemCapacity || response.documentSummary?.keyContractValues?.systemCapacity,
      baseRate: response.extractedData?.baseRate || response.documentSummary?.keyContractValues?.baseRate,
      annualEscalation: response.extractedData?.annualEscalation || response.documentSummary?.keyContractValues?.annualEscalation,
      efficiencyWarranty: response.extractedData?.efficiencyWarranty || response.documentSummary?.keyContractValues?.efficiencyWarranty,
      availabilityGuarantee: response.extractedData?.availabilityGuarantee || response.documentSummary?.keyContractValues?.availabilityGuarantee,
      effectiveDate: response.extractedData?.effectiveDate || response.documentSummary?.effectiveDate,
      commercialOperationDate: response.extractedData?.commercialOperationDate || response.documentSummary?.commercialOperationDate
    };

    console.log('📊 DEBUG: extractedData BEFORE regex fallback:', {
      systemCapacity: extractedData.systemCapacity,
      baseRate: extractedData.baseRate,
      annualEscalation: extractedData.annualEscalation,
      efficiencyWarranty: extractedData.efficiencyWarranty,
      availabilityGuarantee: extractedData.availabilityGuarantee
    });

    // NEW: Run regex fallback if we have the original document and AI failed to extract values
    console.log('🔍 DEBUG: Checking if regex fallback should run...');
    console.log(`   options._documentContent exists: ${!!options._documentContent}`);
    console.log(`   options._documentContent type: ${typeof options._documentContent}`);
    console.log(`   options._documentContent length: ${options._documentContent?.length || 0}`);

    if (options._documentContent) {
      extractedData = this.regexExtractFallback(options._documentContent, extractedData);
      console.log('📊 DEBUG: extractedData AFTER regex fallback:', {
        systemCapacity: extractedData.systemCapacity,
        baseRate: extractedData.baseRate,
        annualEscalation: extractedData.annualEscalation,
        efficiencyWarranty: extractedData.efficiencyWarranty,
        availabilityGuarantee: extractedData.availabilityGuarantee
      });
    } else {
      console.warn('⚠️  No document content available for regex fallback extraction');
    }

    const extractedRules = (response.extractedRules || []).map((rule, index) => ({
      id: rule.id || `rule_${Date.now()}_${index}`,
      category: rule.category || 'general',
      subcategory: rule.subcategory || null,
      type: rule.type || 'validation',
      name: rule.name || `Rule ${index + 1}`,
      description: rule.description || 'No description provided',
      condition: rule.condition || null,
      action: rule.action || 'No action specified',
      consequence: rule.consequence || null,
      parameters: rule.parameters || {},
      confidence: Math.max(0, Math.min(1, rule.confidence || 0.5)),
      sourceText: rule.sourceText || 'Source not available',
      sourceSection: rule.sourceSection || null,
      businessValue: rule.businessValue || 'Business value not specified',

      // Enhanced fields
      priority: rule.priority || 'medium',
      applicablePhase: rule.applicablePhase || 'all',
      frequency: rule.frequency || null,
      dependencies: rule.dependencies || [],
      responsibleParty: rule.responsibleParty || null,
      notificationRequired: rule.notificationRequired || false,
      escalationProcedure: rule.escalationProcedure || null,
      financialImpact: rule.financialImpact || null,
      complianceType: rule.complianceType || null
    }));

    // Count extraction quality
    const fieldsExtracted = Object.values(extractedData).filter(v => v && v !== 'NOT SPECIFIED').length;
    const fieldsNotFound = Object.values(extractedData).filter(v => !v || v === 'NOT SPECIFIED').length;
    const highConfidenceRules = extractedRules.filter(r => r.confidence >= 0.8);
    const lowConfidenceRules = extractedRules.filter(r => r.confidence < 0.5);

    // Extract enhanced structured data
    const paymentRules = response.paymentRules || [];
    const performanceGuarantees = response.performanceGuarantees || [];
    const operationalRequirements = response.operationalRequirements || [];
    const terminationClauses = response.terminationClauses || [];
    const complianceRequirements = response.complianceRequirements || [];
    const keyMilestones = response.keyMilestones || [];

    // Count rules by priority
    const priorityCounts = {
      critical: extractedRules.filter(r => r.priority === 'critical').length,
      high: extractedRules.filter(r => r.priority === 'high').length,
      medium: extractedRules.filter(r => r.priority === 'medium').length,
      low: extractedRules.filter(r => r.priority === 'low').length
    };

    console.log(`📊 Enhanced extraction summary:`);
    console.log(`   💰 Payment Rules: ${paymentRules.length}`);
    console.log(`   🎯 Performance Guarantees: ${performanceGuarantees.length}`);
    console.log(`   ⚙️  Operational Requirements: ${operationalRequirements.length}`);
    console.log(`   📋 Compliance Requirements: ${complianceRequirements.length}`);
    console.log(`   🛑 Termination Clauses: ${terminationClauses.length}`);
    console.log(`   📅 Milestones: ${keyMilestones.length}`);
    console.log(`   ⚠️  Rules by priority: Critical=${priorityCounts.critical}, High=${priorityCounts.high}, Medium=${priorityCounts.medium}, Low=${priorityCounts.low}`);

    const normalized = {
      documentSummary: {
        contractType: response.documentSummary?.contractType || 'Unknown',
        parties: response.documentSummary?.parties || {
          buyer: 'NOT SPECIFIED',
          seller: 'NOT SPECIFIED',
          financialOwner: 'NOT SPECIFIED',
          guarantors: [],
          lenders: [],
          operators: 'NOT SPECIFIED'
        },
        effectiveDate: response.documentSummary?.effectiveDate || extractedData.effectiveDate || 'NOT SPECIFIED',
        commercialOperationDate: response.documentSummary?.commercialOperationDate || extractedData.commercialOperationDate || 'NOT SPECIFIED',
        contractTerm: response.documentSummary?.contractTerm || extractedData.contractTerm || 'NOT SPECIFIED',
        totalContractValue: response.documentSummary?.totalContractValue || 'NOT SPECIFIED',
        keyContractValues: {
          // CRITICAL FIX: Always use extractedData (which includes AI + regex fallback), NOT original response
          systemCapacity: extractedData.systemCapacity || 'NOT SPECIFIED',
          annualEnergyDelivery: extractedData.annualEnergyDelivery || 'NOT SPECIFIED',
          baseRate: extractedData.baseRate || 'NOT SPECIFIED',
          annualEscalation: extractedData.annualEscalation || 'NOT SPECIFIED',
          efficiencyWarranty: extractedData.efficiencyWarranty || 'NOT SPECIFIED',
          availabilityGuarantee: extractedData.availabilityGuarantee || 'NOT SPECIFIED',
          voltage: extractedData.voltage || 'NOT SPECIFIED'
        },
        keyTerms: response.documentSummary?.keyTerms || []
      },
      extractedRules,
      extractedData,
      riskFactors: response.riskFactors || [],
      anomalies: response.anomalies || [],

      // Enhanced structured data
      paymentRules,
      performanceGuarantees,
      operationalRequirements,
      terminationClauses,
      complianceRequirements,
      keyMilestones,

      summary: {
        totalRulesExtracted: extractedRules.length,
        confidenceScore: this.calculateOverallConfidence(extractedRules),
        processingNotes: response.summary?.processingNotes || 'AI analysis completed',

        // Enhanced summary counts
        totalPaymentRules: paymentRules.length,
        totalPerformanceGuarantees: performanceGuarantees.length,
        totalOperationalRequirements: operationalRequirements.length,
        totalTerminationClauses: terminationClauses.length,
        totalComplianceRequirements: complianceRequirements.length,
        totalMilestones: keyMilestones.length,
        rulesByPriority: priorityCounts,

        contractOverview: response.summary?.contractOverview || {
          parties: `Buyer: ${extractedData.buyer || 'NOT SPECIFIED'}, Seller: ${extractedData.seller || 'NOT SPECIFIED'}, Financial Owner: ${extractedData.financialOwner || 'NOT SPECIFIED'}`,
          systemSize: extractedData.systemCapacity || 'NOT SPECIFIED',
          contractDuration: extractedData.contractTerm ? `${extractedData.contractTerm} years` : 'NOT SPECIFIED',
          pricingStructure: extractedData.baseRate ? `Base: ${extractedData.baseRate}, Escalation: ${extractedData.annualEscalation || 'N/A'}%` : 'NOT SPECIFIED',
          keyPerformanceMetrics: `Efficiency: ${extractedData.efficiencyWarranty || 'N/A'}%, Availability: ${extractedData.availabilityGuarantee || 'N/A'}%, Output: ${extractedData.outputWarranty || 'N/A'}%`,
          financialTerms: `Payment: ${extractedData.paymentFrequency || 'N/A'}, Terms: ${extractedData.paymentDueDate || 'N/A'}`,
          deliverySpecifications: `Points: ${extractedData.deliveryPoints || 'N/A'}, Interconnection: ${extractedData.interconnectionPoint || 'N/A'}`
        },
        extractionQuality: response.summary?.extractionQuality || {
          fieldsExtracted,
          fieldsNotFound,
          highConfidenceFields: highConfidenceRules.map(r => r.name),
          lowConfidenceFields: lowConfidenceRules.map(r => r.name),
          missingCriticalData: [
            extractedData.contractTerm === 'NOT SPECIFIED' ? 'contractTerm' : null,
            extractedData.systemCapacity === 'NOT SPECIFIED' ? 'systemCapacity' : null,
            extractedData.baseRate === 'NOT SPECIFIED' ? 'baseRate' : null,
            extractedData.buyer === 'NOT SPECIFIED' ? 'buyer' : null,
            extractedData.seller === 'NOT SPECIFIED' ? 'seller' : null
          ].filter(Boolean)
        }
      }
    };

    return normalized;
  }

  /**
   * Extract basic rules from unstructured text
   */
  extractBasicRules(text) {
    const rules = [];
    let ruleId = 1;

    // Look for payment terms
    if (text.match(/payment|pay|billing|invoice/i)) {
      rules.push({
        id: `payment_rule_${ruleId++}`,
        category: 'payment',
        type: 'conditional',
        name: 'Payment Terms',
        description: 'Payment requirements and schedules',
        confidence: 0.7,
        sourceText: text.match(/[^.]*payment[^.]*/gi)?.[0] || 'Payment terms mentioned',
        businessValue: 'Ensures timely payment processing'
      });
    }

    // Look for performance requirements
    if (text.match(/performance|guarantee|warranty|sla|service level/i)) {
      rules.push({
        id: `performance_rule_${ruleId++}`,
        category: 'performance',
        type: 'threshold',
        name: 'Performance Requirements',
        description: 'Service level and performance standards',
        confidence: 0.7,
        sourceText: text.match(/[^.]*performance[^.]*/gi)?.[0] || 'Performance requirements mentioned',
        businessValue: 'Maintains service quality standards'
      });
    }

    // Look for compliance requirements
    if (text.match(/compliance|regulatory|legal|requirement/i)) {
      rules.push({
        id: `compliance_rule_${ruleId++}`,
        category: 'compliance',
        type: 'validation',
        name: 'Compliance Requirements',
        description: 'Regulatory and legal compliance obligations',
        confidence: 0.6,
        sourceText: text.match(/[^.]*compliance[^.]*/gi)?.[0] || 'Compliance requirements mentioned',
        businessValue: 'Ensures regulatory compliance'
      });
    }

    return rules;
  }

  /**
   * Detect contract type from text
   */
  detectContractType(text) {
    const types = [
      { pattern: /energy service|power purchase|ppa/i, type: 'Energy Services Agreement' },
      { pattern: /master.*agreement|framework/i, type: 'Master Agreement' },
      { pattern: /service.*agreement|sla/i, type: 'Service Agreement' },
      { pattern: /purchase.*order|po/i, type: 'Purchase Order' },
      { pattern: /contract|agreement/i, type: 'General Contract' }
    ];

    for (const { pattern, type } of types) {
      if (pattern.test(text)) {
        return type;
      }
    }

    return 'Unknown Document Type';
  }

  /**
   * Extract parties from text
   */
  extractParties(text) {
    const parties = [];
    
    // Look for common party indicators
    const partyPatterns = [
      /between\s+([^,\n]+)\s+and\s+([^,\n]+)/i,
      /party.*?\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/gi,
      /company.*?\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/gi
    ];

    partyPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        for (let i = 1; i < matches.length; i++) {
          if (matches[i] && !parties.includes(matches[i].trim())) {
            parties.push(matches[i].trim());
          }
        }
      }
    });

    return parties.slice(0, 2); // Limit to 2 main parties
  }

  /**
   * Extract dates from text
   */
  extractDates(text) {
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      /\b\d{4}-\d{2}-\d{2}\b/g,
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi
    ];

    const dates = [];
    datePatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      dates.push(...matches);
    });

    return dates;
  }

  /**
   * Extract key terms from text
   */
  extractKeyTerms(text) {
    const terms = [];
    
    // Extract monetary amounts
    const amounts = text.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
    terms.push(...amounts);

    // Extract percentages
    const percentages = text.match(/\d+(?:\.\d+)?%/g) || [];
    terms.push(...percentages);

    // Extract capacity/power terms
    const powerTerms = text.match(/\d+\s*(?:kw|mw|gw)/gi) || [];
    terms.push(...powerTerms);

    return terms.slice(0, 10); // Limit to 10 key terms
  }

  /**
   * Extract basic data from text
   */
  extractBasicData(text) {
    // Extract Bloom Energy specific contract parameters from raw text
    const lowerText = text.toLowerCase();

    // Extract contract term (years)
    const termMatch = text.match(/(?:contract term|initial term|term length)[\s:]*(\d+)\s*years?/i) ||
                     text.match(/(\d+)[\s-]*year\s+(?:term|contract|agreement)/i);
    const contractTerm = termMatch ? termMatch[1] : 'NOT SPECIFIED';

    // Extract system capacity (kW)
    const capacityMatch = text.match(/(?:rated capacity|system capacity|capacity)[\s:]*(\d{1,4}(?:,\d{3})*)\s*kW/i) ||
                         text.match(/(\d{1,4}(?:,\d{3})*)\s*kW\s+(?:capacity|system)/i);
    const systemCapacity = capacityMatch ? capacityMatch[1].replace(/,/g, '') + ' kW' : 'NOT SPECIFIED';

    // Extract base rate ($/kWh)
    const rateMatch = text.match(/(?:base rate|price|rate)[\s:]*\$?\s*(\d+\.\d+)\s*(?:per kWh|\/kWh)/i);
    const baseRate = rateMatch ? rateMatch[1] : 'NOT SPECIFIED';

    // Extract efficiency warranty (%)
    const efficiencyMatch = text.match(/(?:efficiency warranty|electrical efficiency|LHV efficiency)[\s:]*(\d+(?:\.\d+)?)\s*%/i);
    const efficiencyWarranty = efficiencyMatch ? efficiencyMatch[1] : 'NOT SPECIFIED';

    // Extract availability guarantee (%)
    const availabilityMatch = text.match(/(?:availability|uptime|minimum availability)[\s:]*(\d+(?:\.\d+)?)\s*%/i);
    const availabilityGuarantee = availabilityMatch ? availabilityMatch[1] : 'NOT SPECIFIED';

    // Extract annual escalation (%)
    const escalationMatch = text.match(/(?:annual escalation|escalation rate|price escalation)[\s:]*(\d+(?:\.\d+)?)\s*%/i);
    const annualEscalation = escalationMatch ? escalationMatch[1] : 'NOT SPECIFIED';

    // Extract voltage
    const voltageMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kV|V)\b/i);
    const voltage = voltageMatch ? voltageMatch[0] : 'NOT SPECIFIED';

    return {
      // Bloom Energy specific fields
      contractTerm,
      systemCapacity,
      baseRate,
      efficiencyWarranty,
      availabilityGuarantee,
      annualEscalation,
      voltage,
      // Generic fields
      contractValue: text.match(/\$[\d,]+(?:\.\d{2})?/)?.[0] || 'NOT SPECIFIED',
      paymentTerms: text.match(/(?:monthly|quarterly|annually|net \d+)/i)?.[0] || 'NOT SPECIFIED',
      effectiveDate: this.extractDates(text)[0] || 'NOT SPECIFIED',
      governingLaw: text.match(/governed by.*?(?:law|laws) of ([^,\n]+)/i)?.[1] || 'NOT SPECIFIED'
    };
  }

  /**
   * Extract risk factors from text
   */
  extractRiskFactors(text) {
    const riskKeywords = ['risk', 'penalty', 'default', 'termination', 'liability', 'force majeure'];
    const risks = [];

    riskKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) {
        risks.push(`${keyword.charAt(0).toUpperCase() + keyword.slice(1)} considerations mentioned`);
      }
    });

    return risks;
  }

  /**
   * Calculate overall confidence score
   */
  calculateOverallConfidence(rules) {
    if (!rules.length) return 0;
    
    const totalConfidence = rules.reduce((sum, rule) => sum + (rule.confidence || 0), 0);
    return Math.round((totalConfidence / rules.length) * 100) / 100;
  }

  /**
   * Generate mock rules response for fallback
   */
  generateMockRulesResponse(documentContent) {
    const contentLength = typeof documentContent === 'string' ? documentContent.length : 0;
    
    return {
      documentSummary: {
        contractType: 'Energy Services Agreement (Mock)',
        parties: ['Bloom Energy Corporation', 'Customer Entity'],
        effectiveDate: new Date().toISOString().split('T')[0],
        keyTerms: ['Power Generation', 'Service Level Agreement', 'Payment Terms']
      },
      extractedRules: [
        {
          id: 'mock_payment_rule_1',
          category: 'payment',
          type: 'conditional',
          name: 'Monthly Payment Schedule',
          description: 'Customer shall pay monthly fees based on actual power generation',
          condition: 'IF power is generated during the month',
          action: 'THEN customer pays based on kWh rate',
          consequence: 'No payment required if no power generated',
          parameters: {
            baseRate: '$0.15/kWh',
            billingCycle: 'monthly',
            paymentTerms: 'Net 30'
          },
          confidence: 0.8,
          sourceText: 'Mock analysis - API not configured',
          businessValue: 'Ensures predictable revenue stream based on actual usage'
        },
        {
          id: 'mock_performance_rule_1',
          category: 'performance',
          type: 'threshold',
          name: 'System Availability Guarantee',
          description: 'System must maintain minimum availability levels',
          condition: 'IF system availability falls below 95%',
          action: 'THEN service credits apply',
          consequence: 'Customer receives bill credits for downtime',
          parameters: {
            minimumAvailability: '95%',
            measurementPeriod: 'monthly',
            creditRate: '2x downtime hours'
          },
          confidence: 0.9,
          sourceText: 'Mock analysis - API not configured',
          businessValue: 'Maintains customer satisfaction through guaranteed service levels'
        },
        {
          id: 'mock_compliance_rule_1',
          category: 'compliance',
          type: 'validation',
          name: 'Environmental Compliance',
          description: 'All operations must comply with environmental regulations',
          condition: 'IF environmental regulations change',
          action: 'THEN system must be updated to comply',
          consequence: 'Non-compliance may result in service suspension',
          parameters: {
            regulatoryBodies: ['EPA', 'State Environmental Agency'],
            complianceReporting: 'quarterly',
            auditFrequency: 'annual'
          },
          confidence: 0.7,
          sourceText: 'Mock analysis - API not configured',
          businessValue: 'Ensures legal compliance and reduces regulatory risk'
        }
      ],
      extractedData: {
        contractValue: '$1,250,000',
        paymentTerms: 'Monthly payments based on generation',
        performanceMetrics: '95% availability, 90% efficiency',
        effectiveDate: new Date().toISOString().split('T')[0],
        expirationDate: new Date(Date.now() + 15 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        governingLaw: 'California'
      },
      riskFactors: [
        'Performance penalties for low availability',
        'Environmental compliance requirements',
        'Technology obsolescence risk',
        'Regulatory change impact'
      ],
      anomalies: [
        {
          type: 'mock_analysis',
          description: 'This is mock data generated because AI API is not configured',
          impact: 'Analysis results are not based on actual document content',
          recommendation: 'Configure Anthropic API key for real analysis'
        }
      ],
      summary: {
        totalRulesExtracted: 3,
        confidenceScore: 0.8,
        processingNotes: `Mock analysis of ${contentLength} character document. Configure ANTHROPIC_API_KEY environment variable for real AI-powered rules extraction.`
      }
    };
  }

  // Mock response generators for fallback

  generateMockResponse(type, contractData) {
    switch (type) {
      case 'optimization':
        return {
          message: `Based on the contract parameters for ${contractData.client}, I recommend optimizing the base rate and considering a longer term to improve economics. The ${contractData.capacity}kW system appears well-sized for the application.`,
          suggestions: [
            'Consider negotiating base rate based on market conditions',
            'Evaluate extending contract term for better economics',
            'Review escalation rate alignment with inflation projections'
          ],
          actions: [
            {
              type: 'optimize_pricing',
              label: 'Apply Pricing Recommendations',
              data: { reasoning: 'Mock recommendation - API not configured' }
            }
          ]
        };
      
      case 'analysis':
        return {
          message: 'Contract analysis shows standard parameters within typical ranges for this system size and application.',
          insights: ['Standard contract configuration', 'Competitive pricing structure'],
          alerts: [],
          score: 25
        };
      
      default:
        return { message: 'AI service not configured. Using mock response.' };
    }
  }

  generateMockChatResponse(message) {
    const responses = [
      'I can help you with contract optimization and analysis. What specific aspect would you like to focus on?',
      'For contract suggestions, I\'d recommend reviewing the capacity requirements and financial terms.',
      'The Bloom Energy system configuration looks appropriate for your requirements.',
      'Consider the long-term economics when setting escalation rates and contract terms.'
    ];
    
    return {
      message: responses[Math.floor(Math.random() * responses.length)],
      usage: null,
      model: 'mock',
      timestamp: new Date().toISOString()
    };
  }

  generateMockSuggestions(partialData) {
    return {
      message: 'Based on similar contracts, here are my suggestions for the missing parameters.',
      suggestions: {
        capacity: '975kW (3 servers of 325kW each)',
        term: '15 years (optimal balance of economics and flexibility)',
        baseRate: '$0.135/kWh (competitive market rate)',
        escalation: '2.5%/year (aligned with inflation expectations)'
      },
      confidence: 0.7
    };
  }

  /**
   * Generate mock streaming response for fallback
   */
  async* generateMockStreamResponse(type) {
    const responses = {
      optimization: [
        'Based on the contract parameters provided, I can offer several optimization recommendations.\n\n',
        '**Pricing Optimization:**\n',
        '- The current base rate appears competitive for this system size\n',
        '- Consider negotiating the escalation rate based on current inflation projections\n',
        '- Evaluate volume discounts for multi-year commitments\n\n',
        '**Risk Mitigation:**\n',
        '- Review force majeure clauses for comprehensive coverage\n',
        '- Ensure appropriate insurance requirements are specified\n',
        '- Consider performance guarantees with clear measurement criteria\n\n',
        '**Performance Improvements:**\n',
        '- Optimize system configuration for peak efficiency\n',
        '- Include provisions for technology upgrades\n',
        '- Establish clear maintenance and support protocols\n\n',
        'These recommendations should help optimize both economic and operational aspects of the contract.'
      ],
      default: [
        'I\'m here to help with your Bloom Energy contract questions. ',
        'I can assist with contract optimization, analysis, and provide suggestions based on industry best practices.\n\n',
        'What specific aspect would you like to focus on today? ',
        'I can help with pricing, terms, technical specifications, or general contract guidance.'
      ]
    };

    const chunks = responses[type] || responses.default;
    
    for (const chunk of chunks) {
      yield {
        type: 'content_block_delta',
        delta: { text: chunk },
        index: 0
      };
      
      // Simulate streaming delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    yield {
      type: 'message_stop',
      usage: {
        input_tokens: 100,
        output_tokens: 200
      }
    };
  }
}

// Export a getter function that lazily creates the singleton
let instance = null;

function getInstance() {
  if (!instance) {
    console.log('🔄 Initializing AIService singleton (lazy init)');
    instance = new AIService();
  }
  return instance;
}

// Export the getter function directly - callers will get the instance automatically
export default getInstance();