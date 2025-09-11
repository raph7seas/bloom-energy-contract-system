export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Anthropic Claude API types
export interface ClaudeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  temperature?: number;
  top_p?: number;
  stream?: boolean;
}

export interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ClaudeContent[];
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ClaudeContent {
  type: 'text';
  text: string;
}

// AWS Textract types (for document processing)
export interface TextractRequest {
  documentId: string;
  bucketName: string;
  objectKey: string;
}

export interface TextractResponse {
  jobId: string;
  status: 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';
  blocks?: TextractBlock[];
}

export interface TextractBlock {
  id: string;
  type: 'PAGE' | 'LINE' | 'WORD' | 'SELECTION_ELEMENT' | 'KEY_VALUE_SET';
  text?: string;
  confidence?: number;
  geometry?: {
    boundingBox: {
      width: number;
      height: number;
      left: number;
      top: number;
    };
  };
}

// Contract API endpoints
export interface GetContractsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  type?: string;
  clientName?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateContractRequest {
  formData: any; // ContractFormData from contract.types.ts
  templateId?: string;
}

export interface UpdateContractRequest {
  id: string;
  formData: Partial<any>; // Partial<ContractFormData>
}

export interface DeleteContractRequest {
  id: string;
}

// File upload API types
export interface FileUploadRequest {
  file: File;
  contractId?: string;
}

export interface FileUploadResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  uploadUrl?: string; // For direct S3 upload
}

// Analytics API types
export interface AnalyticsRequest {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
  metrics?: string[];
}

export interface AnalyticsResponse {
  summary: {
    totalContracts: number;
    totalValue: number;
    averageValue: number;
    completionRate: number;
  };
  timeSeries: {
    date: string;
    contracts: number;
    value: number;
  }[];
  breakdown: {
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byClient: Record<string, number>;
  };
}

// Rules Engine API types
export interface ExtractRulesRequest {
  contractIds: string[];
  ruleTypes?: string[];
}

export interface ExtractRulesResponse {
  rules: ExtractedRule[];
  confidence: number;
  summary: {
    totalRules: number;
    byCategory: Record<string, number>;
  };
}

export interface ExtractedRule {
  id: string;
  type: 'financial' | 'technical' | 'operational' | 'compliance';
  name: string;
  description: string;
  condition: string;
  action: string;
  confidence: number;
  sourceContracts: string[];
  examples: string[];
}

// Export to Management Platform API types
export interface ExportRulesRequest {
  ruleIds: string[];
  platformEndpoint: string;
  credentials: {
    apiKey: string;
    secretKey: string;
  };
}

export interface ExportRulesResponse {
  exportId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  exportedRules: number;
  failedRules: number;
  errors?: string[];
}