import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { 
  Clock,
  FileText,
  Settings,
  Upload,
  User,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowRight
} from 'lucide-react';

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user?: string;
}

interface RecentActivityProps {
  activities: Activity[];
  loading?: boolean;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'contract':
      return FileText;
    case 'rules':
      return Settings;
    case 'upload':
      return Upload;
    case 'user':
      return User;
    case 'system':
      return CheckCircle;
    default:
      return Info;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'contract':
      return 'bg-blue-100 text-blue-600';
    case 'rules':
      return 'bg-green-100 text-green-600';
    case 'upload':
      return 'bg-purple-100 text-purple-600';
    case 'user':
      return 'bg-gray-100 text-gray-600';
    case 'system':
      return 'bg-yellow-100 text-yellow-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const activityTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days}d ago`;
  }
};

const ActivityItem: React.FC<{ activity: Activity; isLast: boolean }> = ({ activity, isLast }) => {
  const Icon = getActivityIcon(activity.type);
  const colorClass = getActivityColor(activity.type);

  return (
    <div className="flex items-start space-x-3 group">
      <div className="relative flex-shrink-0">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && (
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-px h-8 bg-gray-200" />
        )}
      </div>
      
      <div className="flex-1 min-w-0 pb-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-900 group-hover:text-blue-600 cursor-pointer">
            {activity.description}
          </p>
          <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <div className="flex items-center space-x-2 mt-1">
          <p className="text-xs text-gray-500">
            {formatRelativeTime(activity.timestamp)}
          </p>
          {activity.user && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <p className="text-xs text-gray-500">
                by {activity.user}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const LoadingItem: React.FC<{ isLast: boolean }> = ({ isLast }) => (
  <div className="flex items-start space-x-3">
    <div className="relative flex-shrink-0">
      <div className="p-2 rounded-lg bg-gray-200 animate-pulse">
        <div className="h-4 w-4 bg-gray-300 rounded" />
      </div>
      {!isLast && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-px h-8 bg-gray-200" />
      )}
    </div>
    
    <div className="flex-1 min-w-0 pb-8 space-y-2">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
    </div>
  </div>
);

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities, loading = false }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Activity</span>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View All
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }, (_, index) => (
              <LoadingItem key={index} isLast={index === 4} />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-sm">No recent activity</p>
            <p className="text-gray-400 text-xs mt-1">
              Activities will appear here as you use the system
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((activity, index) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity} 
                isLast={index === activities.length - 1}
              />
            ))}
          </div>
        )}
        
        {activities.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium py-2 hover:bg-blue-50 rounded transition-colors">
              Load More Activities
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;