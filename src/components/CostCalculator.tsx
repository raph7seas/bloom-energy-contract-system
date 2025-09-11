import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { 
  Calculator, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Zap, 
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  Lightbulb
} from 'lucide-react';

const CostCalculator = () => {
  // State management
  const [providers, setProviders] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [inputTokens, setInputTokens] = useState(1000);
  const [outputTokens, setOutputTokens] = useState(500);
  const [textLength, setTextLength] = useState(3000);
  const [comparison, setComparison] = useState(null);
  const [monthlyProjection, setMonthlyProjection] = useState(null);
  const [efficiency, setEfficiency] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Configuration state
  const [usagePattern, setUsagePattern] = useState({
    requestsPerDay: 100,
    averageInputTokens: 1000,
    averageOutputTokens: 500,
    workingDaysPerMonth: 22
  });
  
  const [filters, setFilters] = useState({
    provider: '',
    capability: '',
    speed: '',
    quality: '',
    reasoning: null,
    beta: false,
    maxCost: null
  });

  const [activeTab, setActiveTab] = useState('compare');
  const [autoCalculate, setAutoCalculate] = useState(true);

  // Fetch providers and models on component mount
  useEffect(() => {
    fetchProvidersAndModels();
  }, []);

  // Auto-calculate when relevant values change
  useEffect(() => {
    if (autoCalculate && selectedModels.length > 0) {
      calculateCosts();
    }
  }, [inputTokens, outputTokens, selectedModels, autoCalculate]);

  // Auto-estimate tokens from text length
  useEffect(() => {
    // Rough estimation: ~4 characters per token
    const estimatedTokens = Math.ceil(textLength / 4);
    setInputTokens(estimatedTokens);
    setOutputTokens(Math.ceil(estimatedTokens * 0.3)); // 30% output ratio
  }, [textLength]);

  const fetchProvidersAndModels = async () => {
    try {
      setLoading(true);
      
      const [providersRes, modelsRes] = await Promise.all([
        fetch('/api/ai/providers'),
        fetch('/api/ai/models')
      ]);
      
      if (!providersRes.ok || !modelsRes.ok) {
        throw new Error('Failed to fetch providers or models');
      }
      
      const providersData = await providersRes.json();
      const modelsData = await modelsRes.json();
      
      setProviders(providersData.providers);
      setModels(modelsData.models);
      
      // Auto-select some popular models for comparison
      const popularModels = modelsData.models
        .filter(m => ['gpt-4o', 'claude-3-5-sonnet-20241022', 'gpt-4o-mini', 'claude-3-5-haiku-20241022'].includes(m.id))
        .slice(0, 4)
        .map(m => `${m.providerId}:${m.id}`);
      
      setSelectedModels(popularModels);
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateCosts = useCallback(async () => {
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
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedModels, inputTokens, outputTokens]);

  const calculateMonthly = async (modelId) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/ai/costs/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          usage: usagePattern
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to calculate monthly projection');
      }
      
      const data = await response.json();
      setMonthlyProjection(data.projection);
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeEfficiency = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/ai/costs/efficiency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelIds: selectedModels,
          useCases: {
            quickChat: { input: 200, output: 150, priority: 'speed' },
            contractAnalysis: { input: 2000, output: 1000, priority: 'quality' },
            optimization: { input: 1500, output: 800, priority: 'balance' },
            longDocument: { input: 10000, output: 2000, priority: 'cost' }
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze efficiency');
      }
      
      const data = await response.json();
      setEfficiency(data.analysis);
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleModelToggle = (modelKey, isSelected) => {
    if (isSelected) {
      setSelectedModels(prev => [...prev, modelKey]);
    } else {
      setSelectedModels(prev => prev.filter(m => m !== modelKey));
    }
  };

  const filteredModels = models.filter(model => {
    if (filters.provider && model.providerId !== filters.provider) return false;
    if (filters.capability && !model.capabilities.includes(filters.capability)) return false;
    if (filters.speed && model.speed !== filters.speed) return false;
    if (filters.quality && model.quality !== filters.quality) return false;
    if (filters.reasoning !== null && Boolean(model.reasoning) !== filters.reasoning) return false;
    if (filters.beta && !model.beta) return false;
    if (filters.maxCost && Math.max(model.pricing.input, model.pricing.output) > filters.maxCost) return false;
    return true;
  });

  const formatCurrency = (amount) => {
    if (amount < 0.001) return `$${(amount * 1000000).toFixed(2)}M`;
    if (amount < 1) return `$${(amount * 1000).toFixed(2)}K`;
    return `$${amount.toFixed(4)}`;
  };

  const getQualityColor = (quality) => {
    const colors = {
      exceptional: 'bg-purple-100 text-purple-800',
      outstanding: 'bg-blue-100 text-blue-800',
      excellent: 'bg-green-100 text-green-800',
      very_good: 'bg-yellow-100 text-yellow-800',
      good: 'bg-gray-100 text-gray-800'
    };
    return colors[quality] || colors.good;
  };

  const getSpeedColor = (speed) => {
    const colors = {
      very_fast: 'bg-green-100 text-green-800',
      fast: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      slow: 'bg-red-100 text-red-800'
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
            <div className="flex items-center space-x-2">
              <Label htmlFor="auto-calculate" className="text-sm">Auto-calculate</Label>
              <Switch 
                id="auto-calculate"
                checked={autoCalculate}
                onCheckedChange={setAutoCalculate}
              />
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="text-length">Text Length (characters)</Label>
              <Input
                id="text-length"
                type="number"
                value={textLength}
                onChange={(e) => setTextLength(parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
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
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{providers.length} providers</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4 text-blue-500" />
              <span>{models.length} models</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>{selectedModels.length} selected</span>
            </div>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compare">Cost Comparison</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Projection</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency Analysis</TabsTrigger>
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
                            <Badge variant="outline">{comp.provider}</Badge>
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

                {/* Recommendations */}
                {comparison.recommendations && comparison.recommendations.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 flex items-center">
                      <Lightbulb className="h-4 w-4 mr-1 text-yellow-500" />
                      Recommendations
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {comparison.recommendations.map((rec, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded-lg">
                          <div className="font-medium text-blue-800">{rec.title}</div>
                          <div className="text-sm text-blue-600 mt-1">{rec.reason}</div>
                          <div className="text-xs text-blue-500 mt-1">
                            {rec.models.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Monthly Projection Tab */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Usage Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Requests per day: {usagePattern.requestsPerDay}</Label>
                    <Slider
                      value={[usagePattern.requestsPerDay]}
                      onValueChange={([value]) => setUsagePattern(prev => ({ ...prev, requestsPerDay: value }))}
                      max={1000}
                      min={1}
                      step={10}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Working days per month: {usagePattern.workingDaysPerMonth}</Label>
                    <Slider
                      value={[usagePattern.workingDaysPerMonth]}
                      onValueChange={([value]) => setUsagePattern(prev => ({ ...prev, workingDaysPerMonth: value }))}
                      max={31}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Average input tokens: {usagePattern.averageInputTokens}</Label>
                    <Slider
                      value={[usagePattern.averageInputTokens]}
                      onValueChange={([value]) => setUsagePattern(prev => ({ ...prev, averageInputTokens: value }))}
                      max={10000}
                      min={100}
                      step={100}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Average output tokens: {usagePattern.averageOutputTokens}</Label>
                    <Slider
                      value={[usagePattern.averageOutputTokens]}
                      onValueChange={([value]) => setUsagePattern(prev => ({ ...prev, averageOutputTokens: value }))}
                      max={5000}
                      min={50}
                      step={50}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-3">Calculate for Model:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {selectedModels.slice(0, 4).map(modelKey => {
                    const model = models.find(m => `${m.providerId}:${m.id}` === modelKey);
                    if (!model) return null;
                    return (
                      <Button
                        key={modelKey}
                        onClick={() => calculateMonthly(modelKey)}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                      >
                        <TrendingUp className="h-4 w-4 mr-1" />
                        {model.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {monthlyProjection && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Projection: {monthlyProjection.modelName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Daily Usage</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Requests:</span>
                        <span className="font-medium">{monthlyProjection.daily.requests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tokens:</span>
                        <span className="font-medium">{monthlyProjection.daily.tokens.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cost:</span>
                        <span className="font-medium">{formatCurrency(monthlyProjection.daily.cost)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium">Monthly Total</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Requests:</span>
                        <span className="font-medium">{monthlyProjection.monthly.requests.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tokens:</span>
                        <span className="font-medium">{monthlyProjection.monthly.tokens.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cost:</span>
                        <span className="font-bold text-lg">{formatCurrency(monthlyProjection.monthly.cost)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium">Cost Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Per Request:</span>
                        <span className="font-medium">{formatCurrency(monthlyProjection.costBreakdown.perRequest)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Per Token:</span>
                        <span className="font-medium">{formatCurrency(monthlyProjection.costBreakdown.perToken)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Per Day:</span>
                        <span className="font-medium">{formatCurrency(monthlyProjection.costBreakdown.perDay)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Efficiency Analysis Tab */}
        <TabsContent value="efficiency" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Efficiency Analysis</CardTitle>
                <Button 
                  onClick={analyzeEfficiency} 
                  disabled={loading || selectedModels.length === 0}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analyze
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {efficiency && (
                <div className="space-y-6">
                  {Object.entries(efficiency.analysis).map(([useCase, data]) => (
                    <div key={useCase} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium capitalize">
                          {useCase.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <Badge>{data.scenario.priority} priority</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 p-3 rounded">
                          <div className="font-medium text-green-800">Recommended</div>
                          <div className="text-sm text-green-600">
                            {data.recommended.modelName}
                          </div>
                          <div className="text-xs text-green-500">
                            Score: {data.recommended.efficiency.score}/10
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="font-medium text-sm">Alternatives</div>
                          {data.alternatives.map((alt, index) => (
                            <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                              <div>{alt.modelName}</div>
                              <div className="text-xs text-gray-500">
                                Score: {alt.efficiency.score}/10
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="font-medium text-sm">Scenario</div>
                          <div className="text-xs space-y-1">
                            <div>Input: {data.scenario.input} tokens</div>
                            <div>Output: {data.scenario.output} tokens</div>
                            <div>Priority: {data.scenario.priority}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Model Selection Tab */}
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Selection & Filters</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <Label>Provider</Label>
                  <Select value={filters.provider} onValueChange={(value) => setFilters(prev => ({ ...prev, provider: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All providers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All providers</SelectItem>
                      {providers.map(provider => (
                        <SelectItem key={provider.name} value={provider.name}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Speed</Label>
                  <Select value={filters.speed} onValueChange={(value) => setFilters(prev => ({ ...prev, speed: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any speed" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any speed</SelectItem>
                      <SelectItem value="very_fast">Very Fast</SelectItem>
                      <SelectItem value="fast">Fast</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="slow">Slow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Quality</Label>
                  <Select value={filters.quality} onValueChange={(value) => setFilters(prev => ({ ...prev, quality: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any quality</SelectItem>
                      <SelectItem value="exceptional">Exceptional</SelectItem>
                      <SelectItem value="outstanding">Outstanding</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="very_good">Very Good</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={filters.reasoning === true}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, reasoning: checked ? true : null }))}
                    />
                    <Label>Reasoning</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={filters.beta}
                      onCheckedChange={(checked) => setFilters(prev => ({ ...prev, beta: checked }))}
                    />
                    <Label>Beta</Label>
                  </div>
                </div>
              </div>

              {/* Model Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredModels.map(model => {
                  const modelKey = `${model.providerId}:${model.id}`;
                  const isSelected = selectedModels.includes(modelKey);
                  
                  return (
                    <div 
                      key={modelKey}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleModelToggle(modelKey, !isSelected)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{model.name}</h4>
                        <Badge variant="outline">{model.providerId}</Badge>
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
                          <Badge className={getSpeedColor(model.speed)} variant="secondary">
                            {model.speed.replace('_', ' ')}
                          </Badge>
                          <Badge className={getQualityColor(model.quality)} variant="secondary">
                            {model.quality.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="flex space-x-1">
                          {model.reasoning && (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Reasoning
                            </Badge>
                          )}
                          {model.beta && (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              Beta
                            </Badge>
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

export default CostCalculator;