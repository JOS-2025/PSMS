import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { reportService, DailySummary, FuelBreakdown, PaymentBreakdown } from '../services/reportService';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Filter, 
  Loader2,
  TrendingUp,
  DollarSign,
  Fuel,
  CreditCard,
  ArrowUpRight,
  RefreshCw,
  PieChart as PieChartIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { toast } from 'sonner';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DailyReports() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [stations, setStations] = useState<any[]>([]);
  
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [fuelBreakdown, setFuelBreakdown] = useState<FuelBreakdown[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      fetchReportData();
    }
  }, [selectedStation, selectedDate]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: stationsData } = await supabase.from('stations').select('id, name');
      if (stationsData) {
        setStations(stationsData);
        if (stationsData.length > 0) setSelectedStation(stationsData[0].id);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async () => {
    setRefreshing(true);
    try {
      const [summaryRes, fuelRes, paymentRes] = await Promise.all([
        reportService.getDailySummary(selectedStation, selectedDate),
        reportService.getFuelBreakdown(selectedStation, selectedDate),
        reportService.getPaymentBreakdown(selectedStation, selectedDate)
      ]);

      setSummary(summaryRes);
      setFuelBreakdown(fuelRes);
      setPaymentBreakdown(paymentRes);
    } catch (err) {
      console.error('Error fetching report data:', err);
      toast.error('Failed to fetch report data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    if (!summary) {
      toast.error('No data available to export for the selected date and station.');
      return;
    }
    
    let csvContent = "DAILY SALES REPORT\n";
    csvContent += `Station: ${stations.find(s => s.id === selectedStation)?.name || 'Unknown'}\n`;
    csvContent += `Date: ${selectedDate}\n\n`;
    
    csvContent += "SUMMARY\n";
    csvContent += `Total Revenue,KES ${summary.total_revenue || 0}\n`;
    csvContent += `Total Liters,${summary.total_liters || 0} L\n`;
    csvContent += `Total Transactions,${summary.total_transactions || 0}\n\n`;
    
    csvContent += "FUEL BREAKDOWN\n";
    csvContent += "Product,Liters,Amount (KES)\n";
    if (fuelBreakdown.length > 0) {
      fuelBreakdown.forEach(item => {
        csvContent += `${item.product_name || 'Unknown'},${item.total_liters || 0},${item.total_amount || 0}\n`;
      });
    } else {
      csvContent += "No fuel breakdown data available\n";
    }
    
    csvContent += "\nPAYMENT BREAKDOWN\n";
    csvContent += "Method,Amount (KES)\n";
    if (paymentBreakdown.length > 0) {
      paymentBreakdown.forEach(item => {
        csvContent += `${item.payment_method || 'Unknown'},${item.total_amount || 0}\n`;
      });
    } else {
      csvContent += "No payment breakdown data available\n";
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `daily_report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully');
  };

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Daily Sales Report</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Comprehensive overview of today's performance.</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <select 
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
          >
            {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={fetchReportData}
              disabled={refreshing}
              className="flex-1 sm:flex-none p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm active:scale-95 flex items-center justify-center"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={handleExportCSV}
              className="flex-[2] sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200 active:scale-95 text-sm md:text-base"
            >
              <Download className="w-4 h-4 md:w-5 md:h-5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Live
            </span>
          </div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Revenue</p>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-1">
            KES {summary?.total_revenue.toLocaleString() || '0'}
          </h2>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
              <Fuel className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Volume
            </span>
          </div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Liters</p>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-1">
            {summary?.total_liters.toLocaleString() || '0'} L
          </h2>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 rounded-2xl text-green-600">
              <BarChart3 className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Count
            </span>
          </div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Transactions</p>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-1">
            {summary?.total_transactions.toLocaleString() || '0'}
          </h2>
        </div>
      </div>

      {/* Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Fuel Breakdown */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Fuel className="w-5 h-5 text-blue-600" /> Fuel Product Breakdown
          </h3>
          <div className="h-[300px] w-full mb-6">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
              <BarChart data={fuelBreakdown}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="product_name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`KES ${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="total_amount" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-gray-500 uppercase border-b border-gray-50">
                  <th className="pb-4">Product</th>
                  <th className="pb-4">Liters</th>
                  <th className="pb-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fuelBreakdown.map((item) => (
                  <tr key={item.fuel_product_id}>
                    <td className="py-4 font-bold text-gray-900">{item.product_name}</td>
                    <td className="py-4 text-gray-600">{item.total_liters.toLocaleString()} L</td>
                    <td className="py-4 text-right font-bold text-gray-900">KES {item.total_amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" /> Payment Method Breakdown
          </h3>
          <div className="h-[300px] w-full mb-6">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
              <PieChart>
                <Pie
                  data={paymentBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="total_amount"
                  nameKey="payment_method"
                >
                  {paymentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`KES ${value.toLocaleString()}`, 'Total']}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-gray-500 uppercase border-b border-gray-50">
                  <th className="pb-4">Method</th>
                  <th className="pb-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paymentBreakdown.map((item, index) => (
                  <tr key={item.payment_method}>
                    <td className="py-4 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-bold text-gray-900 capitalize">{item.payment_method}</span>
                    </td>
                    <td className="py-4 text-right font-bold text-gray-900">KES {item.total_amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
