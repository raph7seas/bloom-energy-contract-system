import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Loader2, FileText, AlertCircle } from 'lucide-react';
import { Contract } from '../../types';
import { contractService } from '../../services';
import { useAI } from '../../hooks/useAI';

interface ContractDocument {
  id: string;
  title: string;
  fileName: string;
  documentType: string;
  content?: string;
  pageCount?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const ContractChatAssistant: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { sendMessage, loading: aiLoading } = useAI();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load all contracts on mount
  useEffect(() => {
    loadContracts();
  }, []);

  // Load documents when contract is selected
  useEffect(() => {
    if (selectedContractId) {
      loadContractDetails();
    } else {
      setSelectedContract(null);
      setDocuments([]);
      setMessages([]);
    }
  }, [selectedContractId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadContracts = async () => {
    try {
      setLoadingContracts(true);
      const contractsList = await contractService.getContracts();
      setContracts(contractsList);
    } catch (err) {
      setError('Failed to load contracts');
      console.error('Error loading contracts:', err);
    } finally {
      setLoadingContracts(false);
    }
  };

  const loadContractDetails = async () => {
    if (!selectedContractId) return;

    try {
      setLoadingDocuments(true);
      setError(null);

      // Fetch contract details
      const contract = await contractService.getContractById(selectedContractId);
      setSelectedContract(contract);

      // Fetch contract documents
      const response = await fetch(`/api/contracts/${selectedContractId}/documents`, {
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('accessToken') && {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          })
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const documentsData = await response.json();
      const documentsList = Array.isArray(documentsData) ? documentsData : documentsData.documents || [];

      // Fetch content for each document
      const documentsWithContent = await Promise.all(
        documentsList.map(async (doc: any) => {
          try {
            const contentResponse = await fetch(`/api/documents/${doc.id}/content`, {
              headers: {
                'Content-Type': 'application/json',
                ...(localStorage.getItem('accessToken') && {
                  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                })
              }
            });

            if (contentResponse.ok) {
              const contentData = await contentResponse.json();
              return {
                id: doc.id,
                title: doc.title,
                fileName: doc.fileName,
                documentType: doc.documentType,
                content: contentData.content || contentData.text || '',
                pageCount: doc.pageCount
              };
            }
          } catch (err) {
            console.error(`Error fetching content for document ${doc.id}:`, err);
          }

          return {
            id: doc.id,
            title: doc.title,
            fileName: doc.fileName,
            documentType: doc.documentType,
            pageCount: doc.pageCount
          };
        })
      );

      setDocuments(documentsWithContent);

      // Add welcome message
      const welcomeMessage: ChatMessage = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `I'm ready to help you with questions about the "${contract?.name}" contract. I have access to ${documentsWithContent.length} document(s) related to this contract. You can ask me anything about serial numbers, financiers, terms, pricing, or any other details in the contract documents.`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);

    } catch (err) {
      setError('Failed to load contract details');
      console.error('Error loading contract details:', err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedContract || aiLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      // Prepare context with contract and document information
      const context = {
        contract: {
          id: selectedContract.id,
          name: selectedContract.name,
          client: selectedContract.client,
          site: selectedContract.site,
          capacity: selectedContract.capacity,
          term: selectedContract.term,
          type: selectedContract.type,
          status: selectedContract.status,
          totalValue: selectedContract.totalValue,
          effectiveDate: selectedContract.effectiveDate,
          parameters: selectedContract.parameters
        },
        documents: documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          fileName: doc.fileName,
          documentType: doc.documentType,
          content: doc.content ? doc.content.substring(0, 10000) : '', // Limit content size
          pageCount: doc.pageCount
        })),
        conversationHistory: messages.slice(-10).map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      };

      // Send message to AI with contract context
      const response = await sendMessage(inputMessage, context);

      if (response && response.message) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('No response from AI');
      }
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Error sending message:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <MessageCircle className="h-8 w-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Contract AI Assistant</h2>
        </div>
        <p className="text-gray-600">
          Select a contract and ask questions about its documents
        </p>
      </div>

      {/* Contract Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Contract
        </label>
        {loadingContracts ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading contracts...</span>
          </div>
        ) : (
          <select
            value={selectedContractId}
            onChange={(e) => setSelectedContractId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a contract...</option>
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.name} - {contract.client} ({contract.status})
              </option>
            ))}
          </select>
        )}

        {/* Document info */}
        {selectedContract && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Contract: {selectedContract.name}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {loadingDocuments ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading documents...
                    </span>
                  ) : (
                    `${documents.length} document(s) available`
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Chat Area */}
      {selectedContract && !loadingDocuments && (
        <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ maxHeight: '500px' }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about this contract..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                disabled={aiLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || aiLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {aiLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedContract && !loadingContracts && (
        <div className="flex-1 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center p-8">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Contract Selected
            </h3>
            <p className="text-gray-600">
              Select a contract above to start asking questions
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractChatAssistant;
