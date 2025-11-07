import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Zap, 
  DollarSign, 
  Target,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  BarChart3,
  Shield
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ContractFormData } from '../../types';
import { 
  aiOptimizationService, 
  OptimizationSuggestion, 
  ContractAnalysis 
} from '../../services/aiOptimizationService';

interface ContractOptimizerProps {
  contractData: ContractFormData;
  onApplySuggestion: (field: keyof ContractFormData, value: any) => void;
  onAnalysisComplete?: (analysis: ContractAnalysis) => void;
}

export const ContractOptimizer: React.FC<ContractOptimizerProps> = ({
  contractData,
  onApplySuggestion,
  onAnalysisComplete
}) => {
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'suggestions' | 'benchmarks'>('overview');
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isContractDataComplete(contractData)) {
      analyzeContract();
    }
  }, [contractData]);

  const analyzeContract = async () => {
    setLoading(true);
    try {
      const result = await aiOptimizationService.analyzeContract(contractData);
      setAnalysis(result);
      onAnalysisComplete?.(result);
    } catch (error) {
      console.error('Contract analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = (suggestion: OptimizationSuggestion) => {
    const fieldMap: Record<string, keyof ContractFormData> = {
      'fin_rate_high': 'baseRate',
      'sys_capacity_align': 'ratedCapacity',
      'op_critical_realistic': 'guaranteedCriticalOutput',
      'rate_industry_avg': 'baseRate'
    };

    const field = fieldMap[suggestion.id];
    if (field) {
      onApplySuggestion(field, suggestion.suggestedValue);
      setAppliedSuggestions(prev => new Set([...prev, suggestion.id]));
    }
  };

  const getPriorityColor = (priority: OptimizationSuggestion['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getPriorityIcon = (priority: OptimizationSuggestion['priority']) => {
    switch (priority) {
      case 'high': return AlertTriangle;
      case 'medium': return Target;
      case 'low': return Lightbulb;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const isContractDataComplete = (data: ContractFormData): boolean => {
    return !!(data.customerName && data.ratedCapacity && data.baseRate && data.contractTerm);
  };

  if (!isContractDataComplete(contractData)) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI Contract Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              Complete the basic contract information to enable AI optimization analysis.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI Contract Optimizer
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={analyzeContract}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {loading ? 'Analyzing...' : 'Refresh Analysis'}
          </Button>
        </div>
        
        {analysis && (
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Contract Score:</span>
              <span className={cn("text-lg font-bold", getScoreColor(analysis.overallScore))}>
                {analysis.overallScore}/100
              </span>
            </div>
            <Progress value={analysis.overallScore} className="flex-1" />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-gray-600">Analyzing contract with AI...</p>
            </div>
          </div>
        ) : analysis ? (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="flex items-center gap-1">
                <Lightbulb className="h-4 w-4" />
                Suggestions ({analysis.suggestions.length})
              </TabsTrigger>
              <TabsTrigger value="benchmarks" className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Benchmarks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Optimization Potential</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {analysis.optimizationPotential}%
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Market Position</p>
                        <p className="text-2xl font-bold text-green-600">
                          {analysis.marketComparison.percentile}th
                        </p>
                        <p className="text-xs text-gray-500">percentile</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {analysis.strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Contract Strengths
                  </h4>
                  <ul className="space-y-1">
                    {analysis.strengths.map((strength, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.risks.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    Potential Risks
                  </h4>
                  <ul className="space-y-1">
                    {analysis.risks.map((risk, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-4 mt-4">
              {analysis.suggestions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Contract Looks Great!</h3>
                  <p className="text-gray-600">No optimization suggestions at this time.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analysis.suggestions.map((suggestion) => {
                    const PriorityIcon = getPriorityIcon(suggestion.priority);
                    const isApplied = appliedSuggestions.has(suggestion.id);
                    
                    return (
                      <Card key={suggestion.id} className={cn(
                        "transition-all duration-200",
                        isApplied ? "bg-green-50 border-green-200" : "hover:shadow-md"
                      )}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <PriorityIcon className="h-4 w-4" />
                                <h4 className="font-semibold">{suggestion.title}</h4>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs", getPriorityColor(suggestion.priority))}
                                >
                                  {suggestion.priority}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-gray-700 mb-3">
                                {suggestion.description}
                              </p>
                              
                              <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                                <span>Current: <strong>{suggestion.currentValue}</strong></span>
                                <ArrowRight className="h-3 w-3" />
                                <span>Suggested: <strong>{suggestion.suggestedValue}</strong></span>
                              </div>
                              
                              <div className="space-y-2">
                                <p className="text-sm text-blue-700 font-medium">
                                  Impact: {suggestion.impact}
                                </p>
                                <p className="text-xs text-gray-600">
                                  Reasoning: {suggestion.reasoning}
                                </p>
                                {suggestion.potentialSavings && (
                                  <p className="text-sm text-green-700 font-medium">
                                    Potential Savings: ${suggestion.potentialSavings.toLocaleString()}/year
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="ml-4 text-right">
                              <div className="text-xs text-gray-500 mb-2">
                                Confidence: {Math.round(suggestion.confidence * 100)}%
                              </div>
                              {!isApplied ? (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleApplySuggestion(suggestion)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Apply
                                </Button>
                              ) : (
                                <div className="flex items-center gap-1 text-green-600 text-sm">
                                  <CheckCircle className="h-4 w-4" />
                                  Applied
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="benchmarks" className="space-y-4 mt-4">
              <div className="text-center py-4">
                <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="text-lg font-semibold">Market Benchmarks</h3>
                <p className="text-sm text-gray-600">
                  Your contract compared to industry standards
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Performance Ranking</h4>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {analysis.marketComparison.percentile}th
                      </div>
                      <div className="text-sm text-gray-600">percentile</div>
                      <Badge className="mt-2">
                        {analysis.marketComparison.benchmark}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Improvement Potential</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Current Score:</span>
                        <span className={getScoreColor(analysis.overallScore)}>
                          {analysis.overallScore}/100
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Optimization Potential:</span>
                        <span className="text-blue-600 font-medium">
                          +{analysis.optimizationPotential}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Click "Refresh Analysis" to get AI-powered optimization suggestions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractOptimizer;