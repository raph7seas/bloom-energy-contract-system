/**
 * Notification Center Component
 * Real-time notification display and management
 */

import React, { useState } from 'react';
import { Bell, X, Check, AlertCircle, CheckCircle, Info, Wifi, WifiOff } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useNotifications, Notification, NOTIFICATION_TYPES } from '../hooks/useNotifications';

const NotificationCenter: React.FC = () => {
  const {
    notifications,
    unreadCount,
    connected,
    connecting,
    error,
    markAsRead,
    clearAll,
    sendTestNotification
  } = useNotifications({
    autoConnect: true,
    maxNotifications: 50
  });

  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAsRead = (notificationIds: string[]) => {
    markAsRead(notificationIds);
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case NOTIFICATION_TYPES.SYSTEM_ALERT:
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case NOTIFICATION_TYPES.CONTRACT_CREATED:
      case NOTIFICATION_TYPES.CONTRACT_UPDATED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case NOTIFICATION_TYPES.BULK_OPERATION_COMPLETED:
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case NOTIFICATION_TYPES.BULK_OPERATION_FAILED:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case NOTIFICATION_TYPES.BULK_OPERATION_STARTED:
      case NOTIFICATION_TYPES.BULK_OPERATION_PROGRESS:
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string, read: boolean) => {
    const baseClasses = read ? 'bg-gray-50' : 'bg-white border-l-4';
    
    if (read) return baseClasses;
    
    switch (type) {
      case NOTIFICATION_TYPES.SYSTEM_ALERT:
        return `${baseClasses} border-l-orange-500`;
      case NOTIFICATION_TYPES.CONTRACT_CREATED:
      case NOTIFICATION_TYPES.CONTRACT_UPDATED:
        return `${baseClasses} border-l-green-500`;
      case NOTIFICATION_TYPES.BULK_OPERATION_COMPLETED:
        return `${baseClasses} border-l-blue-500`;
      case NOTIFICATION_TYPES.BULK_OPERATION_FAILED:
        return `${baseClasses} border-l-red-500`;
      default:
        return `${baseClasses} border-l-gray-500`;
    }
  };

  const formatNotificationMessage = (notification: Notification) => {
    const { type, data } = notification;
    
    switch (type) {
      case NOTIFICATION_TYPES.CONTRACT_CREATED:
        return `New contract "${data.contractName || 'Untitled'}" created by ${data.createdBy || 'Unknown'}`;
      case NOTIFICATION_TYPES.CONTRACT_UPDATED:
        return `Contract "${data.contractName || 'Untitled'}" updated by ${data.updatedBy || 'Unknown'}`;
      case NOTIFICATION_TYPES.BULK_OPERATION_STARTED:
        return data.message || `${data.operationType} operation started for ${data.itemCount} items`;
      case NOTIFICATION_TYPES.BULK_OPERATION_COMPLETED:
        return `${data.operationType} completed: ${data.successfulItems} successful, ${data.failedItems} failed`;
      case NOTIFICATION_TYPES.BULK_OPERATION_PROGRESS:
        return `${data.operationType} progress: ${data.processed}/${data.total} (${Math.round(data.progress)}%)`;
      case NOTIFICATION_TYPES.RULE_LEARNED:
        return `New rule "${data.ruleName}" learned with ${(data.confidence * 100).toFixed(1)}% confidence`;
      case NOTIFICATION_TYPES.SYSTEM_ALERT:
        return data.message || 'System notification';
      default:
        return data.message || 'Notification received';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const connectionIcon = () => {
    if (connecting) {
      return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />;
    }
    if (connected) {
      return <Wifi className="w-4 h-4 text-green-500" />;
    }
    return <WifiOff className="w-4 h-4 text-red-500" />;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Notifications</h3>
                {connectionIcon()}
              </div>
              <div className="flex items-center gap-2">
                {process.env.NODE_ENV === 'development' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={sendTestNotification}
                    className="text-xs"
                  >
                    Test
                  </Button>
                )}
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleMarkAllAsRead}
                    className="text-xs"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAll}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
            
            {/* Connection status */}
            <div className="text-xs text-gray-500">
              {connecting && 'Connecting...'}
              {connected && 'Connected'}
              {error && `Error: ${error}`}
              {!connected && !connecting && !error && 'Disconnected'}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No notifications yet
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${getNotificationColor(notification.type, notification.read)}`}
                      onClick={() => {
                        if (!notification.read) {
                          handleMarkAsRead([notification.id]);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                            {formatNotificationMessage(notification)}
                          </p>
                          
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500">
                              {formatTimestamp(notification.timestamp)}
                            </p>
                            
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          
                          {/* Show additional data for bulk operations */}
                          {notification.type.startsWith('bulk:') && notification.data.jobId && (
                            <p className="text-xs text-gray-400 mt-1 font-mono">
                              Job: {notification.data.jobId}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;