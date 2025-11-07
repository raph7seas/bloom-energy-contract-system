import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ContractOptimizer } from '../ai/ContractOptimizer';
import { SmartAutoFill } from '../ai/SmartAutoFill';
import { MLPatternDashboard } from '../ai/MLPatternDashboard';
import { ContractFormData, ValidationError } from '../../types';
import { ContractAnalysis } from '../../services/aiOptimizationService';
import { patternLearningService } from '../../services/patternLearningService';
import { Brain, Wand2, TrendingUp, Database } from 'lucide-react';

interface AIAssistantTabProps {
  formData: ContractFormData;
  validationErrors: ValidationError;
  onFieldChange: (field: keyof ContractFormData, value: any) => void;
}

export const AIAssistantTab: React.FC<AIAssistantTabProps> = ({
  formData,
  validationErrors,
  onFieldChange
}) => {
  const [activeAITab, setActiveAITab] = useState<'autofill' | 'optimizer' | 'patterns'>('autofill');
  const [contractAnalysis, setContractAnalysis] = useState<ContractAnalysis | null>(null);

  const handleAutoFillSuggestions = (suggestions: Partial<ContractFormData>) => {
    // Apply multiple field changes at once
    Object.entries(suggestions).forEach(([field, value]) => {
      onFieldChange(field as keyof ContractFormData, value);
    });
  };

  const handleOptimizationSuggestion = (field: keyof ContractFormData, value: any) => {
    onFieldChange(field, value);
  };

  const handleAnalysisComplete = (analysis: ContractAnalysis) => {
    setContractAnalysis(analysis);
  };

  const handleContractLearning = () => {
    // When a contract is completed, learn from it
    patternLearningService.learnFromContract(formData, {
      appliedSuggestions: ['rate_optimization', 'capacity_alignment'], // Example
      rejectedSuggestions: [],
      timeSpent: 1200, // 20 minutes
      errorCount: 0
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Brain className="h-8 w-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">AI Assistant</h2>
        </div>
        <p className="text-gray-600">
          Let our AI help you optimize your contract and auto-fill fields intelligently
        </p>
      </div>

      <Tabs value={activeAITab} onValueChange={(value) => setActiveAITab(value as any)}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="autofill" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Smart Auto-Fill
          </TabsTrigger>
          <TabsTrigger value="optimizer" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Contract Optimizer
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            ML Patterns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="autofill" className="mt-0">
          <SmartAutoFill
            contractData={formData}
            onAutoFillSuggestions={handleAutoFillSuggestions}
            onApplyAllSuggestions={() => {
              // Additional logic when all suggestions are applied
              console.log('All auto-fill suggestions applied');
            }}
          />
        </TabsContent>

        <TabsContent value="optimizer" className="mt-0">
          <ContractOptimizer
            contractData={formData}
            onApplySuggestion={handleOptimizationSuggestion}
            onAnalysisComplete={handleAnalysisComplete}
          />
        </TabsContent>

        <TabsContent value="patterns" className="mt-0">
          <MLPatternDashboard
            contractData={formData}
            onPatternApplied={onFieldChange}
          />
        </TabsContent>
      </Tabs>

      {/* Analysis Summary Card - shown when analysis is available */}
      {contractAnalysis && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">AI Analysis Summary</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {contractAnalysis.overallScore}/100
              </div>
              <div className="text-blue-700">Contract Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {contractAnalysis.optimizationPotential}%
              </div>
              <div className="text-green-700">Optimization Potential</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {contractAnalysis.suggestions.length}
              </div>
              <div className="text-purple-700">Active Suggestions</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantTab;