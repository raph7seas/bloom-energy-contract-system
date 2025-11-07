import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Image, Eye, Download, Trash2, RefreshCw, Search, Calendar, AlertCircle, CheckCircle, Clock, Brain, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProcessing } from '../../contexts/ProcessingContext';
import { ContractBlueprint, ContractFormData } from '../../types';
import MultiDocumentProgress from './MultiDocumentProgress';

interface Document {
  id: string;
  title: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  documentType: string;
  uploadStatus: string;
  processingStatus: string;
  uploadProgress: number;
  processingProgress: number;
  pageCount?: number;
  wordCount?: number;
  uploadDate: string;
  uploadedBy?: string;
  extractionCompleted?: string;
  errorMessage?: string;
  pages?: DocumentPage[];
}

interface DocumentPage {
  id: string;
  pageNumber: number;
  extractedText?: string;
  confidenceScore?: number;
  wordCount?: number;
  hasTable: boolean;
  hasImage: boolean;
  processingStatus: string;
}

interface DocumentManagerProps {
  contractId: string;
  onDocumentSelect?: (document: Document) => void;
  onCreateFromDocument?: (aiData: Partial<ContractFormData>, sourceDoc: { id: string; name: string; confidence?: number }) => void;
  enableSearch?: boolean;
  enableFiltering?: boolean;
  compact?: boolean;
  aiProvider?: 'bedrock' | 'anthropic';
  onUploadComplete?: number;  // Counter value to trigger refresh without remounting
}

interface DocumentAnalysisSummary {
  success: boolean;
  contractId: string;
  documentsAnalyzed: number;
  results: any[];
  summary: {
    totalDocuments: number;
    totalRulesExtracted: number;
    contractTypes: string[];
    parties: string[];
    averageConfidence: number;
    rulesByCategory: Record<string, number>;
    totalAnomalies: number;
    totalRiskFactors: number;
    analysisDate: string;
    processingStats: {
      averageProcessingTime: number;
      successfulAnalyses: number;
      failedAnalyses: number;
    };

    // Enhanced summary fields
    rulesByPriority?: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    totalPaymentRules?: number;
    totalPerformanceGuarantees?: number;
    totalOperationalRequirements?: number;
    totalTerminationClauses?: number;
    totalComplianceRequirements?: number;
    totalStakeholders?: number;
    totalMilestones?: number;
  };
  contractBlueprint?: ContractBlueprint;
  contractSummaryNarrative?: string;

  // Enhanced financial summary
  financialSummary?: {
    totalContractValue?: number;
    annualCost?: number;
    escalatedTotalValue?: number;
    paymentFrequency?: string;
    estimatedRevenue?: number;
  };

