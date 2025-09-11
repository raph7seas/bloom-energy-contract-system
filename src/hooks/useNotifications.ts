/**
 * React Hook for Real-time Notifications
 * Manages WebSocket connection and notification state
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Notification {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  read: boolean;
  userId?: string;
}

export interface NotificationHookOptions {
  autoConnect?: boolean;
  subscribeToTypes?: string[];
  maxNotifications?: number;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  markAsRead: (notificationIds: string[]) => void;
  clearAll: () => void;
  sendTestNotification: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  subscribe: (notificationTypes: string[]) => void;
}

const NOTIFICATION_TYPES = {
  CONTRACT_CREATED: 'contract:created',
  CONTRACT_UPDATED: 'contract:updated',
  CONTRACT_DELETED: 'contract:deleted',
  BULK_OPERATION_STARTED: 'bulk:started',
  BULK_OPERATION_PROGRESS: 'bulk:progress',
  BULK_OPERATION_COMPLETED: 'bulk:completed',
  BULK_OPERATION_FAILED: 'bulk:failed',
  RULE_EXTRACTED: 'rule:extracted',
  RULE_LEARNED: 'rule:learned',
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
  SYSTEM_ALERT: 'system:alert',
  VALIDATION_RESULT: 'validation:result',
  UPLOAD_COMPLETED: 'upload:completed',
  EXPORT_READY: 'export:ready'
};

export const useNotifications = (
  options: NotificationHookOptions = {}
): UseNotificationsReturn => {
  const {
    autoConnect = true,
    subscribeToTypes = [],
    maxNotifications = 100
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(true);

  // Get auth token from localStorage
  const getAuthToken = useCallback(() => {
    try {
      const authData = localStorage.getItem('bloom_auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.token;
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }
    return null;
  }, []);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError('Authentication token not found');
      return;
    }

    setConnecting(true);
    setError(null);

    const serverUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://your-production-domain.com' 
      : 'ws://localhost:3001';

    const socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socket.on('connect', () => {
      if (!mountedRef.current) return;
      
      console.log('🔔 Connected to notification server');
      setConnected(true);
      setConnecting(false);
      setError(null);

      // Subscribe to notification types if specified
      if (subscribeToTypes.length > 0) {
        socket.emit('subscribe', subscribeToTypes);
      }
    });

    socket.on('disconnect', (reason) => {
      if (!mountedRef.current) return;
      
      console.log('🔌 Disconnected from notification server:', reason);
      setConnected(false);
      setConnecting(false);
      
      if (reason !== 'io client disconnect') {
        setError(`Disconnected: ${reason}`);
      }
    });

    socket.on('connect_error', (error) => {
      if (!mountedRef.current) return;
      
      console.error('🚨 Connection error:', error.message);
      setConnecting(false);
      setError(`Connection failed: ${error.message}`);
    });

    socket.on('notification', (notification: Notification) => {
      if (!mountedRef.current) return;
      
      console.log('📬 Received notification:', notification);
      
      setNotifications(prev => {
        const updated = [notification, ...prev];
        
        // Limit notifications to prevent memory issues
        if (updated.length > maxNotifications) {
          return updated.slice(0, maxNotifications);
        }
        
        return updated;
      });
    });

    socket.on('notifications:history:response', (history: Notification[]) => {
      if (!mountedRef.current) return;
      
      console.log('📜 Received notification history:', history);
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const newNotifications = history.filter(n => !existingIds.has(n.id));
        return [...prev, ...newNotifications];
      });
    });

    socket.on('notifications:readConfirm', (data: { notificationIds: string[] }) => {
      if (!mountedRef.current) return;
      
      setNotifications(prev =>
        prev.map(notification =>
          data.notificationIds.includes(notification.id)
            ? { ...notification, read: true }
            : notification
        )
      );
    });

    socket.on('error', (error) => {
      if (!mountedRef.current) return;
      console.error('🚨 Socket error:', error);
      setError(error.message || 'Socket error occurred');
    });

    socket.on('pong', (data) => {
      console.log('🏓 Pong received:', data.timestamp);
    });

    socketRef.current = socket;
  }, [getAuthToken, subscribeToTypes, maxNotifications]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnected(false);
    setConnecting(false);
    setError(null);
  }, []);

  // Mark notifications as read
  const markAsRead = useCallback((notificationIds: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('notifications:markRead', notificationIds);
    }
    
    // Optimistically update local state
    setNotifications(prev =>
      prev.map(notification =>
        notificationIds.includes(notification.id)
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Send test notification (for development)
  const sendTestNotification = useCallback(() => {
    if (process.env.NODE_ENV === 'development' && socketRef.current?.connected) {
      fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      }).catch(error => {
        console.error('Failed to send test notification:', error);
      });
    }
  }, [getAuthToken]);

  // Join a room for real-time updates
  const joinRoom = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join:room', roomId);
    }
  }, []);

  // Leave a room
  const leaveRoom = useCallback((roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave:room', roomId);
    }
  }, []);

  // Subscribe to specific notification types
  const subscribe = useCallback((notificationTypes: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', notificationTypes);
    }
  }, []);

  // Send ping for connection health check
  const ping = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('ping');
    }
  }, []);

  // Request notification history
  const requestHistory = useCallback((limit = 50) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('notifications:history', { limit });
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Periodic ping for connection health
  useEffect(() => {
    if (!connected) return;

    const pingInterval = setInterval(ping, 30000); // Ping every 30 seconds
    
    return () => clearInterval(pingInterval);
  }, [connected, ping]);

  // Request history on first connection
  useEffect(() => {
    if (connected && notifications.length === 0) {
      setTimeout(() => requestHistory(), 1000); // Small delay after connection
    }
  }, [connected, notifications.length, requestHistory]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    connected,
    connecting,
    error,
    connect,
    disconnect,
    markAsRead,
    clearAll,
    sendTestNotification,
    joinRoom,
    leaveRoom,
    subscribe
  };
};

export { NOTIFICATION_TYPES };
export default useNotifications;