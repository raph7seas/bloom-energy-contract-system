import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { 
  FileText,
  DollarSign,
  Settings,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface StatsProps {
  stats: {
    totalContracts: number;
    contractValue: number;
    rulesExtracted: number;
    timeSaved: number;
  };
  loading?: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  loading?: boolean;
  prefix?: string;
  suffix?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  loading, 
  prefix = '',
  suffix = '' 
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${prefix}${(val / 1000000).toFixed(1)}M${suffix}`;
      } else if (val >= 1000) {
        return `${prefix}${(val / 1000).toFixed(1)}K${suffix}`;
      }
      return `${prefix}${val.toLocaleString()}${suffix}`;
    }
    return `${prefix}${val}${suffix}`;
  };

  const getChangeIcon = () => {
    if (!change) return null;
    
    switch (change.type) {
      case 'increase':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'decrease':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getChangeColor = () => {
    if (!change) return 'text-gray-500';
    
    switch (change.type) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            {loading ? (
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {formatValue(value)}
              </p>
            )}
            {change && !loading && (
              <div className="flex items-center mt-2 space-x-1">
                {getChangeIcon()}
                <span className={`text-sm font-medium ${getChangeColor()}`}>
                  {Math.abs(change.value)}%
                </span>
                <span className="text-xs text-gray-500">vs {change.period}</span>
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const DashboardStats: React.FC<StatsProps> = ({ stats, loading = false }) => {
  // Calculate some mock growth percentages for demo
  const getGrowthData = (value: number, seed: number) => {
    if (value === 0) return undefined;
    
    const change = (seed % 3 === 0) ? 'increase' : (seed % 3 === 1) ? 'decrease' : 'neutral';
    const changeValue = Math.floor(Math.random() * 20) + 1;
    
    return {
      value: changeValue,
      type: change as 'increase' | 'decrease' | 'neutral',
      period: 'last month'
    };
  };

  const statCards = [
    {
      title: 'Total Contracts',
      value: stats.totalContracts,
      icon: FileText,
      change: getGrowthData(stats.totalContracts, 1)
    },
    {
      title: 'Contract Value',
      value: stats.contractValue,
      icon: DollarSign,
      prefix: '$',
      change: getGrowthData(stats.contractValue, 2)
    },
    {
      title: 'Rules Extracted',
      value: stats.rulesExtracted,
      icon: Settings,
      change: getGrowthData(stats.rulesExtracted, 3)
    },
    {
      title: 'Time Saved',
      value: stats.timeSaved,
      icon: Clock,
      suffix: ' hrs',
      change: { value: 15, type: 'increase' as const, period: 'last month' }
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          change={stat.change}
          loading={loading}
          prefix={stat.prefix}
        />
      ))}
    </div>
  );
};

export default DashboardStats;