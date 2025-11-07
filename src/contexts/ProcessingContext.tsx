import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface ProcessingJob {
  jobId: string;
  status: 'processing' | 'completed' | 'paused' | 'cancelled' | 'failed';
  overallProgress: number;
  currentDocIndex: number;
  documents: ProcessingDocument[];
  estimatedTimeRemaining?: number;
  results?: any[];
  startTime: number;
}

interface ProcessingDocument {
  filename: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  chunksTotal: number;
  currentChunk?: number;
  chunksProcessed?: number;
  chunkStatus?: string;
  error?: string;
}

interface ProcessingContextType {
  activeJobs: Map<string, ProcessingJob>;
  minimizedJobs: Set<string>;
  startJob: (jobId: string, documentCount: number, onComplete?: (results: any[]) => void) => void;
  minimizeJob: (jobId: string) => void;
  maximizeJob: (jobId: string) => void;
  closeJob: (jobId: string) => void;
  cancelJob: (jobId: string) => Promise<void>;
  getJob: (jobId: string) => ProcessingJob | undefined;
  isJobMinimized: (jobId: string) => boolean;
}

const ProcessingContext = createContext<ProcessingContextType | undefined>(undefined);

const STORAGE_KEY = 'bloom_active_jobs';
const MINIMIZED_KEY = 'bloom_minimized_jobs';