  // Aggregated structured data
  allPaymentRules?: any[];
  allPerformanceGuarantees?: any[];
  allOperationalRequirements?: any[];
  allTerminationClauses?: any[];
  allComplianceRequirements?: any[];
  allRiskFactors?: any[];
  allMilestones?: any[];
  allStakeholders?: any[];
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PRIMARY: 'Primary Contract',
  APPENDIX: 'Appendix',
  AMENDMENT: 'Amendment',
  EXHIBIT: 'Exhibit',
  ADDENDUM: 'Addendum',
  SIGNATURE: 'Signature Page',
  COVER_LETTER: 'Cover Letter',
  OTHER: 'Other'
};

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  contractId,
  onDocumentSelect,
  onCreateFromDocument,
  enableSearch = true,
  enableFiltering = true,
  compact = false,
  aiProvider = 'anthropic',
  onUploadComplete
}) => {
  const { token } = useAuth();
  const { startJob } = useProcessing();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<DocumentAnalysisSummary | null>(null);
  const [creatingContract, setCreatingContract] = useState(false);
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null);

  const blueprint = analysisResults?.contractBlueprint || null;
  const topRules = useMemo(() => {
    if (!blueprint?.rulesBySection) return [];
    const flattened = Object.values(blueprint.rulesBySection).flat();
    return flattened
      .filter(rule => rule)
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
      .slice(0, 5);
  }, [blueprint]);

  const mapUploadToDocument = (upload: any): Document => {
    const rawUploadStatus = (upload?.uploadStatus || upload?.status || 'COMPLETED').toString().toUpperCase();
    const rawProcessingStatus = (upload?.processingStatus || upload?.status || rawUploadStatus).toString().toUpperCase();

    const uploadProgress = typeof upload?.uploadProgress === 'number'
      ? upload.uploadProgress
      : typeof upload?.progress === 'number'
        ? upload.progress
        : rawUploadStatus === 'COMPLETED'
          ? 100
          : 0;

    const processingProgress = typeof upload?.processingProgress === 'number'
      ? upload.processingProgress
      : uploadProgress;

    return {
      id: upload?.id,
      title: upload?.title || upload?.originalName || upload?.fileName || 'Uploaded Document',
      fileName: upload?.fileName || upload?.originalName || 'document',
      originalName: upload?.originalName || upload?.fileName || 'document',
      fileSize: upload?.fileSize ?? upload?.size ?? 0,
      fileType: upload?.fileType || upload?.type || 'application/octet-stream',
      documentType: upload?.documentType || 'OTHER',
      uploadStatus: rawUploadStatus,
      processingStatus: rawProcessingStatus,
      uploadProgress,
      processingProgress,
      pageCount: upload?.pageCount,
      wordCount: upload?.wordCount ?? upload?.wordCountEstimate,
      uploadDate: upload?.uploadDate || new Date().toISOString(),
      uploadedBy: upload?.uploadedBy,
      extractionCompleted: upload?.extractionCompleted,
      errorMessage: upload?.errorMessage,
      pages: upload?.pages || []
    };
  };

  const fetchDocuments = async () => {
    console.log('🔍 [DocumentManager] fetchDocuments() called for contractId:', contractId);
    try {
      setLoading(true);
      const url = `/api/uploads/contract/${contractId}`;
      console.log('📡 [DocumentManager] Fetching from:', url);

      const response = await fetch(url, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });

      console.log('📥 [DocumentManager] Response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      console.log('📦 [DocumentManager] Response data:', data);

      const uploads = Array.isArray(data.uploads) ? data.uploads : [];
      console.log('📄 [DocumentManager] Found uploads:', uploads.length);
      console.log('📋 [DocumentManager] Upload IDs:', uploads.map((u: any) => u.id));

      const mappedDocs = uploads.map(mapUploadToDocument);
      console.log('✅ [DocumentManager] Mapped to documents:', mappedDocs.length);

      setDocuments(mappedDocs);
      console.log('💾 [DocumentManager] Documents state updated with', mappedDocs.length, 'documents');
      setError(null);
    } catch (err) {
      console.error('❌ [DocumentManager] fetchDocuments error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const retryProcessing = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/documents/${documentId}/retry`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });

      if (response.ok) {
        fetchDocuments(); // Refresh the list
      } else {
        throw new Error('Failed to retry processing');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry processing');
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      } else {
        throw new Error('Failed to delete document');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const analyzeDocuments = async () => {
    console.log('');
    console.log('🧠 [DocumentManager] ═══════════════════════════════════════════════════════');
    console.log('🧠 [DocumentManager] analyzeDocuments() CALLED!');
    console.log('🧠 [DocumentManager] ⚡ CONTRACT ID BEING USED FOR ANALYZE:', contractId);
    console.log('🧠 [DocumentManager] ⚡ CONTRACT ID FROM PROPS:', contractId);
    console.log('🧠 [DocumentManager] ⚡ CONTRACT ID FROM SESSIONSTORAGE:', sessionStorage.getItem('current_document_upload_contract_id'));
    console.log('🧠 [DocumentManager] Current documents.length:', documents.length);
    console.log('🧠 [DocumentManager] Documents:', documents.map(d => ({ id: d.id, name: d.fileName, contractId: (d as any).contractId, tempContractId: (d as any).tempContractId })));
    console.log('🧠 [DocumentManager] ═══════════════════════════════════════════════════════');
    console.log('');

    if (documents.length === 0) {
      console.error('❌ [DocumentManager] EARLY RETURN: No documents available for analysis');
      setError('No documents available for analysis');
      return;
    }

    console.log('✅ [DocumentManager] Proceeding with analysis...');

    try {
      setAnalyzing(true);
      setError(null);

      // Fetch document content for each document
      const documentsWithContent = await Promise.all(
        documents.map(async (doc) => {
          try {
            const contentResponse = await fetch(`/api/uploads/${doc.id}/content`, {
              headers: {
                ...(token && { Authorization: `Bearer ${token}` })
              }
            });

            if (contentResponse.ok) {
              const contentData = await contentResponse.json();
              console.log(`Fetched content for ${doc.fileName}:`, {
                hasExtractedContent: !!contentData.extractedContent,
                hasAnalysis: !!contentData.analysis,
                contentType: typeof contentData.extractedContent
              });

              // The endpoint returns extractedContent.text or extractedContent
              let text = '';
              if (contentData.extractedContent) {
                if (typeof contentData.extractedContent === 'string') {
                  text = contentData.extractedContent;
                } else if (contentData.extractedContent.text) {
                  text = contentData.extractedContent.text;
                } else if (contentData.extractedContent.content) {
                  text = contentData.extractedContent.content;
                }
              }

              if (!text && contentData.analysis && contentData.analysis.extractedText) {
                text = contentData.analysis.extractedText;
              }

              if (text && text.length > 0) {
                return {
                  id: doc.id,
                  filename: doc.originalName || doc.fileName,  // Prefer originalName for display
                  content: text,
                  extractedText: text
                };
              }
            } else {
              console.error(`Failed to fetch content for ${doc.fileName}: ${contentResponse.status}`);
            }
            return null;
          } catch (error) {
            console.error(`Failed to fetch content for ${doc.fileName}:`, error);
            return null;
          }
        })
      );

      const validDocuments = documentsWithContent.filter(d => d !== null && d.extractedText && d.extractedText.length > 0);

      console.log(`Found ${validDocuments.length} documents with extracted text out of ${documents.length} total`);

      if (validDocuments.length === 0) {
        setError('No documents with extracted text found');
        setAnalyzing(false);
        setAnalysisJobId(null);  // Clear jobId on error
        return;
      }

      // Start REAL AI analysis directly with progress tracking
      console.log('🚀 Starting REAL AI analysis for contract:', contractId);

      // Generate job ID for progress tracking
      const jobId = `analysis-${Date.now()}`;
      setAnalysisJobId(jobId);  // Store jobId in state for progress tracking

      // Track if API response already handled results
      let apiResponseHandled = false;

      // Start job monitoring BEFORE calling the API
      startJob(jobId, validDocuments.length, async (socketResults) => {
        console.log('🎉 Analysis job completed via Socket.IO callback!');
        console.log('📦 Socket.IO results:', socketResults);
        console.log('🔍 API response already handled?', apiResponseHandled);

        // If API response already handled the results, don't process Socket.IO results
        // This prevents overwriting good data with stale/empty data
        if (apiResponseHandled) {
          console.log('⏭️  Skipping Socket.IO results - API response already processed');
          return;
        }

        console.log('📡 Processing Socket.IO results as fallback');

        // Socket.IO completion triggered - now fetch the actual analyzed documents
        try {
          const docsResponse = await fetch(`/api/uploads/contract/${contractId}`, {
            headers: {
              ...(token && { Authorization: `Bearer ${token}` })
            }
          });

          if (!docsResponse.ok) {
            throw new Error('Failed to fetch analyzed documents');
          }

          const responseData = await docsResponse.json();
          const analyzedDocs = Array.isArray(responseData) ? responseData : (responseData.documents || []);

          const finalResults = analyzedDocs
            .filter((doc: any) => doc.analysis)
            .map((doc: any) => ({
              documentId: doc.id,
              filename: doc.originalName,
              confidence: doc.analysis.confidence || 0,
              extractedRules: doc.analysis.extractedRules || [],
              documentSummary: doc.analysis.documentSummary || {},
              paymentRules: doc.analysis.paymentRules || [],
              performanceGuarantees: doc.analysis.performanceGuarantees || [],
              riskFactors: doc.analysis.riskFactors || [],
              anomalies: doc.analysis.anomalies || [],
              milestones: doc.analysis.milestones || []
            }));

          console.log('✅ Final results built from', finalResults.length, 'documents');

          // If we have 0 results from Socket.IO, don't call handleProcessingComplete
          // Let the API response handle it instead (it has the actual data)
          if (finalResults.length === 0) {
            console.log('⏭️  Socket.IO returned 0 results - waiting for API response instead');
            return;
          }

          // The blueprint should be in the Socket.IO completion event results
          // Don't call analyze again - just use the results we already have
          const blueprint = (socketResults as any)?.blueprint || null;

          console.log('📋 Blueprint from Socket.IO:', blueprint ? 'Found' : 'Not found');

          await handleProcessingComplete(finalResults, blueprint);
        } catch (error) {
          console.error('❌ Failed to fetch final results:', error);
          // Don't use Socket.IO results as fallback if we have 0 results
          // Wait for API response instead
          console.log('⏭️  Skipping Socket.IO error fallback - waiting for API response');
        }
      });

      try {
        // Call the REAL AI analysis endpoint with jobId, aiProvider, and clearCache (this will emit progress via Socket.IO)
        // clearCache=true ensures we only see fresh analysis results, not cached/aggregated data
        console.log('');
        console.log('📡 ═══════════════════════════════════════════════════════');
        console.log('📡 MAKING API CALL TO ANALYZE ENDPOINT');
        console.log('📡 Contract ID:', contractId);
        console.log(`📡 Selected AI Provider: ${aiProvider}`);
        console.log(`📡 Full URL: /api/documents/analyze/${contractId}?jobId=${jobId}&aiProvider=${aiProvider}&clearCache=true`);
        console.log('📡 ═══════════════════════════════════════════════════════');
        console.log('');

        const analysisResponse = await fetch(`/api/documents/analyze/${contractId}?jobId=${jobId}&aiProvider=${aiProvider}&clearCache=true`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          }
        });

        console.log('📡 AI Analysis response status:', analysisResponse.status);

        if (!analysisResponse.ok) {
          const errorText = await analysisResponse.text();
          console.error('❌ AI Analysis failed:', errorText);
          throw new Error(`Analysis failed: ${errorText}`);
        }

        // Clone the response so we can read it twice
        const responseClone = analysisResponse.clone();
        const responseText = await responseClone.text();
        console.log('📄 Raw response length:', responseText.length, 'chars');
        console.log('📄 Raw response preview (first 500 chars):', responseText.substring(0, 500));

        const analysisData = await analysisResponse.json();
        console.log('');
        console.log('✅ ═══════════════════════════════════════════════════════');
        console.log('✅ AI ANALYSIS API RESPONSE RECEIVED');
        console.log('✅ Success:', analysisData.success);
        console.log('✅ Contract ID from response:', analysisData.contractId);
        console.log('✅ Documents Analyzed:', analysisData.documentsAnalyzed);
        console.log('✅ Results array length:', analysisData.results?.length);
        console.log('✅ Has Blueprint:', !!analysisData.contractBlueprint);
        console.log('✅ Summary:', analysisData.summary);
        console.log('✅ First result:', analysisData.results?.[0]);
        console.log('✅ ═══════════════════════════════════════════════════════');
        console.log('');

        // Handle results directly from API response (don't wait for Socket.IO)
        if (analysisData.success && analysisData.results) {
          console.log('📦 Processing analysis results from API response');

          const finalResults = analysisData.results.map((result: any) => ({
            documentId: result.documentId || result.id,
            filename: result.filename || result.originalName,
            confidence: result.confidence || 0,
            extractedRules: result.extractedRules || [],
            documentSummary: result.documentSummary || {},
            extractedData: result.extractedData || {},
            paymentRules: result.paymentRules || [],
            performanceGuarantees: result.performanceGuarantees || [],
            riskFactors: result.riskFactors || [],
            anomalies: result.anomalies || [],
            milestones: result.milestones || []
          }));

          console.log('✅ Built', finalResults.length, 'results from API response');

          // Mark that API response handled the results
          apiResponseHandled = true;
          console.log('🚩 Set apiResponseHandled = true to prevent Socket.IO from overwriting');

          await handleProcessingComplete(finalResults, analysisData.contractBlueprint || null);
        } else {
          console.warn('⚠️ No results in API response, will wait for Socket.IO callback');
        }

        setAnalyzing(false);
        setAnalysisJobId(null);  // Clear jobId when analysis completes
      } catch (error) {
        console.error('❌ AI Analysis error:', error);
        setError(error instanceof Error ? error.message : 'Analysis failed');
        setAnalyzing(false);
        setAnalysisJobId(null);  // Clear jobId on error
      }

    } catch (err) {
      console.error('❌ Document analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze documents');
      setAnalyzing(false);
      setAnalysisJobId(null);  // Clear jobId on error
    }
  };

  const handleProcessingComplete = async (results: any[], blueprint?: ContractBlueprint) => {
    console.log('🎯 ==========================================');
    console.log('🎯 handleProcessingComplete CALLED');
    console.log('🎯 ==========================================');
    console.log(`✅ Processing complete with ${results.length} results`, results);
    console.log('📦 Blueprint received:', blueprint);
    console.log('📦 Blueprint formData:', blueprint?.formData);
    console.log('📦 Blueprint metadata:', blueprint?.metadata);

    setAnalyzing(false);
    setAnalysisJobId(null);  // Clear jobId when processing completes

    // Debug: Log individual result structures
    results.forEach((r, idx) => {
      console.log(`Result ${idx} confidence:`, r.confidence, r);
    });

    // Calculate average confidence properly
    const confidenceValues = results
      .map(r => r.confidence)
      .filter(c => typeof c === 'number' && !isNaN(c) && c > 0);

    const averageConfidence = confidenceValues.length > 0
      ? confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length
      : 0;

    console.log('📊 Confidence calculation:', { confidenceValues, averageConfidence });

    // Build analysis summary directly from results
    const summary: DocumentAnalysisSummary = {
      documentsAnalyzed: results.length,
      results: results,
      contractBlueprint: blueprint, // Use the blueprint from backend
      summary: {
        totalRulesExtracted: results.reduce((sum, r) => sum + (r.extractedRules?.length || 0), 0),
        totalPaymentRules: results.reduce((sum, r) => sum + (r.paymentRules?.length || 0), 0),
        totalPerformanceGuarantees: results.reduce((sum, r) => sum + (r.performanceGuarantees?.length || 0), 0),
        averageConfidence: averageConfidence,
        contractTypes: [...new Set(results.map(r => r.documentSummary?.contractType).filter(Boolean))],
        totalRiskFactors: results.reduce((sum, r) => sum + (r.riskFactors?.length || 0), 0),
        totalAnomalies: results.reduce((sum, r) => sum + (r.anomalies?.length || 0), 0),
      },
      allStakeholders: results.flatMap(r => {
        const parties = r.documentSummary?.parties || {};
        return [
          parties.buyer && { name: parties.buyer, role: 'Buyer' },
          parties.seller && { name: parties.seller, role: 'Seller' },
          parties.financialOwner && { name: parties.financialOwner, role: 'Financial Owner' },
        ].filter(Boolean);
      }),
      allRiskFactors: results.flatMap(r => r.riskFactors || []),
      allMilestones: results.flatMap(r => r.milestones || []),
    };

    console.log('📋 Analysis summary built with blueprint:', summary);
    console.log('📋 Summary has contractBlueprint:', !!summary.contractBlueprint);
    console.log('📋 Summary.contractBlueprint.formData:', summary.contractBlueprint?.formData);

    setAnalysisResults(summary);
    console.log('✅ Analysis results set in state with blueprint');
    console.log('✅ State should now update and trigger re-render');

    // Store results in sessionStorage so they persist across navigation
    try {
      const jsonString = JSON.stringify(summary);
      sessionStorage.setItem(`analysis_results_${contractId}`, jsonString);
      console.log('💾 Stored analysis results in sessionStorage');
      console.log('💾 Stored data length:', jsonString.length, 'characters');

      // Verify it was stored
      const stored = sessionStorage.getItem(`analysis_results_${contractId}`);
      console.log('💾 Verification - can retrieve stored data:', !!stored);
    } catch (error) {
      console.error('Failed to store analysis results:', error);
    }

    // Refresh documents
    console.log('🔄 Refreshing documents...');
    await fetchDocuments();
    console.log('✅ Documents refreshed');
  };

  const handleProcessingCancel = () => {
    setAnalyzing(false);
    setAnalysisJobId(null);  // Clear jobId when processing is cancelled
  };

  const handleApplyBlueprint = () => {
    if (!analysisResults?.contractBlueprint || !onCreateFromDocument) {
      return;
    }

    const { formData, metadata } = analysisResults.contractBlueprint;
    const primaryDocument = metadata?.documents?.[0];

    onCreateFromDocument(formData, {
      id: primaryDocument?.documentId || `analysis-${Date.now()}`,
      name: primaryDocument?.filename || 'Analyzed Documents',
      confidence: primaryDocument?.confidence || analysisResults.summary?.averageConfidence
    });
  };

  const handleCreateFromBlueprint = async () => {
    console.log('🔍 handleCreateFromBlueprint called');
    console.log('📦 analysisResults:', analysisResults);
    console.log('📋 contractBlueprint:', analysisResults?.contractBlueprint);

    if (!analysisResults?.contractBlueprint) {
      console.error('❌ No blueprint available to create contract');
      alert('No analysis results available. Please analyze documents first.');
      return;
    }

    setCreatingContract(true);

    try {
      const { formData, metadata } = analysisResults.contractBlueprint;
      console.log('📝 Form data to submit:', formData);
      console.log('📊 Metadata:', metadata);

      // Call the contract creation API directly
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        aiExtracted: true,
        sourceDocuments: metadata?.documents || [],
        extractionConfidence: analysisResults.summary?.averageConfidence || 0
      };

      console.log('🚀 Sending payload to /api/contracts:', payload);

      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(payload)
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API error response:', errorText);
        throw new Error(`Failed to create contract: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Contract created successfully:', result);

      // Show success message or navigate
      alert('Contract created successfully!');

      // Optionally navigate to the contract details or library
      if (onCreateFromDocument) {
        console.log('🔄 Calling onCreateFromDocument callback');
        // Navigate using the existing callback
        onCreateFromDocument(formData, {
          id: result.contract?.id || `contract-${Date.now()}`,
          name: formData.customerName || 'New Contract',
          confidence: analysisResults.summary?.averageConfidence
        });
      }

    } catch (error) {
      console.error('❌ Failed to create contract:', error);
      alert(`Failed to create contract: ${error.message}`);
    } finally {
      setCreatingContract(false);
      console.log('✅ handleCreateFromBlueprint completed');
    }
  };

  const saveAsContract = async () => {
    if (!analysisResults?.contractBlueprint) {
      setError('No analysis results available');
      return;
    }

    try {
      setCreatingContract(true);
      setError(null);

      const response = await fetch('/api/contracts/from-blueprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          blueprint: analysisResults.contractBlueprint,
          contractId: contractId,
          analysisResults: analysisResults.results
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create contract');
      }

      const data = await response.json();

      if (data.success) {
        alert(`✅ Contract created successfully!\n\n` +
          `Contract: ${data.contract.name}\n` +
          `Rules extracted: ${data.extractedRulesCount}\n` +
          `Documents analyzed: ${data.documentsAnalyzed}\n\n` +
          `You can now view this contract in the Contracts Library.`);

        // Clear analysis results after successful save
        setAnalysisResults(null);
      } else {
        throw new Error(data.error || 'Failed to create contract');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contract');
    } finally {
      setCreatingContract(false);
    }
  };

  const formatDisplay = (
    value: unknown,
    decimals: number,
    options: { prefix?: string; suffix?: string } = {}
  ) => {
    const num = Number(value);
    if (Number.isNaN(num)) return '—';
    const { prefix = '', suffix = '' } = options;
    return `${prefix}${num.toFixed(decimals)}${suffix}`;
  };

  const renderBlueprintField = (label: string, value: React.ReactNode) => (
    <div className="bg-white rounded border border-blue-100 p-3">
      <div className="text-[11px] uppercase tracking-wide text-blue-500 font-semibold">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-800">{value ?? '—'}</div>
    </div>
  );

  const downloadDocument = async (documentId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/documents/documents/${documentId}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Failed to download document');
    }
  };

  const viewDocumentContent = async (documentId: string, title: string) => {
    try {
      const response = await fetch(`/api/documents/documents/${documentId}/content`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });

      if (response.ok) {
        const content = await response.json();
        const textWindow = window.open('', '_blank', 'width=900,height=700');
        if (textWindow) {
          textWindow.document.write(`
            <html>
              <head>
                <title>Document Content - ${title}</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; line-height: 1.6; }
                  .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px; }
                  .content { white-space: pre-wrap; background: #f9fafb; padding: 20px; border-radius: 8px; }
                  .metadata { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                  .pages { margin-top: 30px; }
                  .page { border: 1px solid #e5e7eb; margin-bottom: 20px; border-radius: 8px; }
                  .page-header { background: #f9fafb; padding: 10px 15px; border-bottom: 1px solid #e5e7eb; font-weight: 600; }
                  .page-content { padding: 15px; white-space: pre-wrap; }
                </style>
              </head>
              <body>
                <div class="header">
                  <h2>Document Content: ${title}</h2>
                </div>
                
                <div class="metadata">
                  <strong>File:</strong> ${content.fileName || 'N/A'}<br>
                  <strong>Pages:</strong> ${content.pageCount || 0}<br>
                  <strong>Words:</strong> ${content.wordCount || 0}<br>
                  <strong>Confidence:</strong> ${content.averageConfidence ? Math.round(content.averageConfidence) + '%' : 'N/A'}
                </div>

                ${content.fullText ? `
                  <div class="content">${content.fullText}</div>
                ` : ''}

                ${content.pages && content.pages.length > 0 ? `
                  <div class="pages">
                    <h3>Pages</h3>
                    ${content.pages.map((page: any) => `
                      <div class="page">
                        <div class="page-header">
                          Page ${page.pageNumber} 
                          ${page.confidenceScore ? `(${Math.round(page.confidenceScore)}% confidence)` : ''}
                          ${page.wordCount ? `- ${page.wordCount} words` : ''}
                        </div>
                        <div class="page-content">${page.extractedText || 'No text extracted'}</div>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </body>
            </html>
          `);
          textWindow.document.close();
        }
      }
    } catch (err) {
      setError('Failed to load document content');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getFileIcon = (type: string) => {
    if (!type) return <FileText className="w-5 h-5 text-gray-500" />;
    if (type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    if (type === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const getStatusIcon = (uploadStatus: string, processingStatus: string) => {
    if (uploadStatus === 'FAILED' || processingStatus === 'FAILED') {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (uploadStatus === 'COMPLETED' && processingStatus === 'COMPLETED') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusText = (uploadStatus: string, processingStatus: string) => {
    if (uploadStatus === 'UPLOADING') return 'Uploading...';
    if (uploadStatus === 'FAILED') return 'Upload Failed';
    if (processingStatus === 'PROCESSING') return 'Processing...';
    if (processingStatus === 'FAILED') return 'Processing Failed';
    if (processingStatus === 'COMPLETED') return 'Complete';
    return 'Pending';
  };

  // Filter and sort documents
  const filteredDocuments = documents
    .filter(doc => {
      if (searchTerm && !doc.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (selectedType && doc.documentType !== selectedType) return false;
      if (selectedStatus) {
        const status = getStatusText(doc.uploadStatus, doc.processingStatus);
        if (!status.toLowerCase().includes(selectedStatus.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'date':
          comparison = new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
          break;
        case 'size':
          comparison = a.fileSize - b.fileSize;
          break;
        case 'type':
          comparison = a.documentType.localeCompare(b.documentType);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  useEffect(() => {
    fetchDocuments();

    // Check for stored analysis results
    try {
      const storedResults = sessionStorage.getItem(`analysis_results_${contractId}`);
      if (storedResults) {
        const summary = JSON.parse(storedResults);
        console.log('📦 Restored analysis results from sessionStorage:', summary);
        setAnalysisResults(summary);
      }
    } catch (error) {
      console.error('Failed to restore analysis results:', error);
    }
  }, [contractId, onUploadComplete]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading documents...</span>
      </div>
    );
  }

  // Compact mode rendering
  if (compact) {
    return (
      <div className="space-y-3">
        {/* Compact Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Documents ({documents.length})
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                console.log('🖱️  [DocumentManager] Analyze button clicked!');
                console.log('📊 [DocumentManager] Button state - analyzing:', analyzing, 'documents.length:', documents.length);
                analyzeDocuments();
              }}
              disabled={analyzing || documents.length === 0}
              className="inline-flex items-center px-2 py-1 border border-green-300 rounded text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Brain className={`w-3 h-3 mr-1 ${analyzing ? 'animate-pulse' : ''}`} />
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </button>
            <button
              onClick={fetchDocuments}
              className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-2 text-xs">
            <div className="flex">
              <AlertCircle className="h-3 w-3 text-red-400 mr-1 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Multi-Document Processing Progress - Compact */}
        {analyzing && analysisJobId && (
          <MultiDocumentProgress
            jobId={analysisJobId}
            onComplete={handleProcessingComplete}
            onCancel={handleProcessingCancel}
          />
        )}

        {/* Analysis Results - Compact */}
        {analysisResults && (
          <div className="bg-green-50 border border-green-200 rounded p-3 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Brain className="h-4 w-4 text-green-600 mr-1 flex-shrink-0" />
                <h4 className="text-xs font-semibold text-green-800">Analysis Complete</h4>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white rounded p-2 text-center">
                <div className="font-bold text-green-700">{analysisResults.documentsAnalyzed || 0}</div>
                <div className="text-gray-500">Docs</div>
              </div>
              <div className="bg-white rounded p-2 text-center">
                <div className="font-bold text-green-700">{analysisResults.summary?.totalRulesExtracted || 0}</div>
                <div className="text-gray-500">Rules</div>
              </div>
              <div className="bg-white rounded p-2 text-center">
                <div className="font-bold text-green-700">{Math.round((analysisResults.summary?.averageConfidence || 0) * 100)}%</div>
                <div className="text-gray-500">Confidence</div>
              </div>
            </div>

            {/* Debug Blueprint Status */}
            {(() => {
              console.log('🔍 Blueprint Debug:', {
                hasAnalysisResults: !!analysisResults,
                hasBlueprint: !!analysisResults?.contractBlueprint,
                hasFormData: !!analysisResults?.contractBlueprint?.formData,
                blueprintKeys: analysisResults?.contractBlueprint ? Object.keys(analysisResults.contractBlueprint) : [],
                formDataKeys: analysisResults?.contractBlueprint?.formData ? Object.keys(analysisResults.contractBlueprint.formData) : [],
                fullBlueprint: analysisResults?.contractBlueprint
              });
              return null;
            })()}

            {/* Complete Contract Summary */}
            {analysisResults.contractBlueprint?.formData && (
              <div className="border-t border-green-200 pt-3 space-y-3">
                <h5 className="text-xs font-semibold text-green-800">Extracted Contract Data:</h5>

                {/* Basic Information */}
                <details open className="bg-white rounded p-2">
                  <summary className="cursor-pointer font-semibold text-xs text-gray-900 mb-2">📋 Basic Information</summary>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pl-3">
                    {analysisResults.contractBlueprint.formData.customerName && (
                      <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{analysisResults.contractBlueprint.formData.customerName}</span></div>
                    )}
                    {analysisResults.contractBlueprint.formData.siteName && (
                      <div><span className="text-gray-500">Site:</span> <span className="font-medium">{analysisResults.contractBlueprint.formData.siteName}</span></div>
                    )}
                    {analysisResults.contractBlueprint.formData.siteAddress && (
                      <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="font-medium">{analysisResults.contractBlueprint.formData.siteAddress}</span></div>
                    )}
                    {analysisResults.contractBlueprint.formData.contractTerm && (
                      <div><span className="text-gray-500">Term:</span> <span className="font-medium">{analysisResults.contractBlueprint.formData.contractTerm} years</span></div>
                    )}
                  </div>
                </details>

                {/* System Configuration */}
                <details open className="bg-white rounded p-2">
                  <summary className="cursor-pointer font-semibold text-xs text-gray-900 mb-2">⚡ System Configuration</summary>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pl-3">
                    {analysisResults.contractBlueprint.formData.solutionType && (
                      <div><span className="text-gray-500">Solution Type:</span> <span className="font-medium">{analysisResults.contractBlueprint.formData.solutionType}</span></div>
                    )}
                    {analysisResults.contractBlueprint.formData.ratedCapacity && (
                      <div><span className="text-gray-500">Capacity:</span> <span className="font-medium">{analysisResults.contractBlueprint.formData.ratedCapacity} kW</span></div>
                    )}
                    {analysisResults.contractBlueprint.formData.numberOfUnits && (
                      <div><span className="text-gray-500">Units:</span> <span className="font-medium">{analysisResults.contractBlueprint.formData.numberOfUnits}</span></div>
                    )}
                  </div>
                </details>

                {/* Financial Terms */}
                <details open className="bg-white rounded p-2">
                  <summary className="cursor-pointer font-semibold text-xs text-gray-900 mb-2">💰 Financial Terms</summary>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pl-3">
                    {analysisResults.contractBlueprint.formData.baseRate && (
                      <div><span className="text-gray-500">Base Rate:</span> <span className="font-medium">${analysisResults.contractBlueprint.formData.baseRate}/kWh</span></div>
                    )}
                    {analysisResults.contractBlueprint.formData.annualEscalation && (
                      <div><span className="text-gray-500">Escalation:</span> <span className="font-medium">{analysisResults.contractBlueprint.formData.annualEscalation}% / year</span></div>
                    )}
                    {analysisResults.contractBlueprint.formData.paymentTerms && (
                      <div className="col-span-2"><span className="text-gray-500">Payment Terms:</span> <span className="font-medium">{analysisResults.contractBlueprint.formData.paymentTerms}</span></div>
                    )}
                  </div>
                </details>

                {/* Operating Parameters */}
                <details open className="bg-white rounded p-2">
                  <summary className="cursor-pointer font-semibold text-xs text-gray-900 mb-2">🔧 Operating Parameters</summary>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pl-3">
                    {analysisResults.contractBlueprint.formData.outputWarrantyPercent && (
                      <div><span className="text-gray-500">Availability:</span> <span className="font-medium">{analysisResults.contractBlueprint.formData.outputWarrantyPercent}%</span></div>
                    )}
                    {analysisResults.contractBlueprint.formData.efficiencyWarrantyPercent && (
                      <div><span className="text-gray-500">Efficiency:</span> <span className="font-medium">{analysisResults.contractBlueprint.formData.efficiencyWarrantyPercent}%</span></div>
                    )}
                    {analysisResults.contractBlueprint.formData.demandResponseCapable !== undefined && (
                      <div><span className="text-gray-500">Demand Response:</span> <span className="font-medium">{analysisResults.contractBlueprint.formData.demandResponseCapable ? 'Yes' : 'No'}</span></div>
                    )}
                  </div>
                </details>

                {/* Technical Specifications */}
                <details open className="bg-white rounded p-2">
                  <summary className="cursor-pointer font-semibold text-xs text-gray-900 mb-2">⚙️ Technical Specifications</summary>
                  <div className="grid grid-cols-2 gap-2 text-[10px] pl-3">
                    {analysisResults.contractBlueprint.formData.gridParallelVoltage && (
                      <div><span className="text-gray-500">Voltage:</span> <span className="font-medium">{analysisResults.contractBlueprint.formData.gridParallelVoltage}</span></div>
                    )}
                    {analysisResults.contractBlueprint.formData.includesRenewableInverter !== undefined && (
                      <div><span className="text-gray-500">Renewable Inverter:</span> <span className="font-medium">{analysisResults.contractBlueprint.formData.includesRenewableInverter ? 'Yes' : 'No'}</span></div>
                    )}
                    {analysisResults.contractBlueprint.formData.includesEnergyStorage !== undefined && (
                      <div><span className="text-gray-500">Energy Storage:</span> <span className="font-medium">{analysisResults.contractBlueprint.formData.includesEnergyStorage ? 'Yes' : 'No'}</span></div>
                    )}
                  </div>
                </details>

                {/* All Extracted Data - Comprehensive View with Fleet/Multi-Site Support */}
                {analysisResults.results && analysisResults.results.length > 0 && (() => {
                  // Group by fleet/customer
                  const groupedResults: Record<string, any[]> = {};
                  let totalCapacity = 0;
                  let isFleet = false;

                  analysisResults.results.forEach((result: any) => {
                    const data = result.extractedData || {};
                    const fleetName = data.fleetName || 'Ungrouped Sites';
                    const customer = data.customerName || result.documentSummary?.parties?.buyer || 'Unknown Customer';
                    const groupKey = data.fleetName ? `${customer} - ${fleetName}` : customer;

                    if (data.isFleetContract === 'yes' || data.fleetName) {
                      isFleet = true;
                    }

                    if (!groupedResults[groupKey]) {
                      groupedResults[groupKey] = [];
                    }
                    groupedResults[groupKey].push(result);

                    // Sum total capacity
                    const capacity = parseFloat(data.systemCapacity) || 0;
                    totalCapacity += capacity;
                  });

                  const fleetCount = Object.keys(groupedResults).length;
                  const siteCount = analysisResults.results.length;

                  return (
                    <details open className="bg-blue-50 border border-blue-200 rounded p-2">
                      <summary className="cursor-pointer font-semibold text-xs text-blue-900 mb-2">
                        📊 All Extracted Data - {isFleet ? `${fleetCount} Fleet${fleetCount > 1 ? 's' : ''}, ${siteCount} Sites` : `${siteCount} ${siteCount === 1 ? 'Site' : 'Sites'}`}
                        {totalCapacity > 0 && ` (Total: ${totalCapacity.toLocaleString()} kW)`}
                      </summary>
                      <div className="space-y-3 text-[10px] pl-3 max-h-80 overflow-y-auto">
                        {Object.entries(groupedResults).map(([fleetKey, sites]: [string, any[]], fleetIdx: number) => {
                          const fleetCapacity = sites.reduce((sum, site) => sum + (parseFloat(site.extractedData?.systemCapacity) || 0), 0);

                          return (
                            <div key={fleetIdx} className="bg-white rounded p-2 border border-blue-200">
                              {/* Fleet/Customer Header */}
                              <div className="font-semibold text-blue-900 mb-2 pb-2 border-b border-blue-200 flex justify-between items-center">
                                <span>🏢 {fleetKey}</span>
                                <span className="text-blue-700 text-[9px]">
                                  {sites.length} {sites.length === 1 ? 'Site' : 'Sites'}
                                  {fleetCapacity > 0 && ` • ${fleetCapacity.toLocaleString()} kW`}
                                </span>
                              </div>

                              {/* Sites within this fleet/customer */}
                              <div className="space-y-2">
                                {sites.map((result: any, siteIdx: number) => {
                                  const extractedData = result.extractedData || {};
                                  const docSummary = result.documentSummary || {};

                                  // Identify if this is a location-specific document
                                  const location = extractedData.siteLocation || extractedData.siteAddress || extractedData.siteName;

                                  return (
                                    <details key={siteIdx} open={siteIdx === 0} className="bg-gray-50 rounded p-2 border border-blue-100">
                                      <summary className="cursor-pointer font-semibold text-gray-800 text-[11px] mb-2 hover:text-blue-600">
                                        📍 {location || result.filename || `Site ${siteIdx + 1}`}
                                        {extractedData.systemCapacity && ` (${extractedData.systemCapacity} kW)`}
                                      </summary>
                                      <div className="grid grid-cols-2 gap-1 pl-3 pt-2">
                                        {/* Party Information */}
                                        {docSummary.parties && (
                                          <div className="col-span-2 mb-2 p-2 bg-white rounded border border-gray-200">
                                            <div className="font-semibold text-gray-700 mb-1">Parties:</div>
                                            <div className="grid grid-cols-2 gap-1 text-[9px]">
                                              {docSummary.parties.buyer && <div><span className="text-gray-500">Buyer:</span> <span className="font-medium">{docSummary.parties.buyer}</span></div>}
                                              {docSummary.parties.seller && <div><span className="text-gray-500">Seller:</span> <span className="font-medium">{docSummary.parties.seller}</span></div>}
                                              {docSummary.parties.financialOwner && <div className="col-span-2"><span className="text-gray-500">Financial Owner:</span> <span className="font-medium">{docSummary.parties.financialOwner}</span></div>}
                                            </div>
                                          </div>
                                        )}

                                        {/* All Extracted Fields */}
                                        {Object.entries(extractedData)
                                          .filter(([key, value]) => value && value !== 'NOT SPECIFIED' && value !== 'undefined')
                                          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                                          .map(([key, value]: [string, any]) => {
                                            // Format key for display
                                            const displayKey = key
                                              .replace(/([A-Z])/g, ' $1')
                                              .trim()
                                              .split(' ')
                                              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                              .join(' ');

                                            if (typeof value === 'object' && !Array.isArray(value)) {
                                              // Handle nested objects like additionalFields
                                              return (
                                                <div key={key} className="col-span-2 p-1 bg-white rounded border border-gray-100">
                                                  <span className="text-gray-600 font-medium text-[9px]">{displayKey}:</span>
                                                  <div className="pl-2 text-[9px] text-gray-700 mt-1">
                                                    {Object.entries(value).map(([nestedKey, nestedValue]) => (
                                                      <div key={nestedKey}>
                                                        <span className="text-gray-500">{nestedKey}:</span> {String(nestedValue)}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              );
                                            }

                                            // Highlight key financial and technical fields
                                            const isKeyField = ['siteId', 'systemCapacity', 'baseRate', 'annualEscalation', 'contractTerm', 'siteLocation'].includes(key);

                                            return (
                                              <div key={key} className={isKeyField ? 'font-semibold' : ''}>
                                                <span className="text-gray-600 text-[9px]">{displayKey}:</span>{' '}
                                                <span className={`${isKeyField ? 'text-blue-700 font-bold' : 'text-gray-800'} text-[9px]`}>{String(value)}</span>
                                              </div>
                                            );
                                          })}

                                        {/* Document Type and Confidence */}
                                        {result.contractType && (
                                          <div className="col-span-2 mt-2 pt-2 border-t border-gray-200 text-[9px] text-gray-500">
                                            Type: {result.contractType} | Confidence: {Math.round((result.confidence || 0) * 100)}%
                                          </div>
                                        )}
                                      </div>
                                    </details>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  );
                })()}

                {/* Business Rules */}
                {analysisResults.summary?.totalRulesExtracted > 0 && (
                  <details open className="bg-white rounded p-2">
                    <summary className="cursor-pointer font-semibold text-xs text-gray-900 mb-2">🛡️ Business Rules ({analysisResults.summary.totalRulesExtracted})</summary>
                    <div className="space-y-1 text-[10px] pl-3 max-h-60 overflow-y-auto">
                      {analysisResults.results?.flatMap((r: any) => r.extractedRules || []).map((rule: any, idx: number) => (
                        <div key={idx} className="border-b border-gray-100 pb-1 mb-1">
                          <div className="font-medium text-gray-800">{rule.name || `Rule ${idx + 1}`}</div>
                          <div className="text-gray-600 text-[9px]">{rule.description || rule.ruleText || 'No description'}</div>
                          {rule.category && (
                            <div className="text-gray-400 text-[9px]">Category: {rule.category}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Fallback: Show blueprint structure if formData is missing */}
            {analysisResults.contractBlueprint && !analysisResults.contractBlueprint?.formData && (
              <div className="border-t border-green-200 pt-3">
                <details className="bg-yellow-50 border border-yellow-200 rounded p-2">
                  <summary className="cursor-pointer font-semibold text-xs text-yellow-900 mb-2">⚠️ Blueprint Structure (Debug)</summary>
                  <pre className="text-[9px] overflow-x-auto bg-white p-2 rounded">
                    {JSON.stringify(analysisResults.contractBlueprint, null, 2)}
                  </pre>
                </details>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-green-200">
              {analysisResults.contractBlueprint && onCreateFromDocument && (
                <>
                  <button
                    onClick={handleApplyBlueprint}
                    className="flex-1 px-3 py-2 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 flex items-center justify-center space-x-1"
                    title="Use extracted data to fill contract form"
                  >
                    <ArrowRight className="h-3 w-3" />
                    <span>Use as Blueprint</span>
                  </button>
                  <button
                    onClick={handleCreateFromBlueprint}
                    disabled={creatingContract}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-1"
                    title="Create contract directly from extracted data"
                  >
                    {creatingContract ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        <span>Create Contract</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Compact Documents Grid */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-xs text-gray-500">
              {documents.length === 0 ? 'No documents uploaded' : 'No matching documents'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {filteredDocuments.map((document) => {
              // Find analysis results for this document
              const docAnalysis = analysisResults?.results?.find((r: any) =>
                r.filename === document.originalName || r.filename === document.fileName || r.filename === document.title
              );

              return (
                <div key={document.id} className="border border-gray-200 rounded bg-white overflow-hidden">
                  <div className="p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {getFileIcon(document.fileType)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1">
                            <h5 className="text-xs font-medium text-gray-900 truncate">
                              {document.title}
                            </h5>
                            {getStatusIcon(document.uploadStatus, document.processingStatus)}
                          </div>
                          <div className="flex items-center space-x-2 text-[10px] text-gray-500 mt-0.5">
                            <span>{formatFileSize(document.fileSize)}</span>
                            {document.pageCount && <span>{document.pageCount}p</span>}
                            <span className="capitalize">{getStatusText(document.uploadStatus, document.processingStatus)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        {(document.uploadStatus === 'COMPLETED' && document.processingStatus === 'COMPLETED') && (
                          <button
                            onClick={() => viewDocumentContent(document.id, document.title)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="View content"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={() => downloadDocument(document.id, document.fileName)}
                          className="p-1 text-gray-400 hover:text-green-600"
                          title="Download"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteDocument(document.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Compact Progress bar */}
                    {(document.uploadStatus === 'UPLOADING' || document.processingStatus === 'PROCESSING') && (
                      <div className="mt-1.5">
                        <div className="bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-green-600 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${document.processingStatus === 'PROCESSING' ? document.processingProgress : document.uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document Analysis Results */}
                  {docAnalysis && (
                    <div className="border-t border-gray-100 bg-gray-50 p-2">
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium text-gray-700 hover:text-green-700 flex items-center justify-between">
                          <span>Analysis Results</span>
                          <span className="text-[10px] text-gray-500">
                            {docAnalysis.extractedRules?.length || 0} rules • {Math.round((docAnalysis.confidence || 0) * 100)}% confidence
                          </span>
                        </summary>
                        <div className="mt-2 space-y-2 pl-2 border-l-2 border-green-200">
                          {/* Contract Type */}
                          {docAnalysis.documentSummary?.contractType && (
                            <div>
                              <span className="font-semibold">Type:</span> {docAnalysis.documentSummary.contractType}
                            </div>
                          )}

                          {/* Parties */}
                          {docAnalysis.documentSummary?.parties && (
                            <div>
                              <span className="font-semibold">Parties:</span>
                              <div className="pl-2 text-[10px]">
                                {docAnalysis.documentSummary.parties.buyer && <div>• Buyer: {docAnalysis.documentSummary.parties.buyer}</div>}
                                {docAnalysis.documentSummary.parties.seller && <div>• Seller: {docAnalysis.documentSummary.parties.seller}</div>}
                              </div>
                            </div>
                          )}

                          {/* Extracted Rules */}
                          {docAnalysis.extractedRules && docAnalysis.extractedRules.length > 0 && (
                            <div>
                              <span className="font-semibold">Rules ({docAnalysis.extractedRules.length}):</span>
                              <div className="pl-2 space-y-1 max-h-32 overflow-y-auto text-[10px]">
                                {docAnalysis.extractedRules.slice(0, 5).map((rule: any, rIdx: number) => (
                                  <div key={rIdx} className="text-gray-700">
                                    • {rule.description || rule.ruleText || JSON.stringify(rule).substring(0, 100)}
                                  </div>
                                ))}
                                {docAnalysis.extractedRules.length > 5 && (
                                  <div className="text-gray-500 italic">+ {docAnalysis.extractedRules.length - 5} more...</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Risk Factors */}
                          {docAnalysis.riskFactors && docAnalysis.riskFactors.length > 0 && (
                            <div>
                              <span className="font-semibold text-red-600">Risk Factors ({docAnalysis.riskFactors.length}):</span>
                              <div className="pl-2 text-[10px]">
                                {docAnalysis.riskFactors.slice(0, 3).map((risk: any, rIdx: number) => (
                                  <div key={rIdx} className="text-red-700">• {risk.description || risk}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Full mode rendering
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Contract Documents ({documents.length})
        </h2>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              console.log('🖱️  [DocumentManager] Analyze Documents button clicked! (full mode)');
              console.log('📊 [DocumentManager] Button state - analyzing:', analyzing, 'documents.length:', documents.length);
              analyzeDocuments();
            }}
            disabled={analyzing || documents.length === 0}
            className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Brain className={`w-4 h-4 mr-2 ${analyzing ? 'animate-pulse' : ''}`} />
            {analyzing ? 'Analyzing...' : 'Analyze Documents'}
          </button>
          <button
            onClick={fetchDocuments}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Document Processing Progress */}
      {analyzing && (
        <div className="bg-white border border-blue-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Analyzing Documents</h3>
                <p className="text-sm text-gray-600">Processing {documents.length} documents with AI...</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Processing documents...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This may take a few minutes depending on document size and complexity.
            </p>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResults && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-start">
            <Brain className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800 mb-3">Analysis Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
                <div className="bg-white rounded p-3">
                  <div className="text-gray-600">Documents Analyzed</div>
                  <div className="text-lg font-semibold text-blue-700">{analysisResults.documentsAnalyzed || 0}</div>
                </div>
                <div className="bg-white rounded p-3">
                  <div className="text-gray-600">Contract Types Found</div>
                  <div className="text-lg font-semibold text-blue-700">{Array.isArray(analysisResults.summary?.contractTypes) ? analysisResults.summary.contractTypes.length : 0}</div>
                </div>
                <div className="bg-white rounded p-3">
                  <div className="text-gray-600">Average Confidence</div>
                  <div className="text-lg font-semibold text-blue-700">{Math.round((analysisResults.summary?.averageConfidence || 0) * 100)}%</div>
                </div>
              </div>

              {/* Financial Summary */}
              {analysisResults.financialSummary && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center">
                    <span className="mr-2">💰</span> Financial Summary
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {analysisResults.financialSummary.totalContractValue && (
                      <div className="bg-white rounded p-2">
                        <div className="text-[10px] text-gray-500 uppercase">Total Value</div>
                        <div className="text-sm font-bold text-green-700">
                          ${(analysisResults.financialSummary.totalContractValue / 1000000).toFixed(2)}M
                        </div>
                      </div>
                    )}
                    {analysisResults.financialSummary.annualCost && (
                      <div className="bg-white rounded p-2">
                        <div className="text-[10px] text-gray-500 uppercase">Annual Cost</div>
                        <div className="text-sm font-bold text-green-700">
                          ${(analysisResults.financialSummary.annualCost / 1000).toFixed(0)}K
                        </div>
                      </div>
                    )}
                    {analysisResults.financialSummary.escalatedTotalValue && (
                      <div className="bg-white rounded p-2">
                        <div className="text-[10px] text-gray-500 uppercase">Escalated Total</div>
                        <div className="text-sm font-bold text-green-700">
                          ${(analysisResults.financialSummary.escalatedTotalValue / 1000000).toFixed(2)}M
                        </div>
                      </div>
                    )}
                    {analysisResults.financialSummary.paymentFrequency && (
                      <div className="bg-white rounded p-2">
                        <div className="text-[10px] text-gray-500 uppercase">Payment Frequency</div>
                        <div className="text-sm font-semibold text-green-700 capitalize">
                          {analysisResults.financialSummary.paymentFrequency}
                        </div>
                      </div>
                    )}
                    {analysisResults.financialSummary.estimatedRevenue && (
                      <div className="bg-white rounded p-2">
                        <div className="text-[10px] text-gray-500 uppercase">Est. Revenue</div>
                        <div className="text-sm font-bold text-green-700">
                          ${(analysisResults.financialSummary.estimatedRevenue / 1000000).toFixed(2)}M
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Business Rules Breakdown */}
              {analysisResults.summary && (analysisResults.summary.totalRulesExtracted > 0 || analysisResults.summary.totalPaymentRules || analysisResults.summary.totalPerformanceGuarantees) && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-purple-800 mb-3 flex items-center">
                    <span className="mr-2">📋</span> Business Rules Breakdown
                  </h4>

                  {/* Rules by Category */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3">
                    {analysisResults.summary.totalRulesExtracted > 0 && (
                      <div className="bg-white rounded p-2 text-center">
                        <div className="text-xl font-bold text-purple-600">{analysisResults.summary.totalRulesExtracted}</div>
                        <div className="text-[10px] text-gray-600">Total Rules</div>
                      </div>
                    )}
                    {(analysisResults.summary.totalPaymentRules ?? 0) > 0 && (
                      <div className="bg-white rounded p-2 text-center">
                        <div className="text-xl font-bold text-green-600">{analysisResults.summary.totalPaymentRules}</div>
                        <div className="text-[10px] text-gray-600">Payment</div>
                      </div>
                    )}
                    {(analysisResults.summary.totalPerformanceGuarantees ?? 0) > 0 && (
                      <div className="bg-white rounded p-2 text-center">
                        <div className="text-xl font-bold text-blue-600">{analysisResults.summary.totalPerformanceGuarantees}</div>
                        <div className="text-[10px] text-gray-600">Performance</div>
                      </div>
                    )}
                    {(analysisResults.summary.totalOperationalRequirements ?? 0) > 0 && (
                      <div className="bg-white rounded p-2 text-center">
                        <div className="text-xl font-bold text-orange-600">{analysisResults.summary.totalOperationalRequirements}</div>
                        <div className="text-[10px] text-gray-600">Operational</div>
                      </div>
                    )}
                    {(analysisResults.summary.totalComplianceRequirements ?? 0) > 0 && (
                      <div className="bg-white rounded p-2 text-center">
                        <div className="text-xl font-bold text-indigo-600">{analysisResults.summary.totalComplianceRequirements}</div>
                        <div className="text-[10px] text-gray-600">Compliance</div>
                      </div>
                    )}
                    {(analysisResults.summary.totalTerminationClauses ?? 0) > 0 && (
                      <div className="bg-white rounded p-2 text-center">
                        <div className="text-xl font-bold text-red-600">{analysisResults.summary.totalTerminationClauses}</div>
                        <div className="text-[10px] text-gray-600">Termination</div>
                      </div>
                    )}
                  </div>

                  {/* Rules by Priority */}
                  {analysisResults.summary.rulesByPriority && (
                    <div className="bg-white rounded p-3">
                      <div className="text-[10px] uppercase tracking-wide text-purple-600 font-semibold mb-2">By Priority</div>
                      <div className="flex justify-between items-center space-x-2 text-xs">
                        {analysisResults.summary.rulesByPriority.critical > 0 && (
                          <div className="flex items-center">
                            <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                            <span className="font-semibold text-red-700">{analysisResults.summary.rulesByPriority.critical}</span>
                            <span className="text-gray-500 ml-1">Critical</span>
                          </div>
                        )}
                        {analysisResults.summary.rulesByPriority.high > 0 && (
                          <div className="flex items-center">
                            <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-1"></span>
                            <span className="font-semibold text-orange-700">{analysisResults.summary.rulesByPriority.high}</span>
                            <span className="text-gray-500 ml-1">High</span>
                          </div>
                        )}
                        {analysisResults.summary.rulesByPriority.medium > 0 && (
                          <div className="flex items-center">
                            <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                            <span className="font-semibold text-yellow-700">{analysisResults.summary.rulesByPriority.medium}</span>
                            <span className="text-gray-500 ml-1">Medium</span>
                          </div>
                        )}
                        {analysisResults.summary.rulesByPriority.low > 0 && (
                          <div className="flex items-center">
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                            <span className="font-semibold text-green-700">{analysisResults.summary.rulesByPriority.low}</span>
                            <span className="text-gray-500 ml-1">Low</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Risk & Compliance Dashboard */}
              {((analysisResults.summary?.totalRiskFactors ?? 0) > 0 || (analysisResults.summary?.totalAnomalies ?? 0) > 0 || (analysisResults.allRiskFactors?.length ?? 0) > 0) && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-red-800 mb-3 flex items-center">
                    <span className="mr-2">⚠️</span> Risk & Compliance Dashboard
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    {(analysisResults.summary.totalRiskFactors ?? 0) > 0 && (
                      <div className="bg-white rounded p-2">
                        <div className="text-[10px] text-gray-500 uppercase">Risk Factors</div>
                        <div className="text-lg font-bold text-red-600">{analysisResults.summary.totalRiskFactors}</div>
                      </div>
                    )}
                    {(analysisResults.summary.totalAnomalies ?? 0) > 0 && (
                      <div className="bg-white rounded p-2">
                        <div className="text-[10px] text-gray-500 uppercase">Anomalies</div>
                        <div className="text-lg font-bold text-orange-600">{analysisResults.summary.totalAnomalies}</div>
                      </div>
                    )}
                    {(analysisResults.summary.totalComplianceRequirements ?? 0) > 0 && (
                      <div className="bg-white rounded p-2">
                        <div className="text-[10px] text-gray-500 uppercase">Compliance Items</div>
                        <div className="text-lg font-bold text-indigo-600">{analysisResults.summary.totalComplianceRequirements}</div>
                      </div>
                    )}
                    {(analysisResults.summary.totalMilestones ?? 0) > 0 && (
                      <div className="bg-white rounded p-2">
                        <div className="text-[10px] text-gray-500 uppercase">Key Milestones</div>
                        <div className="text-lg font-bold text-blue-600">{analysisResults.summary.totalMilestones}</div>
                      </div>
                    )}
                  </div>

                  {/* Risk Factor Details */}
                  {Array.isArray(analysisResults.allRiskFactors) && analysisResults.allRiskFactors.length > 0 && (
                    <div className="bg-white rounded p-3">
                      <div className="text-[10px] uppercase tracking-wide text-red-600 font-semibold mb-2">Top Risk Factors</div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {analysisResults.allRiskFactors.slice(0, 5).map((risk: any, idx: number) => (
                          <div key={idx} className="text-xs border-l-2 border-red-400 pl-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-800">{risk.category || 'Unknown'}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded ${
                                risk.severity === 'critical' ? 'bg-red-200 text-red-800' :
                                risk.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                                risk.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                                'bg-green-200 text-green-800'
                              }`}>
                                {risk.severity || 'unknown'}
                              </span>
                            </div>
                            <div className="text-gray-600 mt-1">{risk.description || 'No description'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stakeholders Section */}
              {Array.isArray(analysisResults.allStakeholders) && analysisResults.allStakeholders.length > 0 && (
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-cyan-800 mb-3 flex items-center">
                    <span className="mr-2">👥</span> Parties & Stakeholders
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {analysisResults.allStakeholders.map((stakeholder: any, idx: number) => (
                      <div key={idx} className="bg-white rounded p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-800">{stakeholder.name || 'Unknown'}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded capitalize">
                            {stakeholder.role?.replace('_', ' ') || 'unknown'}
                          </span>
                        </div>
                        {stakeholder.contact && (
                          <div className="text-gray-600 mt-1 text-[10px]">
                            {stakeholder.contact.email && <div>📧 {stakeholder.contact.email}</div>}
                            {stakeholder.contact.phone && <div>📞 {stakeholder.contact.phone}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestones Timeline */}
              {Array.isArray(analysisResults.allMilestones) && analysisResults.allMilestones.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center">
                    <span className="mr-2">📅</span> Key Milestones
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {analysisResults.allMilestones
                      .sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''))
                      .map((milestone: any, idx: number) => (
                        <div key={idx} className="bg-white rounded p-2 text-xs flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">{milestone.description || 'Milestone'}</div>
                            {milestone.responsibleParty && (
                              <div className="text-gray-600 text-[10px]">Responsible: {milestone.responsibleParty}</div>
                            )}
                          </div>
                          <div className="text-right ml-2">
                            <div className="font-semibold text-amber-700">{milestone.date || 'TBD'}</div>
                            <div className="text-[10px] text-gray-500 capitalize">{milestone.type?.replace('_', ' ') || ''}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {Array.isArray(analysisResults.results) && analysisResults.results.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-blue-800">Document Details:</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {analysisResults.results.map((result: any, index: number) => (
                      <div key={index} className="bg-white rounded p-2 text-xs">
                        <div className="font-medium">{result.filename || 'Unknown'}</div>
                        <div className="text-gray-600">Type: {result.contractType || 'Not specified'}</div>
                        <div className="text-gray-600">Parties: {Array.isArray(result.parties) ? result.parties.join(', ') : 'Not specified'}</div>
                        <div className="text-gray-600">Confidence: {Math.round((result.confidence || 0) * 100)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {blueprint && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-blue-800">AI Contract Blueprint</h4>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={saveAsContract}
                        disabled={creatingContract}
                        className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingContract ? 'Saving...' : 'Save as Contract'}
                        {!creatingContract && <CheckCircle className="w-4 h-4 ml-2" />}
                      </button>
                      {onCreateFromDocument && (
                        <button
                          onClick={handleApplyBlueprint}
                          className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Use Blueprint in Builder
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                      )}
                    </div>
                  </div>

                  {analysisResults.contractSummaryNarrative && (
                    <p className="text-xs text-blue-900 bg-white border border-blue-100 rounded p-3 leading-relaxed">
                      {analysisResults.contractSummaryNarrative}
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {renderBlueprintField('Customer', blueprint.formData.customerName)}
                    {renderBlueprintField('Solution Type', blueprint.formData.solutionType)}
                    {renderBlueprintField('Capacity', formatDisplay(blueprint.formData.ratedCapacity, 0, { suffix: ' kW' }))}
                    {renderBlueprintField('Term', formatDisplay(blueprint.formData.contractTerm, 0, { suffix: ' years' }))}
                    {renderBlueprintField('Base Rate', formatDisplay(blueprint.formData.baseRate, 3, { prefix: '$', suffix: '/kWh' }))}
                    {renderBlueprintField('Escalation', formatDisplay(blueprint.formData.annualEscalation, 2, { suffix: '%' }))}
                    {renderBlueprintField('Availability', formatDisplay(blueprint.formData.outputWarrantyPercent, 1, { suffix: '%' }))}
                    {renderBlueprintField('Efficiency', formatDisplay(blueprint.formData.efficiencyWarrantyPercent, 1, { suffix: '%' }))}
                    {renderBlueprintField('Voltage', blueprint.formData.gridParallelVoltage)}
                  </div>

                  {topRules.length > 0 && (
                    <div className="bg-white border border-blue-100 rounded p-3">
                      <div className="text-[11px] uppercase tracking-wide text-blue-500 font-semibold mb-2">Key Rules Identified</div>
                      <ul className="space-y-2">
                        {topRules.map(rule => (
                          <li key={rule.id} className="text-xs text-gray-700">
                            <div className="font-semibold text-gray-900">{rule.name}</div>
                            <div>{rule.mappedValue || rule.description}</div>
                            <div className="text-[11px] text-gray-500">Confidence: {Math.round((rule.confidence ?? 0) * 100)}%</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              <button 
                onClick={() => setAnalysisResults(null)}
                className="mt-3 text-xs text-blue-600 hover:text-blue-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      {(enableSearch || enableFiltering) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {enableSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          )}

          {enableFiltering && (
            <>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Types</option>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Status</option>
                <option value="complete">Complete</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split('-');
                  setSortBy(by as any);
                  setSortOrder(order as any);
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="size-desc">Largest First</option>
                <option value="size-asc">Smallest First</option>
              </select>
            </>
          )}
        </div>
      )}

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {documents.length === 0 
              ? 'No documents have been uploaded for this contract yet.'
              : 'No documents match your current search criteria.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((document) => (
            <div key={document.id} className="border border-gray-200 rounded-lg bg-white shadow-sm">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getFileIcon(document.fileType)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {document.title}
                        </h4>
                        {getStatusIcon(document.uploadStatus, document.processingStatus)}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span>{DOCUMENT_TYPE_LABELS[document.documentType] || document.documentType}</span>
                        <span>{formatFileSize(document.fileSize)}</span>
                        {document.pageCount && <span>{document.pageCount} pages</span>}
                        {document.wordCount && <span>{document.wordCount.toLocaleString()} words</span>}
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(document.uploadDate)}</span>
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Status: {getStatusText(document.uploadStatus, document.processingStatus)}
                        {document.errorMessage && (
                          <span className="text-red-600 ml-2">- {document.errorMessage}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {(document.uploadStatus === 'COMPLETED' && document.processingStatus === 'COMPLETED') && (
                      <button
                        onClick={() => viewDocumentContent(document.id, document.title)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                        title="View content"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      onClick={() => downloadDocument(document.id, document.fileName)}
                      className="p-2 text-gray-400 hover:text-green-600"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>

                    {(document.uploadStatus === 'FAILED' || document.processingStatus === 'FAILED') && (
                      <button
                        onClick={() => retryProcessing(document.id)}
                        className="p-2 text-gray-400 hover:text-yellow-600"
                        title="Retry processing"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      onClick={() => deleteDocument(document.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => setShowDetails(showDetails === document.id ? null : document.id)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {showDetails === document.id ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>

                {/* Progress bars for uploading/processing */}
                {(document.uploadStatus === 'UPLOADING' || document.processingStatus === 'PROCESSING') && (
                  <div className="mt-3">
                    {document.uploadStatus === 'UPLOADING' && (
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Uploading</span>
                          <span>{document.uploadProgress}%</span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${document.uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {document.processingStatus === 'PROCESSING' && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Processing</span>
                          <span>{document.processingProgress}%</span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${document.processingProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Document Details */}
                {showDetails === document.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">File Information</h5>
                        <dl className="space-y-1">
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Original Name:</dt>
                            <dd className="text-gray-900">{document.originalName}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-500">File Type:</dt>
                            <dd className="text-gray-900">{document.fileType}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-500">File Size:</dt>
                            <dd className="text-gray-900">{formatFileSize(document.fileSize)}</dd>
                          </div>
                        </dl>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Processing Information</h5>
                        <dl className="space-y-1">
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Upload Status:</dt>
                            <dd className="text-gray-900">{document.uploadStatus}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-500">Processing Status:</dt>
                            <dd className="text-gray-900">{document.processingStatus}</dd>
                          </div>
                          {document.extractionCompleted && (
                            <div className="flex justify-between">
                              <dt className="text-gray-500">Completed:</dt>
                              <dd className="text-gray-900">{formatDate(document.extractionCompleted)}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
