import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { 
  Shield,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Database,
  Server,
  Cloud,
  Zap,
  RefreshCw
} from 'lucide-react';

interface SystemStatus {
  overall: string;
  services: Array<{
    name: string;
    status: string;
    lastCheck: string;
  }>;
}

interface SystemHealthProps {
  systemStatus: SystemStatus;
  loading?: boolean;
  onRefresh?: () => void;
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'healthy':
    case 'operational':
    case 'online':
      return CheckCircle;
    case 'warning':
    case 'partial':
    case 'degraded':
      return AlertCircle;
    case 'error':
    case 'down':
    case 'offline':
      return XCircle;
    default:
      return Clock;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'healthy':
    case 'operational':
    case 'online':
      return 'text-green-600 bg-green-100';
    case 'warning':
    case 'partial':
    case 'degraded':
      return 'text-yellow-600 bg-yellow-100';
    case 'error':
    case 'down':
    case 'offline':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

const getServiceIcon = (serviceName: string) => {
  switch (serviceName.toLowerCase()) {
    case 'database':
    case 'postgresql':
      return Database;
    case 'api gateway':
    case 'api':
    case 'server':
      return Server;
    case 'ai services':
    case 'ai':
      return Zap;
    case 'file storage':
    case 'storage':
    case 'cloud':
      return Cloud;
    default:
      return Server;
  }
};

const formatLastCheck = (timestamp: string) => {
  const now = new Date();
  const checkTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - checkTime.getTime()) / (1000 * 60));

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

const ServiceStatus: React.FC<{ 
  service: { name: string; status: string; lastCheck: string };
  loading: boolean;
}> = ({ service, loading }) => {
  const StatusIcon = getStatusIcon(service.status);
  const ServiceIcon = getServiceIcon(service.name);
  const statusColor = getStatusColor(service.status);

  if (loading) {
    return (
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gray-200 rounded-lg animate-pulse">
            <div className="h-5 w-5 bg-gray-300 rounded" />
          </div>
          <div className="space-y-1">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 rounded-lg">
          <ServiceIcon className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{service.name}</h4>
          <p className="text-xs text-gray-500">
            Last check: {formatLastCheck(service.lastCheck)}
          </p>
        </div>
      </div>
      
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
        <StatusIcon className="h-3 w-3 mr-1" />
        {service.status}
      </div>
    </div>
  );
};

const OverallStatus: React.FC<{ status: string; loading: boolean }> = ({ status, loading }) => {
  const StatusIcon = getStatusIcon(status);
  const statusColor = getStatusColor(status);

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="h-12 w-12 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse" />
        <div className="h-6 w-32 bg-gray-200 rounded mx-auto mb-2 animate-pulse" />
        <div className="h-4 w-48 bg-gray-200 rounded mx-auto animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-6 text-center ${statusColor.replace('text-', 'bg-').replace('-600', '-50')}`}>
      <div className={`inline-flex p-3 rounded-full mb-4 ${statusColor.replace('text-', 'bg-').replace('-600', '-100')}`}>
        <StatusIcon className={`h-8 w-8 ${statusColor.split(' ')[0]}`} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 capitalize mb-1">
        System {status}
      </h3>
      <p className="text-sm text-gray-600">
        {status === 'healthy' 
          ? 'All systems operational'
          : status === 'partial'
          ? 'Some services experiencing issues'
          : status === 'unhealthy'
          ? 'System experiencing problems'
          : 'System status unknown'
        }
      </p>
    </div>
  );
};

export const SystemHealth: React.FC<SystemHealthProps> = ({ 
  systemStatus, 
  loading = false,
  onRefresh
}) => {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>System Health</span>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Status */}
        <OverallStatus status={systemStatus.overall} loading={loading} />

        {/* Individual Services */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Service Status</h4>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, index) => (
                <ServiceStatus 
                  key={index} 
                  service={{ name: '', status: '', lastCheck: '' }} 
                  loading={true} 
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {systemStatus.services.map((service, index) => (
                <ServiceStatus key={index} service={service} loading={false} />
              ))}
            </div>
          )}
        </div>

        {/* Status Legend */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h5 className="font-medium text-gray-900 text-sm">Status Legend</h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-gray-600">Healthy</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-3 w-3 text-yellow-600" />
              <span className="text-gray-600">Warning</span>
            </div>
            <div className="flex items-center space-x-2">
              <XCircle className="h-3 w-3 text-red-600" />
              <span className="text-gray-600">Error</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3 text-gray-600" />
              <span className="text-gray-600">Unknown</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemHealth;