import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Upload, Search, Filter, FileText, Building, Calendar, DollarSign, 
  Zap, TrendingUp, Eye, Brain, Database, Plus, ChevronRight, Users,
  Settings, BarChart3, FileSearch, Sparkles, X, CheckCircle, AlertCircle,
  Download, Copy, Layers, GitBranch, Send, Bot, Shield, Calculator,
  Library, PlusCircle, Trash2, Edit, Save, FileDown, ChevronDown, ChevronUp,
  RefreshCw, Check, Info, ArrowRight, Loader2
} from 'lucide-react';
import { useDataSync } from './src/hooks/useDataSync';

const BloomContractLearningSystem = () => {
  // ============= INITIALIZE DATA SYNC =============
  const [syncData, dataActions, { isLoading, isSyncing, error: syncError }] = useDataSync({
    autoSync: true,
    syncInterval: 5 * 60 * 1000, // 5 minutes
    loadOnMount: true
  });

  // ============= CONTRACT LIBRARY & LEARNING SYSTEM STATE =============
  // Use synced data instead of localStorage
  const contracts = syncData.contracts.length > 0 ? syncData.contracts : [
    {
      id: 'COV-001',
      name: "Covidien LP - North Haven",
      client: "Covidien LP",
      site: "North Haven, CT",
      capacity: 1040,
      term: 10,
      type: "Microgrid - Constrained",
      uploadDate: "2024-08-05",
      effectiveDate: "2024-09-01",
      status: "Active",
      totalValue: 9750000,
      yearlyRate: 75.79,
      parameters: {
        financial: { 
          baseRate: 62.21, 
          microgridAdder: 8.83, 
          escalation: 3.5, 
          thermalCycleFee: 1000,
          electricalBudget: 650000,
          commissioningAllowance: 20000
        },
        technical: { 
          voltage: "13.2kV", 
          gridVoltage: "13.2kV",
          servers: 5, 
          components: ["RI", "AC"],
          recType: "CT-Class-I"
        },
        operating: { 
          outputWarranty: 90, 
          efficiency: 50, 
          demandRange: { min: 200, max: 800 },
          criticalOutput: 800
        }
      },
      notes: "Standard healthcare facility configuration",
      tags: ["Healthcare", "Connecticut", "Microgrid"]
    },
    {
      id: 'KP-001',
      name: "Kaiser Permanente - San Diego",
      client: "Kaiser Permanente",
      site: "San Diego, CA",
      capacity: 2000,
      term: 15,
      type: "Microgrid - Unconstrained",
      uploadDate: "2024-07-20",
      effectiveDate: "2024-08-15",
      status: "Active",
      totalValue: 28500000,
      yearlyRate: 82.45,
      parameters: {
        financial: { 
          baseRate: 68.50, 
          microgridAdder: 10.25, 
          escalation: 4.0, 
          thermalCycleFee: 1500,
          electricalBudget: 950000,
          commissioningAllowance: 35000
        },
        technical: { 
          voltage: "34.5kV",
          gridVoltage: "34.5kV", 
          servers: 10, 
          components: ["RI", "AC", "UC", "BESS"],
          recType: "CA-RPS"
        },
        operating: { 
          outputWarranty: 95, 
          efficiency: 55, 
          demandRange: { min: 400, max: 1800 },
          criticalOutput: 1800
        }
      },
      notes: "High-reliability medical campus with battery backup",
      tags: ["Healthcare", "California", "High-Reliability", "BESS"]
    },
    {
      id: 'ADBE-001',
      name: "Adobe - San Jose HQ",
      client: "Adobe Inc.",
      site: "San Jose, CA",
      capacity: 1500,
      term: 12,
      type: "Grid Parallel",
      uploadDate: "2024-06-15",
      effectiveDate: "2024-07-01",
      status: "Active",
      totalValue: 16200000,
      yearlyRate: 70.00,
      parameters: {
        financial: { 
          baseRate: 58.00, 
          microgridAdder: 7.50, 
          escalation: 3.0, 
          thermalCycleFee: 800,
          electricalBudget: 500000,
          commissioningAllowance: 15000
        },
        technical: { 
          voltage: "4.16kV",
          gridVoltage: "4.16kV", 
          servers: 7, 
          components: ["AC"],
          recType: "CA-RPS"
        },
        operating: { 
          outputWarranty: 88, 
          efficiency: 48, 
          demandRange: { min: 300, max: 1200 },
          criticalOutput: 1200
        }
      },
      notes: "Tech campus with standard grid-parallel configuration",
      tags: ["Technology", "California", "Grid-Parallel"]
    }
  ]));

  const learnedRules = syncData.learnedRules.length > 0 ? 
    syncData.learnedRules.reduce((acc, rule) => {
      acc[rule.name] = rule.ruleData;
      return acc;
    }, {}) : {
    capacityRange: { min: 200, max: 2000 },
    termRange: { min: 5, max: 20 },
    systemTypes: ["Microgrid - Constrained", "Microgrid - Unconstrained", "Grid Parallel", "Standalone"],
    voltageOptions: ["208V", "480V", "4.16kV", "13.2kV", "34.5kV"],
    componentOptions: ["RI", "AC", "UC", "BESS", "Solar Integration"],
    escalationRange: { min: 2.0, max: 5.0 },
    warrantyRanges: {
      output: { min: 85, max: 99 },
      efficiency: { min: 45, max: 60 }
    },
    paymentTerms: ["NET30", "NET45", "NET60", "Prepaid", "Performance-Based"],
    specialClauses: [
      "Force Majeure Extended",
      "Green Energy Credits",
      "Demand Response Participation",
      "Resilience Guarantees",
      "Carbon Offset Provisions"
    ],
    commonTags: ["Healthcare", "Technology", "Manufacturing", "Education", "Government", "Retail"]
  };

  // Data is automatically synced via the useDataSync hook - no manual localStorage saves needed

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contractToDelete, setContractToDelete] = useState(null);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareContracts, setCompareContracts] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mainTab, setMainTab] = useState('create');
  const [showLibraryPanel, setShowLibraryPanel] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [viewingContract, setViewingContract] = useState(null);

  // ============= ORIGINAL CONTRACT CREATION STATE =============
  const [customerName, setCustomerName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntilDate, setValidUntilDate] = useState('');
  const [contractNotes, setContractNotes] = useState('');
  const [contractTags, setContractTags] = useState([]);

  // System Configuration
  const [ratedCapacity, setRatedCapacity] = useState(1040);
  const [systemType, setSystemType] = useState('Microgrid - Constrained');
  const [guaranteedCriticalOutput, setGuaranteedCriticalOutput] = useState(800);
  const [termYears, setTermYears] = useState(10);
  const [paymentTerms, setPaymentTerms] = useState('NET30');

  // Financial Parameters
  const [baseRateYear1, setBaseRateYear1] = useState(62.21);
  const [microgridAdderYear1, setMicrogridAdderYear1] = useState(8.83);
  const [offGridAdderRate, setOffGridAdderRate] = useState(4.75);
  const [thermalCycleFee, setThermalCycleFee] = useState(1000);
  const [annualEscalation, setAnnualEscalation] = useState(3.5);
  const [electricalBudget, setElectricalBudget] = useState(650000);
  const [commissioningAllowance, setCommissioningAllowance] = useState(20000);
  const [gridParallelRemobilization, setGridParallelRemobilization] = useState(10000);

  // Operating Parameters
  const [minDemandKW, setMinDemandKW] = useState(200);
  const [maxDemandKW, setMaxDemandKW] = useState(800);
  const [outputWarrantyPercent, setOutputWarrantyPercent] = useState(90);
  const [efficiencyWarrantyPercent, setEfficiencyWarrantyPercent] = useState(50);

  // Technical Parameters
  const [voltageHandoff, setVoltageHandoff] = useState('480V');
  const [gridParallelVoltage, setGridParallelVoltage] = useState('13.2kV');
  const [numberOfEnergyServers, setNumberOfEnergyServers] = useState(5);
  const [includeRIInverters, setIncludeRIInverters] = useState(true);
  const [includeACInverters, setIncludeACInverters] = useState(true);
  const [includeUltracapacitors, setIncludeUltracapacitors] = useState(false);
  const [includeBESS, setIncludeBESS] = useState(false);
  const [includeSolar, setIncludeSolar] = useState(false);

  // Incentives and RECs
  const [includeRECs, setIncludeRECs] = useState(true);
  const [recType, setRecType] = useState('CT-Class-I');

  // AI Assistant State
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiHistory, setAiHistory] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Validation State
  const [validationErrors, setValidationErrors] = useState({});

  // Calculate yearly rates based on escalation
  const [yearlyRates, setYearlyRates] = useState([]);
  
  useEffect(() => {
    const rates = [];
    const baseTotal = baseRateYear1 + microgridAdderYear1 + offGridAdderRate;
    for (let i = 0; i < termYears; i++) {
      const escalationMultiplier = Math.pow(1 + annualEscalation / 100, i);
      rates.push({
        year: i + 1,
        rate: (baseTotal * escalationMultiplier).toFixed(2),
        base: (baseRateYear1 * escalationMultiplier).toFixed(2),
        microgrid: (microgridAdderYear1 * escalationMultiplier).toFixed(2),
        offGrid: (offGridAdderRate * escalationMultiplier).toFixed(2),
        monthly: ((baseTotal * escalationMultiplier * ratedCapacity) / 12).toFixed(2)
      });
    }
    setYearlyRates(rates);
  }, [baseRateYear1, microgridAdderYear1, offGridAdderRate, annualEscalation, termYears, ratedCapacity]);

  // Calculate termination values
  const [terminationValues, setTerminationValues] = useState([]);
  
  useEffect(() => {
    const values = [];
    const totalContractValue = ratedCapacity * yearlyRates.reduce((sum, year) => sum + parseFloat(year.rate) * 12, 0);
    
    for (let month = 1; month <= termYears * 12; month++) {
      const remainingPercent = (termYears * 12 - month) / (termYears * 12);
      values.push({
        month,
        year: Math.ceil(month / 12),
        value: Math.round(totalContractValue * remainingPercent * 0.8)
      });
    }
    setTerminationValues(values);
  }, [ratedCapacity, yearlyRates, termYears]);

  // Calculate total contract value
  const totalContractValue = ratedCapacity * yearlyRates.reduce((sum, year) => sum + parseFloat(year.rate) * 12, 0);

  // Demand charge tiers
  const demandChargeTiers = [
    { min: 0, max: minDemandKW, charge: 5.00 },
    { min: minDemandKW, max: maxDemandKW, charge: 0 },
    { min: maxDemandKW, max: ratedCapacity, charge: 3.50 },
    { min: ratedCapacity, max: Infinity, charge: 7.00 }
  ];

  // Validation Function
  const validateContract = () => {
    const errors = {};
    
    if (!customerName) errors.customerName = "Customer name is required";
    if (!siteAddress) errors.siteAddress = "Site address is required";
    if (guaranteedCriticalOutput > ratedCapacity) {
      errors.criticalOutput = "Critical output cannot exceed rated capacity";
    }
    if (minDemandKW >= maxDemandKW) {
      errors.demandRange = "Minimum demand must be less than maximum demand";
    }
    if (baseRateYear1 <= 0) errors.baseRate = "Base rate must be positive";
    if (annualEscalation < 0 || annualEscalation > 10) {
      errors.escalation = "Escalation should be between 0% and 10%";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Filter contracts
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = searchQuery === '' || 
      contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClient = selectedClient === 'all' || contract.client === selectedClient;
    const matchesStatus = selectedStatus === 'all' || contract.status === selectedStatus;
    const matchesType = selectedType === 'all' || contract.type === selectedType;
    
    return matchesSearch && matchesClient && matchesStatus && matchesType;
  });

  const uniqueClients = [...new Set(contracts.map(c => c.client))];
  const uniqueTypes = [...new Set(contracts.map(c => c.type))];

  // Load contract as template
  const loadContractAsTemplate = (contract) => {
    setCustomerName(contract.client);
    setSiteAddress(contract.site);
    setRatedCapacity(contract.capacity);
    setTermYears(contract.term);
    setSystemType(contract.type);
    setBaseRateYear1(contract.parameters.financial.baseRate);
    setMicrogridAdderYear1(contract.parameters.financial.microgridAdder);
    setAnnualEscalation(contract.parameters.financial.escalation);
    setThermalCycleFee(contract.parameters.financial.thermalCycleFee || 1000);
    setElectricalBudget(contract.parameters.financial.electricalBudget || 650000);
    setCommissioningAllowance(contract.parameters.financial.commissioningAllowance || 20000);
    setOutputWarrantyPercent(contract.parameters.operating.outputWarranty);
    setEfficiencyWarrantyPercent(contract.parameters.operating.efficiency);
    setGridParallelVoltage(contract.parameters.technical.voltage);
    setNumberOfEnergyServers(contract.parameters.technical.servers);
    setGuaranteedCriticalOutput(contract.parameters.operating.criticalOutput || 800);
    
    // Set components
    const components = contract.parameters.technical.components;
    setIncludeRIInverters(components.includes("RI"));
    setIncludeACInverters(components.includes("AC"));
    setIncludeUltracapacitors(components.includes("UC"));
    setIncludeBESS(components.includes("BESS"));
    setIncludeSolar(components.includes("Solar"));
    
    // Set demand range
    setMinDemandKW(contract.parameters.operating.demandRange.min);
    setMaxDemandKW(contract.parameters.operating.demandRange.max);
    
    // Set tags and notes
    setContractTags(contract.tags || []);
    setContractNotes(contract.notes || '');
    
    setShowLibraryPanel(false);
    setMainTab('basic');
    setValidationErrors({});
  };

  // AI Assistant Functions with Claude API
  const handleAiSubmit = async () => {
    if (!aiInput.trim() || isAiLoading) return;
    
    setIsAiLoading(true);
    const userMessage = { role: 'user', content: aiInput };
    setAiHistory(prev => [...prev, userMessage]);
    setAiInput('');

    try {
      // Use the Claude API that's available in artifacts
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `You are an AI assistant for the Bloom Energy Contract Learning System. 
              The user has ${contracts.length} contracts in their library with an average capacity of ${Math.round(contracts.reduce((sum, c) => sum + c.capacity, 0) / contracts.length)} kW 
              and average term of ${Math.round(contracts.reduce((sum, c) => sum + c.term, 0) / contracts.length)} years.
              
              Current contract configuration:
              - Capacity: ${ratedCapacity} kW
              - Term: ${termYears} years
              - Base Rate: $${baseRateYear1}/kW
              - System Type: ${systemType}
              - Total Value: $${(totalContractValue / 1000000).toFixed(2)}M
              
              User question: ${aiInput}
              
              Provide specific, actionable advice. If suggesting optimizations, be specific about what values to change.`
            }
          ]
        })
      });

      const data = await response.json();
      const aiResponse = data.content[0].text;
      
      setAiHistory(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      
      // Auto-apply optimizations if mentioned
      if (aiResponse.toLowerCase().includes('recommend') || aiResponse.toLowerCase().includes('suggest')) {
        applyAiRecommendations(aiResponse);
      }
    } catch (error) {
      // Fallback to mock response if API fails
      const mockResponse = generateMockAiResponse(aiInput);
      setAiHistory(prev => [...prev, { role: 'assistant', content: mockResponse }]);
      
      if (mockResponse.includes('applying')) {
        applyAiRecommendations(aiInput);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const generateMockAiResponse = (input) => {
    const lowerInput = input.toLowerCase();
    
    const avgCapacity = Math.round(contracts.reduce((sum, c) => sum + c.capacity, 0) / contracts.length);
    const avgRate = (contracts.reduce((sum, c) => sum + c.yearlyRate, 0) / contracts.length).toFixed(2);
    
    if (lowerInput.includes('compare')) {
      return `Based on your contract portfolio analysis:

**Current Configuration vs Portfolio Average:**
• Your capacity (${ratedCapacity} kW) vs avg (${avgCapacity} kW): ${ratedCapacity > avgCapacity ? 'Above average ✓' : 'Below average'}
• Your rate ($${(baseRateYear1 + microgridAdderYear1 + offGridAdderRate).toFixed(2)}/kW) vs avg ($${avgRate}/kW)
• Your term (${termYears} years) is ${termYears > 12 ? 'longer' : 'shorter'} than typical

**Recommendations:**
1. Consider adjusting base rate to $${(parseFloat(avgRate) * 0.85).toFixed(2)}/kW for competitive positioning
2. Include BESS for enhanced reliability (found in 33% of high-value contracts)
3. Set escalation to 3.5% (portfolio average)`;
    } else if (lowerInput.includes('optimize')) {
      return `Optimizing configuration based on best performers in your portfolio:

**Applying these changes:**
• Setting capacity to ${avgCapacity} kW (portfolio sweet spot)
• Adjusting term to 12 years (optimal ROI period)
• Base rate optimized to $65/kW
• Adding BESS and UC components (found in top contracts)
• Warranty levels set to 92% output, 52% efficiency

These changes would increase contract value by approximately 15% while maintaining competitiveness.`;
    } else if (lowerInput.includes('hospital') || lowerInput.includes('medical')) {
      return `For medical facilities (based on Kaiser and Covidien contracts):

**Healthcare-Specific Configuration:**
• Critical output: 90% of capacity (${Math.round(ratedCapacity * 0.9)} kW)
• Warranties: 95% output, 55% efficiency
• Required components: RI, AC, UC, BESS
• Recommended voltage: 13.2kV or higher
• Special provisions: 99.99% uptime SLA, emergency response

Applying healthcare standards to current configuration...`;
    } else {
      return `I can help optimize your contract using insights from your ${contracts.length}-contract portfolio:

**Available Analyses:**
• Portfolio comparison and benchmarking
• ROI optimization strategies
• Industry-specific configurations
• Pricing recommendations
• Risk assessment

**Your Portfolio Stats:**
• Average capacity: ${avgCapacity} kW
• Average rate: $${avgRate}/kW
• Most common type: ${contracts[0]?.type || 'Microgrid'}
• Total portfolio value: $${(contracts.reduce((sum, c) => sum + c.totalValue, 0) / 1000000).toFixed(1)}M

What specific aspect would you like to optimize?`;
    }
  };

  const applyAiRecommendations = (query) => {
    const lower = query.toLowerCase();
    
    if (lower.includes('optimize') || lower.includes('roi')) {
      const avgCapacity = Math.round(contracts.reduce((sum, c) => sum + c.capacity, 0) / contracts.length);
      setRatedCapacity(avgCapacity);
      setTermYears(12);
      setBaseRateYear1(65);
      setGuaranteedCriticalOutput(Math.round(avgCapacity * 0.85));
      setIncludeBESS(true);
      setIncludeUltracapacitors(true);
      setAnnualEscalation(3.5);
      setOutputWarrantyPercent(92);
      setEfficiencyWarrantyPercent(52);
    } else if (lower.includes('hospital') || lower.includes('medical')) {
      setGuaranteedCriticalOutput(Math.round(ratedCapacity * 0.9));
      setOutputWarrantyPercent(95);
      setEfficiencyWarrantyPercent(55);
      setIncludeRIInverters(true);
      setIncludeACInverters(true);
      setIncludeUltracapacitors(true);
      setIncludeBESS(true);
      setGridParallelVoltage('13.2kV');
    }
  };

  // Contract generation with download
  const generateContract = async () => {
    if (!validateContract()) {
      alert('Please fix validation errors before generating the contract');
      return;
    }

    const contractData = {
      id: `BEC-${Date.now().toString(36).toUpperCase()}`,
      basicInfo: {
        customerName,
        siteAddress,
        orderDate,
        validUntilDate: validUntilDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]
      },
      systemConfig: {
        ratedCapacity,
        systemType,
        guaranteedCriticalOutput,
        termYears,
        paymentTerms
      },
      financial: {
        baseRateYear1,
        microgridAdderYear1,
        offGridAdderRate,
        yearlyRates,
        thermalCycleFee,
        totalContractValue: totalContractValue.toFixed(2),
        monthlyPayments: yearlyRates.map(y => ({
          year: y.year,
          monthly: y.monthly
        })),
        terminationSchedule: terminationValues.filter((_, i) => i % 12 === 0),
        electricalBudget,
        commissioningAllowance,
        gridParallelRemobilization
      },
      operating: {
        demandRange: { min: minDemandKW, max: maxDemandKW },
        demandCharges: demandChargeTiers,
        warranties: {
          output: outputWarrantyPercent,
          efficiency: efficiencyWarrantyPercent
        }
      },
      technical: {
        voltageHandoff,
        gridParallelVoltage,
        numberOfEnergyServers,
        components: [
          includeRIInverters && 'RI Inverters',
          includeACInverters && 'AC Inverters',
          includeUltracapacitors && 'Ultracapacitors',
          includeBESS && 'Battery Energy Storage System',
          includeSolar && 'Solar Integration'
        ].filter(Boolean)
      },
      incentives: {
        includeRECs,
        recType: includeRECs ? recType : null
      },
      metadata: {
        generatedDate: new Date().toISOString(),
        createdBy: 'Bloom Energy Contract Learning System',
        version: '2.0',
        basedOnContracts: contracts.length,
        learnedRules: Object.keys(learnedRules).length,
        tags: contractTags,
        notes: contractNotes
      }
    };
    
    // Create downloadable JSON
    const dataStr = JSON.stringify(contractData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `bloom-contract-${contractData.id}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    // Save to contracts library
    const newContract = {
      id: contractData.id,
      name: `${customerName} - ${siteAddress.split(',')[0]}`,
      client: customerName,
      site: siteAddress,
      capacity: ratedCapacity,
      term: termYears,
      type: systemType,
      uploadDate: new Date().toISOString().split('T')[0],
      effectiveDate: orderDate,
      status: "Draft",
      totalValue: parseFloat(totalContractValue.toFixed(0)),
      yearlyRate: parseFloat((baseRateYear1 + microgridAdderYear1 + offGridAdderRate).toFixed(2)),
      parameters: {
        financial: {
          baseRate: baseRateYear1,
          microgridAdder: microgridAdderYear1,
          escalation: annualEscalation,
          thermalCycleFee,
          electricalBudget,
          commissioningAllowance
        },
        technical: {
          voltage: gridParallelVoltage,
          gridVoltage: gridParallelVoltage,
          servers: numberOfEnergyServers,
          components: contractData.technical.components.map(c => c.split(' ')[0]),
          recType: recType
        },
        operating: {
          outputWarranty: outputWarrantyPercent,
          efficiency: efficiencyWarrantyPercent,
          demandRange: { min: minDemandKW, max: maxDemandKW },
          criticalOutput: guaranteedCriticalOutput
        }
      },
      notes: contractNotes,
      tags: contractTags
    };
    
    await dataActions.addContract(newContract);
    
    alert(`Contract ${contractData.id} generated and saved to library!`);
  };

  // Handle contract upload with text extraction
  const handleContractUpload = (file) => {
    setIsProcessing(true);
    setUploadProgress(0);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      
      // Simulate processing with progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            
            // Extract contract data (simulate extraction from PDF text)
            const extractedData = extractContractData(text, file.name);
            
            // Update learned rules based on extracted data
            updateLearnedRules(extractedData);
            
            // Add to contracts
            await dataActions.addContract(extractedData);
            
            setIsProcessing(false);
            setUploadProgress(0);
            setShowUploadDialog(false);
            
            alert(`Contract "${extractedData.name}" uploaded and analyzed successfully!`);
            return 100;
          }
          return prev + 20;
        });
      }, 300);
    };
    
    // For demo, read as text (in production, would use PDF parsing library)
    reader.readAsText(file);
  };

  // Extract contract data from uploaded file
  const extractContractData = (text, filename) => {
    // Simulate extraction logic
    const capacity = Math.floor(Math.random() * 1000) + 500;
    const term = Math.floor(Math.random() * 10) + 5;
    const baseRate = Math.random() * 20 + 55;
    
    return {
      id: `UPL-${Date.now().toString(36).toUpperCase()}`,
      name: filename.replace(/\.[^/.]+$/, ""),
      client: "Extracted Client Corp",
      site: "Extracted Location",
      capacity,
      term,
      type: "Microgrid - Constrained",
      uploadDate: new Date().toISOString().split('T')[0],
      effectiveDate: new Date().toISOString().split('T')[0],
      status: "Processing",
      totalValue: capacity * term * baseRate * 12,
      yearlyRate: baseRate,
      parameters: {
        financial: {
          baseRate,
          microgridAdder: Math.random() * 5 + 8,
          escalation: Math.random() * 2 + 2.5,
          thermalCycleFee: Math.floor(Math.random() * 1000) + 500,
          electricalBudget: Math.floor(Math.random() * 500000) + 500000,
          commissioningAllowance: Math.floor(Math.random() * 20000) + 15000
        },
        technical: {
          voltage: "13.2kV",
          gridVoltage: "13.2kV",
          servers: Math.floor(capacity / 200),
          components: ["RI", "AC", Math.random() > 0.5 ? "UC" : null, Math.random() > 0.7 ? "BESS" : null].filter(Boolean),
          recType: "CT-Class-I"
        },
        operating: {
          outputWarranty: Math.floor(Math.random() * 10) + 85,
          efficiency: Math.floor(Math.random() * 10) + 45,
          demandRange: { min: Math.floor(capacity * 0.2), max: Math.floor(capacity * 0.8) },
          criticalOutput: Math.floor(capacity * 0.75)
        }
      },
      notes: "Automatically extracted from uploaded document",
      tags: ["Uploaded", "Auto-Extracted"]
    };
  };

  // Update learned rules based on new contract
  const updateLearnedRules = async (contract) => {
    // Create learned rules from contract data - simplified version for now
    // In production, this would be more sophisticated rule extraction
    const existingRules = syncData.learnedRules;
    const updatedRules = [...existingRules];
    
    // Find or create capacity range rule
    let capacityRuleIndex = updatedRules.findIndex(r => r.name === 'capacityRange');
    if (capacityRuleIndex === -1) {
      updatedRules.push({
        id: `rule_capacity_${Date.now()}`,
        ruleType: 'RANGE',
        category: 'technical',
        name: 'capacityRange',
        ruleData: { min: contract.capacity, max: contract.capacity },
        confidence: 0.8,
        occurrences: 1,
        lastSeen: new Date().toISOString(),
        isActive: true,
        source: `contract_${contract.id}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      const rule = updatedRules[capacityRuleIndex];
      rule.ruleData = {
        min: Math.min(rule.ruleData.min, contract.capacity),
        max: Math.max(rule.ruleData.max, contract.capacity)
      };
      rule.occurrences += 1;
      rule.lastSeen = new Date().toISOString();
      rule.updatedAt = new Date().toISOString();
    }

    // Update the rules via the API
    try {
      await dataActions.updateLearnedRules(updatedRules);
    } catch (error) {
      console.error('Failed to update learned rules:', error);
    }
  };

  // Delete contract
  const deleteContract = async (contractId) => {
    await dataActions.deleteContract(contractId);
    setShowDeleteDialog(false);
    setContractToDelete(null);
  };

  // Compare contracts
  const CompareContracts = () => {
    if (compareContracts.length < 2) return null;
    
    const contracts = compareContracts.map(id => contracts.find(c => c.id === id)).filter(Boolean);
    
    return (
      <div className="space-y-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Parameter</th>
              {contracts.map(c => (
                <th key={c.id} className="text-left p-2">{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-2 font-medium">Capacity</td>
              {contracts.map(c => (
                <td key={c.id} className="p-2">{c.capacity} kW</td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium">Term</td>
              {contracts.map(c => (
                <td key={c.id} className="p-2">{c.term} years</td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium">Rate</td>
              {contracts.map(c => (
                <td key={c.id} className="p-2">${c.yearlyRate}/kW</td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium">Total Value</td>
              {contracts.map(c => (
                <td key={c.id} className="p-2">${(c.totalValue / 1000000).toFixed(2)}M</td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium">Output Warranty</td>
              {contracts.map(c => (
                <td key={c.id} className="p-2">{c.parameters.operating.outputWarranty}%</td>
              ))}
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium">Components</td>
              {contracts.map(c => (
                <td key={c.id} className="p-2">{c.parameters.technical.components.join(', ')}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Statistics
  const stats = {
    totalContracts: contracts.length,
    totalClients: uniqueClients.length,
    totalCapacity: contracts.reduce((sum, c) => sum + c.capacity, 0),
    totalValue: contracts.reduce((sum, c) => sum + c.totalValue, 0),
    averageRate: contracts.length > 0 ? (contracts.reduce((sum, c) => sum + c.yearlyRate, 0) / contracts.length).toFixed(2) : 0,
    averageTerm: contracts.length > 0 ? Math.round(contracts.reduce((sum, c) => sum + c.term, 0) / contracts.length) : 0
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Bloom Energy Logo */}
              <svg width="143" height="24" viewBox="0 0 143 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_bloom_logo)">
                  <path d="M17.3643 17.4551C15.3752 17.4551 14.085 16.4733 14.085 14.1278V0.21875H17.0417V13.6369C17.0417 14.346 17.203 14.8369 18.2244 14.8369C18.4932 14.8369 18.547 14.8369 18.7083 14.8369V17.2915C18.0632 17.4006 17.9556 17.4551 17.3643 17.4551Z" fill="#1F3045"/>
                  <path d="M27.2023 8.07337C26.826 7.637 26.1809 7.30973 25.3745 7.30973C24.5681 7.30973 23.923 7.69155 23.5467 8.07337C22.8478 8.837 22.6865 10.037 22.6865 11.1825C22.6865 12.3279 22.8478 13.4734 23.5467 14.2915C23.923 14.7279 24.5681 15.0552 25.3745 15.0552C26.1809 15.0552 26.826 14.7279 27.2023 14.2915C27.9012 13.5279 28.0624 12.3825 28.0624 11.1825C28.0624 9.98246 27.9012 8.837 27.2023 8.07337ZM29.6215 15.7097C28.7613 16.7461 27.2023 17.6188 25.3745 17.6188C23.5467 17.6188 21.9876 16.7461 21.1275 15.7097C20.2136 14.5643 19.7297 13.2552 19.7297 11.1825C19.7297 9.10973 20.2136 7.80064 21.1275 6.65518C21.9876 5.61882 23.5467 4.74609 25.3745 4.74609C27.2023 4.74609 28.7613 5.61882 29.6215 6.65518C30.5354 7.80064 31.0192 9.10973 31.0192 11.1825C31.0192 13.2006 30.5354 14.5097 29.6215 15.7097Z" fill="#1F3045"/>
                  <path d="M39.997 8.07337C39.6207 7.637 38.9755 7.30973 38.1692 7.30973C37.3628 7.30973 36.7176 7.69155 36.3413 8.07337C35.6425 8.837 35.4812 10.037 35.4812 11.1825C35.4812 12.3279 35.6425 13.4734 36.3413 14.2915C36.7176 14.7279 37.3628 15.0552 38.1692 15.0552C38.9755 15.0552 39.6207 14.7279 39.997 14.2915C40.6958 13.5279 40.8571 12.3825 40.8571 11.1825C40.8571 9.98246 40.6958 8.837 39.997 8.07337ZM42.4161 15.7097C41.556 16.7461 39.997 17.6188 38.1692 17.6188C36.3413 17.6188 34.7823 16.7461 33.9222 15.7097C33.0082 14.5643 32.5244 13.2552 32.5244 11.1825C32.5244 9.10973 33.0082 7.80064 33.9222 6.65518C34.7823 5.61882 36.3413 4.74609 38.1692 4.74609C39.997 4.74609 41.556 5.61882 42.4161 6.65518C43.3301 7.80064 43.8139 9.10973 43.8139 11.1825C43.8139 13.2006 43.3301 14.5097 42.4161 15.7097Z" fill="#1F3045"/>
                  <path d="M59.9956 17.2915V9.65518C59.9956 8.12791 59.6193 7.25518 58.114 7.25518C56.4475 7.25518 55.7486 9.00064 55.7486 10.5825V17.2915H52.8456V9.65518C52.8456 8.12791 52.4693 7.25518 50.964 7.25518C49.2975 7.25518 48.5449 9.00064 48.5449 10.5825V17.2915H45.6418V5.01882H48.061L48.2761 6.65518C48.9212 5.50973 50.1039 4.74609 51.7167 4.74609C53.437 4.74609 54.5659 5.50973 55.1573 6.76428C55.8561 5.50973 57.2001 4.74609 58.8129 4.74609C61.3933 4.74609 62.7373 6.49155 62.7373 9.05518V17.3461L59.9956 17.2915Z" fill="#1F3045"/>
                  <path d="M73.1127 7.80064C72.7364 7.36427 72.0913 7.09155 71.2849 7.09155C70.4247 7.09155 69.6721 7.47337 69.242 8.01882C68.8119 8.56428 68.6507 9.10973 68.5969 9.92791H73.8116C73.8116 9.00064 73.5428 8.29155 73.1127 7.80064ZM76.7146 12.0552H68.6507C68.5969 12.9825 68.9732 13.9097 69.5108 14.4552C69.9409 14.837 70.5322 15.2188 71.2849 15.2188C72.145 15.2188 72.6289 15.0552 73.0589 14.6188C73.3277 14.3461 73.5428 14.0188 73.6503 13.5825H76.4458C76.392 14.2915 75.9082 15.2734 75.4243 15.8734C74.4029 17.1279 72.8977 17.6188 71.3386 17.6188C69.6721 17.6188 68.4894 17.0188 67.5217 16.0915C66.2852 14.8915 65.6401 13.2006 65.6401 11.1825C65.6401 9.21882 66.2315 7.47337 67.3604 6.27337C68.2743 5.34609 69.5646 4.74609 71.2311 4.74609C73.0052 4.74609 74.6717 5.45518 75.6394 7.037C76.4995 8.40064 76.7146 9.76428 76.6608 11.2915C76.7683 11.237 76.7146 11.837 76.7146 12.0552Z" fill="#3DAE2B"/>
                  <path d="M86.3914 17.2914V9.76413C86.3914 8.34595 85.9076 7.47322 84.4023 7.47322C83.3809 7.47322 82.682 8.12777 82.3057 9.05504C81.8756 10.0369 81.9294 11.2914 81.9294 12.3278V17.346H79.0264V5.01868H81.4455L81.6606 6.6005C82.3594 5.29141 83.811 4.69141 85.2087 4.69141C87.7891 4.69141 89.2944 6.54595 89.2944 9.05504V17.2369H86.3914V17.2914Z" fill="#3DAE2B"/>
                  <path d="M98.8637 7.80064C98.4874 7.36427 97.8423 7.09155 97.0359 7.09155C96.1758 7.09155 95.4231 7.47337 94.993 8.01882C94.563 8.56428 94.4017 9.10973 94.3479 9.92791H99.5626C99.5626 9.00064 99.3476 8.29155 98.8637 7.80064ZM102.466 12.0552H94.3479C94.3479 12.9825 94.6705 13.9097 95.2081 14.4552C95.6382 14.837 96.2295 15.2188 96.9821 15.2188C97.8423 15.2188 98.3261 15.0552 98.7562 14.6188C99.025 14.3461 99.24 14.0188 99.3476 13.5825H102.143C102.089 14.2915 101.605 15.2734 101.122 15.8734C100.1 17.1279 98.5949 17.6188 97.0359 17.6188C95.3694 17.6188 94.1867 17.0188 93.219 16.0915C92.0363 14.8915 91.3374 13.2006 91.3374 11.1825C91.3374 9.21882 91.9288 7.47337 93.0577 6.27337C93.9716 5.34609 95.2618 4.74609 96.9284 4.74609C98.7024 4.74609 100.369 5.45518 101.337 7.037C102.197 8.40064 102.412 9.76428 102.412 11.2915C102.519 11.237 102.466 11.837 102.466 12.0552Z" fill="#3DAE2B"/>
                  <path d="M110.798 7.63729C108.755 7.63729 107.68 9.11001 107.68 11.1282V17.2918H104.723V5.01911H107.196L107.465 6.87365C108.002 5.45547 109.454 4.85547 110.905 4.85547C111.228 4.85547 111.497 4.91001 111.819 4.91001V7.74638C111.497 7.69183 111.121 7.63729 110.798 7.63729Z" fill="#3DAE2B"/>
                  <path d="M117.733 6.92773C116.389 6.92773 115.583 7.90955 115.583 9.21864C115.583 10.5277 116.389 11.5096 117.733 11.5096C119.077 11.5096 119.884 10.5823 119.884 9.21864C119.884 7.90955 119.077 6.92773 117.733 6.92773ZM118.271 17.455H116.013C115.368 17.6732 114.938 18.1641 114.938 18.9823C114.938 20.5641 116.82 20.6732 118.002 20.6732C119.185 20.6732 121.228 20.6186 121.228 18.9823C121.174 17.455 119.346 17.455 118.271 17.455ZM118.056 23.0186C116.604 23.0186 115.045 22.9096 113.755 21.9823C112.841 21.3277 112.304 20.455 112.304 19.3096C112.304 18.2186 112.841 17.2914 113.755 16.8005C113.003 16.3641 112.573 15.4914 112.573 14.6732C112.573 13.6368 113.056 12.8186 114.024 12.2186C113.271 11.455 112.841 10.4732 112.841 9.21864C112.841 6.27319 115.099 4.69137 117.787 4.69137C118.809 4.69137 119.723 4.9641 120.529 5.45501C121.013 4.41864 121.98 3.92773 123.002 3.92773C123.163 3.92773 123.593 3.92773 123.808 3.98228V6.27319C123.754 6.27319 123.647 6.27319 123.593 6.27319C122.894 6.27319 122.303 6.49137 122.142 7.03682C122.518 7.69137 122.787 8.40046 122.787 9.27319C122.787 12.055 120.475 13.7459 117.841 13.7459C117.142 13.7459 116.497 13.6368 115.906 13.4186C115.637 13.5823 115.314 13.9096 115.314 14.2914C115.314 15.0005 116.013 15.2186 116.658 15.2186H118.647C119.884 15.2186 121.443 15.2186 122.572 16.0368C123.593 16.7459 124.023 17.7823 124.023 18.9823C123.916 22.1459 120.744 23.0186 118.056 23.0186Z" fill="#3DAE2B"/>
                  <path d="M131.872 19.3629C131.281 20.9447 130.259 22.4174 128.163 22.4174C127.195 22.4174 126.55 22.2538 125.905 22.0902V19.6356C126.657 19.7993 126.872 19.8538 127.518 19.8538C128.055 19.8538 128.593 19.6902 128.915 18.9265L129.614 17.2356L124.83 4.96289H128.001L131.173 13.8538L134.184 4.96289H137.14L131.872 19.3629Z" fill="#3DAE2B"/>
                  <path d="M6.23639 14.8371C4.78488 14.8371 3.7097 13.9643 3.60218 12.3825V9.87344H5.1612H5.96759C7.47285 9.87344 8.81684 10.6371 8.81684 12.3825C8.81684 13.9098 7.68789 14.8371 6.23639 14.8371ZM6.23639 2.89162C7.52661 2.89162 8.44052 3.87344 8.44052 5.07344C8.44052 6.60071 7.52661 7.3098 5.91383 7.3098H5.21496H3.54842V2.94616L6.23639 2.89162ZM9.1394 8.5098C10.5909 7.96435 11.5048 6.43707 11.5048 4.96435C11.5048 2.12798 9.24691 0.273438 6.29015 0.273438H0.75293V12.3825C0.806689 15.4371 3.22586 17.4553 6.23639 17.4553C9.30067 17.4553 11.7736 15.7098 11.7736 12.4371C11.7736 10.6916 10.8059 9.00071 9.1394 8.5098Z" fill="#1F3045"/>
                  <path d="M140.527 5.94624C140.473 5.89169 140.366 5.89169 140.258 5.89169H140.151V6.43714H140.366C140.473 6.43714 140.581 6.43715 140.635 6.3826C140.688 6.32805 140.742 6.27351 140.742 6.16442C140.742 6.05533 140.635 5.94624 140.527 5.94624ZM139.613 7.47351V5.56442C139.721 5.56442 139.882 5.56442 140.151 5.56442C140.366 5.56442 140.527 5.56442 140.527 5.56442C140.688 5.56442 140.796 5.61896 140.903 5.67351C141.065 5.7826 141.172 5.94624 141.172 6.10987C141.172 6.27351 141.118 6.3826 141.065 6.43714C140.957 6.49169 140.85 6.54624 140.742 6.54624C140.85 6.54624 140.957 6.60078 141.011 6.65533C141.118 6.76442 141.172 6.87351 141.172 7.09169V7.25533V7.30987V7.36442V7.41896H140.688C140.688 7.36442 140.688 7.25533 140.635 7.14624C140.635 7.03715 140.635 6.92805 140.581 6.92805C140.581 6.87351 140.527 6.81896 140.42 6.76442C140.366 6.76442 140.312 6.70987 140.258 6.70987H140.151H140.043V7.36442H139.613V7.47351ZM139.398 5.50987C139.129 5.7826 138.968 6.10987 138.968 6.49169C138.968 6.87351 139.129 7.25533 139.398 7.52805C139.667 7.80078 139.989 7.96442 140.366 7.96442C140.742 7.96442 141.065 7.80078 141.333 7.52805C141.602 7.25533 141.764 6.92805 141.764 6.49169C141.764 6.10987 141.602 5.7826 141.333 5.50987C141.065 5.23715 140.742 5.07351 140.366 5.07351C139.989 5.07351 139.667 5.23715 139.398 5.50987ZM141.548 7.74624C141.226 8.07351 140.796 8.23715 140.366 8.23715C139.882 8.23715 139.506 8.07351 139.183 7.74624C138.86 7.41896 138.699 6.9826 138.699 6.54624C138.699 6.05533 138.86 5.61896 139.237 5.29169C139.559 4.96442 139.936 4.80078 140.42 4.80078C140.903 4.80078 141.28 4.96442 141.602 5.29169C141.925 5.61896 142.086 6.05533 142.086 6.49169C142.086 6.9826 141.925 7.41896 141.548 7.74624Z" fill="#3DAE2B"/>
                </g>
                <defs>
                  <clipPath id="clip0_bloom_logo">
                    <rect width="143" height="24" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <CardTitle className="text-xl">Contract Learning System</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Create contracts using intelligence from {stats.totalContracts} analyzed contracts
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={showLibraryPanel ? "default" : "outline"}
                onClick={() => setShowLibraryPanel(!showLibraryPanel)}
              >
                <Library className="mr-2 h-4 w-4" />
                Contract Library ({stats.totalContracts})
              </Button>
              <Button 
                variant={showAiPanel ? "default" : "outline"}
                onClick={() => setShowAiPanel(!showAiPanel)}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                AI Assistant
              </Button>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Contract
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.totalContracts}</div>
            <p className="text-xs text-muted-foreground">Total Contracts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">Active Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.totalCapacity}</div>
            <p className="text-xs text-muted-foreground">Total kW</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">${(stats.totalValue / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">Portfolio Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">${stats.averageRate}</div>
            <p className="text-xs text-muted-foreground">Avg Rate/kW</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.averageTerm}y</div>
            <p className="text-xs text-muted-foreground">Avg Term</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-6">
        {/* Main Contract Creation Interface */}
        <div className={showLibraryPanel || showAiPanel ? "flex-1" : "w-full"}>
          <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="create">Create</TabsTrigger>
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="operating">Operating</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            {/* Create Tab */}
            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Contract</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Start from scratch or use a template from your library
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500" onClick={() => setMainTab('basic')}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Plus className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Start Fresh</h3>
                          <p className="text-sm text-muted-foreground">Create a new contract from scratch</p>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-500" onClick={() => setShowLibraryPanel(true)}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Copy className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Use Template</h3>
                          <p className="text-sm text-muted-foreground">Start from an existing contract</p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription>
                      This system has learned {Object.keys(learnedRules).reduce((count, key) => {
                        if (Array.isArray(learnedRules[key])) return count + learnedRules[key].length;
                        return count + 1;
                      }, 0)} unique rules from {stats.totalContracts} contracts
                    </AlertDescription>
                  </Alert>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Recent Contracts</h4>
                    <div className="space-y-2">
                      {contracts.slice(0, 3).map(contract => (
                        <div key={contract.id} className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">{contract.name}</span>
                            <Badge variant="outline" className="text-xs">{contract.capacity} kW</Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => loadContractAsTemplate(contract)}
                          >
                            Use as Template
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Basic Info Tab */}
            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Contract Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer">Customer Name *</Label>
                      <Input
                        id="customer"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                        className={validationErrors.customerName ? "border-red-500" : ""}
                      />
                      {validationErrors.customerName && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.customerName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="site">Site Address *</Label>
                      <Input
                        id="site"
                        value={siteAddress}
                        onChange={(e) => setSiteAddress(e.target.value)}
                        placeholder="Enter site address"
                        className={validationErrors.siteAddress ? "border-red-500" : ""}
                      />
                      {validationErrors.siteAddress && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.siteAddress}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="orderDate">Order Date</Label>
                      <Input
                        id="orderDate"
                        type="date"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="validUntil">Valid Until Date</Label>
                      <Input
                        id="validUntil"
                        type="date"
                        value={validUntilDate}
                        onChange={(e) => setValidUntilDate(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Contract Notes</Label>
                    <Textarea
                      id="notes"
                      value={contractNotes}
                      onChange={(e) => setContractNotes(e.target.value)}
                      placeholder="Add any special notes or requirements..."
                      className="h-20"
                    />
                  </div>
                  
                  <div>
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {learnedRules.commonTags.map(tag => (
                        <Badge
                          key={tag}
                          variant={contractTags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setContractTags(prev =>
                              prev.includes(tag)
                                ? prev.filter(t => t !== tag)
                                : [...prev, tag]
                            );
                          }}
                        >
                          {contractTags.includes(tag) && <Check className="mr-1 h-3 w-3" />}
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Tab */}
            <TabsContent value="system">
              <Card>
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label htmlFor="capacity">Rated Capacity</Label>
                      <span className="text-sm font-medium">{ratedCapacity} kW</span>
                    </div>
                    <Slider
                      id="capacity"
                      min={learnedRules.capacityRange.min}
                      max={learnedRules.capacityRange.max}
                      step={10}
                      value={[ratedCapacity]}
                      onValueChange={(v) => setRatedCapacity(v[0])}
                    />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>{learnedRules.capacityRange.min} kW</span>
                      <span>{learnedRules.capacityRange.max} kW</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="systemType">System Type</Label>
                    <Select value={systemType} onValueChange={setSystemType}>
                      <SelectTrigger id="systemType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {learnedRules.systemTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <Label htmlFor="critical">Guaranteed Critical Output</Label>
                      <span className="text-sm font-medium">{guaranteedCriticalOutput} kW</span>
                    </div>
                    <Slider
                      id="critical"
                      min={100}
                      max={ratedCapacity}
                      step={10}
                      value={[guaranteedCriticalOutput]}
                      onValueChange={(v) => setGuaranteedCriticalOutput(v[0])}
                      className={validationErrors.criticalOutput ? "border-red-500" : ""}
                    />
                    {validationErrors.criticalOutput && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.criticalOutput}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <Label htmlFor="term">Term Length</Label>
                      <span className="text-sm font-medium">{termYears} years</span>
                    </div>
                    <Slider
                      id="term"
                      min={learnedRules.termRange.min}
                      max={learnedRules.termRange.max}
                      step={1}
                      value={[termYears]}
                      onValueChange={(v) => setTermYears(v[0])}
                    />
                  </div>

                  <div>
                    <Label htmlFor="payment">Payment Terms</Label>
                    <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                      <SelectTrigger id="payment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {learnedRules.paymentTerms.map(term => (
                          <SelectItem key={term} value={term}>{term}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Financial Tab */}
            <TabsContent value="financial">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="baseRate">Base Rate Year 1 ($/kW)</Label>
                      <Input
                        id="baseRate"
                        type="number"
                        step="0.01"
                        value={baseRateYear1}
                        onChange={(e) => setBaseRateYear1(parseFloat(e.target.value) || 0)}
                        className={validationErrors.baseRate ? "border-red-500" : ""}
                      />
                      {validationErrors.baseRate && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.baseRate}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="microgridAdder">Microgrid Adder Year 1 ($/kW)</Label>
                      <Input
                        id="microgridAdder"
                        type="number"
                        step="0.01"
                        value={microgridAdderYear1}
                        onChange={(e) => setMicrogridAdderYear1(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="offGridAdder">Off-Grid Adder Rate ($/kW)</Label>
                      <Input
                        id="offGridAdder"
                        type="number"
                        step="0.01"
                        value={offGridAdderRate}
                        onChange={(e) => setOffGridAdderRate(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="thermalCycle">Thermal Cycle Fee ($)</Label>
                      <Input
                        id="thermalCycle"
                        type="number"
                        value={thermalCycleFee}
                        onChange={(e) => setThermalCycleFee(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <Label htmlFor="escalation">Annual Escalation</Label>
                      <span className="text-sm font-medium">{annualEscalation}%</span>
                    </div>
                    <Slider
                      id="escalation"
                      min={learnedRules.escalationRange.min}
                      max={learnedRules.escalationRange.max}
                      step={0.1}
                      value={[annualEscalation]}
                      onValueChange={(v) => setAnnualEscalation(v[0])}
                      className={validationErrors.escalation ? "border-red-500" : ""}
                    />
                    {validationErrors.escalation && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.escalation}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="electrical">Electrical Budget ($)</Label>
                      <Input
                        id="electrical"
                        type="number"
                        value={electricalBudget}
                        onChange={(e) => setElectricalBudget(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="commissioning">Commissioning Allowance ($)</Label>
                      <Input
                        id="commissioning"
                        type="number"
                        value={commissioningAllowance}
                        onChange={(e) => setCommissioningAllowance(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="remobilization">Grid Parallel Remobilization ($)</Label>
                      <Input
                        id="remobilization"
                        type="number"
                        value={gridParallelRemobilization}
                        onChange={(e) => setGridParallelRemobilization(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {yearlyRates.length > 0 && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label>Calculated Yearly Rates</Label>
                        <span className="text-sm text-muted-foreground">
                          Total Contract Value: ${(totalContractValue / 1000000).toFixed(2)}M
                        </span>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left pb-2">Year</th>
                              <th className="text-right pb-2">Total ($/kW)</th>
                              <th className="text-right pb-2">Monthly Payment</th>
                              <th className="text-right pb-2">Annual Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {yearlyRates.slice(0, 5).map((year) => (
                              <tr key={year.year} className="border-b">
                                <td className="py-1">{year.year}</td>
                                <td className="text-right font-semibold">${year.rate}</td>
                                <td className="text-right">${parseInt(year.monthly).toLocaleString()}</td>
                                <td className="text-right">${(parseInt(year.monthly) * 12).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {yearlyRates.length > 5 && (
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            ... and {yearlyRates.length - 5} more years
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Operating Tab */}
            <TabsContent value="operating">
              <Card>
                <CardHeader>
                  <CardTitle>Operating Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Demand Range (kW)</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <Label htmlFor="minDemand" className="text-sm">Minimum</Label>
                        <Input
                          id="minDemand"
                          type="number"
                          value={minDemandKW}
                          onChange={(e) => setMinDemandKW(parseFloat(e.target.value) || 0)}
                          className={validationErrors.demandRange ? "border-red-500" : ""}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxDemand" className="text-sm">Maximum</Label>
                        <Input
                          id="maxDemand"
                          type="number"
                          value={maxDemandKW}
                          onChange={(e) => setMaxDemandKW(parseFloat(e.target.value) || 0)}
                          className={validationErrors.demandRange ? "border-red-500" : ""}
                        />
                      </div>
                    </div>
                    {validationErrors.demandRange && (
                      <p className="text-xs text-red-500 mt-1">{validationErrors.demandRange}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <Label htmlFor="outputWarranty">Output Warranty</Label>
                      <span className="text-sm font-medium">{outputWarrantyPercent}%</span>
                    </div>
                    <Slider
                      id="outputWarranty"
                      min={learnedRules.warrantyRanges.output.min}
                      max={learnedRules.warrantyRanges.output.max}
                      step={1}
                      value={[outputWarrantyPercent]}
                      onValueChange={(v) => setOutputWarrantyPercent(v[0])}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <Label htmlFor="efficiencyWarranty">Efficiency Warranty</Label>
                      <span className="text-sm font-medium">{efficiencyWarrantyPercent}%</span>
                    </div>
                    <Slider
                      id="efficiencyWarranty"
                      min={learnedRules.warrantyRanges.efficiency.min}
                      max={learnedRules.warrantyRanges.efficiency.max}
                      step={1}
                      value={[efficiencyWarrantyPercent]}
                      onValueChange={(v) => setEfficiencyWarrantyPercent(v[0])}
                    />
                  </div>

                  <div>
                    <Label>Demand Charge Schedule</Label>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left pb-2">Range (kW)</th>
                            <th className="text-right pb-2">Charge ($/kW)</th>
                            <th className="text-right pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {demandChargeTiers.map((tier, i) => (
                            <tr key={i} className="border-b">
                              <td className="py-2">
                                {tier.min} - {tier.max === Infinity ? '∞' : tier.max}
                              </td>
                              <td className="text-right font-semibold">${tier.charge.toFixed(2)}</td>
                              <td className="text-right">
                                {tier.charge === 0 ? (
                                  <Badge variant="outline" className="bg-green-50">No Charge</Badge>
                                ) : tier.charge > 5 ? (
                                  <Badge variant="outline" className="bg-red-50">Premium</Badge>
                                ) : (
                                  <Badge variant="outline">Standard</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Technical Tab */}
            <TabsContent value="technical">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Specifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="voltageHandoff">Voltage Handoff</Label>
                      <Select value={voltageHandoff} onValueChange={setVoltageHandoff}>
                        <SelectTrigger id="voltageHandoff">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {learnedRules.voltageOptions.map(voltage => (
                            <SelectItem key={voltage} value={voltage}>{voltage}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="gridVoltage">Grid Parallel Voltage</Label>
                      <Select value={gridParallelVoltage} onValueChange={setGridParallelVoltage}>
                        <SelectTrigger id="gridVoltage">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {learnedRules.voltageOptions.map(voltage => (
                            <SelectItem key={voltage} value={voltage}>{voltage}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <Label htmlFor="servers">Number of Energy Servers</Label>
                      <span className="text-sm font-medium">{numberOfEnergyServers}</span>
                    </div>
                    <Slider
                      id="servers"
                      min={1}
                      max={Math.max(10, Math.ceil(ratedCapacity / 200))}
                      step={1}
                      value={[numberOfEnergyServers]}
                      onValueChange={(v) => setNumberOfEnergyServers(v[0])}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label>Components</Label>
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="riInverters"
                            checked={includeRIInverters}
                            onCheckedChange={setIncludeRIInverters}
                          />
                          <Label htmlFor="riInverters">RI Inverters</Label>
                        </div>
                        <Badge variant="outline">Standard</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="acInverters"
                            checked={includeACInverters}
                            onCheckedChange={setIncludeACInverters}
                          />
                          <Label htmlFor="acInverters">AC Inverters</Label>
                        </div>
                        <Badge variant="outline">Standard</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="ultracapacitors"
                            checked={includeUltracapacitors}
                            onCheckedChange={setIncludeUltracapacitors}
                          />
                          <Label htmlFor="ultracapacitors">Ultracapacitors</Label>
                        </div>
                        <Badge variant="outline">Premium</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="bess"
                            checked={includeBESS}
                            onCheckedChange={setIncludeBESS}
                          />
                          <Label htmlFor="bess">Battery Energy Storage (BESS)</Label>
                        </div>
                        <Badge className="bg-green-600">Recommended</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="solar"
                            checked={includeSolar}
                            onCheckedChange={setIncludeSolar}
                          />
                          <Label htmlFor="solar">Solar Integration</Label>
                        </div>
                        <Badge variant="outline">Optional</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="recs"
                        checked={includeRECs}
                        onCheckedChange={setIncludeRECs}
                      />
                      <Label htmlFor="recs">Include Renewable Energy Credits (RECs)</Label>
                    </div>
                    {includeRECs && (
                      <div>
                        <Label htmlFor="recType">REC Type</Label>
                        <Select value={recType} onValueChange={setRecType}>
                          <SelectTrigger id="recType">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CT-Class-I">Connecticut Class I</SelectItem>
                            <SelectItem value="CT-Class-II">Connecticut Class II</SelectItem>
                            <SelectItem value="MA-Class-I">Massachusetts Class I</SelectItem>
                            <SelectItem value="CA-RPS">California RPS</SelectItem>
                            <SelectItem value="National">National Green-e</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle>Contract Summary</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Review and generate your contract
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Object.keys(validationErrors).length > 0 && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        Please fix {Object.keys(validationErrors).length} validation {Object.keys(validationErrors).length === 1 ? 'error' : 'errors'} before generating the contract.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Basic Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Customer:</dt>
                            <dd className="font-medium">{customerName || 'Not specified'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Site:</dt>
                            <dd className="font-medium">{siteAddress || 'Not specified'}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Term:</dt>
                            <dd className="font-medium">{termYears} years</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Payment:</dt>
                            <dd className="font-medium">{paymentTerms}</dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">System Configuration</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Capacity:</dt>
                            <dd className="font-medium">{ratedCapacity} kW</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Critical Output:</dt>
                            <dd className="font-medium">{guaranteedCriticalOutput} kW</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Type:</dt>
                            <dd className="font-medium">{systemType}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Servers:</dt>
                            <dd className="font-medium">{numberOfEnergyServers}</dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Financial Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Year 1 Rate:</dt>
                            <dd className="font-medium">${yearlyRates[0]?.rate}/kW</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Final Year Rate:</dt>
                            <dd className="font-medium">${yearlyRates[yearlyRates.length - 1]?.rate}/kW</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Escalation:</dt>
                            <dd className="font-medium">{annualEscalation}%/year</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Total Value:</dt>
                            <dd className="font-medium text-green-600">${(totalContractValue / 1000000).toFixed(2)}M</dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Technical Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Voltage:</dt>
                            <dd className="font-medium">{gridParallelVoltage}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Warranties:</dt>
                            <dd className="font-medium">{outputWarrantyPercent}% / {efficiencyWarrantyPercent}%</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Demand Range:</dt>
                            <dd className="font-medium">{minDemandKW}-{maxDemandKW} kW</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">RECs:</dt>
                            <dd className="font-medium">{includeRECs ? recType : 'None'}</dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Selected Components</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {includeRIInverters && <Badge>RI Inverters</Badge>}
                        {includeACInverters && <Badge>AC Inverters</Badge>}
                        {includeUltracapacitors && <Badge>Ultracapacitors</Badge>}
                        {includeBESS && <Badge className="bg-green-600">BESS</Badge>}
                        {includeSolar && <Badge>Solar Integration</Badge>}
                        {!includeRIInverters && !includeACInverters && !includeUltracapacitors && !includeBESS && !includeSolar && (
                          <span className="text-sm text-muted-foreground">No components selected</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {contractTags.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Tags</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {contractTags.map(tag => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="pt-4 border-t">
                    <div className="flex gap-4">
                      <Button 
                        onClick={generateContract} 
                        className="flex-1"
                        disabled={Object.keys(validationErrors).length > 0}
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        Generate & Download Contract
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          if (validateContract()) {
                            alert('Contract configuration is valid!');
                          }
                        }}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Validate Configuration
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Library Panel */}
        {showLibraryPanel && (
          <div className="w-96">
            <Card className="h-full flex flex-col max-h-[calc(100vh-200px)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Library className="h-5 w-5" />
                    Contract Library
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowLibraryPanel(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contracts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="All Clients" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Clients</SelectItem>
                        {uniqueClients.map(client => (
                          <SelectItem key={client} value={client}>{client}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCompareDialog(true)}
                      disabled={compareContracts.length < 2}
                    >
                      <GitBranch className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {filteredContracts.map(contract => (
                      <Card key={contract.id} className="p-3 hover:shadow-md transition-all">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={compareContracts.includes(contract.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCompareContracts(prev => [...prev, contract.id]);
                                  } else {
                                    setCompareContracts(prev => prev.filter(id => id !== contract.id));
                                  }
                                }}
                                className="mt-1"
                              />
                              <div>
                                <h4 className="font-medium text-sm">{contract.name}</h4>
                                <p className="text-xs text-muted-foreground">{contract.id}</p>
                              </div>
                            </div>
                            <Badge 
                              variant={contract.status === 'Active' ? 'default' : 'secondary'} 
                              className="text-xs"
                            >
                              {contract.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {contract.capacity} kW
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {contract.term}y
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${contract.yearlyRate}/kW
                            </div>
                            <div className="flex items-center gap-1">
                              <Settings className="h-3 w-3" />
                              {contract.parameters.technical.voltage}
                            </div>
                          </div>
                          
                          {contract.tags && contract.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {contract.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => loadContractAsTemplate(contract)}
                            >
                              <Copy className="mr-1 h-3 w-3" />
                              Use
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="flex-1"
                              onClick={() => setViewingContract(contract)}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setContractToDelete(contract);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Assistant Panel */}
        {showAiPanel && (
          <div className="w-96">
            <Card className="h-full flex flex-col max-h-[calc(100vh-200px)]">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      <span className="text-lg font-semibold">AI Contract Assistant</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Powered by insights from {stats.totalContracts} contracts
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAiPanel(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4 px-4 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-9"
                    onClick={() => {
                      setAiInput("Compare this configuration to our portfolio average");
                      handleAiSubmit();
                    }}
                  >
                    <TrendingUp className="mr-1 h-3 w-3" />
                    Compare
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-9"
                    onClick={() => {
                      setAiInput("Optimize this contract for maximum ROI");
                      handleAiSubmit();
                    }}
                  >
                    <DollarSign className="mr-1 h-3 w-3" />
                    Optimize ROI
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-9"
                    onClick={() => {
                      setAiInput("Configure for hospital requirements");
                      handleAiSubmit();
                    }}
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    Healthcare
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-9"
                    onClick={() => {
                      setAiInput("What components should I include?");
                      handleAiSubmit();
                    }}
                  >
                    <Settings className="mr-1 h-3 w-3" />
                    Components
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px] bg-gray-50 rounded-lg p-3">
                  {aiHistory.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground p-4">
                      <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Ask me about contract optimization, pricing recommendations, or portfolio insights.</p>
                    </div>
                  )}
                  {aiHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg text-sm ${
                        msg.role === 'user' 
                          ? 'bg-blue-50 dark:bg-blue-900/20 ml-8' 
                          : 'bg-white dark:bg-gray-800 mr-2'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {msg.role === 'assistant' && <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1 whitespace-pre-wrap break-words">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  {isAiLoading && (
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg mr-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Analyzing...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Ask about optimization, pricing, or comparisons..."
                    className="flex-1 min-h-[60px] text-sm resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAiSubmit();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAiSubmit}
                    disabled={isAiLoading || !aiInput.trim()}
                    size="icon"
                    className="h-[60px]"
                  >
                    {isAiLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Contract for Analysis</DialogTitle>
            <DialogDescription>
              Upload a Bloom Energy contract to extract parameters and expand the system's capabilities
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your contract here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Supports PDF, Word, and JSON formats
              </p>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.json"
                className="hidden"
                id="contract-upload"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleContractUpload(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="contract-upload">
                <Button variant="outline" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </div>
            
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing contract...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {uploadProgress < 30 && <p>📄 Reading document...</p>}
                  {uploadProgress >= 30 && uploadProgress < 60 && <p>🔍 Extracting parameters...</p>}
                  {uploadProgress >= 60 && uploadProgress < 90 && <p>🧠 Learning new rules...</p>}
                  {uploadProgress >= 90 && <p>✅ Finalizing analysis...</p>}
                </div>
              </div>
            )}

            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                The system will automatically extract all contract parameters, identify new rules and options, 
                and make them available in the contract builder.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contract</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{contractToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteContract(contractToDelete?.id)}
            >
              Delete Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Compare Contracts</DialogTitle>
            <DialogDescription>
              Side-by-side comparison of selected contracts
            </DialogDescription>
          </DialogHeader>
          <CompareContracts />
          <DialogFooter>
            <Button onClick={() => setShowCompareDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Contract Dialog */}
      {viewingContract && (
        <Dialog open={!!viewingContract} onOpenChange={() => setViewingContract(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingContract.name}</DialogTitle>
              <DialogDescription>{viewingContract.id} • {viewingContract.status}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Client:</span>
                      <span className="font-medium">{viewingContract.client}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Site:</span>
                      <span className="font-medium">{viewingContract.site}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Upload Date:</span>
                      <span className="font-medium">{viewingContract.uploadDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Effective Date:</span>
                      <span className="font-medium">{viewingContract.effectiveDate}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">System Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Capacity:</span>
                      <span className="font-medium">{viewingContract.capacity} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{viewingContract.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Term:</span>
                      <span className="font-medium">{viewingContract.term} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Servers:</span>
                      <span className="font-medium">{viewingContract.parameters.technical.servers}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Financial Parameters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Rate:</span>
                      <span className="font-medium">${viewingContract.parameters.financial.baseRate}/kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Yearly Rate:</span>
                      <span className="font-medium">${viewingContract.yearlyRate}/kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Escalation:</span>
                      <span className="font-medium">{viewingContract.parameters.financial.escalation}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Value:</span>
                      <span className="font-medium text-green-600">
                        ${(viewingContract.totalValue / 1000000).toFixed(2)}M
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Operating Parameters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Output Warranty:</span>
                      <span className="font-medium">{viewingContract.parameters.operating.outputWarranty}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Efficiency:</span>
                      <span className="font-medium">{viewingContract.parameters.operating.efficiency}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Demand Range:</span>
                      <span className="font-medium">
                        {viewingContract.parameters.operating.demandRange.min}-{viewingContract.parameters.operating.demandRange.max} kW
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Voltage:</span>
                      <span className="font-medium">{viewingContract.parameters.technical.voltage}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Components & Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {viewingContract.parameters.technical.components.map(comp => (
                      <Badge key={comp} variant="outline">{comp}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {viewingContract.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{viewingContract.notes}</p>
                  </CardContent>
                </Card>
              )}

              {viewingContract.tags && viewingContract.tags.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {viewingContract.tags.map(tag => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => loadContractAsTemplate(viewingContract)}>
                <Copy className="mr-2 h-4 w-4" />
                Use as Template
              </Button>
              <Button onClick={() => setViewingContract(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default BloomContractLearningSystem;
