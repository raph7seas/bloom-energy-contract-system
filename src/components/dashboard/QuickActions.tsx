import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { 
  Plus,
  Calculator,
  FileUp,
  Library,
  BarChart3,
  Brain,
  FileText,
  Settings,
  ArrowRight
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

interface QuickActionsProps {
  onNavigate?: (view: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  const handleNavigate = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
    } else {
      // Fallback: dispatch custom event that the main app can listen to
      window.dispatchEvent(new CustomEvent('navigate', { detail: { view } }));
    }
  };

  const primaryActions: QuickAction[] = [
    {
      id: 'create-contract',
      title: 'Create New Contract',
      description: 'Start building a new energy service contract',
      icon: Plus,
      action: () => handleNavigate('create'),
      variant: 'primary'
    },
    {
      id: 'upload-document',
      title: 'Upload Document',
      description: 'Import existing contracts for rules extraction',
      icon: FileUp,
      action: () => handleNavigate('documents'),
      variant: 'primary'
    }
  ];

  const secondaryActions: QuickAction[] = [
    {
      id: 'view-library',
      title: 'Contract Library',
      description: 'Browse and manage existing contracts',
      icon: Library,
      action: () => handleNavigate('library')
    },
    {
      id: 'rules-engine',
      title: 'Rules Engine',
      description: 'View extracted rules and patterns',
      icon: Settings,
      action: () => handleNavigate('rules')
    },
    {
      id: 'analytics',
      title: 'View Analytics',
      description: 'Contract performance and insights',
      icon: BarChart3,
      action: () => handleNavigate('analytics')
    },
    {
      id: 'templates',
      title: 'Template Management',
      description: 'Manage contract templates and configurations',
      icon: FileText,
      action: () => handleNavigate('templates')
    }
  ];

  const ActionButton: React.FC<{ action: QuickAction; isPrimary?: boolean }> = ({ 
    action, 
    isPrimary = false 
  }) => {
    const Icon = action.icon;
    
    if (isPrimary) {
      return (
        <Button
          onClick={action.action}
          disabled={action.disabled}
          className="w-full h-auto p-6 flex flex-col items-start space-y-3 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <div className="flex items-center justify-between w-full">
            <Icon className="h-6 w-6" />
            <ArrowRight className="h-4 w-4 opacity-70" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-base">{action.title}</div>
            <div className="text-sm opacity-90 mt-1">{action.description}</div>
          </div>
        </Button>
      );
    }

    return (
      <button
        onClick={action.action}
        disabled={action.disabled}
        className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
            <Icon className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 text-sm">{action.title}</div>
            <div className="text-xs text-gray-500 mt-1">{action.description}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Quick Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Actions */}
        <div className="space-y-3">
          {primaryActions.map((action) => (
            <ActionButton key={action.id} action={action} isPrimary={true} />
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Secondary Actions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3">More Actions</h4>
          {secondaryActions.map((action) => (
            <ActionButton key={action.id} action={action} />
          ))}
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Need Help?</span>
          </div>
          <p className="text-xs text-blue-700">
            Check out our user guide or contact support for assistance with contract management.
          </p>
          <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            View Documentation →
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;