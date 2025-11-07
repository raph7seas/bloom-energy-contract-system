import React, { useState, useCallback } from 'react';
import { FolderPlus, Folder, Users, FileText, Bot, ArrowRight, CheckCircle, AlertCircle, Eye, Trash2, Plus } from 'lucide-react';
import { DocumentUploader } from './DocumentUploader';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ContractFormData } from '../../types/contract.types';
import { BusinessRulesAnalysis } from '../../services/aiFormMappingService';
import { aiToContractService } from '../../services/aiToContractService';

interface DocumentGroup {
  id: string;
  name: string;
  description: string;
  contractType: 'primary' | 'amendment' | 'renewal' | 'multi-party';
  clientName: string;
  created: string;
  documents: GroupDocument[];
  status: 'draft' | 'uploading' | 'analyzing' | 'ready' | 'converted' | 'error';
  aiAnalysis?: CombinedBusinessRulesAnalysis;
  mappedFormData?: Partial<ContractFormData>;
  contractId?: string;
  totalConfidence?: number;
}

interface GroupDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  documentType: string;
  uploadProgress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'analyzing' | 'analyzed';
  extractedText?: string;
  aiAnalysis?: BusinessRulesAnalysis;
  mappedFormData?: Partial<ContractFormData>;
  analysisConfidence?: number;
  error?: string;
}

interface CombinedBusinessRulesAnalysis {
  groupId: string;
  documentSummaries: Record<string, any>;
  combinedRules: any[];
  aggregatedData: Partial<ContractFormData>;
  crossDocumentValidation: {
    consistencyScore: number;
    conflicts: Array<{
      field: string;
      values: Array<{ documentId: string; value: any; confidence: number }>;
      recommendation: string;
    }>;
    recommendations: string[];
  };
  overallConfidence: number;
  riskFactors: string[];
  summary: {
    totalDocuments: number;
    totalRulesExtracted: number;
    processingNotes: string[];
  };
}

interface DocumentGroupManagerProps {
  contractId?: string;
  onGroupComplete?: (group: DocumentGroup) => void;
  onContractCreated?: (contract: any, group: DocumentGroup) => void;
  onNavigate?: (view: string) => void;
  maxGroups?: number;
  enableAutoConversion?: boolean;
}

const CONTRACT_TYPES = [
  { value: 'primary', label: 'Primary Contract', description: 'Main contract with all standard terms' },
  { value: 'amendment', label: 'Amendment', description: 'Modification to existing contract' },
  { value: 'renewal', label: 'Renewal', description: 'Contract renewal with updated terms' },
  { value: 'multi-party', label: 'Multi-Party', description: 'Contract involving multiple parties' }
];

