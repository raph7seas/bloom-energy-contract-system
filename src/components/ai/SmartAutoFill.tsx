import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Wand2, 
  MessageSquare, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ContractFormData } from '../../types';
import { aiOptimizationService } from '../../services/aiOptimizationService';

interface SmartAutoFillProps {
  contractData: Partial<ContractFormData>;
  onAutoFillSuggestions: (suggestions: Partial<ContractFormData>) => void;
  onApplyAllSuggestions?: () => void;
}

interface ParsedSuggestion {
  field: keyof ContractFormData;
  value: any;
  confidence: number;
  reasoning: string;
  fieldLabel: string;
}

export const SmartAutoFill: React.FC<SmartAutoFillProps> = ({
  contractData,
  onAutoFillSuggestions,
  onApplyAllSuggestions
}) => {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [suggestions, setSuggestions] = useState<ParsedSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingMode, setProcessingMode] = useState<'nlp' | 'pattern'>('nlp');

  const fieldLabels: Record<keyof ContractFormData, string> = {
    customerName: 'Customer Name',
    industry: 'Industry',
    siteLocation: 'Site Location',
    ratedCapacity: 'Rated Capacity (kW)',
    systemType: 'System Type',
    contractTerm: 'Contract Term (Years)',
    baseRate: 'Base Rate ($/kWh)',
    annualEscalation: 'Annual Escalation (%)',
    guaranteedCriticalOutput: 'Guaranteed Critical Output (kW)',
    minimumDemand: 'Minimum Demand (kW)',
    maximumDemand: 'Maximum Demand (kW)',
    outputWarranty: 'Output Warranty (%)',
    efficiencyTarget: 'Efficiency Target (%)',
    voltage: 'Voltage Level',
    servers: 'Number of Servers',
    components: 'System Components',
    installationType: 'Installation Type',
    reliabilityLevel: 'Reliability Level',
    effectiveDate: 'Effective Date',
    executionDate: 'Execution Date'
  } as const;

  const processNaturalLanguageInput = async () => {
    if (!naturalLanguageInput.trim()) return;

    setLoading(true);
    try {
      // First, try to extract structured data from natural language
      const extractedData = await extractDataFromNaturalLanguage(naturalLanguageInput);
      
      // Then get AI suggestions based on the extracted data
      const autoFillSuggestions = await aiOptimizationService.autoFillSuggestions({
        ...contractData,
        ...extractedData
      });

      // Convert to suggestions format
      const parsedSuggestions = Object.entries(autoFillSuggestions)
        .map(([field, value]) => ({
          field: field as keyof ContractFormData,
          value,
          confidence: calculateConfidence(field, value, naturalLanguageInput),
          reasoning: generateReasoning(field, value, naturalLanguageInput),
          fieldLabel: fieldLabels[field as keyof ContractFormData] || field
        }))
        .filter(s => s.confidence > 0.5)
        .sort((a, b) => b.confidence - a.confidence);

      setSuggestions(parsedSuggestions);
      
      // Apply high-confidence suggestions automatically
      const highConfidenceSuggestions = parsedSuggestions
        .filter(s => s.confidence > 0.8)
        .reduce((acc, s) => ({
          ...acc,
          [s.field]: s.value
        }), {});

      if (Object.keys(highConfidenceSuggestions).length > 0) {
        onAutoFillSuggestions(highConfidenceSuggestions);
      }

    } catch (error) {
      console.error('NLP processing failed:', error);
      // Fallback to pattern-based suggestions
      await processPatternBasedSuggestions();
    } finally {
      setLoading(false);
    }
  };

  const processPatternBasedSuggestions = async () => {
    setLoading(true);
    try {
      const autoFillSuggestions = await aiOptimizationService.autoFillSuggestions(contractData);
      
      const parsedSuggestions = Object.entries(autoFillSuggestions)
        .map(([field, value]) => ({
          field: field as keyof ContractFormData,
          value,
          confidence: 0.7,
          reasoning: 'Based on learned patterns from similar contracts',
          fieldLabel: fieldLabels[field as keyof ContractFormData] || field
        }));

      setSuggestions(parsedSuggestions);
      
    } catch (error) {
      console.error('Pattern-based suggestions failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractDataFromNaturalLanguage = async (text: string): Promise<Partial<ContractFormData>> => {
    const extracted: Partial<ContractFormData> = {};

    // Simple NLP patterns - in production, this would use a proper NLP service
    const patterns = {
      customerName: /(?:customer|client|company)(?:\s+(?:is|name))?\s*:?\s*([A-Za-z\s&.,]+?)(?:\n|\.|\s+(?:located|industry|capacity))/gi,
      industry: /(?:industry|sector|business)(?:\s+(?:is|type))?\s*:?\s*([A-Za-z\s&.,]+?)(?:\n|\.|\s+(?:located|capacity|customer))/gi,
      siteLocation: /(?:location|site|address)(?:\s+(?:is|at))?\s*:?\s*([A-Za-z\s,.\d]+?)(?:\n|\.|\s+(?:capacity|customer|industry))/gi,
      ratedCapacity: /(?:capacity|power|kw)(?:\s+(?:is|of))?\s*:?\s*(\d+(?:\.\d+)?)\s*(?:kw|kilowatt)/gi,
      contractTerm: /(?:term|duration|years?)(?:\s+(?:is|of))?\s*:?\s*(\d+)\s*(?:years?|yr)/gi,
      baseRate: /(?:rate|price|cost)(?:\s+(?:is|of))?\s*:?\s*\$?(\d+(?:\.\d+)?)\s*(?:\/kwh|per\s*kwh|cents?)/gi,
      systemType: /(?:system|type)(?:\s+(?:is|of))?\s*:?\s*(MG|PP|AMG|OG|microgrid|power\s*plant)/gi,
      voltage: /(?:voltage|volt)(?:\s+(?:is|of))?\s*:?\s*(\d+(?:\.\d+)?)\s*(?:v|volt|kv)/gi
    };

    for (const [field, pattern] of Object.entries(patterns)) {
      const match = pattern.exec(text);
      if (match && match[1]) {
        let value = match[1].trim();
        
        // Process specific field types
        switch (field) {
          case 'ratedCapacity':
            extracted[field] = parseFloat(value);
            break;
          case 'contractTerm':
            extracted[field] = parseInt(value);
            break;
          case 'baseRate':
            // Convert cents to dollars if necessary
            const rate = parseFloat(value);
            extracted[field] = rate > 1 ? rate / 100 : rate;
            break;
          case 'systemType':
            const systemMap: Record<string, string> = {
              'microgrid': 'MG',
              'power plant': 'PP',
              'mg': 'MG',
              'pp': 'PP',
              'amg': 'AMG',
              'og': 'OG'
            };
            extracted[field] = systemMap[value.toLowerCase()] || value.toUpperCase();
            break;
          case 'voltage':
            const voltageVal = parseFloat(value);
            if (voltageVal < 1000) {
              extracted[field] = `${voltageVal}V`;
            } else {
              extracted[field] = `${voltageVal / 1000}kV`;
            }
            break;
          default:
            extracted[field as keyof ContractFormData] = value;
        }
      }
    }

    return extracted;
  };

  const calculateConfidence = (field: string, value: any, input: string): number => {
    let confidence = 0.6;

    // Increase confidence based on explicit mentions
    const fieldMentions = (input.match(new RegExp(field, 'gi')) || []).length;
    confidence += fieldMentions * 0.1;

    // Increase confidence for numerical fields with proper units
    if (['ratedCapacity', 'contractTerm', 'baseRate'].includes(field)) {
      if (typeof value === 'number' && value > 0) {
        confidence += 0.2;
      }
    }

    // Increase confidence for industry-specific terms
    if (field === 'industry') {
      const industryTerms = ['healthcare', 'manufacturing', 'data center', 'retail', 'education'];
      if (industryTerms.some(term => input.toLowerCase().includes(term))) {
        confidence += 0.2;
      }
    }

    return Math.min(0.95, confidence);
  };

  const generateReasoning = (field: string, value: any, input: string): string => {
    if (input.toLowerCase().includes(field.toLowerCase()) || 
        input.toLowerCase().includes(fieldLabels[field as keyof ContractFormData]?.toLowerCase() || '')) {
      return `Extracted directly from input text mentioning "${field}"`;
    }
    return 'Inferred from context and similar contract patterns';
  };

  const applySuggestion = (suggestion: ParsedSuggestion) => {
    onAutoFillSuggestions({ [suggestion.field]: suggestion.value });
    setSuggestions(prev => prev.filter(s => s.field !== suggestion.field));
  };

  const applyAllHighConfidenceSuggestions = () => {
    const highConfidenceSuggestions = suggestions
      .filter(s => s.confidence > 0.7)
      .reduce((acc, s) => ({
        ...acc,
        [s.field]: s.value
      }), {});

    onAutoFillSuggestions(highConfidenceSuggestions);
    setSuggestions(prev => prev.filter(s => s.confidence <= 0.7));
    onApplyAllSuggestions?.();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence > 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence > 0.8) return 'High';
    if (confidence > 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-purple-600" />
          Smart Auto-Fill
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant={processingMode === 'nlp' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setProcessingMode('nlp')}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Natural Language
          </Button>
          <Button
            variant={processingMode === 'pattern' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setProcessingMode('pattern')}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Pattern Based
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {processingMode === 'nlp' ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Describe your contract requirements in plain English:
              </label>
              <Textarea
                placeholder="Example: Healthcare client MedCenter needs a 975kW microgrid system for 15 years at their Chicago facility. Base rate should be around $0.095/kWh with 2.5% annual escalation."
                value={naturalLanguageInput}
                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            <Button 
              onClick={processNaturalLanguageInput}
              disabled={loading || !naturalLanguageInput.trim()}
              className="w-full"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Processing...' : 'Process & Auto-Fill'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                Get auto-fill suggestions based on learned patterns from similar contracts.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={processPatternBasedSuggestions}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Analyzing...' : 'Get Smart Suggestions'}
            </Button>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Suggested Auto-Fill Values</h4>
              {suggestions.filter(s => s.confidence > 0.7).length > 0 && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={applyAllHighConfidenceSuggestions}
                >
                  Apply All High Confidence
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <Card key={`${suggestion.field}-${index}`} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{suggestion.fieldLabel}</span>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getConfidenceColor(suggestion.confidence))}
                        >
                          {getConfidenceLabel(suggestion.confidence)} 
                          ({Math.round(suggestion.confidence * 100)}%)
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <span>Suggested: <strong>{String(suggestion.value)}</strong></span>
                      </div>
                      
                      <p className="text-xs text-gray-500">
                        {suggestion.reasoning}
                      </p>
                    </div>
                    
                    <Button 
                      size="sm" 
                      onClick={() => applySuggestion(suggestion)}
                      className="ml-3"
                    >
                      Apply
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!loading && suggestions.length === 0 && naturalLanguageInput.trim() && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No suggestions found. Try providing more specific contract details or use pattern-based suggestions.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartAutoFill;