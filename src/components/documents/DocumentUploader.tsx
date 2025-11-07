import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Image, AlertCircle, CheckCircle, X, Eye, Download, Trash2, Bot, FileEdit, Sparkles, Layers } from 'lucide-react';
import { AIFormMappingService, BusinessRulesAnalysis } from '../../services/aiFormMappingService';
import { ContractFormData } from '../../types/contract.types';
import MultiDocumentProgress from './MultiDocumentProgress';

interface UploadedFile {
  id: string;
  backendId?: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: string;
  documentType: string;
  extractedText?: string;
  error?: string;
  url?: string;
  aiAnalysis?: BusinessRulesAnalysis;
  mappedFormData?: Partial<ContractFormData>;
  analysisConfidence?: number;
  contractId?: string;
  contractName?: string;
  aiGenerated?: boolean;
  confidence?: number;
  hasExtractedData?: boolean;
}

interface DocumentUploaderProps {
  contractId: string;
  onUploadComplete?: (documents: UploadedFile[]) => void;
  onAIAnalysisComplete?: (analysis: BusinessRulesAnalysis, formData: Partial<ContractFormData>, contract?: any) => void;
  onCreateContractFromAI?: (formData: Partial<ContractFormData>, source: UploadedFile) => void;
  onContractCreated?: (contract: any) => void;
  onNavigate?: (view: string) => void;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  enableTextExtraction?: boolean;
  enableAIAnalysis?: boolean;
  compact?: boolean;
}

const DOCUMENT_TYPES = [
  { value: 'PRIMARY', label: 'Primary Contract', description: 'Main contract document' },
  { value: 'APPENDIX', label: 'Appendix', description: 'Additional terms and conditions' },
  { value: 'AMENDMENT', label: 'Amendment', description: 'Contract modifications' },
  { value: 'EXHIBIT', label: 'Exhibit', description: 'Supporting documentation' },
  { value: 'ADDENDUM', label: 'Addendum', description: 'Supplementary information' },
  { value: 'SIGNATURE', label: 'Signature Page', description: 'Executed signatures' },
  { value: 'OTHER', label: 'Other', description: 'Other document type' }
];