export const ProcessingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeJobs, setActiveJobs] = useState<Map<string, ProcessingJob>>(new Map());
  const [minimizedJobs, setMinimizedJobs] = useState<Set<string>>(new Set());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [completionCallbacks, setCompletionCallbacks] = useState<Map<string, (results: any[]) => void>>(new Map());

  // Initialize socket connection
  useEffect(() => {
    console.log('🚀🚀🚀 ProcessingContext useEffect RUNNING - Creating Socket.IO connection');
    const newSocket = io('http://localhost:4003');
    console.log('🚀 Socket.IO instance created:', newSocket);

    newSocket.on('connect', () => {
      console.log('✅✅✅ Processing socket CONNECTED to port 4003');
      console.log('✅ Socket ID:', newSocket.id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
    });

    newSocket.on('processing:progress', (status: ProcessingJob) => {
      console.log('📨📨📨 RECEIVED processing:progress event:', status);
      console.log('📨 Job ID:', status.jobId, 'Status:', status.status, 'Progress:', status.overallProgress);
      setActiveJobs(prev => {
        const updated = new Map(prev);
        updated.set(status.jobId, status);

        // Save to sessionStorage
        try {
          const jobsArray = Array.from(updated.entries());
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(jobsArray));
        } catch (error) {
          console.error('Failed to save jobs to storage:', error);
        }

        return updated;
      });

      // Call completion callback if job completed successfully
      if (status.status === 'completed' && status.results) {
        console.log('🎉 Job completed:', status.jobId, 'with results:', status.results);
        setCompletionCallbacks(prev => {
          const callback = prev.get(status.jobId);
          console.log('🔍 Looking for callback for job:', status.jobId, 'found:', !!callback);
          console.log('📊 All registered callbacks:', Array.from(prev.keys()));
          if (callback) {
            console.log(`🎯 Calling completion callback for job ${status.jobId}`);
            console.log(`📦 Passing results to callback:`, status.results);

            try {
              callback(status.results);
              console.log('✅ Callback executed successfully');
            } catch (error) {
              console.error('❌ Error in completion callback:', error);
            }

            // Remove callback after calling it
            const updated = new Map(prev);
            updated.delete(status.jobId);
            console.log('🗑️ Callback removed from registry');
            return updated;
          } else {
            console.log('⚠️ No callback found for completed job:', status.jobId);
          }
          return prev;
        });
      }

      // Auto-remove completed jobs after delay
      if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
        setTimeout(() => {
          // Check if job is still in the same state before removing
          setActiveJobs(prev => {
            const current = prev.get(status.jobId);
            if (current && current.status === status.status) {
              const updated = new Map(prev);
              updated.delete(status.jobId);

              // Also remove from minimized
              setMinimizedJobs(prevMin => {
                const updatedMin = new Set(prevMin);
                updatedMin.delete(status.jobId);
                sessionStorage.setItem(MINIMIZED_KEY, JSON.stringify(Array.from(updatedMin)));
                return updatedMin;
              });

              // Clean up callback
              setCompletionCallbacks(prevCallbacks => {
                const updatedCallbacks = new Map(prevCallbacks);
                updatedCallbacks.delete(status.jobId);
                return updatedCallbacks;
              });

              // Update storage
              try {
                const jobsArray = Array.from(updated.entries());
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(jobsArray));
              } catch (error) {
                console.error('Failed to update storage:', error);
              }

              return updated;
            }
            return prev;
          });
        }, 10000); // Remove after 10 seconds
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Restore jobs from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      const storedMinimized = sessionStorage.getItem(MINIMIZED_KEY);

      if (stored) {
        const jobsArray = JSON.parse(stored);
        const restoredJobs = new Map(jobsArray);

        // Only keep jobs that are still processing
        const activeJobsOnly = new Map(
          Array.from(restoredJobs.entries()).filter(([_, job]) =>
            job.status === 'processing' || job.status === 'paused'
          )
        );

        setActiveJobs(activeJobsOnly);

        // Re-fetch status for each active job
        activeJobsOnly.forEach((_, jobId) => {
          fetch(`/api/processing/status/${jobId}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.status) {
                setActiveJobs(prev => {
                  const updated = new Map(prev);
                  updated.set(jobId, data.status);
                  return updated;
                });
              }
            })
            .catch(console.error);
        });
      }

      if (storedMinimized) {
        const minimizedArray = JSON.parse(storedMinimized);
        setMinimizedJobs(new Set(minimizedArray));
      }
    } catch (error) {
      console.error('Failed to restore jobs from storage:', error);
    }
  }, []);

  const startJob = useCallback((jobId: string, documentCount: number, onComplete?: (results: any[]) => void) => {
    console.log('🚀 ProcessingContext.startJob called:', { jobId, documentCount, hasCallback: !!onComplete });

    const newJob: ProcessingJob = {
      jobId,
      status: 'processing',
      overallProgress: 0,
      currentDocIndex: 0,
      documents: [],
      startTime: Date.now()
    };

    setActiveJobs(prev => {
      const updated = new Map(prev);
      updated.set(jobId, newJob);
      console.log('📋 Active jobs updated, total:', updated.size);
      return updated;
    });

    // Register completion callback if provided
    if (onComplete) {
      setCompletionCallbacks(prev => {
        const updated = new Map(prev);
        updated.set(jobId, onComplete);
        console.log('✅ Completion callback registered for job:', jobId);
        console.log('📊 Total callbacks registered:', updated.size);
        return updated;
      });
    } else {
      console.log('⚠️ No completion callback provided for job:', jobId);
    }

    // Start maximized by default
    setMinimizedJobs(prev => {
      const updated = new Set(prev);
      updated.delete(jobId);
      return updated;
    });
  }, []);

  const minimizeJob = useCallback((jobId: string) => {
    setMinimizedJobs(prev => {
      const updated = new Set(prev);
      updated.add(jobId);

      try {
        sessionStorage.setItem(MINIMIZED_KEY, JSON.stringify(Array.from(updated)));
      } catch (error) {
        console.error('Failed to save minimized state:', error);
      }

      return updated;
    });
  }, []);

  const maximizeJob = useCallback((jobId: string) => {
    setMinimizedJobs(prev => {
      const updated = new Set(prev);
      updated.delete(jobId);

      try {
        sessionStorage.setItem(MINIMIZED_KEY, JSON.stringify(Array.from(updated)));
      } catch (error) {
        console.error('Failed to save minimized state:', error);
      }

      return updated;
    });
  }, []);

  const closeJob = useCallback((jobId: string) => {
    setActiveJobs(prev => {
      const updated = new Map(prev);
      updated.delete(jobId);

      try {
        const jobsArray = Array.from(updated.entries());
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(jobsArray));
      } catch (error) {
        console.error('Failed to update storage:', error);
      }

      return updated;
    });

    setMinimizedJobs(prev => {
      const updated = new Set(prev);
      updated.delete(jobId);

      try {
        sessionStorage.setItem(MINIMIZED_KEY, JSON.stringify(Array.from(updated)));
      } catch (error) {
        console.error('Failed to update storage:', error);
      }

      return updated;
    });
  }, []);

  const cancelJob = useCallback(async (jobId: string) => {
    try {
      await fetch(`/api/processing/cancel/${jobId}`, {
        method: 'POST'
      });

      closeJob(jobId);
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  }, [closeJob]);

  const getJob = useCallback((jobId: string) => {
    return activeJobs.get(jobId);
  }, [activeJobs]);

  const isJobMinimized = useCallback((jobId: string) => {
    return minimizedJobs.has(jobId);
  }, [minimizedJobs]);

  const value: ProcessingContextType = {
    activeJobs,
    minimizedJobs,
    startJob,
    minimizeJob,
    maximizeJob,
    closeJob,
    cancelJob,
    getJob,
    isJobMinimized
  };

  return (
    <ProcessingContext.Provider value={value}>
      {children}
    </ProcessingContext.Provider>
  );
};

export const useProcessing = (): ProcessingContextType => {
  const context = useContext(ProcessingContext);
  if (!context) {
    throw new Error('useProcessing must be used within ProcessingProvider');
  }
  return context;
};
