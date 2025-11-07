import React, { useState, useEffect } from 'react';
import { Progress } from '../ui/progress';
import { CheckCircle2, Circle, Clock, AlertCircle, Loader2, Pause, Play, X } from 'lucide-react';
import { Button } from '../ui/button';

interface Document {
  filename: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  chunksTotal: number;
  currentChunk?: number;
  chunksProcessed?: number;
  chunkStatus?: string;
  error?: string;
}

interface ProcessingStatus {
  jobId: string;
  status: 'processing' | 'completed' | 'paused' | 'cancelled' | 'failed';
  overallProgress: number;
  currentDocIndex: number;
  documents: Document[];
  estimatedTimeRemaining?: number;
}

interface MultiDocumentProgressProps {
  jobId: string;
  onComplete?: (results: any[]) => void;
  onCancel?: () => void;
}

const MultiDocumentProgress: React.FC<MultiDocumentProgressProps> = ({
  jobId,
  onComplete,
  onCancel
}) => {
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    // Import socket.io-client dynamically
    import('socket.io-client').then(({ io }) => {
      const newSocket = io('http://localhost:4003');

      newSocket.on('connect', () => {
        console.log('✅ Connected to processing server');
      });

      newSocket.on('processing:progress', (progressStatus: ProcessingStatus) => {
        console.log('📨 MultiDocumentProgress received event:', progressStatus.jobId, 'Looking for:', jobId);
        if (progressStatus.jobId === jobId) {
          console.log('✅ Job ID matches! Updating status:', progressStatus);
          setStatus(progressStatus);

          // Check if completed
          if (progressStatus.status === 'completed' && onComplete && progressStatus.results) {
            console.log('🎉 Analysis completed with results:', progressStatus.results);
            onComplete(progressStatus.results);
          }
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    });
  }, [jobId]);

  const handlePause = async () => {
    try {
      const response = await fetch(`/api/processing/pause/${jobId}`, {
        method: 'POST'
      });

      if (response.ok) {
        setIsPaused(true);
      }
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  };

  const handleResume = async () => {
    try {
      const response = await fetch(`/api/processing/resume/${jobId}`, {
        method: 'POST'
      });

      if (response.ok) {
        setIsPaused(false);
      }
    } catch (error) {
      console.error('Failed to resume:', error);
    }
  };

  const handleCancel = async () => {
    try {
      const response = await fetch(`/api/processing/cancel/${jobId}`, {
        method: 'POST'
      });

      if (response.ok && onCancel) {
        onCancel();
      }
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'Calculating...';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getStatusIcon = (docStatus: string) => {
    switch (docStatus) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'queued':
        return <Circle className="w-5 h-5 text-gray-400" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getChunkStatusText = (chunkStatus?: string) => {
    switch (chunkStatus) {
      case 'analyzing':
        return '🔍 Analyzing chunk...';
      case 'waiting_for_rate_limit':
        return '⏳ Waiting for rate limit...';
      case 'sending_to_ai':
        return '📤 Sending to AI...';
      case 'completed':
        return '✅ Chunk complete';
      case 'delay_between_chunks':
        return '⏱️ Delay between chunks...';
      case 'rate_limit_retry':
        return '🔄 Rate limit hit, retrying...';
      case 'error':
        return '❌ Chunk failed';
      default:
        return '';
    }
  };

  if (!status) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-lg">Loading processing status...</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[600px] bg-white rounded-lg shadow-2xl border border-gray-300 z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Processing Documents
            </h3>
            <p className="text-xs text-gray-600">
              {status.documents.length} documents
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {status.status === 'processing' && (
            <>
              {isPaused ? (
                <Button
                  onClick={handleResume}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  title="Resume"
                >
                  <Play className="w-3 h-3" />
                </Button>
              ) : (
                <Button
                  onClick={handlePause}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  title="Pause"
                >
                  <Pause className="w-3 h-3" />
                </Button>
              )}
            </>
          )}
          <Button
            onClick={handleCancel}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Cancel"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="px-4 py-3 space-y-2 border-b border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">
            Doc {status.currentDocIndex + 1}/{status.documents.length}
          </span>
          <span className="font-semibold text-gray-900">
            {status.overallProgress}%
          </span>
        </div>
        <Progress value={status.overallProgress} className="h-2" />
      </div>

      {/* Document List - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="space-y-2">
          {status.documents.map((doc, idx) => (
            <div
              key={idx}
              className={`px-3 py-2 rounded border text-xs transition-all ${
                doc.status === 'processing'
                  ? 'bg-blue-50 border-blue-200'
                  : doc.status === 'completed'
                  ? 'bg-green-50 border-green-200'
                  : doc.status === 'failed'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {getStatusIcon(doc.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 truncate text-xs" title={doc.filename}>
                      {doc.filename.length > 35 ? doc.filename.substring(0, 35) + '...' : doc.filename}
                    </span>
                    <span className="text-xs text-gray-600 ml-2 flex-shrink-0">
                      {doc.progress}%
                    </span>
                  </div>

                  {doc.status === 'processing' && (
                    <>
                      <Progress value={doc.progress} className="h-1 mb-1" />
                      {doc.chunksTotal > 0 && (
                        <div className="text-xs text-gray-600">
                          Chunk {doc.currentChunk || 0}/{doc.chunksTotal}
                        </div>
                      )}
                    </>
                  )}

                  {doc.status === 'completed' && (
                    <p className="text-xs text-green-700">✓ Complete</p>
                  )}

                  {doc.status === 'failed' && doc.error && (
                    <p className="text-xs text-red-700">❌ {doc.error}</p>
                  )}

                  {doc.status === 'queued' && (
                    <p className="text-xs text-gray-600">Waiting...</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Footer */}
      {(status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          {status.status === 'completed' && (
            <div className="flex items-center gap-2 text-xs text-green-700">
              <CheckCircle2 className="w-3 h-3" />
              <span className="font-medium">Complete!</span>
            </div>
          )}
          {status.status === 'failed' && (
            <div className="flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-3 h-3" />
              <span className="font-medium">Failed</span>
            </div>
          )}
          {status.status === 'cancelled' && (
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <X className="w-3 h-3" />
              <span className="font-medium">Cancelled</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiDocumentProgress;