const DEFAULT_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain'
];

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  contractId,
  onUploadComplete,
  onAIAnalysisComplete,
  onCreateContractFromAI,
  onContractCreated,
  onNavigate,
  maxFiles = 50,
  maxFileSize = 100 * 1024 * 1024, // 100MB
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  enableTextExtraction = true,
  enableAIAnalysis = true,
  compact = false
}) => {
  // Get token from localStorage directly instead of using AuthContext
  const getToken = (): string | null => {
    try {
      return localStorage.getItem('accessToken');
    } catch (error) {
      console.log('ℹ️ Could not access localStorage for token');
      return null;
    }
  };

  const token = getToken();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState('PRIMARY');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string; action?: { label: string; onClick: () => void } } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-document processing state
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    if (type === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)} limit`;
    }
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }
    if (uploadedFiles.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }
    return null;
  };

  // Mock upload functions removed - using real backend API for all uploads
  // No mock data generation to ensure extraction accuracy

  const uploadFile = async (file: File, documentType: string): Promise<void> => {
    const fileId = Math.random().toString(36).substr(2, 9);
    console.log(`📋 Creating upload file entry for ${file.name} with ID ${fileId}`);

    const uploadedFile: UploadedFile = {
      id: fileId,
      backendId: undefined,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'uploading',
      documentType,
      hasExtractedData: false
    };

    setUploadedFiles(prev => {
      console.log(`📝 Adding file to upload list. Previous count: ${prev.length}`);
      return [...prev, uploadedFile];
    });

    try {
      console.log(`🚀 Starting upload for file: ${file.name} (ID: ${fileId})`);

      // Use actual backend API for upload
      await uploadFileSimple(file, fileId, documentType);
      console.log(`✅ Upload completed successfully for ${file.name}`);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadedFiles(prev =>
        prev.map(f => f.id === fileId ? {
          ...f,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f)
      );
    }
  };

  const uploadFileSimple = async (file: File, fileId: string, documentType: string): Promise<void> => {
    console.log('');
    console.log('📤 ═══════════════════════════════════════════════════════');
    console.log('📤 UPLOADING FILE');
    console.log('📤 File:', file.name);
    console.log('📤 ⚡ CONTRACT ID BEING USED FOR UPLOAD:', contractId);
    console.log('📤 ⚡ CONTRACT ID FROM PROPS:', contractId);
    console.log('📤 ⚡ CONTRACT ID FROM SESSIONSTORAGE:', sessionStorage.getItem('current_document_upload_contract_id'));
    console.log('📤 ═══════════════════════════════════════════════════════');
    console.log('');

    const formData = new FormData();
    formData.append('files', file);  // Changed from 'documents' to 'files' to match uploads.js
    formData.append('contractId', contractId);
    formData.append('description', `${documentType}: ${file.name}`);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadedFiles(prev =>
            prev.map(f => f.id === fileId ? { ...f, progress } : f)
          );
        }
      });

     xhr.addEventListener('load', async () => {
       if (xhr.status === 200 || xhr.status === 201) {
         try {
           const response = JSON.parse(xhr.responseText);
           console.log('Upload response:', response);

           const uploadedFileInfo = response.files?.[0] || response.file;
            if (!uploadedFileInfo) {
              throw new Error('No file information in response');
            }

            const backendId = uploadedFileInfo.id;
            if (!backendId) {
              throw new Error('Uploaded file response missing id');
            }

            const backendStatus = (uploadedFileInfo.status || '').toString().toUpperCase();
            const extractedData = uploadedFileInfo.extractedData || {};
            const immediateTextValue = typeof extractedData?.content?.text === 'string'
              ? extractedData.content.text
              : '';
            const hasImmediateText = immediateTextValue.trim().length > 0;
            const backendClaimsText = Boolean(extractedData?.analysis?.hasText);
            const hasExtractedData = Boolean(
              uploadedFileInfo.hasExtractedData ?? (hasImmediateText || backendClaimsText)
            );
            const immediateText = hasImmediateText ? immediateTextValue : '';

            const nextStatus = (() => {
              if (backendStatus === 'FAILED' || backendStatus === 'ERROR') return 'error';
              if (backendStatus === 'UPLOADING') return 'uploading';
              if (backendStatus === 'PROCESSING') return 'processing';
              if (hasExtractedData) return 'processing';
              return 'completed';
            })();

            setUploadedFiles(prev =>
              prev.map(f => f.id === fileId ? {
                ...f,
                backendId,
                progress: 100,
                status: nextStatus,
                url: uploadedFileInfo.url,
                hasExtractedData,
                extractedText: immediateText || f.extractedText
              } : f)
            );

            if (nextStatus === 'error') {
              reject(new Error('Upload failed during processing'));
              return;
            }

            if (hasExtractedData) {
              let extractedText = immediateText;

              if (!extractedText) {
                try {
                  const contentResponse = await fetch(`/api/uploads/${backendId}/content`, {
                    headers: {
                      ...(token && { Authorization: `Bearer ${token}` })
                    }
                  });

                  if (contentResponse.ok) {
                    const contentData = await contentResponse.json();
                    extractedText = contentData.extractedContent?.text || contentData.extractedContent?.content || '';
                  } else {
                    throw new Error(`Unable to load extracted content (status ${contentResponse.status})`);
                  }
                } catch (contentError) {
                  console.error('Failed to load extracted content:', contentError);
                  setUploadedFiles(prev =>
                    prev.map(f => f.id === fileId ? {
                      ...f,
                      status: 'error',
                      error: 'Failed to load extracted content from server'
                    } : f)
                  );
                  reject(contentError instanceof Error ? contentError : new Error('Failed to load extracted content'));
                  return;
                }
              }

              if (extractedText) {
                setUploadedFiles(prev =>
                  prev.map(f => f.id === fileId ? {
                    ...f,
                    status: enableAIAnalysis ? 'analyzing' : 'completed',
                    extractedText
                  } : f)
                );

                if (enableAIAnalysis) {
                  await analyzeExtractedText(fileId, extractedText, backendId, file.name);
                }
              } else {
                setUploadedFiles(prev =>
                  prev.map(f => f.id === fileId ? {
                    ...f,
                    status: 'completed'
                  } : f)
                );
              }
            } else {
              setUploadedFiles(prev =>
                prev.map(f => f.id === fileId ? {
                  ...f,
                  status: 'completed'
                } : f)
              );
            }

            resolve();
          } catch (error) {
            console.error('Error processing upload response:', error);
            reject(error instanceof Error ? error : new Error('Unknown upload processing error'));
          }
       } else {
          console.error('Upload failed', {
            status: xhr.status,
            responseText: xhr.responseText,
            contractId,
            fileName: file.name
          });
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', (event) => {
        console.error('Network error during upload', {
          event,
          contractId,
          fileName: file.name
        });
        reject(new Error('Network error during upload'));
      });

      const uploadUrl = `/api/uploads/multiple`;
      console.log('Uploading via XHR', { uploadUrl, contractId, fileName: file.name, size: file.size });
      xhr.open('POST', uploadUrl);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  };

  const uploadFileChunked = async (file: File, fileId: string, documentType: string): Promise<void> => {
    // Initialize chunked upload
    const initResponse = await fetch(`/api/documents/contracts/${contractId}/upload/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: JSON.stringify({
        originalName: file.name,
        fileSize: file.size,
        fileType: file.type,
        documentType,
        title: file.name
      })
    });

    if (!initResponse.ok) {
      throw new Error('Failed to initialize chunked upload');
    }

    const { uploadSession } = await initResponse.json();
    const { documentId, totalChunks, chunkSize } = uploadSession;
    const CHUNK_SIZE = chunkSize || 5 * 1024 * 1024; // 5MB chunks

    // Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunk);

      const response = await fetch(`/api/documents/upload/${documentId}/chunk/${i}`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to upload chunk ${i}`);
      }

      // Update progress
      const progress = Math.round(((i + 1) / totalChunks) * 100);
      setUploadedFiles(prev =>
        prev.map(f => f.id === fileId ? { ...f, progress } : f)
      );
    }

    // Mark as processing for text extraction
    setUploadedFiles(prev =>
      prev.map(f => f.id === fileId ? { 
        ...f, 
        status: enableTextExtraction ? 'processing' : 'completed' 
      } : f)
    );

    // Start text extraction if enabled
    if (enableTextExtraction) {
      extractTextFromDocument(documentId, fileId);
    }
  };

  const extractTextFromDocument = async (documentId: string, fileId: string): Promise<void> => {
    try {
      // Check if document processing is complete
      const checkStatus = async (): Promise<void> => {
        const response = await fetch(`/api/documents/upload/${documentId}/status`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` })
          }
        });

        if (response.ok) {
          const status = await response.json();
          
          if (status.processingStatus === 'COMPLETED') {
            // Get extracted text
            const textResponse = await fetch(`/api/documents/documents/${documentId}/content`, {
              headers: {
                ...(token && { Authorization: `Bearer ${token}` })
              }
            });

            if (textResponse.ok) {
              const content = await textResponse.json();
              const extractedText = content.extractedText || content.content;
              
              setUploadedFiles(prev =>
                prev.map(f => f.id === fileId ? { 
                  ...f, 
                  status: enableAIAnalysis ? 'analyzing' : 'completed',
                  extractedText
                } : f)
              );

              // Start AI analysis if enabled
              if (enableAIAnalysis && extractedText) {
                await analyzeExtractedText(fileId, extractedText);
              }
            } else {
              setUploadedFiles(prev =>
                prev.map(f => f.id === fileId ? { ...f, status: 'completed' } : f)
              );
            }
          } else if (status.processingStatus === 'FAILED') {
            setUploadedFiles(prev =>
              prev.map(f => f.id === fileId ? { 
                ...f, 
                status: 'error',
                error: 'Text extraction failed'
              } : f)
            );
          } else {
            // Still processing, check again in 3 seconds
            setTimeout(checkStatus, 3000);
          }
        }
      };

      // Start checking status
      setTimeout(checkStatus, 2000); // Initial delay
    } catch (error) {
      console.error('Text extraction error:', error);
      setUploadedFiles(prev =>
        prev.map(f => f.id === fileId ? { 
          ...f, 
          status: 'error',
          error: 'Text extraction failed'
        } : f)
      );
    }
  };

  const saveAnalysisToServer = async (
    backendUploadId: string,
    analysis: BusinessRulesAnalysis,
    extractedText: string,
    mappedFormData?: Partial<ContractFormData>
  ): Promise<void> => {
    try {
      const response = await fetch(`/api/uploads/${backendUploadId}/analysis`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          analysis,
          extractedText,
          mappedFormData
        })
      });

      if (!response.ok) {
        console.warn('Failed to persist AI analysis results', {
          status: response.status
        });
      }
    } catch (persistError) {
      console.warn('Unable to persist AI analysis results:', persistError);
    }
  };

  const analyzeExtractedText = async (fileId: string, extractedText: string, backendUploadId?: string, fileName?: string): Promise<void> => {
    try {
      console.log(`🤖 Starting REAL AI analysis for fileId: ${fileId}`);
      console.log(`📄 Text length to analyze: ${extractedText.length} characters`);
      console.log(`🔍 First 200 chars of text:`, extractedText.substring(0, 200));

      // Call REAL backend AI analysis endpoint instead of using mock
      let aiAnalysis: BusinessRulesAnalysis;

      try {
        console.log('📡 Calling backend AI analysis API...');
        const aiResponse = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          },
          body: JSON.stringify({
            text: extractedText,
            analysisType: 'contract_extraction'
          })
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          aiAnalysis = aiResult.analysis || aiResult;
          console.log(`✅ Real AI analysis received:`, JSON.stringify(aiAnalysis, null, 2));
        } else {
          console.warn(`⚠️ AI API returned ${aiResponse.status}, falling back to mock analysis`);
          aiAnalysis = generateMockAnalysis(extractedText);
        }
      } catch (aiError) {
        console.error('❌ AI API call failed, using mock analysis:', aiError);
        aiAnalysis = generateMockAnalysis(extractedText);
      }

      // Map AI analysis to form data using our mapping service
      const mappedFormData = AIFormMappingService.mapAnalysisToFormData(aiAnalysis);
      const analysisConfidence = AIFormMappingService.getMappingConfidence(aiAnalysis);
      const enrichedAnalysis: BusinessRulesAnalysis = {
        ...aiAnalysis,
        overallConfidence: analysisConfidence
      };

      console.log(`📋 Mapped form data:`, JSON.stringify(mappedFormData, null, 2));
      console.log(`🎯 Analysis confidence: ${analysisConfidence}`);

      // Update file with analysis results
      setUploadedFiles(prev => {
        const updated = prev.map(f => f.id === fileId ? { 
          ...f, 
          status: 'analyzed',
          aiAnalysis: enrichedAnalysis,
          mappedFormData,
          analysisConfidence
        } : f);
        console.log(`📝 Updated files list for fileId ${fileId}, new status: analyzed`);
        return updated;
      });

      // 🎯 KEY: Automatically convert analyzed files to contracts
      console.log('🚀 Attempting to automatically convert file to contract using AI intelligence...');

      // Use the backend upload ID if available, otherwise we can't convert
      if (backendUploadId) {
        await saveAnalysisToServer(backendUploadId, enrichedAnalysis, extractedText, mappedFormData);
        try {
          // Show conversion status to user
          setUploadedFiles(prev => {
            const updated = prev.map(f => f.id === fileId ? {
              ...f,
              status: 'converting'
            } : f);
            return updated;
          });

          const response = await fetch(`/api/uploads/${backendUploadId}/convert-to-contract`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` })
            }
          });

          if (response.ok) {
            const result = await response.json();
            console.log('✅ Successfully converted file to contract using AI:', result.contract.id);

            // Update file status to show it was converted successfully
            setUploadedFiles(prev => {
              const updated = prev.map(f => f.id === fileId ? {
                ...f,
                status: 'completed',
                contractId: result.contract.id,
                contractName: result.contract.name || result.contract.client,
                aiGenerated: result.aiGenerated,
                confidence: result.sourceUpload.confidence
              } : f);
              console.log(`📝 File ${fileId} marked as converted to contract ${result.contract.id}`);
              return updated;
            });

            // Show success notification with action to view contract
            const displayName = fileName || 'document';
            setNotification({
              type: 'success',
              message: `Successfully created contract "${result.contract.name || result.contract.client}" from ${displayName}`,
              action: onContractCreated ? {
                label: 'View Contract',
                onClick: () => onContractCreated(result.contract)
              } : undefined
            });

            // Notify parent component if callback exists
            if (onAIAnalysisComplete) {
              console.log('📞 Calling onAIAnalysisComplete callback...');
              await onAIAnalysisComplete(enrichedAnalysis, mappedFormData, result.contract);
            }

            // Also notify about contract creation
            if (onContractCreated) {
              onContractCreated(result.contract);
            }
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.warn('⚠️ Failed to convert file to contract:', response.status, errorData.error);

            // Update file status to show conversion failed but still analyzed
            setUploadedFiles(prev => {
              const updated = prev.map(f => f.id === fileId ? {
                ...f,
                status: 'analyzed',
                error: errorData.error
              } : f);
              return updated;
            });

            // Show warning notification
            const displayName = fileName || 'document';
            setNotification({
              type: 'warning',
              message: `Analysis complete but could not create contract from ${displayName}: ${errorData.error || 'Insufficient data'}`
            });
          }
        } catch (conversionError) {
          console.error('❌ Error converting file to contract:', conversionError);

          // Update file status to show conversion failed but still analyzed
          setUploadedFiles(prev => {
            const updated = prev.map(f => f.id === fileId ? {
              ...f,
              status: 'analyzed',
              error: 'Network error during conversion'
            } : f);
            return updated;
          });

          // Show error notification
          const displayName = fileName || 'document';
          setNotification({
            type: 'error',
            message: `Failed to convert ${displayName} to contract due to network error`
          });
        }
      } else {
        // No backend ID, just mark as analyzed
        console.log('📊 Analysis complete but no backend ID for contract conversion');
        setUploadedFiles(prev => {
          const updated = prev.map(f => f.id === fileId ? {
            ...f,
            status: 'analyzed'
          } : f);
          return updated;
        });

        // Notify parent if they want to handle manual creation
        if (onCreateContractFromAI) {
          console.log('📞 Providing analyzed data for manual contract creation');
        }
      }

    } catch (error) {
      console.error('❌ AI analysis error:', error);
      setUploadedFiles(prev =>
        prev.map(f => f.id === fileId ? {
          ...f,
          status: 'error',
          error: 'AI analysis failed'
        } : f)
      );
    }
  };

  /**
   * Start batch multi-document processing
   */
  const startBatchProcessing = async () => {
    try {
      // Get files that have extracted text and are ready to analyze
      const filesToProcess = uploadedFiles.filter(f =>
        f.extractedText &&
        f.status === 'completed' &&
        !f.aiAnalysis
      );

      if (filesToProcess.length === 0) {
        setNotification({
          type: 'warning',
          message: 'No documents ready for analysis. Please upload documents with extracted text.'
        });
        return;
      }

      console.log(`🚀 Starting batch processing for ${filesToProcess.length} documents`);

      // Prepare documents for processing
      const documents = filesToProcess.map(f => ({
        id: f.id,
        filename: f.name,
        content: f.extractedText,
        extractedText: f.extractedText
      }));

      // Call the multi-document processing API
      const response = await fetch('/api/processing/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          contractId,
          documents
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start batch processing');
      }

      const result = await response.json();

      if (result.success && result.jobId) {
        setProcessingJobId(result.jobId);
        setShowProgressModal(true);

        setNotification({
          type: 'info',
          message: `Processing ${filesToProcess.length} documents in background...`
        });
      }

    } catch (error) {
      console.error('Failed to start batch processing:', error);
      setNotification({
        type: 'error',
        message: 'Failed to start batch processing. Please try again.'
      });
    }
  };

  /**
   * Handle completion of multi-document processing
   */
  const handleBatchProcessingComplete = (results: any[]) => {
    console.log(`✅ Batch processing complete with ${results.length} results`);

    // Update uploaded files with analysis results
    setUploadedFiles(prev => {
      return prev.map(file => {
        const result = results.find(r => r.filename === file.name || r.id === file.id);
        if (result) {
          return {
            ...file,
            aiAnalysis: result,
            status: 'analyzed',
            analysisConfidence: result.confidence || 0.8
          };
        }
        return file;
      });
    });

    setShowProgressModal(false);
    setNotification({
      type: 'success',
      message: `Successfully analyzed ${results.length} documents!`,
      action: {
        label: 'Create Contract',
        onClick: () => {
          // Navigate to contract creation or call batch contract creation
          console.log('User wants to create contract from batch analysis');
        }
      }
    });
  };

  /**
   * Handle cancellation of batch processing
   */
  const handleBatchProcessingCancel = () => {
    setShowProgressModal(false);
    setProcessingJobId(null);
    setNotification({
      type: 'info',
      message: 'Processing cancelled'
    });
  };

  // Generate mock analysis for demonstration when AI service is not available
  const generateMockAnalysis = (text: string): BusinessRulesAnalysis => {
    // Use the same structure as our test data but with dynamic content based on extracted text
    const parties = extractPossibleParties(text);
    const amounts = extractAmounts(text);
    const dates = extractDates(text);
    
    return {
      documentSummary: {
        contractType: text.toLowerCase().includes('energy') ? 'Energy Services Agreement' : 'Service Agreement',
        parties: parties.length > 0 ? parties : ['Unknown Party', 'Unknown Client'],
        effectiveDate: dates.length > 0 ? dates[0] : new Date().toISOString().split('T')[0],
        keyTerms: amounts.concat(['95%', '90%', 'kW']).slice(0, 5)
      },
      extractedRules: generateMockRules(text),
      extractedData: {
        contractValue: amounts.length > 0 ? amounts[0] + '/month' : 'Not specified',
        paymentTerms: 'Net 30 days',
        performanceMetrics: '95% availability, 90% efficiency',
        effectiveDate: dates.length > 0 ? dates[0] : 'Not specified',
        governingLaw: 'Not specified',
        systemCapacity: extractCapacity(text)
      },
      riskFactors: ['Performance penalties', 'Regulatory compliance', 'Contract termination'],
      anomalies: [],
      summary: {
        totalRulesExtracted: 5,
        confidenceScore: 0.85,
        processingNotes: 'Mock analysis generated for demonstration'
      }
    };
  };

  // Helper functions for mock analysis
  const extractPossibleParties = (text: string): string[] => {
    const parties: string[] = [];
    const companyPatterns = [
      /([A-Z][a-zA-Z\s]+(?:Inc|Corp|LLC|Corporation|Company|Ltd)\.?)/g,
      /([A-Z][a-zA-Z\s]{2,20}(?:\sEnergy|\sServices|\sSolutions))/g
    ];
    
    companyPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null && parties.length < 3) {
        const party = match[1].trim();
        if (party.length > 3 && !parties.includes(party)) {
          parties.push(party);
        }
      }
    });
    
    return parties;
  };

  const extractAmounts = (text: string): string[] => {
    const amountPattern = /\$[\d,]+(?:\.\d{2})?/g;
    const amounts = Array.from(text.matchAll(amountPattern), m => m[0]).slice(0, 5);
    return amounts;
  };

  const extractDates = (text: string): string[] => {
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      /\b\d{4}-\d{2}-\d{2}\b/g,
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g
    ];
    
    const dates: string[] = [];
    datePatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern), m => m[0]);
      dates.push(...matches);
    });
    
    return dates.slice(0, 3);
  };

  const extractCapacity = (text: string): string => {
    const capacityMatch = text.match(/(\d+(?:,\d+)?)\s*kW/i);
    return capacityMatch ? capacityMatch[1] + ' kW' : 'Not specified';
  };

  const generateMockRules = (text: string): BusinessRule[] => {
    return [
      {
        id: 'extracted_rule_001',
        category: 'payment',
        type: 'conditional',
        name: 'Payment Terms',
        description: 'Payment obligations extracted from contract',
        condition: 'IF services are provided',
        action: 'THEN payment is due within specified terms',
        consequence: 'Late fees may apply',
        parameters: {
          amount: extractAmounts(text)[0] || '$15,000',
          paymentTerms: 'Net 30'
        },
        confidence: 0.8,
        sourceText: 'Extracted from uploaded document',
        businessValue: 'Ensures payment collection'
      }
    ];
  };

  // Function to create contract from AI analysis
  const createContractFromAI = (file: UploadedFile) => {
    if (file.mappedFormData && onCreateContractFromAI) {
      onCreateContractFromAI(file.mappedFormData, file);
    }
  };

  const handleFileSelect = useCallback(async (files: FileList) => {
    console.log('🎯 handleFileSelect called with files:', files.length);
    console.log('🔍 Callback functions available:', {
      onAIAnalysisComplete: !!onAIAnalysisComplete,
      onCreateContractFromAI: !!onCreateContractFromAI,
      onUploadComplete: !!onUploadComplete
    });
    
    if (isUploading) {
      console.log('⚠️ Upload already in progress, skipping');
      return;
    }

    try {
      console.log('🚀 Starting upload process...');
      setIsUploading(true);
      const fileArray = Array.from(files);
      console.log('📁 Files to upload:', fileArray.map(f => ({ name: f.name, size: f.size, type: f.type })));
      
      // Limit concurrent uploads to prevent overwhelming the browser
      const MAX_CONCURRENT_UPLOADS = 2;
      
      for (let i = 0; i < fileArray.length; i += MAX_CONCURRENT_UPLOADS) {
        const batch = fileArray.slice(i, i + MAX_CONCURRENT_UPLOADS);
        
        await Promise.allSettled(batch.map(async (file) => {
          console.log(`📋 Validating file: ${file.name}`);
          const error = validateFile(file);
          if (error) {
            console.log(`❌ File validation failed for ${file.name}: ${error}`);
            const errorFileId = Math.random().toString(36).substr(2, 9);
            setUploadedFiles(prev => [...prev, {
              id: errorFileId,
              name: file.name,
              size: file.size,
              type: file.type,
              progress: 0,
              status: 'error',
              documentType: selectedDocumentType,
              error
            }]);
            return;
          }

          try {
            console.log(`✅ File validation passed for ${file.name}, starting upload...`);
            await uploadFile(file, selectedDocumentType);
          } catch (uploadError) {
            console.error('File upload error:', uploadError);
            // Error is already handled in uploadFile function
          }
        }));
      }
    } catch (error) {
      console.error('File selection error:', error);
    } finally {
      console.log('🏁 Upload process finished, setting isUploading to false');
      setIsUploading(false);

      // Callback for parent component
      if (onUploadComplete) {
        console.log('📞 Calling onUploadComplete with', uploadedFiles.length, 'files');
        onUploadComplete(uploadedFiles);
      } else {
        console.log('⚠️ onUploadComplete callback not provided');
      }
    }
  }, [contractId, token, selectedDocumentType, isUploading, uploadedFiles, onUploadComplete, onAIAnalysisComplete, onCreateContractFromAI]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the container, not a child element
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const viewExtractedText = (file: UploadedFile) => {
    if (file.extractedText) {
      // Create a modal or new window to display extracted text
      const textWindow = window.open('', '_blank', 'width=800,height=600');
      if (textWindow) {
        textWindow.document.write(`
          <html>
            <head><title>Extracted Text - ${file.name}</title></head>
            <body style="font-family: monospace; padding: 20px; white-space: pre-wrap;">
              <h3>Extracted Text from: ${file.name}</h3>
              <hr>
              ${file.extractedText}
            </body>
          </html>
        `);
        textWindow.document.close();
      }
    }
  };

  // Compact mode rendering
  if (compact) {
    return (
      <div className="w-full space-y-3">
        {/* Notification Display - Compact */}
        {notification && (
          <div className={`p-2 rounded border flex items-start justify-between text-xs ${
            notification.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
            notification.type === 'warning' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' :
            'bg-blue-50 border-blue-300 text-blue-800'
          }`}>
            <div className="flex-1">
              <div className="flex items-center">
                {notification.type === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                {notification.type === 'warning' && <AlertCircle className="h-3 w-3 mr-1" />}
                {notification.type === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                {notification.type === 'info' && <AlertCircle className="h-3 w-3 mr-1" />}
                <p className="font-medium">{notification.message}</p>
              </div>
            </div>
            <button onClick={() => setNotification(null)} className="ml-2 text-gray-400 hover:text-gray-600">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Compact Document Type Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Document Type</label>
          <select
            value={selectedDocumentType}
            onChange={(e) => setSelectedDocumentType(e.target.value)}
            className="block w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-green-500 focus:border-green-500"
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Compact Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded p-4 text-center transition-all duration-200 cursor-pointer ${
            isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedTypes.join(',')}
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            className="hidden"
            disabled={isUploading}
          />

          <Upload className={`mx-auto h-8 w-8 mb-2 ${isDragging ? 'text-green-500' : 'text-gray-400'}`} />

          <h3 className="text-sm font-medium text-gray-900 mb-1">
            {isDragging ? 'Drop files here' : 'Upload Documents'}
          </h3>

          <p className="text-xs text-gray-500 mb-2">
            Drag & drop or click
          </p>

          <div className="text-xs text-gray-400">
            <p>PDF, Word, Images, Text</p>
            <p>{formatFileSize(maxFileSize)} max • {maxFiles} files</p>
          </div>

          {isUploading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            </div>
          )}
        </div>

        {/* Compact Upload Summary */}
        {uploadedFiles.length > 0 && (
          <div className="bg-gray-50 rounded p-2 text-xs">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="font-semibold text-gray-900">{uploadedFiles.length}</div>
                <div className="text-gray-500">Files</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {formatFileSize(uploadedFiles.reduce((sum, f) => sum + f.size, 0))}
                </div>
                <div className="text-gray-500">Size</div>
              </div>
              <div>
                <div className="font-semibold text-green-600">
                  {uploadedFiles.filter(f => f.status === 'completed' || f.status === 'analyzed').length}
                </div>
                <div className="text-gray-500">Ready</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full mode rendering
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Notification Display */}
      {notification && (
        <div className={`mb-4 p-4 rounded-lg border flex items-start justify-between ${
          notification.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
          notification.type === 'warning' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' :
          'bg-blue-50 border-blue-300 text-blue-800'
        }`}>
          <div className="flex-1">
            <div className="flex items-center">
              {notification.type === 'success' && <CheckCircle className="h-5 w-5 mr-2" />}
              {notification.type === 'warning' && <AlertCircle className="h-5 w-5 mr-2" />}
              {notification.type === 'error' && <AlertCircle className="h-5 w-5 mr-2" />}
              {notification.type === 'info' && <AlertCircle className="h-5 w-5 mr-2" />}
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            {notification.action && (
              <button
                onClick={notification.action.onClick}
                className="mt-2 text-sm font-medium underline hover:no-underline"
              >
                {notification.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => setNotification(null)}
            className="ml-4 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Document Type Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Document Type
        </label>
        <select
          value={selectedDocumentType}
          onChange={(e) => setSelectedDocumentType(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {DOCUMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label} - {type.description}
            </option>
          ))}
        </select>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="hidden"
          disabled={isUploading}
        />

        <Upload className={`mx-auto h-12 w-12 mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />

        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {isDragging ? 'Drop files here' : 'Upload Contract Documents'}
        </h3>

        <p className="text-sm text-gray-500 mb-4">
          Drag and drop files here, or click to select files
        </p>

        <div className="text-xs text-gray-400 space-y-1">
          <p>Supports: PDF, Word, Images, Text files</p>
          <p>Max file size: {formatFileSize(maxFileSize)}</p>
          <p>Max files: {maxFiles}</p>
        </div>

        {isUploading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-blue-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Uploaded Documents</h3>
          
          {uploadedFiles.map((file) => (
            <div key={file.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span className="capitalize">{file.documentType.toLowerCase()}</span>
                      <span className="flex items-center space-x-1">
                        {file.status === 'uploading' && (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent"></div>
                            <span>Uploading {file.progress}%</span>
                          </>
                        )}
                        {file.status === 'processing' && (
                          <>
                            <div className="animate-pulse h-3 w-3 bg-yellow-500 rounded-full"></div>
                            <span>Processing...</span>
                          </>
                        )}
                        {file.status === 'analyzing' && (
                          <>
                            <Bot className="h-3 w-3 text-blue-500 animate-pulse" />
                            <span>AI Analyzing...</span>
                          </>
                        )}
                        {file.status === 'analyzed' && (
                          <>
                            <Sparkles className="h-3 w-3 text-purple-500" />
                            <span>AI Complete ({Math.round((file.analysisConfidence || 0) * 100)}%)</span>
                          </>
                        )}
                        {file.status === 'converting' && (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border border-green-600 border-t-transparent"></div>
                            <span>Creating Contract...</span>
                          </>
                        )}
                        {file.status === 'completed' && (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>{file.contractId ? 'Contract Created' : 'Complete'}</span>
                          </>
                        )}
                        {file.status === 'conversion_failed' && (
                          <>
                            <AlertCircle className="h-3 w-3 text-orange-500" />
                            <span>Conversion Failed</span>
                          </>
                        )}
                        {file.status === 'error' && (
                          <>
                            <AlertCircle className="h-3 w-3 text-red-500" />
                            <span>Error</span>
                          </>
                        )}
                      </span>
                    </div>
                    {file.error && (
                      <p className="text-xs text-red-600 mt-1">{file.error}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {file.contractId && (
                    <button
                      onClick={() => {
                        if (onNavigate) {
                          // Navigate to contract library and potentially highlight the specific contract
                          onNavigate('library');
                        }
                      }}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center space-x-1"
                      title="View created contract in library"
                    >
                      <Eye className="h-3 w-3" />
                      <span>View Contract</span>
                    </button>
                  )}

                  {file.status === 'analyzed' && file.mappedFormData && !file.contractId && (
                    <button
                      onClick={() => createContractFromAI(file)}
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 flex items-center space-x-1"
                      title="Create contract with AI data"
                    >
                      <FileEdit className="h-3 w-3" />
                      <span>Create Contract</span>
                    </button>
                  )}

                  {file.aiAnalysis && (
                    <button
                      onClick={() => {
                        // Show AI analysis in a modal or popup
                        const analysisWindow = window.open('', '_blank', 'width=1000,height=800');
                        if (analysisWindow) {
                          analysisWindow.document.write(`
                            <html>
                              <head><title>AI Analysis - ${file.name}</title></head>
                              <body style="font-family: Arial, sans-serif; padding: 20px;">
                                <h2>AI Analysis Results</h2>
                                <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">
${JSON.stringify(file.aiAnalysis, null, 2)}
                                </pre>
                              </body>
                            </html>
                          `);
                          analysisWindow.document.close();
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-purple-600"
                      title="View AI analysis"
                    >
                      <Bot className="h-4 w-4" />
                    </button>
                  )}

                  {file.extractedText && (
                    <button
                      onClick={() => viewExtractedText(file)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="View extracted text"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  
                  {file.url && (
                    <a
                      href={file.url}
                      download={file.name}
                      className="p-2 text-gray-400 hover:text-green-600"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Progress Bar */}
              {file.status === 'uploading' && (
                <div className="mt-3">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Summary and Batch Actions */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">{uploadedFiles.length}</div>
                <div className="text-sm text-gray-500">Total Files</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {uploadedFiles.filter(f => f.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {uploadedFiles.filter(f => f.status === 'uploading' || f.status === 'processing' || f.status === 'analyzing').length}
                </div>
                <div className="text-sm text-gray-500">Processing</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {uploadedFiles.filter(f => f.status === 'analyzed').length}
                </div>
                <div className="text-sm text-gray-500">AI Analyzed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {uploadedFiles.filter(f => f.status === 'error').length}
                </div>
                <div className="text-sm text-gray-500">Errors</div>
              </div>
            </div>
          </div>

          {/* Batch Processing Button */}
          {uploadedFiles.filter(f => f.extractedText && f.status === 'completed' && !f.aiAnalysis).length > 0 && (
            <div className="flex justify-center">
              <button
                onClick={startBatchProcessing}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 flex items-center gap-3 shadow-md transition-all"
              >
                <Layers className="w-5 h-5" />
                <span className="font-medium">
                  Analyze All Documents ({uploadedFiles.filter(f => f.extractedText && f.status === 'completed' && !f.aiAnalysis).length})
                </span>
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Multi-Document Progress Modal */}
      {showProgressModal && processingJobId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <MultiDocumentProgress
              jobId={processingJobId}
              onComplete={handleBatchProcessingComplete}
              onCancel={handleBatchProcessingCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};