export const DocumentGroupManager: React.FC<DocumentGroupManagerProps> = ({
  contractId,
  onGroupComplete,
  onContractCreated,
  onNavigate,
  maxGroups = 10,
  enableAutoConversion = true
}) => {
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({
    name: '',
    description: '',
    contractType: 'primary' as const,
    clientName: ''
  });

  // Create a new document group
  const createDocumentGroup = useCallback(() => {
    if (!newGroupForm.name.trim() || !newGroupForm.clientName.trim()) {
      return;
    }

    const newGroup: DocumentGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newGroupForm.name.trim(),
      description: newGroupForm.description.trim(),
      contractType: newGroupForm.contractType,
      clientName: newGroupForm.clientName.trim(),
      created: new Date().toISOString(),
      documents: [],
      status: 'draft'
    };

    setDocumentGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
    setIsCreatingGroup(false);
    setNewGroupForm({
      name: '',
      description: '',
      contractType: 'primary',
      clientName: ''
    });
  }, [newGroupForm]);

  // Handle document upload completion for a group
  const handleDocumentsUploaded = useCallback((uploadedFiles: any[], groupId: string) => {
    setDocumentGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        const newDocuments: GroupDocument[] = uploadedFiles.map(file => ({
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          documentType: file.documentType,
          uploadProgress: file.progress,
          status: file.status,
          extractedText: file.extractedText,
          aiAnalysis: file.aiAnalysis,
          mappedFormData: file.mappedFormData,
          analysisConfidence: file.analysisConfidence,
          error: file.error
        }));

        return {
          ...group,
          documents: [...group.documents, ...newDocuments],
          status: group.documents.length === 0 ? 'uploading' : group.status
        };
      }
      return group;
    }));
  }, []);

  // Analyze a complete document group using AI
  const analyzeDocumentGroup = useCallback(async (groupId: string) => {
    const group = documentGroups.find(g => g.id === groupId);
    if (!group || group.documents.length === 0) return;

    // Update group status to analyzing
    setDocumentGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, status: 'analyzing' } : g
    ));

    try {
      // Simulate group analysis - in real implementation, this would call the backend
      const mockGroupAnalysis = await simulateGroupAnalysis(group);
      
      // Update group with analysis results
      setDocumentGroups(prev => prev.map(g => 
        g.id === groupId ? {
          ...g,
          status: 'ready',
          aiAnalysis: mockGroupAnalysis.analysis,
          mappedFormData: mockGroupAnalysis.mappedFormData,
          totalConfidence: mockGroupAnalysis.totalConfidence
        } : g
      ));

      // Auto-convert to contract if enabled and confidence is high
      if (enableAutoConversion && mockGroupAnalysis.totalConfidence > 0.75) {
        setTimeout(() => convertGroupToContract(groupId), 1000);
      }

    } catch (error) {
      console.error('Group analysis failed:', error);
      setDocumentGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, status: 'error' } : g
      ));
    }
  }, [documentGroups, enableAutoConversion]);

  // Convert analyzed group to contract
  const convertGroupToContract = useCallback(async (groupId: string) => {
    const group = documentGroups.find(g => g.id === groupId);
    if (!group || !group.mappedFormData) return;

    try {
      // Update status to analyzing (creating contract)
      setDocumentGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, status: 'analyzing' } : g
      ));

      // Create actual contract using AI service
      const contract = await createRealContractFromGroup(group);

      if (contract) {
        // Update group with contract ID
        setDocumentGroups(prev => prev.map(g => 
          g.id === groupId ? { 
            ...g, 
            status: 'converted',
            contractId: contract.id
          } : g
        ));

        // Notify parent components
        if (onContractCreated) {
          onContractCreated(contract, group);
        }
        if (onGroupComplete) {
          onGroupComplete(group);
        }

        console.log(`✅ Contract ${contract.id} created successfully from group ${group.name}`);
      } else {
        throw new Error('Failed to create contract - insufficient data extracted from group');
      }

    } catch (error) {
      console.error('Contract creation failed:', error);
      setDocumentGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, status: 'error' } : g
      ));
    }
  }, [documentGroups, onContractCreated, onGroupComplete]);

  // Delete a document group
  const deleteGroup = useCallback((groupId: string) => {
    setDocumentGroups(prev => prev.filter(g => g.id !== groupId));
    if (activeGroupId === groupId) {
      setActiveGroupId(null);
    }
  }, [activeGroupId]);

  // Get group status color
  const getGroupStatusColor = (status: DocumentGroup['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'uploading': return 'bg-blue-100 text-blue-700';
      case 'analyzing': return 'bg-purple-100 text-purple-700';
      case 'ready': return 'bg-green-100 text-green-700';
      case 'converted': return 'bg-emerald-100 text-emerald-700';
      case 'error': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Get group status icon
  const getGroupStatusIcon = (status: DocumentGroup['status']) => {
    switch (status) {
      case 'draft': return <FileText className="h-4 w-4" />;
      case 'uploading': return <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />;
      case 'analyzing': return <Bot className="h-4 w-4 animate-pulse" />;
      case 'ready': return <CheckCircle className="h-4 w-4" />;
      case 'converted': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Groups</h2>
          <p className="text-gray-600">
            Organize related documents together for better AI analysis and contract creation
          </p>
        </div>
        <Button
          onClick={() => setIsCreatingGroup(true)}
          disabled={documentGroups.length >= maxGroups}
          className="flex items-center space-x-2"
        >
          <FolderPlus className="h-4 w-4" />
          <span>New Group</span>
        </Button>
      </div>

      {/* Create New Group Modal */}
      {isCreatingGroup && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FolderPlus className="h-5 w-5" />
              <span>Create Document Group</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroupForm.name}
                  onChange={(e) => setNewGroupForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., PG&E Main Contract 2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={newGroupForm.clientName}
                  onChange={(e) => setNewGroupForm(prev => ({ ...prev, clientName: e.target.value }))}
                  placeholder="e.g., Pacific Gas & Electric"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Type
              </label>
              <select
                value={newGroupForm.contractType}
                onChange={(e) => setNewGroupForm(prev => ({ 
                  ...prev, 
                  contractType: e.target.value as any 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CONTRACT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newGroupForm.description}
                onChange={(e) => setNewGroupForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this document group..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsCreatingGroup(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={createDocumentGroup}
                disabled={!newGroupForm.name.trim() || !newGroupForm.clientName.trim()}
              >
                Create Group
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Groups List */}
      {documentGroups.length === 0 && !isCreatingGroup ? (
        <Card className="text-center py-12">
          <CardContent>
            <Folder className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Document Groups</h3>
            <p className="text-gray-500 mb-4">
              Create your first document group to organize related contract documents
            </p>
            <Button onClick={() => setIsCreatingGroup(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Create First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeGroupId || 'overview'} onValueChange={setActiveGroupId}>
          <TabsList className="grid w-full grid-cols-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {documentGroups.map(group => (
              <TabsTrigger key={group.id} value={group.id} className="relative">
                <span className="truncate max-w-32">{group.name}</span>
                <Badge 
                  variant="secondary" 
                  className={`ml-2 ${getGroupStatusColor(group.status)}`}
                >
                  {getGroupStatusIcon(group.status)}
                  <span className="ml-1 capitalize">{group.status}</span>
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentGroups.map(group => (
                <Card 
                  key={group.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setActiveGroupId(group.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg truncate">{group.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge className={getGroupStatusColor(group.status)}>
                          {getGroupStatusIcon(group.status)}
                          <span className="ml-1 capitalize">{group.status}</span>
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteGroup(group.id);
                          }}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">{group.clientName}</p>
                      <p className="capitalize">{group.contractType} contract</p>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {group.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{group.description}</p>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {group.documents.length} document{group.documents.length !== 1 ? 's' : ''}
                        </span>
                        {group.totalConfidence && (
                          <span className="text-green-600 font-medium">
                            {Math.round(group.totalConfidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      {group.contractId && (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">Contract Created</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate?.('library');
                            }}
                            className="h-6 px-2 py-0 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Individual Group Tabs */}
          {documentGroups.map(group => (
            <TabsContent key={group.id} value={group.id} className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Folder className="h-5 w-5" />
                        <span>{group.name}</span>
                        <Badge className={getGroupStatusColor(group.status)}>
                          {getGroupStatusIcon(group.status)}
                          <span className="ml-1 capitalize">{group.status}</span>
                        </Badge>
                      </CardTitle>
                      <div className="text-sm text-gray-600 mt-1">
                        <p><strong>Client:</strong> {group.clientName}</p>
                        <p><strong>Type:</strong> {CONTRACT_TYPES.find(t => t.value === group.contractType)?.label}</p>
                        <p><strong>Created:</strong> {new Date(group.created).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {group.status === 'ready' && !group.contractId && (
                        <Button
                          onClick={() => convertGroupToContract(group.id)}
                          className="flex items-center space-x-2"
                        >
                          <ArrowRight className="h-4 w-4" />
                          <span>Create Contract</span>
                        </Button>
                      )}
                      {group.documents.length > 0 && group.status === 'draft' && (
                        <Button
                          onClick={() => analyzeDocumentGroup(group.id)}
                          variant="outline"
                          className="flex items-center space-x-2"
                        >
                          <Bot className="h-4 w-4" />
                          <span>Analyze Group</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {group.description && (
                    <p className="text-gray-600 mb-4">{group.description}</p>
                  )}

                  {/* Group Analysis Results */}
                  {group.aiAnalysis && (
                    <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-2">AI Group Analysis</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-purple-700">Overall Confidence</div>
                          <div className="text-2xl font-bold text-purple-900">
                            {Math.round((group.totalConfidence || 0) * 100)}%
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-purple-700">Documents</div>
                          <div className="text-2xl font-bold text-purple-900">
                            {group.aiAnalysis.summary.totalDocuments}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-purple-700">Rules Found</div>
                          <div className="text-2xl font-bold text-purple-900">
                            {group.aiAnalysis.summary.totalRulesExtracted}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-purple-700">Consistency</div>
                          <div className="text-2xl font-bold text-purple-900">
                            {Math.round(group.aiAnalysis.crossDocumentValidation.consistencyScore * 100)}%
                          </div>
                        </div>
                      </div>
                      
                      {group.aiAnalysis.crossDocumentValidation.conflicts.length > 0 && (
                        <div className="mt-4">
                          <h5 className="font-medium text-purple-900 mb-2">Detected Conflicts</h5>
                          <div className="space-y-2">
                            {group.aiAnalysis.crossDocumentValidation.conflicts.map((conflict, index) => (
                              <div key={index} className="p-2 bg-orange-100 rounded text-sm">
                                <div className="font-medium text-orange-900">{conflict.field}</div>
                                <div className="text-orange-700">{conflict.recommendation}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Document Uploader for this group */}
                  <DocumentUploader
                    contractId={group.id}
                    onUploadComplete={(files) => handleDocumentsUploaded(files, group.id)}
                    onAIAnalysisComplete={(analysis, formData) => {
                      // Handle individual document analysis within the group
                      console.log('Document analyzed within group:', group.id);
                    }}
                    maxFiles={20}
                    enableAIAnalysis={true}
                    enableTextExtraction={true}
                  />

                  {/* Group Documents Summary */}
                  {group.documents.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Group Documents ({group.documents.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {group.documents.map(doc => (
                          <div key={doc.id} className="p-3 border rounded-lg">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium truncate">{doc.name}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              <span className="capitalize">{doc.documentType.toLowerCase()}</span>
                              {doc.analysisConfidence && (
                                <span className="ml-2">
                                  {Math.round(doc.analysisConfidence * 100)}% confidence
                                </span>
                              )}
                            </div>
                            <Badge 
                              variant="secondary" 
                              className={`mt-2 text-xs ${
                                doc.status === 'completed' ? 'bg-green-100 text-green-700' :
                                doc.status === 'error' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {doc.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

// Mock functions for demonstration
async function simulateGroupAnalysis(group: DocumentGroup): Promise<{
  analysis: CombinedBusinessRulesAnalysis;
  mappedFormData: Partial<ContractFormData>;
  totalConfidence: number;
}> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const mockAnalysis: CombinedBusinessRulesAnalysis = {
    groupId: group.id,
    documentSummaries: group.documents.reduce((acc, doc) => ({
      ...acc,
      [doc.id]: {
        documentType: doc.documentType,
        rulesExtracted: Math.floor(Math.random() * 10) + 5,
        confidence: 0.7 + Math.random() * 0.25
      }
    }), {}),
    combinedRules: [],
    aggregatedData: {
      customerName: group.clientName,
      solutionType: 'Power Purchase - Standard',
      ratedCapacity: 975,
      baseRate: 65,
      contractTerm: 15,
      outputWarrantyPercent: 90
    },
    crossDocumentValidation: {
      consistencyScore: 0.85 + Math.random() * 0.1,
      conflicts: Math.random() > 0.7 ? [{
        field: 'Contract Term',
        values: [
          { documentId: group.documents[0]?.id, value: '15 years', confidence: 0.9 },
          { documentId: group.documents[1]?.id, value: '10 years', confidence: 0.8 }
        ],
        recommendation: 'Primary contract specifies 15 years - recommend using this value'
      }] : [],
      recommendations: [
        'High consistency across documents',
        'All key terms properly identified',
        'Ready for contract generation'
      ]
    },
    overallConfidence: 0.8 + Math.random() * 0.15,
    riskFactors: [],
    summary: {
      totalDocuments: group.documents.length,
      totalRulesExtracted: group.documents.length * 7,
      processingNotes: ['Group analysis completed successfully']
    }
  };

  return {
    analysis: mockAnalysis,
    mappedFormData: mockAnalysis.aggregatedData,
    totalConfidence: mockAnalysis.overallConfidence
  };
}

async function createRealContractFromGroup(group: DocumentGroup): Promise<any> {
  console.log(`🚀 Creating contract from group: ${group.name}`);
  
  if (!group.aiAnalysis || !group.mappedFormData) {
    throw new Error('Group must have AI analysis and mapped form data to create contract');
  }

  try {
    // Convert the group's combined analysis to BusinessRulesAnalysis format
    const businessRulesAnalysis = {
      documentId: group.id,
      extractedRules: group.aiAnalysis.combinedRules || [],
      overallConfidence: group.aiAnalysis.overallConfidence || 0.8,
      extractionDate: new Date().toISOString(),
      contractMetadata: {
        parties: [group.clientName, 'Bloom Energy'],
        effectiveDate: group.mappedFormData.effectiveDate,
        term: group.mappedFormData.contractTerm ? `${group.mappedFormData.contractTerm} years` : undefined,
        totalValue: undefined
      },
      riskFlags: group.aiAnalysis.riskFactors || [],
      recommendations: group.aiAnalysis.crossDocumentValidation?.recommendations || []
    };

    // Use the AI to Contract service to create a real contract
    const contract = await aiToContractService.createContractFromAIAnalysis(
      businessRulesAnalysis,
      group.id,
      group.name,
      'document-group'
    );

    if (contract) {
      console.log(`✅ Successfully created contract ${contract.id} for group ${group.name}`);
      return contract;
    } else {
      throw new Error('AI service returned null - insufficient data to create contract');
    }

  } catch (error) {
    console.error(`❌ Failed to create contract from group ${group.name}:`, error);
    throw error;
  }
}