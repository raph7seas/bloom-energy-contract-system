import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Calculator, 
  TrendingUp, 
  BarChart3,
  RefreshCw,
  AlertCircle,
  Lightbulb
} from 'lucide-react';

interface Provider {
  name: string;
  configured: boolean;
  modelCount: number;
  health: string;
}

interface Model {
  id: string;
  name: string;
  providerId: string;
  pricing: {
    input: number;
    output: number;
  };
  contextLength: number;
  capabilities: string[];
  speed: string;
  quality: string;
  reasoning?: boolean;
  beta?: boolean;
  isAvailable: boolean;
}

interface CostComparison {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  comparisons: Array<{
    modelId: string;
    modelName: string;
    provider: string;
    costs: {
      input: number;
      output: number;
      total: number;
      perToken: number;
    };
  }>;
  analysis: {
    cheapest: {
      model: string;
      provider: string;
      cost: number;
    };
    mostExpensive: {
      model: string;
      provider: string;
      cost: number;
    };
    savings: {
      amount: number;
      percentage: number;
    };
  };
}

const SimpleCostCalculator: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [inputTokens, setInputTokens] = useState<number>(1000);
  const [outputTokens, setOutputTokens] = useState<number>(500);
  const [comparison, setComparison] = useState<CostComparison | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('compare');

  // Fetch providers and models on component mount
  useEffect(() => {
    fetchProvidersAndModels();
  }, []);

  const fetchProvidersAndModels = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const [providersRes, modelsRes] = await Promise.all([
        fetch('/api/ai/providers'),
        fetch('/api/ai/models')
      ]);
      
      if (!providersRes.ok || !modelsRes.ok) {
        throw new Error('Failed to fetch providers or models');
      }
      
      const providersData = await providersRes.json();
      const modelsData = await modelsRes.json();
      
      setProviders(providersData.providers || []);
      setModels(modelsData.models || []);
      
      // Auto-select some popular models for comparison
      const popularModels = (modelsData.models || [])
        .filter((m: Model) => ['gpt-4o', 'claude-3-5-sonnet-20241022', 'gpt-4o-mini', 'claude-3-5-haiku-20241022'].includes(m.id))
        .slice(0, 4)
        .map((m: Model) => `${m.providerId}:${m.id}`);
      
      setSelectedModels(popularModels);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateCosts = async (): Promise<void> => {
    if (selectedModels.length === 0) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/ai/costs/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelIds: selectedModels,
          inputTokens,
          outputTokens
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to calculate costs');
      }
      
      const data = await response.json();
      setComparison(data.comparison);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleModelToggle = (modelKey: string): void => {
    setSelectedModels(prev => {
      const isSelected = prev.includes(modelKey);
      if (isSelected) {
        return prev.filter(m => m !== modelKey);
      } else {
        return [...prev, modelKey];
      }
    });
  };

  const formatCurrency = (amount: number): string => {
    if (amount < 0.001) return `$${(amount * 1000000).toFixed(2)}M`;
    if (amount < 1) return `$${(amount * 1000).toFixed(2)}K`;
    return `$${amount.toFixed(4)}`;
  };

  const getQualityColor = (quality: string): string => {
    const colors: Record<string, string> = {
      exceptional: 'bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs',
      outstanding: 'bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs',
      excellent: 'bg-green-100 text-green-800 px-2 py-1 rounded text-xs',
      very_good: 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs',
      good: 'bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs'
    };
    return colors[quality] || colors.good;
  };

  const getSpeedColor = (speed: string): string => {
    const colors: Record<string, string> = {
      very_fast: 'bg-green-100 text-green-800 px-2 py-1 rounded text-xs',
      fast: 'bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs',
      medium: 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs',
      slow: 'bg-red-100 text-red-800 px-2 py-1 rounded text-xs'
    };
    return colors[speed] || colors.medium;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calculator className="h-6 w-6 text-blue-600" />
              <CardTitle>AI Model Cost Calculator</CardTitle>
            </div>
            <Button 
              onClick={fetchProvidersAndModels} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="input-tokens">Input Tokens</Label>
              <Input
                id="input-tokens"
                type="number"
                value={inputTokens}
                onChange={(e) => setInputTokens(parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="output-tokens">Output Tokens</Label>
              <Input
                id="output-tokens"
                type="number"
                value={outputTokens}
                onChange={(e) => setOutputTokens(parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Selected Models</Label>
              <div className="text-sm text-gray-600">
                {selectedModels.length} of {models.length} models
              </div>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={calculateCosts} 
                disabled={loading || selectedModels.length === 0}
                className="w-full"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate
              </Button>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>📊 {providers.length} providers</span>
            <span>🤖 {models.length} models</span>
            <span>⚡ {selectedModels.length} selected</span>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main calculator tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="compare">Cost Comparison</TabsTrigger>
          <TabsTrigger value="models">Model Selection</TabsTrigger>
        </TabsList>

        {/* Cost Comparison Tab */}
        <TabsContent value="compare" className="space-y-4">
          {comparison && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Cost Comparison Results</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(comparison.analysis.cheapest.cost)}
                    </div>
                    <div className="text-sm text-gray-600">Cheapest</div>
                    <div className="text-xs text-gray-500">{comparison.analysis.cheapest.model}</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(comparison.analysis.mostExpensive.cost)}
                    </div>
                    <div className="text-sm text-gray-600">Most Expensive</div>
                    <div className="text-xs text-gray-500">{comparison.analysis.mostExpensive.model}</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {comparison.analysis.savings.percentage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Max Savings</div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(comparison.analysis.savings.amount)} saved
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Model</th>
                        <th className="text-left p-2">Provider</th>
                        <th className="text-right p-2">Input Cost</th>
                        <th className="text-right p-2">Output Cost</th>
                        <th className="text-right p-2">Total Cost</th>
                        <th className="text-right p-2">Per Token</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.comparisons.map((comp, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{comp.modelName}</td>
                          <td className="p-2">
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">{comp.provider}</span>
                          </td>
                          <td className="p-2 text-right">{formatCurrency(comp.costs.input)}</td>
                          <td className="p-2 text-right">{formatCurrency(comp.costs.output)}</td>
                          <td className="p-2 text-right font-bold">{formatCurrency(comp.costs.total)}</td>
                          <td className="p-2 text-right text-gray-600">
                            {formatCurrency(comp.costs.perToken)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Quick recommendation */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Lightbulb className="h-4 w-4 mr-1 text-blue-500" />
                    <span className="font-medium text-blue-800">Recommendation</span>
                  </div>
                  <p className="text-sm text-blue-600">
                    For this usage pattern, <strong>{comparison.analysis.cheapest.model}</strong> offers the best value 
                    at {formatCurrency(comparison.analysis.cheapest.cost)} per request, 
                    saving {comparison.analysis.savings.percentage.toFixed(1)}% compared to the most expensive option.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Model Selection Tab */}
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Models</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {models.map(model => {
                  const modelKey = `${model.providerId}:${model.id}`;
                  const isSelected = selectedModels.includes(modelKey);
                  
                  return (
                    <div 
                      key={modelKey}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleModelToggle(modelKey)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{model.name}</h4>
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">{model.providerId}</span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Input:</span>
                          <span>${model.pricing.input}/M tokens</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Output:</span>
                          <span>${model.pricing.output}/M tokens</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex space-x-1">
                          <span className={getSpeedColor(model.speed)}>
                            {model.speed.replace('_', ' ')}
                          </span>
                          <span className={getQualityColor(model.quality)}>
                            {model.quality.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="flex space-x-1 text-xs">
                          {model.reasoning && (
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
                              🧠 Reasoning
                            </span>
                          )}
                          {model.beta && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              🚧 Beta
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500">
                        Context: {model.contextLength.toLocaleString()} tokens
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SimpleCostCalculator;