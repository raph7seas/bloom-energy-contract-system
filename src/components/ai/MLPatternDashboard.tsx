import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Switch } from '../ui/switch';
import {
  Brain,
  TrendingUp,
  BarChart3,
  Target,
  Zap,
  Database,
  Activity,
  Settings,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  GitBranch
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ContractFormData } from '../../types';
import {
  patternLearningService,
  ContractPattern,
  LearningModel,
  PredictionResult
} from '../../services/patternLearningService';

interface MLPatternDashboardProps {
  contractData?: Partial<ContractFormData>;
  onPatternApplied?: (field: keyof ContractFormData, value: any) => void;
}

export const MLPatternDashboard: React.FC<MLPatternDashboardProps> = ({
  contractData,
  onPatternApplied
}) => {
  const [insights, setInsights] = useState<any>(null);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'models' | 'predictions'>('overview');
  const [learningEnabled, setLearningEnabled] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (contractData && Object.keys(contractData).length > 2) {
      generatePredictions();
      detectAnomalies();
    }
  }, [contractData]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const dashboardInsights = patternLearningService.getPatternInsights();
      setInsights(dashboardInsights);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePredictions = async () => {
    if (!contractData) return;

    try {
      const fieldsToPredict: (keyof ContractFormData)[] = [
        'ratedCapacity',
        'baseRate',
        'contractTerm',
        'annualEscalation',
        'systemType'
      ];

      const results = await patternLearningService.predictValues(
        contractData,
        fieldsToPredict.filter(field => !contractData[field])
      );

      setPredictions(results);
    } catch (error) {
      console.error('Failed to generate predictions:', error);
    }
  };

  const detectAnomalies = async () => {
    if (!contractData || !contractData.customerName) return;

    try {
      const detectedAnomalies = await patternLearningService.detectAnomalies(contractData as ContractFormData);
      setAnomalies(detectedAnomalies);
    } catch (error) {
      console.error('Failed to detect anomalies:', error);
    }
  };

  const handleLearningToggle = (enabled: boolean) => {
    setLearningEnabled(enabled);
    patternLearningService.setLearningEnabled(enabled);
  };

  const handleExportPatterns = () => {
    const patterns = patternLearningService.exportPatterns();
    const blob = new Blob([JSON.stringify(patterns, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract_patterns_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportPatterns = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const patterns = JSON.parse(e.target?.result as string);
        patternLearningService.importPatterns(patterns);
        loadDashboardData();
      } catch (error) {
        console.error('Failed to import patterns:', error);
      }
    };
    reader.readAsText(file);
  };

  const applyPrediction = (prediction: PredictionResult) => {
    if (onPatternApplied) {
      onPatternApplied(prediction.field, prediction.predictedValue);
    }
  };

  const getModelStatusColor = (accuracy: number) => {
    if (accuracy >= 0.85) return 'text-green-600';
    if (accuracy >= 0.70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getModelStatusBadge = (accuracy: number) => {
    if (accuracy >= 0.85) return { label: 'Excellent', variant: 'default' as const };
    if (accuracy >= 0.70) return { label: 'Good', variant: 'secondary' as const };
    return { label: 'Needs Training', variant: 'destructive' as const };
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm text-gray-600">Loading ML insights...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            ML Pattern Learning Dashboard
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Learning:</span>
              <Switch
                checked={learningEnabled}
                onCheckedChange={handleLearningToggle}
              />
            </div>
            <Button variant="outline" size="sm" onClick={loadDashboardData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="patterns" className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              Patterns ({insights?.totalPatterns || 0})
            </TabsTrigger>
            <TabsTrigger value="models" className="flex items-center gap-1">
              <GitBranch className="h-4 w-4" />
              Models
            </TabsTrigger>
            <TabsTrigger value="predictions" className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              Predictions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {insights && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Patterns</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {insights.totalPatterns}
                          </p>
                        </div>
                        <Database className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Average Accuracy</p>
                          <p className="text-2xl font-bold text-green-600">
                            {Math.round(insights.learningStats.averageAccuracy * 100)}%
                          </p>
                        </div>
                        <Target className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Contracts Learned</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {insights.learningStats.totalContracts}
                          </p>
                        </div>
                        <Activity className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Pattern Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(insights.patternsByCategory).map(([category, count]) => (
                          <div key={category} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-purple-600 h-2 rounded-full"
                                  style={{
                                    width: `${Math.min(100, (count as number / insights.totalPatterns) * 100)}%`
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium w-8">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Learning Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Model Accuracy</span>
                            <span>{Math.round(insights.learningStats.averageAccuracy * 100)}%</span>
                          </div>
                          <Progress value={insights.learningStats.averageAccuracy * 100} />
                        </div>

                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            +{Math.round(insights.learningStats.improvementTrend)}%
                          </div>
                          <div className="text-sm text-gray-600">Improvement Trend</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {anomalies.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">Anomalies Detected in Current Contract:</div>
                      <ul className="space-y-1">
                        {anomalies.slice(0, 3).map((anomaly, index) => (
                          <li key={index} className="text-sm">
                            <strong>{anomaly.field}:</strong> {anomaly.suggestion}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="patterns" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Top Performing Patterns</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPatterns}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <label>
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-1" />
                      Import
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportPatterns}
                  />
                </label>
              </div>
            </div>

            {insights?.topPerformingPatterns?.length > 0 ? (
              <div className="space-y-3">
                {insights.topPerformingPatterns.map((pattern: ContractPattern, index: number) => (
                  <Card key={pattern.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="capitalize">
                              {pattern.category}
                            </Badge>
                            <Badge variant="secondary">
                              Confidence: {Math.round(pattern.confidence * 100)}%
                            </Badge>
                            <Badge>
                              Uses: {pattern.frequency}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-700 mb-2">
                            <strong>Pattern:</strong> {JSON.stringify(pattern.pattern, null, 2).slice(0, 100)}...
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span>Accuracy: {Math.round(pattern.performance.accuracyScore * 100)}%</span>
                            <span>Acceptance: {Math.round(pattern.performance.userAcceptanceRate * 100)}%</span>
                            <span>Applications: {pattern.performance.totalApplications}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Patterns Yet</h3>
                <p className="text-gray-600">Create some contracts to start building pattern intelligence.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="models" className="space-y-4 mt-6">
            {insights?.modelPerformance?.length > 0 ? (
              <div className="space-y-4">
                {insights.modelPerformance.map((model: LearningModel) => {
                  const statusBadge = getModelStatusBadge(model.performance.accuracy);
                  return (
                    <Card key={model.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{model.name}</h4>
                              <Badge variant={statusBadge.variant}>
                                {statusBadge.label}
                              </Badge>
                              {model.isActive ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-3">
                              {model.algorithm.replace('_', ' ').toUpperCase()} • 
                              Training Data: {model.trainingData?.length || 0} patterns
                            </p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Accuracy:</span>
                                <span className={cn("ml-1 font-medium", getModelStatusColor(model.performance.accuracy))}>
                                  {Math.round(model.performance.accuracy * 100)}%
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Precision:</span>
                                <span className="ml-1 font-medium">
                                  {Math.round(model.performance.precision * 100)}%
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Recall:</span>
                                <span className="ml-1 font-medium">
                                  {Math.round(model.performance.recall * 100)}%
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">F1-Score:</span>
                                <span className="ml-1 font-medium">
                                  {Math.round(model.performance.f1Score * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Models Initializing</h3>
                <p className="text-gray-600">ML models are being prepared for training.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4 mt-6">
            {predictions.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Smart Predictions for Current Contract</h3>
                {predictions.map((prediction, index) => (
                  <Card key={`${prediction.field}-${index}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium capitalize">
                              {prediction.field.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <Badge variant="outline">
                              {Math.round(prediction.confidence * 100)}% confident
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-700 mb-2">
                            <strong>Predicted Value:</strong> {String(prediction.predictedValue)}
                          </div>
                          
                          <p className="text-xs text-gray-600 mb-3">
                            {prediction.reasoning}
                          </p>

                          <div className="text-xs text-gray-500">
                            Based on {prediction.supportingPatterns.length} similar patterns
                          </div>
                        </div>
                        
                        <Button 
                          size="sm" 
                          onClick={() => applyPrediction(prediction)}
                          className="ml-3"
                        >
                          Apply
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : contractData && Object.keys(contractData).length > 2 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Predictions Needed</h3>
                <p className="text-gray-600">All required fields seem to be filled in already.</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Waiting for Contract Data</h3>
                <p className="text-gray-600">Fill in some basic contract information to see intelligent predictions.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MLPatternDashboard;