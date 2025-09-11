import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp,
  FileText,
  Settings,
  Clock
} from 'lucide-react';

interface ChartData {
  contractTrend: Array<{ month: string; contracts: number; value: number }>;
  rulesExtraction: Array<{ type: string; count: number; accuracy: number }>;
  contractTypes: Array<{ type: string; count: number; value: number }>;
}

interface DashboardChartsProps {
  chartData: ChartData;
  loading?: boolean;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.dataKey}: ${entry.value}`}
            {entry.dataKey === 'value' && '$'}
            {entry.dataKey === 'accuracy' && '%'}
            {entry.dataKey === 'uptime' && '%'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
};

const ChartContainer: React.FC<{ 
  title: string; 
  icon: React.ComponentType<any>; 
  children: React.ReactNode;
  loading?: boolean;
}> = ({ title, icon: Icon, children, loading }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Icon className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 bg-gray-200 rounded animate-pulse flex items-center justify-center">
            <span className="text-gray-500">Loading chart...</span>
          </div>
        ) : (
          <div className="h-64">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ chartData, loading = false }) => {
  const { contractTrend, rulesExtraction, contractTypes } = chartData;

  // Prepare rules extraction data for pie chart
  const rulesExtractionPieData = rulesExtraction.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length]
  }));

  // Prepare contract types data for bar chart
  const contractTypesPieData = contractTypes.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <div className="space-y-6">
      {/* Contract Trend Chart */}
      <ChartContainer title="Contract Performance" icon={TrendingUp} loading={loading}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={contractTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="contracts"
              stackId="1"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.6}
              name="Contracts Created"
            />
            <Area
              type="monotone"
              dataKey="value"
              stackId="2"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.6}
              name="Contract Value ($)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rules Extraction Success */}
        <ChartContainer title="Rules Extraction by Type" icon={Settings} loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rulesExtraction}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="type" 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="count"
                fill="#3B82F6"
                name="Rules Extracted"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="accuracy"
                fill="#10B981"
                name="Accuracy %"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Time Savings Trend */}
      {contractTrend.length > 0 && (
        <ChartContainer title="Time Savings Analysis" icon={Clock} loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={contractTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="contracts" 
                stroke="#3B82F6" 
                strokeWidth={3}
                name="Contracts Created"
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#10B981" 
                strokeWidth={3}
                name="Hours Saved"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}
    </div>
  );
};

export default DashboardCharts;