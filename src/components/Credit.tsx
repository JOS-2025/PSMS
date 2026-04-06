import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Plus, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  ShoppingBag,
  DollarSign,
  MapPin,
  X,
  Search,
  ArrowRight,
  UserPlus,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Customer {
  id: string;
  name: string;
  contact_number: string | null;
  email: string | null;
  credit_limit: number;
  current_balance: number;
}

interface Transaction {
  id: string;
  customer_id: string;
  amount: number;
  transaction_type: 'purchase' | 'payment';
  description: string | null;
  transaction_date: string;
  stations: { name: string };
}

export default function Credit() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stations, setStations] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Customer Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [creditLimit, setCreditLimit] = useState<number | ''>('');

  // Transaction Form
  const [transType, setTransType] = useState<'purchase' | 'payment'>('purchase');
  const [transAmount, setTransAmount] = useState<number | ''>('');
  const [transStation, setTransStation] = useState('');
  const [transDesc, setTransDesc] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [customersRes, transactionsRes, stationsRes] = await Promise.all([
        supabase.from('customers').select('*').order('name', { ascending: true }),
        supabase
          .from('credit_transactions')
          .select('*, stations(name)')
          .order('transaction_date', { ascending: false })
          .limit(20),
        supabase.from('stations').select('id, name')
      ]);

      if (customersRes.data) setCustomers(customersRes.data);
      if (transactionsRes.data) setTransactions(transactionsRes.data as any);
      if (stationsRes.data) setStations(stationsRes.data);
    } catch (err) {
      console.error('Error fetching credit data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) return;

    setSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase.from('customers').insert({
        name: customerName,
        contact_number: customerPhone,
        email: customerEmail,
        credit_limit: Number(creditLimit) || 0
      });

      if (error) throw error;

      setSuccess(true);
      fetchData();
      setTimeout(() => {
        setSuccess(false);
        setIsCustomerModalOpen(false);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCreditLimit('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !transAmount || !transStation) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Record transaction
      const { error: transError } = await supabase.from('credit_transactions').insert({
        customer_id: selectedCustomer.id,
        station_id: transStation,
        amount: Number(transAmount),
        transaction_type: transType,
        description: transDesc
      });

      if (transError) throw transError;

      // 2. Update customer balance
      const balanceChange = transType === 'purchase' ? Number(transAmount) : -Number(transAmount);
      const newBalance = selectedCustomer.current_balance + balanceChange;

      const { error: balanceError } = await supabase
        .from('customers')
        .update({ current_balance: newBalance })
        .eq('id', selectedCustomer.id);

      if (balanceError) throw balanceError;

      setSuccess(true);
      fetchData();
      setTimeout(() => {
        setSuccess(false);
        setIsTransactionModalOpen(false);
        setTransAmount('');
        setTransDesc('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record transaction');
    } finally {
      setSubmitting(false);
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
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Credit & Debtors</h1>
          <p className="text-gray-500 mt-1">Manage corporate accounts, credit limits, and payments.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCustomerModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <UserPlus className="w-5 h-5" />
            New Customer
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Customers List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Customer Accounts</h2>
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Credit Limit</th>
                    <th className="px-6 py-4">Current Balance</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{customer.name}</p>
                          <p className="text-xs text-gray-500">{customer.contact_number || 'No contact'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                        KES {customer.credit_limit.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`text-sm font-extrabold ${customer.current_balance > customer.credit_limit ? 'text-red-600' : 'text-gray-900'}`}>
                            KES {customer.current_balance.toLocaleString()}
                          </span>
                          <div className="w-24 bg-gray-100 h-1.5 rounded-full mt-1 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${customer.current_balance > customer.credit_limit ? 'bg-red-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min((customer.current_balance / (customer.credit_limit || 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setIsTransactionModalOpen(true);
                          }}
                          className="inline-flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        >
                          <CreditCard className="w-4 h-4" /> Record Transaction
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        No customers registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
              <History className="w-5 h-5 text-gray-400" />
            </div>
            <div className="p-6 space-y-6">
              {transactions.map((trans) => (
                <div key={trans.id} className="flex gap-4">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${trans.transaction_type === 'purchase' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {trans.transaction_type === 'purchase' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {customers.find(c => c.id === trans.customer_id)?.name}
                      </p>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {new Date(trans.transaction_date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                      {trans.transaction_type} @ {trans.stations?.name}
                    </p>
                    <p className="text-sm font-extrabold text-gray-900">
                      KES {trans.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No recent transactions.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isCustomerModalOpen && (
          <Modal 
            isOpen={isCustomerModalOpen} 
            onClose={() => setIsCustomerModalOpen(false)} 
            title="Register New Customer"
            submitting={submitting}
          >
            {success ? <SuccessView message="Customer registered!" /> : (
              <form onSubmit={handleAddCustomer} className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Full Name / Company Name</label>
                    <input 
                      type="text" required value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. ABC Logistics Ltd"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Phone Number</label>
                    <input 
                      type="text" value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+254..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Credit Limit (KES)</label>
                    <input 
                      type="number" value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {error && <ErrorView message={error} />}
                <button 
                  type="submit" disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register Customer'}
                </button>
              </form>
            )}
          </Modal>
        )}

        {isTransactionModalOpen && selectedCustomer && (
          <Modal 
            isOpen={isTransactionModalOpen} 
            onClose={() => setIsTransactionModalOpen(false)} 
            title={`Transaction: ${selectedCustomer.name}`}
            submitting={submitting}
          >
            {success ? <SuccessView message="Transaction recorded!" /> : (
              <form onSubmit={handleAddTransaction} className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                    <button 
                      type="button"
                      onClick={() => setTransType('purchase')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${transType === 'purchase' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      Purchase (Credit)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setTransType('payment')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${transType === 'payment' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      Payment (Debit)
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Station</label>
                    <select 
                      required value={transStation}
                      onChange={(e) => setTransStation(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Station</option>
                      {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Amount (KES)</label>
                    <input 
                      type="number" required value={transAmount}
                      onChange={(e) => setTransAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Description / Reference</label>
                    <input 
                      type="text" value={transDesc}
                      onChange={(e) => setTransDesc(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Invoice #123 or M-Pesa Ref"
                    />
                  </div>
                </div>
                {error && <ErrorView message={error} />}
                <button 
                  type="submit" disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Record Transaction'}
                </button>
              </form>
            )}
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children, submitting }: { 
  isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, submitting: boolean 
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !submitting && onClose()} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <button disabled={submitting} onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6 text-gray-400" /></button>
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function SuccessView({ message }: { message: string }) {
  return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"><CheckCircle2 className="w-10 h-10 text-green-600" /></div>
      <p className="text-xl font-bold text-gray-900">{message}</p>
    </motion.div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      {message}
    </div>
  );
}
