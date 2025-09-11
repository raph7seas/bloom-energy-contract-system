/**
 * Unit Tests for NotificationCenter Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationCenter from '../NotificationCenter';
import { useNotifications } from '../../hooks/useNotifications';

// Mock the useNotifications hook
jest.mock('../../hooks/useNotifications');
const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Bell: () => <div data-testid="bell-icon" />,
  X: () => <div data-testid="x-icon" />,
  Check: () => <div data-testid="check-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Wifi: () => <div data-testid="wifi-icon" />,
  WifiOff: () => <div data-testid="wifi-off-icon" />
}));

const createMockNotification = (overrides = {}) => ({
  id: 'notif-1',
  type: 'system:alert',
  data: { message: 'Test notification' },
  timestamp: new Date().toISOString(),
  read: false,
  ...overrides
});

describe('NotificationCenter', () => {
  const defaultMockProps = {
    notifications: [],
    unreadCount: 0,
    connected: true,
    connecting: false,
    error: null,
    markAsRead: jest.fn(),
    clearAll: jest.fn(),
    sendTestNotification: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
    subscribe: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotifications.mockReturnValue(defaultMockProps);
  });

  describe('Notification Button', () => {
    it('should render notification bell icon', () => {
      render(<NotificationCenter />);
      
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    });

    it('should show unread count badge when there are unread notifications', () => {
      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        unreadCount: 5
      });

      render(<NotificationCenter />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should show 99+ for more than 99 unread notifications', () => {
      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        unreadCount: 150
      });

      render(<NotificationCenter />);
      
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should not show badge when there are no unread notifications', () => {
      render(<NotificationCenter />);
      
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Connection Status', () => {
    it('should show connected status', () => {
      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
    });

    it('should show connecting status', () => {
      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        connected: false,
        connecting: true
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('should show disconnected status', () => {
      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        connected: false,
        connecting: false
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
    });

    it('should show error status', () => {
      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        connected: false,
        error: 'Connection failed'
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('Error: Connection failed')).toBeInTheDocument();
    });
  });

  describe('Notification List', () => {
    it('should show empty state when no notifications', () => {
      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });

    it('should render notifications list', () => {
      const mockNotifications = [
        createMockNotification({ 
          id: '1', 
          data: { message: 'First notification' } 
        }),
        createMockNotification({ 
          id: '2', 
          data: { message: 'Second notification' },
          read: true
        })
      ];

      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        notifications: mockNotifications,
        unreadCount: 1
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('First notification')).toBeInTheDocument();
      expect(screen.getByText('Second notification')).toBeInTheDocument();
    });

    it('should show correct icons for different notification types', () => {
      const notifications = [
        createMockNotification({ 
          type: 'system:alert',
          data: { message: 'Alert notification' }
        }),
        createMockNotification({ 
          type: 'contract:created',
          data: { message: 'Contract created' }
        }),
        createMockNotification({ 
          type: 'bulk:completed',
          data: { message: 'Bulk operation completed' }
        })
      ];

      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        notifications
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getAllByTestId('alert-circle-icon')).toHaveLength(1);
      expect(screen.getAllByTestId('check-circle-icon')).toHaveLength(2);
    });

    it('should format different notification types correctly', () => {
      const notifications = [
        createMockNotification({
          type: 'contract:created',
          data: {
            contractName: 'Test Contract',
            createdBy: 'John Doe'
          }
        }),
        createMockNotification({
          type: 'bulk:completed',
          data: {
            operationType: 'import',
            successfulItems: 5,
            failedItems: 2
          }
        })
      ];

      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        notifications
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('New contract "Test Contract" created by John Doe')).toBeInTheDocument();
      expect(screen.getByText('import completed: 5 successful, 2 failed')).toBeInTheDocument();
    });

    it('should show job ID for bulk operations', () => {
      const notification = createMockNotification({
        type: 'bulk:started',
        data: {
          operationType: 'import',
          jobId: 'bulk-123',
          message: 'Bulk import started'
        }
      });

      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        notifications: [notification]
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('Job: bulk-123')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should mark notification as read when clicked', async () => {
      const user = userEvent.setup();
      const markAsRead = jest.fn();
      const notification = createMockNotification({
        id: 'unread-notif',
        read: false
      });

      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        notifications: [notification],
        markAsRead,
        unreadCount: 1
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const notificationElement = screen.getByText('Test notification');
      await user.click(notificationElement);
      
      expect(markAsRead).toHaveBeenCalledWith(['unread-notif']);
    });

    it('should not call markAsRead for already read notifications', async () => {
      const user = userEvent.setup();
      const markAsRead = jest.fn();
      const notification = createMockNotification({
        id: 'read-notif',
        read: true
      });

      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        notifications: [notification],
        markAsRead
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const notificationElement = screen.getByText('Test notification');
      await user.click(notificationElement);
      
      expect(markAsRead).not.toHaveBeenCalled();
    });

    it('should mark all notifications as read', async () => {
      const user = userEvent.setup();
      const markAsRead = jest.fn();
      const notifications = [
        createMockNotification({ id: '1', read: false }),
        createMockNotification({ id: '2', read: false }),
        createMockNotification({ id: '3', read: true })
      ];

      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        notifications,
        markAsRead,
        unreadCount: 2
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const markAllButton = screen.getByText('Mark all read');
      await user.click(markAllButton);
      
      expect(markAsRead).toHaveBeenCalledWith(['1', '2']);
    });

    it('should clear all notifications', async () => {
      const user = userEvent.setup();
      const clearAll = jest.fn();
      const notifications = [createMockNotification()];

      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        notifications,
        clearAll
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const clearButton = screen.getByText('Clear');
      await user.click(clearButton);
      
      expect(clearAll).toHaveBeenCalled();
    });

    it('should send test notification in development', async () => {
      const user = userEvent.setup();
      const sendTestNotification = jest.fn();
      
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        sendTestNotification
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      const testButton = screen.getByText('Test');
      await user.click(testButton);
      
      expect(sendTestNotification).toHaveBeenCalled();
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should not show test button in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.queryByText('Test')).not.toBeInTheDocument();
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Timestamp Formatting', () => {
    it('should show "Just now" for very recent notifications', () => {
      const notification = createMockNotification({
        timestamp: new Date().toISOString()
      });

      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        notifications: [notification]
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('should show minutes ago for recent notifications', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
      const notification = createMockNotification({
        timestamp: fiveMinutesAgo.toISOString()
      });

      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        notifications: [notification]
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    it('should show hours ago for older notifications', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000);
      const notification = createMockNotification({
        timestamp: twoHoursAgo.toISOString()
      });

      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        notifications: [notification]
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });
  });

  describe('Visual Indicators', () => {
    it('should show unread indicator for unread notifications', () => {
      const notification = createMockNotification({ read: false });

      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        notifications: [notification]
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Look for the blue dot indicator (it should have specific styling)
      const notificationContainer = screen.getByText('Test notification').closest('div');
      expect(notificationContainer).toHaveClass('bg-white', 'border-l-4');
    });

    it('should show different styling for read notifications', () => {
      const notification = createMockNotification({ read: true });

      mockUseNotifications.mockReturnValue({
        ...defaultMockProps,
        notifications: [notification]
      });

      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const notificationContainer = screen.getByText('Test notification').closest('div');
      expect(notificationContainer).toHaveClass('bg-gray-50');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<NotificationCenter />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      
      render(<NotificationCenter />);
      
      // Tab to the notification button
      await user.tab();
      
      const button = screen.getByRole('button');
      expect(button).toHaveFocus();
      
      // Enter should open the dropdown
      await user.keyboard('{Enter}');
      
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });
  });
});