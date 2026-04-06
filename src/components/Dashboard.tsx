import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, 
  Droplets, 
  CreditCard, 
  BarChart3, 
  MapPin, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  RefreshCw,
  Edit2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import { startOfDay, format, subDays, isSameDay } from 'date-fns';
import { motion } from 'motion/react';
import { toast } from 'sonner';

// --- Types ---

interface DashboardStats {
  totalLiters: number;
  totalRevenue: number;
  transactionCount: number;
}

interface StationMetric {
  id: string;
  name: string;
  revenue: number;
  volume: number;
}

interface DailySaleData {
  date: string;
  revenue: number;
  volume: number;
}

// --- Component ---

export default function Dashboard({ onEditStation }: { onEditStation?: (id: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalLiters: 0,
    totalRevenue: 0,
    transactionCount: 0
  });
  const [stationMetrics, setStationMetrics] = useState<StationMetric[]>([]);
  const [chartData, setChartData] = useState<DailySaleData[]>([]);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      const today = startOfDay(new Date()).toISOString();

      // 1. Fetch Today's Summary
      const { data: todaySales, error: salesError } = await supabase
        .from('fuel_sales')
        .select('volume_liters, total_amount, station_id, created_at')
        .gte('created_at', today);

      if (salesError) throw salesError;

      const summary = (todaySales || []).reduce((acc, sale) => ({
        totalLiters: acc.totalLiters + Number(sale.volume_liters),
        totalRevenue: acc.totalRevenue + Number(sale.total_amount),
        transactionCount: acc.transactionCount + 1
      }), { totalLiters: 0, totalRevenue: 0, transactionCount: 0 });

      setStats(summary);

      // 2. Fetch Station Metrics (Today)
      const { data: stations, error: stationsError } = await supabase
        .from('stations')
        .select('id, name');

      if (stationsError) throw stationsError;

      const metrics = (stations || []).map(station => {
        const stationSales = (todaySales || []).filter(s => s.station_id === station.id);
        return {
          id: station.id,
          name: station.name,
          revenue: stationSales.reduce((sum, s) => sum + Number(s.total_amount), 0),
          volume: stationSales.reduce((sum, s) => sum + Number(s.volume_liters), 0)
        };
      });

      setStationMetrics(metrics);

      // 3. Fetch Last 7 Days for Chart
      const sevenDaysAgo = startOfDay(subDays(new Date(), 6)).toISOString();
      const { data: historicalSales, error: histError } = await supabase
        .from('fuel_sales')
        .select('volume_liters, total_amount, created_at')
        .gte('created_at', sevenDaysAgo);

      if (histError) throw histError;

      const dailyData: DailySaleData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const daySales = (historicalSales || []).filter(s => isSameDay(new Date(s.created_at), date));
        
        dailyData.push({
          date: format(date, 'MMM dd'),
          revenue: daySales.reduce((sum, s) => sum + Number(s.total_amount), 0),
          volume: daySales.reduce((sum, s) => sum + Number(s.volume_liters), 0)
        });
      }

      setChartData(dailyData);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      toast.error('Failed to load dashboard data. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Real-time subscription to fuel_sales
    const subscription = supabase
      .channel('dashboard_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fuel_sales' }, () => {
        fetchDashboardData(); // Refresh on new sale
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Real-time performance overview.</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="p-2.5 md:p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Today's Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Today's Revenue" 
          value={`KES ${stats.totalRevenue.toLocaleString()}`} 
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
          color="bg-green-50"
          trend="+12% from yesterday" // Placeholder for trend logic
          trendUp={true}
        />
        <StatCard 
          title="Fuel Sold" 
          value={`${stats.totalLiters.toFixed(2)} L`} 
          icon={<Droplets className="w-6 h-6 text-blue-600" />}
          color="bg-blue-50"
          trend="+5% from yesterday"
          trendUp={true}
        />
        <StatCard 
          title="Transactions" 
          value={stats.transactionCount.toString()} 
          icon={<CreditCard className="w-6 h-6 text-purple-600" />}
          color="bg-purple-50"
          trend="-2% from yesterday"
          trendUp={false}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-900">Sales Performance (7 Days)</h2>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
              <BarChart data={chartData}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="barGradientLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#93c5fd" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(value) => `KES ${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value) => [`KES ${Number(value).toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === chartData.length - 1 ? 'url(#barGradient)' : 'url(#barGradientLight)'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Station Metrics List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-900">Per Station (Today)</h2>
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-6">
            {stationMetrics.map((station) => (
              <div key={station.id} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{station.name}</span>
                    {onEditStation && (
                      <button 
                        onClick={() => onEditStation(station.id)}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all opacity-0 group-hover:opacity-100"
                        title="Edit Station"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-900">KES {station.revenue.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((station.revenue / (stats.totalRevenue || 1)) * 100, 100)}%` }}
                    className="bg-blue-600 h-full rounded-full"
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">{station.volume.toFixed(2)} Liters sold</span>
                  <span className="text-xs font-semibold text-blue-600">
                    {((station.revenue / (stats.totalRevenue || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
            {stationMetrics.length === 0 && (
              <p className="text-center text-gray-500 py-8">No station data available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Volume Trend Chart (Secondary) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-gray-900">Fuel Volume Trend</h2>
          <Droplets className="w-5 h-5 text-gray-400" />
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(value) => `${value}L`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="volume" 
                stroke="#2563eb" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorVolume)"
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }} 
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, trend, trendUp }: { 
  title: string, 
  value: string, 
  icon: React.ReactNode, 
  color: string,
  trend: string,
  trendUp: boolean
}) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 ${color} rounded-xl`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trendUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {trend}
        </div>
      </div>
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
      <p className="text-3xl font-extrabold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
