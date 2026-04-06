import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Filter, 
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Fuel,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  FileText,
  Table as TableIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [stats, setStats] = useState({
    totalSales: 0,
    totalLiters: 0,
    totalExpenses: 0,
    netProfit: 0,
    meterVolume: 0,
    varianceVolume: 0,
    salesTrend: [] as any[],
    productMix: [] as any[],
    shiftHistory: [] as any[]
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Petrol Station Management System - Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Period: Last ${dateRange === '7d' ? '7 Days' : dateRange === '30d' ? '30 Days' : '90 Days'}`, 14, 36);

    // Summary Stats
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Summary Statistics', 14, 50);
    
    autoTable(doc, {
      startY: 55,
      head: [['Metric', 'Value']],
      body: [
        ['Total Sales', `KES ${stats.totalSales.toLocaleString()}`],
        ['Total Liters', `${stats.totalLiters.toLocaleString()} L`],
        ['Total Expenses', `KES ${stats.totalExpenses.toLocaleString()}`],
        ['Net Profit', `KES ${stats.netProfit.toLocaleString()}`],
        ['Meter Volume', `${stats.meterVolume.toLocaleString()} L`],
        ['Variance', `${stats.varianceVolume.toLocaleString()} L`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    // Shift History
    doc.text('Recent Shift History', 14, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Date', 'Station', 'Staff', 'Volume (L)', 'Status']],
      body: stats.shiftHistory.map(s => [
        new Date(s.start_time).toLocaleDateString(),
        s.stations?.name || 'N/A',
        s.profiles?.full_name || 'N/A',
        (s.volume_sold || 0).toLocaleString(),
        s.status.toUpperCase()
      ]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`PSMS_Report_${dateRange}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Sales', stats.totalSales],
      ['Total Liters', stats.totalLiters],
      ['Total Expenses', stats.totalExpenses],
      ['Net Profit', stats.netProfit],
      ['Meter Volume', stats.meterVolume],
      ['Variance', stats.varianceVolume]
    ];

    const shiftData = stats.shiftHistory.map(s => ({
      Date: new Date(s.start_time).toLocaleDateString(),
      Station: s.stations?.name || 'N/A',
      Staff: s.profiles?.full_name || 'N/A',
      'Volume (L)': s.volume_sold || 0,
      Status: s.status.toUpperCase()
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    const ws2 = XLSX.utils.json_to_sheet(shiftData);

    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');
    XLSX.utils.book_append_sheet(wb, ws2, 'Shift History');

    XLSX.writeFile(wb, `PSMS_Report_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [salesRes, expensesRes, shiftsRes] = await Promise.all([
        supabase
          .from('fuel_sales')
          .select('total_amount, volume_liters, created_at')
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('expenses')
          .select('amount, created_at')
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('shifts')
          .select('*, stations(name), profiles:staff_id(full_name, email)')
          .gte('start_time', startDate.toISOString())
          .order('start_time', { ascending: false })
      ]);

      if (salesRes.data && expensesRes.data && shiftsRes.data) {
        const totalSales = salesRes.data.reduce((sum, s) => sum + Number(s.total_amount), 0);
        const totalLiters = salesRes.data.reduce((sum, s) => sum + Number(s.volume_liters), 0);
        const totalExpenses = expensesRes.data.reduce((sum, e) => sum + Number(e.amount), 0);
        
        const meterVolume = shiftsRes.data
          .filter(s => s.status === 'closed')
          .reduce((sum, s) => 
            sum + (Number(s.volume_sold) || (Number(s.closing_meter_reading) - Number(s.opening_meter_reading))), 0);

        // Group sales by date for trend
        const dailyData = salesRes.data.reduce((acc: any, sale) => {
          const date = new Date(sale.created_at).toLocaleDateString();
          if (!acc[date]) acc[date] = { date, transactions: 0 };
          acc[date].transactions += Number(sale.total_amount);
          return acc;
        }, {});

        const salesTrend = Object.values(dailyData).sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime());

        // Product Mix
        const { data: salesWithProducts } = await supabase
          .from('fuel_sales')
          .select('total_amount, fuel_products(name)')
          .gte('created_at', startDate.toISOString());

        const productMix = (salesWithProducts || []).reduce((acc: any, sale) => {
          const name = (sale as any).fuel_products?.name || 'Unknown';
          acc[name] = (acc[name] || 0) + Number(sale.total_amount);
          return acc;
        }, {});

        const productMixData = Object.entries(productMix).map(([name, value]) => ({
          name,
          value
        }));

        setStats({
          totalSales,
          totalLiters,
          totalExpenses,
          netProfit: totalSales - totalExpenses,
          meterVolume,
          varianceVolume: meterVolume - totalLiters,
          salesTrend,
          productMix: productMixData,
          shiftHistory: shiftsRes.data
        });
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Advanced Reports</h1>
          <p className="text-gray-500 mt-1">Deep dive into sales performance, expenses, and profitability.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  dateRange === range 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={exportToPDF}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:bg-gray-50 active:scale-95"
              title="Export PDF"
            >
              <FileText className="w-4 h-4 text-red-600" />
              PDF
            </button>
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:bg-gray-50 active:scale-95"
              title="Export Excel"
            >
              <TableIcon className="w-4 h-4 text-green-600" />
              Excel
            </button>
            <button 
              onClick={fetchData}
              disabled={refreshing}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +12%
            </span>
          </div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Revenue</p>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-1">KES {stats.totalSales.toLocaleString()}</h2>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 rounded-2xl text-red-600">
              <TrendingDown className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-red-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +5%
            </span>
          </div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Expenses</p>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-1">KES {stats.totalExpenses.toLocaleString()}</h2>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-2xl text-green-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +18%
            </span>
          </div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Net Profit</p>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-1">KES {stats.netProfit.toLocaleString()}</h2>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
              <Fuel className="w-6 h-6" />
            </div>
            <span className={`text-xs font-bold flex items-center gap-1 ${stats.varianceVolume > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.varianceVolume > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {stats.varianceVolume.toFixed(2)} L Var
            </span>
          </div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Meter Volume</p>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-1">{stats.meterVolume.toLocaleString()} L</h2>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Trend */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" /> Sales Trend
            </h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <AreaChart data={stats.salesTrend}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(value) => `KES ${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`KES ${value.toLocaleString()}`, 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="transactions" 
                  stroke="#2563eb" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Mix */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Product Mix
            </h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%" debounce={100}>
              <BarChart data={stats.productMix} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`KES ${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 10, 10, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Shift History (Attendance) */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600" /> Staff Shift History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-8 py-4">Staff Member</th>
                <th className="px-8 py-4">Station</th>
                <th className="px-8 py-4">Clock In</th>
                <th className="px-8 py-4">Clock Out</th>
                <th className="px-8 py-4">Duration</th>
                <th className="px-8 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.shiftHistory.map((shift) => (
                <tr key={shift.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="font-bold text-gray-900">{shift.profiles?.full_name || 'Staff'}</div>
                    <div className="text-xs text-gray-500">{shift.profiles?.email}</div>
                  </td>
                  <td className="px-8 py-4 text-sm text-gray-600">{shift.stations?.name}</td>
                  <td className="px-8 py-4">
                    <div className="text-sm font-medium text-gray-900">{new Date(shift.start_time).toLocaleDateString()}</div>
                    <div className="text-xs text-green-600 font-bold">{new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-8 py-4">
                    {shift.end_time ? (
                      <>
                        <div className="text-sm font-medium text-gray-900">{new Date(shift.end_time).toLocaleDateString()}</div>
                        <div className="text-xs text-red-600 font-bold">{new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </>
                    ) : (
                      <span className="text-gray-400 italic text-sm">Active</span>
                    )}
                  </td>
                  <td className="px-8 py-4 text-sm font-bold text-gray-900">
                    {shift.end_time ? (
                      `${(Math.abs(new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / 36e5).toFixed(1)} hrs`
                    ) : (
                      '--'
                    )}
                  </td>
                  <td className="px-8 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      shift.status === 'open' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {shift.status}
                    </span>
                  </td>
                </tr>
              ))}
              {stats.shiftHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-gray-500">
                    No shift history found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
