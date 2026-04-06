import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  DollarSign, 
  Plus, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  ShoppingBag,
  Truck,
  MapPin,
  X,
  Calendar,
  Filter,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Expense {
  id: string;
  station_id: string;
  category: string;
  amount: number;
  description: string;
  expense_date: string;
  stations: { name: string };
}

export default function Expenses({ user }: { user: any }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stations, setStations] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);

  // Form States
  const [selectedStation, setSelectedStation] = useState('');
  const [category, setCategory] = useState('Electricity');
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'Electricity', 'Water', 'Maintenance', 'Salaries', 'Rent', 'Licenses', 'Security', 'Other'
  ];

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const userId = user?.id;

      // Fetch active shift for current user
      if (userId) {
        const { data: shiftData } = await supabase
          .from('shifts')
          .select('id')
          .eq('staff_id', userId)
          .eq('status', 'open')
          .maybeSingle();
        
        if (shiftData) setActiveShiftId(shiftData.id);
        else setActiveShiftId(null);
      }

      const [expensesRes, stationsRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('*, stations(name)')
          .order('expense_date', { ascending: false }),
        supabase.from('stations').select('id, name')
      ]);

      if (expensesRes.data) {
        setExpenses(expensesRes.data as any);
        const total = expensesRes.data.reduce((sum, exp) => sum + Number(exp.amount), 0);
        setTotalExpenses(total);
      }
      if (stationsRes.data) setStations(stationsRes.data);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation || !amount) return;

    setSubmitting(true);
    setError(null);

    try {
      const userId = user?.id;

      const { error: expenseError } = await supabase
        .from('expenses')
        .insert({
          station_id: selectedStation,
          category,
          amount: Number(amount),
          description,
          expense_date: expenseDate,
          recorded_by: userId,
          shift_id: activeShiftId
        });

      if (expenseError) throw expenseError;

      setSuccess(true);
      fetchData();
      setTimeout(() => {
        setSuccess(false);
        setIsModalOpen(false);
        setAmount('');
        setDescription('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Expense Management</h1>
          <p className="text-gray-500 mt-1">Track operational costs and overheads across all stations.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Record Expense
          </button>
          <button 
            onClick={fetchData}
            disabled={refreshing}
            className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-2xl">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Expenses</p>
              <h2 className="text-2xl font-extrabold text-gray-900">KES {totalExpenses.toLocaleString()}</h2>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <Filter className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Categories</p>
              <h2 className="text-2xl font-extrabold text-gray-900">{categories.length}</h2>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-2xl">
              <History className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Transactions</p>
              <h2 className="text-2xl font-extrabold text-gray-900">{expenses.length}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Recent Expenses</h2>
          <History className="w-5 h-5 text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Station</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">
                    {expense.stations?.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wider">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 italic">
                    {expense.description || 'No description'}
                  </td>
                  <td className="px-6 py-4 text-sm font-extrabold text-red-600">
                    KES {expense.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No expenses recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Record New Expense</h2>
                  <button 
                    disabled={submitting}
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                {success ? (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 space-y-4"
                  >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">Expense recorded!</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleAddExpense} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Station</label>
                        <select 
                          required
                          value={selectedStation}
                          onChange={(e) => setSelectedStation(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Station</option>
                          {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Category</label>
                        <select 
                          required
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Amount (KES)</label>
                        <input 
                          type="number"
                          required
                          value={amount}
                          onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Date</label>
                        <input 
                          type="date"
                          required
                          value={expenseDate}
                          onChange={(e) => setExpenseDate(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Description</label>
                        <textarea 
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                          placeholder="What was this for?"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Record Expense'}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
