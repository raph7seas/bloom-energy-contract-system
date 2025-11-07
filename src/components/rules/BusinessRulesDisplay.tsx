import React, { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { 
  Shield, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  FileText, 
  Activity,
  Filter,
  Download,
  Eye,
  ChevronDown,
  ChevronRight,
  BarChart3
} from 'lucide-react';

interface BusinessRule {
  id: string;
  category: string;
  type: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  consequence: string | null;
  parameters: Record<string, any>;
  confidence: number;
  sourceText: string;
  businessValue: string;
}

interface BusinessRulesAnalysis {
  documentSummary: {
    contractType: string;
    parties: string[];
    effectiveDate: string;
    keyTerms: string[];
  };
  extractedRules: BusinessRule[];
  extractedData: {
    contractValue: string;
    paymentTerms: string;
    performanceMetrics: string;
    effectiveDate: string;
    governingLaw: string;
    systemCapacity: string;
  };
  riskFactors: string[];
  anomalies: any[];
  summary: {
    totalRulesExtracted: number;
    confidenceScore: number;
    processingNotes: string;
  };
}

const categoryIcons = {
  payment: DollarSign,
  performance: TrendingUp,
  compliance: Shield,
  risk: AlertCircle,
  operational: Settings,
  approval: CheckCircle,
  calculation: BarChart3,
  validation: FileText
};

const categoryColors = {
  payment: 'bg-green-100 text-green-800 border-green-200',
  performance: 'bg-blue-100 text-blue-800 border-blue-200',
  compliance: 'bg-purple-100 text-purple-800 border-purple-200',
  risk: 'bg-red-100 text-red-800 border-red-200',
  operational: 'bg-gray-100 text-gray-800 border-gray-200',
  approval: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  calculation: 'bg-orange-100 text-orange-800 border-orange-200',
  validation: 'bg-indigo-100 text-indigo-800 border-indigo-200'
};

interface BusinessRulesDisplayProps {
  contractData?: any;
  aiExtractionInfo?: {
    isAiExtracted: boolean;
    sourceDocument?: {
      id: string;
      name: string;
      confidence?: number;
    };
  };
}

export const BusinessRulesDisplay: React.FC<BusinessRulesDisplayProps> = ({ 
  contractData, 
  aiExtractionInfo 
}) => {
  const [analysisData, setAnalysisData] = useState<BusinessRulesAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadAnalysisData();
  }, [aiExtractionInfo]);

  const transformAnalysisToDisplayFormat = (analysisData: any, sourceDocument: any) => {
    return {
      documentSummary: {
        contractType: analysisData.documentSummary?.contractType || "Energy Services Agreement",
        parties: analysisData.documentSummary?.parties || ["Bloom Energy Corporation", contractData?.customerName || "Unknown Client"],
        effectiveDate: analysisData.documentSummary?.effectiveDate || contractData?.effectiveDate || new Date().toISOString().split('T')[0],
        keyTerms: analysisData.documentSummary?.keyTerms || []
      },
      extractedRules: analysisData.extractedRules || [],
      extractedData: analysisData.extractedData || {},
      riskFactors: analysisData.riskFactors || [],
      anomalies: analysisData.anomalies || [],
      summary: {
        totalRulesExtracted: analysisData.extractedRules?.length || 0,
        confidenceScore: sourceDocument.confidence || 0.85,
        processingNotes: `Rules extracted from uploaded document: ${sourceDocument.name}`
      }
    };
  };

  const loadAnalysisData = async () => {
    try {
      // If we have AI extraction info, try to load from uploaded document
      if (aiExtractionInfo?.isAiExtracted && aiExtractionInfo.sourceDocument?.id) {
        const response = await fetch(`/api/uploads/${aiExtractionInfo.sourceDocument.id}/content`);
        if (response.ok) {
          const data = await response.json();
          if (data.analysis) {
            setAnalysisData(transformAnalysisToDisplayFormat(data.analysis, aiExtractionInfo.sourceDocument));
            setLoading(false);
            return;
          }
        }
      }

      // Try to load from API analysis endpoint
      const response = await fetch('/api/analysis/latest');
      if (response.ok) {
        const data = await response.json();
        setAnalysisData(data);
      } else {
        // No mock data fallback - show error state
        console.warn('No analysis data available from API');
        setAnalysisData(null);
      }
    } catch (error) {
      console.error('Failed to load business rules analysis:', error);
      // No mock data fallback - let the UI show "No Analysis Data Available" message
      setAnalysisData(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleRuleExpansion = (ruleId: string) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId);
    } else {
      newExpanded.add(ruleId);
    }
    setExpandedRules(newExpanded);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getFilteredRules = () => {
    if (!analysisData) return [];
    if (selectedCategory === 'all') return analysisData.extractedRules;
    return analysisData.extractedRules.filter(rule => rule.category === selectedCategory);
  };

  const getCategoryStats = () => {
    if (!analysisData) return {};
    const stats: Record<string, number> = {};
    analysisData.extractedRules.forEach(rule => {
      stats[rule.category] = (stats[rule.category] || 0) + 1;
    });
    return stats;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-pulse text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading business rules analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Data Available</h3>
        <p className="text-gray-600">Upload and analyze a contract to see extracted business rules here.</p>
      </div>
    );
  }

  const filteredRules = getFilteredRules();
  const categoryStats = getCategoryStats();
  const categories = Object.keys(categoryStats);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Rules Analysis</h2>
          <p className="text-gray-600 mt-1">
            {aiExtractionInfo?.isAiExtracted 
              ? `AI-extracted rules from ${aiExtractionInfo.sourceDocument?.name || 'uploaded document'}`
              : `AI-extracted rules from ${analysisData.documentSummary.contractType}`
            }
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Eye className="h-4 w-4 mr-2" />
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
          <button className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Export Rules
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Rules Extracted</p>
              <p className="text-2xl font-bold text-gray-900">{analysisData.summary.totalRulesExtracted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Confidence</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(analysisData.summary.confidenceScore * 100)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Summary */}
      {showDetails && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Contract Type</p>
              <p className="text-gray-900">{analysisData.documentSummary.contractType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Effective Date</p>
              <p className="text-gray-900">{analysisData.documentSummary.effectiveDate}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Parties</p>
              <p className="text-gray-900">{analysisData.documentSummary.parties.join(', ')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Contract Value</p>
              <p className="text-gray-900">{analysisData.extractedData.contractValue}</p>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Rules by Category</h3>
          <Filter className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium border ${
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-800 border-blue-200'
                : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
            }`}
          >
            All ({analysisData.extractedRules.length})
          </button>
          {categories.map(category => {
            const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || Settings;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center ${
                  selectedCategory === category
                    ? categoryColors[category as keyof typeof categoryColors]
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                }`}
              >
                <IconComponent className="h-3 w-3 mr-1" />
                {category} ({categoryStats[category]})
              </button>
            );
          })}
        </div>

        {/* Rules List */}
        <div className="space-y-4">
          {filteredRules.map(rule => {
            const IconComponent = categoryIcons[rule.category as keyof typeof categoryIcons] || Settings;
            const isExpanded = expandedRules.has(rule.id);
            
            return (
              <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                <div 
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleRuleExpansion(rule.id)}
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`p-2 rounded-lg ${categoryColors[rule.category as keyof typeof categoryColors]}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                        <Badge className={`text-xs ${getConfidenceColor(rule.confidence)}`}>
                          {Math.round(rule.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      <p className="text-gray-600 text-sm">{rule.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Condition</p>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{rule.condition}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Action</p>
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{rule.action}</p>
                    </div>
                    {rule.consequence && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Consequence</p>
                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{rule.consequence}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Business Value</p>
                      <p className="text-sm text-green-700 bg-green-50 p-2 rounded">{rule.businessValue}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Source Text</p>
                      <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded italic">"{rule.sourceText}"</p>
                    </div>
                    {Object.keys(rule.parameters).length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Parameters</p>
                        <div className="bg-gray-50 p-2 rounded">
                          {Object.entries(rule.parameters).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="font-medium text-gray-600">{key}:</span>
                              <span className="text-gray-900">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk Factors */}
      {analysisData.riskFactors.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            Risk Factors
          </h3>
          <div className="space-y-2">
            {analysisData.riskFactors.map((risk, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <p className="text-sm text-gray-700">{risk}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};