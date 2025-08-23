'use client';

import React, { useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Brush,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Download, 
  Maximize2, 
  TrendingUp, 
  TrendingDown,
  Filter,
  Calendar,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'composed' | 'radar';
export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'custom';
export type Aggregation = 'daily' | 'weekly' | 'monthly';

interface DataPoint {
  date: string;
  value: number;
  category?: string;
  [key: string]: any;
}

interface ChartConfig {
  type: ChartType;
  dataKey: string;
  categoryKey?: string;
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  showBrush?: boolean;
  animated?: boolean;
  stacked?: boolean;
}

interface InteractiveChartProps {
  title: string;
  description?: string;
  data: DataPoint[];
  config?: Partial<ChartConfig>;
  height?: number;
  onDataPointClick?: (data: DataPoint) => void;
  onExport?: () => void;
  showControls?: boolean;
  className?: string;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function InteractiveChart({
  title,
  description,
  data,
  config = {},
  height = 400,
  onDataPointClick,
  onExport,
  showControls = true,
  className
}: InteractiveChartProps) {
  const [chartType, setChartType] = useState<ChartType>(config.type || 'line');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [aggregation, setAggregation] = useState<Aggregation>('daily');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const chartConfig: ChartConfig = {
    type: chartType,
    dataKey: 'value',
    colors: COLORS,
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    showBrush: false,
    animated: true,
    stacked: false,
    ...config
  };

  // Filter data based on time range
  const filteredData = useCallback(() => {
    if (!data) return [];
    
    const now = new Date();
    let startDate = now;
    
    switch (timeRange) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      case '1y':
        startDate = subDays(now, 365);
        break;
      default:
        return data;
    }
    
    return data.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate && itemDate <= now;
    });
  }, [data, timeRange]);

  // Aggregate data based on aggregation type
  const aggregatedData = useCallback(() => {
    const filtered = filteredData();
    if (aggregation === 'daily') return filtered;
    
    const grouped = new Map<string, DataPoint[]>();
    
    filtered.forEach(item => {
      const date = new Date(item.date);
      let key: string;
      
      if (aggregation === 'weekly') {
        const weekStart = startOfWeek(date);
        key = format(weekStart, 'yyyy-MM-dd');
      } else {
        const monthStart = startOfMonth(date);
        key = format(monthStart, 'yyyy-MM');
      }
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    });
    
    return Array.from(grouped.entries()).map(([date, items]) => ({
      date,
      value: items.reduce((sum, item) => sum + item.value, 0) / items.length,
      count: items.length,
      ...items[0] // Preserve other fields from first item
    }));
  }, [filteredData, aggregation]);

  const processedData = aggregatedData();

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mt-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Export chart as image
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      // Default export implementation
      const chartElement = document.querySelector('.recharts-wrapper');
      if (chartElement) {
        // Convert to canvas and download
        // This would require html2canvas library
        console.log('Exporting chart...');
      }
    }
  };

  // Calculate trend
  const calculateTrend = () => {
    if (processedData.length < 2) return null;
    
    const firstValue = processedData[0].value;
    const lastValue = processedData[processedData.length - 1].value;
    const change = ((lastValue - firstValue) / firstValue) * 100;
    
    return {
      value: change,
      direction: change > 0 ? 'up' : 'down'
    };
  };

  const trend = calculateTrend();

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={processedData}>
            {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="date" />
            <YAxis />
            {chartConfig.showTooltip && <Tooltip content={<CustomTooltip />} />}
            {chartConfig.showLegend && <Legend />}
            <Line 
              type="monotone" 
              dataKey={chartConfig.dataKey}
              stroke={chartConfig.colors![0]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6, onClick: onDataPointClick }}
              animationDuration={chartConfig.animated ? 1000 : 0}
            />
            {chartConfig.showBrush && <Brush dataKey="date" height={30} />}
          </LineChart>
        );
      
      case 'bar':
        return (
          <BarChart data={processedData}>
            {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="date" />
            <YAxis />
            {chartConfig.showTooltip && <Tooltip content={<CustomTooltip />} />}
            {chartConfig.showLegend && <Legend />}
            <Bar 
              dataKey={chartConfig.dataKey}
              fill={chartConfig.colors![0]}
              onClick={onDataPointClick}
              animationDuration={chartConfig.animated ? 1000 : 0}
            />
          </BarChart>
        );
      
      case 'area':
        return (
          <AreaChart data={processedData}>
            {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="date" />
            <YAxis />
            {chartConfig.showTooltip && <Tooltip content={<CustomTooltip />} />}
            {chartConfig.showLegend && <Legend />}
            <Area 
              type="monotone" 
              dataKey={chartConfig.dataKey}
              stroke={chartConfig.colors![0]}
              fill={chartConfig.colors![0]}
              fillOpacity={0.3}
              onClick={onDataPointClick}
              animationDuration={chartConfig.animated ? 1000 : 0}
            />
          </AreaChart>
        );
      
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={processedData}
              dataKey={chartConfig.dataKey}
              nameKey="date"
              cx="50%"
              cy="50%"
              outerRadius={height / 3}
              onClick={onDataPointClick}
              animationDuration={chartConfig.animated ? 1000 : 0}
            >
              {processedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartConfig.colors![index % chartConfig.colors!.length]} />
              ))}
            </Pie>
            {chartConfig.showTooltip && <Tooltip content={<CustomTooltip />} />}
            {chartConfig.showLegend && <Legend />}
          </PieChart>
        );
      
      case 'scatter':
        return (
          <ScatterChart>
            {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="date" />
            <YAxis dataKey={chartConfig.dataKey} />
            {chartConfig.showTooltip && <Tooltip content={<CustomTooltip />} />}
            {chartConfig.showLegend && <Legend />}
            <Scatter 
              data={processedData}
              fill={chartConfig.colors![0]}
              onClick={onDataPointClick}
              animationDuration={chartConfig.animated ? 1000 : 0}
            />
          </ScatterChart>
        );
      
      case 'radar':
        return (
          <RadarChart data={processedData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="date" />
            <PolarRadiusAxis />
            <Radar 
              dataKey={chartConfig.dataKey}
              stroke={chartConfig.colors![0]}
              fill={chartConfig.colors![0]}
              fillOpacity={0.6}
              animationDuration={chartConfig.animated ? 1000 : 0}
            />
            {chartConfig.showTooltip && <Tooltip content={<CustomTooltip />} />}
            {chartConfig.showLegend && <Legend />}
          </RadarChart>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            {trend && (
              <Badge variant={trend.direction === 'up' ? 'default' : 'secondary'}>
                {trend.direction === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(trend.value).toFixed(1)}%
              </Badge>
            )}
            {showControls && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        {showControls && (
          <div className="flex flex-wrap gap-2 mt-4">
            {/* Chart Type Selector */}
            <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">
                  <div className="flex items-center gap-2">
                    <LineChartIcon className="h-4 w-4" />
                    Line
                  </div>
                </SelectItem>
                <SelectItem value="bar">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Bar
                  </div>
                </SelectItem>
                <SelectItem value="area">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Area
                  </div>
                </SelectItem>
                <SelectItem value="pie">
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4" />
                    Pie
                  </div>
                </SelectItem>
                <SelectItem value="scatter">Scatter</SelectItem>
                <SelectItem value="radar">Radar</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Time Range Selector */}
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="w-[120px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Aggregation Selector */}
            <Select value={aggregation} onValueChange={(value) => setAggregation(value as Aggregation)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}