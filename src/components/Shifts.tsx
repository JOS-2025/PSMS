import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import { 
  Clock, 
  Play, 
  Square, 
  Calculator, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  History,
  MapPin,
  User,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Fuel,
  Plus,
  X,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Shift {
  id: string;
  station_id: string;
  staff_id: string;
  start_time: string;
  end_time: string | null;
  opening_meter_reading: number;
  closing_meter_reading: number | null;
  volume_sold: number | null;
  cash_collected: number;
  status: 'open' | 'closed';
  stations: { name: string };
  profiles: { full_name: string | null; email: string };
  shift_lubricants?: {
    id: string;
    lubricant_id: string;
    opening_stock: number;
    closing_stock: number | null;
    lubricant_inventory: { name: string; unit_size: string };
  }[];
}

interface LubricantItem {
  id: string;
  name: string;
  unit_size: string;
  current_stock: number;
}

export default function Shifts({ user }: { user: any }) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shiftSales, setShiftSales] = useState<any[]>([]);
  const [shiftLubricantSales, setShiftLubricantSales] = useState<any[]>([]);
  const [shiftExpenses, setShiftExpenses] = useState<any[]>([]);
  const [stations, setStations] = useState<{id: string, name: string}[]>([]);
  const [lubricants, setLubricants] = useState<LubricantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState({
    totalVolume: 0,
    totalCash: 0,
    totalExpected: 0,
    cashDiscrepancy: 0,
    volumeDiscrepancy: 0
  });

  // Form States
  const [selectedStation, setSelectedStation] = useState('');
  const [openingReading, setOpeningReading] = useState<number | ''>('');
  const [closingReading, setClosingReading] = useState<number | ''>('');
  const [cashCollected, setCashCollected] = useState<number | ''>('');
  const [cashOnHand, setCashOnHand] = useState<number | ''>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  
  // Lubricant Assignment States
  const [shiftLubricants, setShiftLubricants] = useState<{lubricant_id: string, opening_stock: number}[]>([]);
  const [closingLubricantStocks, setClosingLubricantStocks] = useState<{[key: string]: number}>({});
  const [selectedShiftDetails, setSelectedShiftDetails] = useState<Shift | null>(null);
  const [shiftDetailsData, setShiftDetailsData] = useState<{
    fuelSales: any[],
    lubeSales: any[],
    expenses: any[]
  }>({ fuelSales: [], lubeSales: [], expenses: [] });
  const [loadingDetails, setLoadingDetails] = useState(false);

  const expectedFuelSales = shiftSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const expectedLubeSales = shiftLubricantSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const totalExpenses = shiftExpenses.reduce((sum, s) => sum + Number(s.amount), 0);
  const expectedCash = expectedFuelSales + expectedLubeSales - totalExpenses;

  const expectedVolume = shiftSales.reduce((sum, s) => sum + Number(s.volume_liters), 0);
  const actualVolume = closingReading ? (Number(closingReading) - (activeShift?.opening_meter_reading || 0)) : 0;
  const volumeDiscrepancy = actualVolume - expectedVolume;

  const cashDiscrepancy = cashCollected ? (Number(cashCollected) - expectedCash) : 0;

  const fetchShiftDetails = async (shift: Shift) => {
    setSelectedShiftDetails(shift);
    setLoadingDetails(true);
    try {
      const [fuelSalesRes, lubeSalesRes, expensesRes] = await Promise.all([
        supabase.from('fuel_sales').select('*, fuel_products(name), pumps(name)').eq('shift_id', shift.id),
        supabase.from('lubricant_sales').select('*, lubricant_inventory(name, unit_size)').eq('shift_id', shift.id),
        supabase.from('expenses').select('*').eq('shift_id', shift.id)
      ]);

      setShiftDetailsData({
        fuelSales: fuelSalesRes.data || [],
        lubeSales: lubeSalesRes.data || [],
        expenses: expensesRes.data || []
      });
    } catch (err) {
      console.error('Error fetching shift details:', err);
      toast.error('Failed to load shift details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const userId = user?.id;

      const [shiftsRes, stationsRes] = await Promise.all([
        supabase
          .from('shifts')
          .select('*, stations(name), profiles:staff_id(full_name, email), shift_lubricants(*, lubricant_inventory(name, unit_size))')
          .order('start_time', { ascending: false }),
        supabase.from('stations').select('id, name')
      ]);

      const { data: lubesRes } = await supabase.from('lubricant_inventory').select('*');
      if (lubesRes) setLubricants(lubesRes);

      if (shiftsRes.data) {
        const fetchedShifts = shiftsRes.data as Shift[];
        setShifts(fetchedShifts);
        const open = fetchedShifts.find((s: Shift) => s.status === 'open' && s.staff_id === userId);
        setActiveShift(open || null);

        if (open) {
          // Fetch shift-related data
          const [salesRes, lubeSalesRes, expensesRes] = await Promise.all([
            supabase.from('fuel_sales').select('*').eq('shift_id', open.id),
            supabase.from('lubricant_sales').select('*').eq('shift_id', open.id),
            supabase.from('expenses').select('*').eq('shift_id', open.id)
          ]);
          if (salesRes.data) setShiftSales(salesRes.data);
          if (lubeSalesRes.data) setShiftLubricantSales(lubeSalesRes.data);
          if (expensesRes.data) setShiftExpenses(expensesRes.data);
        } else {
          setShiftSales([]);
          setShiftLubricantSales([]);
          setShiftExpenses([]);
        }

        // Calculate summary for closed shifts
        const closedShifts = fetchedShifts.filter(s => s.status === 'closed');
        
        if (closedShifts.length > 0) {
          const minDate = new Date(Math.min(...closedShifts.map(s => new Date(s.start_time).getTime()))).toISOString();
          const maxDate = new Date(Math.max(...closedShifts.map(s => new Date(s.end_time!).getTime()))).toISOString();

          const { data: salesData } = await supabase
            .from('fuel_sales')
            .select('total_amount, volume_liters, created_at, station_id')
            .gte('created_at', minDate)
            .lte('created_at', maxDate);

          if (salesData) {
            let totalVol = 0;
            let totalCash = 0;
            let totalExpected = 0;
            let totalExpectedVol = 0;

            closedShifts.forEach(shift => {
              const shiftVol = (shift.closing_meter_reading || 0) - shift.opening_meter_reading;
              totalVol += shiftVol;
              totalCash += shift.cash_collected;

              // Find sales belonging to this shift
              const shiftSales = salesData.filter(sale => 
                sale.station_id === shift.station_id &&
                new Date(sale.created_at) >= new Date(shift.start_time) &&
                new Date(sale.created_at) <= new Date(shift.end_time!)
              );

              totalExpected += shiftSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
              totalExpectedVol += shiftSales.reduce((sum, s) => sum + Number(s.volume_liters), 0);
            });

            setSummary({
              totalVolume: totalVol,
              totalCash: totalCash,
              totalExpected: totalExpected,
              cashDiscrepancy: totalCash - totalExpected,
              volumeDiscrepancy: totalVol - totalExpectedVol
            });
          }
        }
      }
      if (stationsRes.data) setStations(stationsRes.data);
    } catch (err) {
      console.error('Error fetching shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation || openingReading === '') return;

    setSubmitting(true);
    setError(null);

    try {
      const userId = user?.id;

      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .insert({
          station_id: selectedStation,
          staff_id: userId,
          opening_meter_reading: Number(openingReading),
          start_time: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
          status: 'open'
        })
        .select()
        .single();

      if (shiftError) throw shiftError;

      // Insert lubricant assignments
      if (shiftLubricants.length > 0) {
        const { error: lubeError } = await supabase
          .from('shift_lubricants')
          .insert(shiftLubricants.map(l => ({
            shift_id: shiftData.id,
            lubricant_id: l.lubricant_id,
            opening_stock: l.opening_stock
          })));
        if (lubeError) throw lubeError;
      }

      // Log Audit
      await logAuditAction('SHIFT_STARTED', {
        shift_id: shiftData.id,
        station: stations.find(s => s.id === selectedStation)?.name,
        opening_reading: Number(openingReading)
      }, selectedStation);

      setSuccess('Shift started successfully!');
      setShiftLubricants([]);
      setStartTime('');
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start shift');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift || closingReading === '' || cashCollected === '' || cashOnHand === '') return;

    setSubmitting(true);
    setError(null);

    try {
      if (Number(closingReading) < activeShift.opening_meter_reading) {
        throw new Error(`Closing reading (${closingReading}) cannot be less than opening reading (${activeShift.opening_meter_reading})`);
      }

      const volumeSold = Number(closingReading) - activeShift.opening_meter_reading;

      const { error: shiftError } = await supabase
        .from('shifts')
        .update({
          closing_meter_reading: Number(closingReading),
          cash_collected: Number(cashCollected),
          cash_on_hand: Number(cashOnHand),
          volume_sold: volumeSold,
          end_time: endTime ? new Date(endTime).toISOString() : new Date().toISOString(),
          status: 'closed'
        })
        .eq('id', activeShift.id);

      if (shiftError) throw shiftError;

      // Update lubricant closing stocks
      const updatePromises = Object.entries(closingLubricantStocks).map(([lubeId, stock]) => {
        return supabase
          .from('shift_lubricants')
          .update({ closing_stock: stock })
          .eq('shift_id', activeShift.id)
          .eq('lubricant_id', lubeId);
      });

      await Promise.all(updatePromises);

      // Log Audit
      await logAuditAction('SHIFT_CLOSED', {
        shift_id: activeShift.id,
        station: stations.find(s => s.id === activeShift.station_id)?.name,
        volume_sold: volumeSold,
        cash_collected: Number(cashCollected),
        cash_on_hand: Number(cashOnHand),
        fuel_sales_total: shiftSales.reduce((sum, s) => sum + Number(s.total_amount), 0),
        lube_sales_total: shiftLubricantSales.reduce((sum, s) => sum + Number(s.total_amount), 0),
        expenses_total: shiftExpenses.reduce((sum, s) => sum + Number(s.amount), 0)
      }, activeShift.station_id);

      setSuccess('Shift closed successfully!');
      setClosingReading('');
      setCashCollected('');
      setCashOnHand('');
      setClosingLubricantStocks({});
      setEndTime('');
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end shift');
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Shift Management</h1>
        <p className="text-gray-500 mt-1">Open and close shifts, record meter readings and reconcile cash.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <Fuel className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Fuel Sold</p>
              <h2 className="text-2xl font-extrabold text-gray-900">{summary.totalVolume.toLocaleString()} L</h2>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-2xl">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cash Collected</p>
              <h2 className="text-2xl font-extrabold text-gray-900">KES {summary.totalCash.toLocaleString()}</h2>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${Math.abs(summary.cashDiscrepancy) < 1 ? 'bg-green-50' : 'bg-red-50'}`}>
              {summary.cashDiscrepancy >= 0 ? <TrendingUp className="w-6 h-6 text-green-600" /> : <TrendingDown className="w-6 h-6 text-red-600" />}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cash Discrepancy</p>
              <h2 className={`text-2xl font-extrabold ${summary.cashDiscrepancy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                KES {summary.cashDiscrepancy.toLocaleString()}
              </h2>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${Math.abs(summary.volumeDiscrepancy) < 0.1 ? 'bg-green-50' : 'bg-orange-50'}`}>
              <AlertTriangle className={`w-6 h-6 ${Math.abs(summary.volumeDiscrepancy) < 0.1 ? 'text-green-600' : 'text-orange-600'}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Volume Discrepancy</p>
              <h2 className={`text-2xl font-extrabold ${Math.abs(summary.volumeDiscrepancy) < 0.1 ? 'text-green-600' : 'text-orange-600'}`}>
                {summary.volumeDiscrepancy.toFixed(2)} L
              </h2>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Shift / Start Shift Section */}
        <div className="lg:col-span-1 space-y-6">
          <AnimatePresence mode="wait">
            {activeShift ? (
              <motion.div 
                key="active-shift"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-100 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4">
                  <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> ACTIVE
                  </div>
                </div>

                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Clock className="w-6 h-6" /> Current Shift
                </h2>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-blue-200" />
                    <div>
                      <p className="text-xs text-blue-200 font-bold uppercase">Station</p>
                      <p className="font-bold">{activeShift.stations.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Play className="w-5 h-5 text-blue-200" />
                    <div>
                      <p className="text-xs text-blue-200 font-bold uppercase">Started At</p>
                      <p className="font-bold">{new Date(activeShift.start_time).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calculator className="w-5 h-5 text-blue-200" />
                    <div>
                      <p className="text-xs text-blue-200 font-bold uppercase">Opening Reading</p>
                      <p className="font-bold">{activeShift.opening_meter_reading.toLocaleString()} L</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Fuel Sales</p>
                    <p className="text-xl font-extrabold text-white">
                      KES {shiftSales.reduce((sum, s) => sum + Number(s.total_amount), 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-blue-200/60">{shiftSales.length} Transactions</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Lube Sales</p>
                    <p className="text-xl font-extrabold text-white">
                      KES {shiftLubricantSales.reduce((sum, s) => sum + Number(s.total_amount), 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-blue-200/60">{shiftLubricantSales.length} Transactions</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Expenses</p>
                    <p className="text-xl font-extrabold text-red-300">
                      KES {shiftExpenses.reduce((sum, s) => sum + Number(s.amount), 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-blue-200/60">{shiftExpenses.length} Records</p>
                  </div>
                </div>

                {activeShift.shift_lubricants && activeShift.shift_lubricants.length > 0 && (
                  <div className="mb-6 space-y-3">
                    <p className="text-xs font-bold text-blue-200 uppercase">Lubricants Reconciliation</p>
                    {activeShift.shift_lubricants.map(l => (
                      <div key={l.lubricant_id} className="bg-white/10 p-3 rounded-xl space-y-2">
                        <div className="flex justify-between text-sm font-bold">
                          <span>{l.lubricant_inventory.name} ({l.lubricant_inventory.unit_size})</span>
                          <span>Open: {l.opening_stock}</span>
                        </div>
                        <input 
                          type="number"
                          placeholder="Closing Stock"
                          value={closingLubricantStocks[l.lubricant_id] || ''}
                          onChange={(e) => setClosingLubricantStocks({
                            ...closingLubricantStocks,
                            [l.lubricant_id]: Number(e.target.value)
                          })}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white/20"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleEndShift} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-100 uppercase">Closing Meter Reading (L)</label>
                    <input 
                      type="number"
                      required
                      value={closingReading}
                      onChange={(e) => setClosingReading(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none focus:bg-white/20 transition-all placeholder:text-white/30"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-100 uppercase">Total Cash Collected (KES)</label>
                    <input 
                      type="number"
                      required
                      value={cashCollected}
                      onChange={(e) => setCashCollected(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none focus:bg-white/20 transition-all placeholder:text-white/30"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-100 uppercase">Physical Cash on Hand (KES)</label>
                    <input 
                      type="number"
                      required
                      value={cashOnHand}
                      onChange={(e) => setCashOnHand(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none focus:bg-white/20 transition-all placeholder:text-white/30"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-100 uppercase">Clock Out Time (Optional)</label>
                    <input 
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none focus:bg-white/20 transition-all"
                    />
                  </div>

                  {/* Reconciliation Preview */}
                  {(closingReading !== '' || cashCollected !== '') && (
                    <div className="bg-white/10 p-5 rounded-2xl border border-white/20 space-y-4">
                      <p className="text-xs font-bold text-blue-100 uppercase tracking-wider">Reconciliation Preview</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-blue-200 uppercase">Volume Reconciliation</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white/70">Expected:</span>
                            <span className="text-sm font-bold text-white">{expectedVolume.toLocaleString()} L</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white/70">Actual:</span>
                            <span className="text-sm font-bold text-white">{actualVolume.toLocaleString()} L</span>
                          </div>
                          <div className={`flex items-center justify-between pt-1 border-t border-white/10 ${Math.abs(volumeDiscrepancy) > 0.1 ? 'text-red-300' : 'text-green-300'}`}>
                            <span className="text-xs font-bold">Discrepancy:</span>
                            <span className="text-sm font-black">{volumeDiscrepancy.toLocaleString()} L</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] text-blue-200 uppercase">Cash Reconciliation</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white/70">Expected:</span>
                            <span className="text-sm font-bold text-white">KES {expectedCash.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white/70">Actual:</span>
                            <span className="text-sm font-bold text-white">KES {Number(cashCollected).toLocaleString()}</span>
                          </div>
                          <div className={`flex items-center justify-between pt-1 border-t border-white/10 ${Math.abs(cashDiscrepancy) > 1 ? 'text-red-300' : 'text-green-300'}`}>
                            <span className="text-xs font-bold">Discrepancy:</span>
                            <span className="text-sm font-black">KES {cashDiscrepancy.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {Math.abs(cashDiscrepancy) > 100 && (
                        <div className="flex items-start gap-2 p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                          <AlertTriangle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-red-200 leading-tight">
                            Significant cash discrepancy detected. Please verify all sales and expenses before closing.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-white text-blue-600 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Square className="w-5 h-5" /> End Shift</>}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div 
                key="start-shift"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Play className="w-6 h-6 text-blue-600" /> Start New Shift
                </h2>

                <form onSubmit={handleStartShift} className="space-y-6">
                  <div className="space-y-4">
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
                      <label className="text-sm font-bold text-gray-700">Opening Meter Reading (L)</label>
                      <input 
                        type="number"
                        required
                        value={openingReading}
                        onChange={(e) => setOpeningReading(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Clock In Time (Optional)</label>
                      <input 
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Lubricant Assignment */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-700">Assign Lubricants</label>
                        <button 
                          type="button"
                          onClick={() => setShiftLubricants([...shiftLubricants, { lubricant_id: '', opening_stock: 0 }])}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Item
                        </button>
                      </div>
                      
                      {shiftLubricants.map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <select 
                            required
                            value={item.lubricant_id}
                            onChange={(e) => {
                              const newItems = [...shiftLubricants];
                              newItems[index].lubricant_id = e.target.value;
                              setShiftLubricants(newItems);
                            }}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Lubricant</option>
                            {lubricants.map(l => <option key={l.id} value={l.id}>{l.name} ({l.unit_size})</option>)}
                          </select>
                          <input 
                            type="number"
                            required
                            placeholder="Qty"
                            value={item.opening_stock || ''}
                            onChange={(e) => {
                              const newItems = [...shiftLubricants];
                              newItems[index].opening_stock = Number(e.target.value);
                              setShiftLubricants(newItems);
                            }}
                            className="w-20 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button 
                            type="button"
                            onClick={() => setShiftLubricants(shiftLubricants.filter((_, i) => i !== index))}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-100"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Play className="w-5 h-5" /> Start Shift</>}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback */}
          <AnimatePresence>
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-700 font-medium"
              >
                <CheckCircle2 className="w-5 h-5" />
                {success}
              </motion.div>
            )}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 font-medium"
              >
                <AlertCircle className="w-5 h-5" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Shift History Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900">Shift History</h2>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Filter by staff name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <History className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Staff / Station</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Meter Readings (L)</th>
                    <th className="px-6 py-4">Volume (L)</th>
                    <th className="px-6 py-4">Cash</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {shifts
                    .filter(s => 
                      s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      s.stations?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((shift) => (
                    <tr key={shift.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{shift.profiles?.full_name || 'Staff'}</p>
                            <p className="text-xs text-gray-500">{shift.stations.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-medium text-gray-600">
                          <p className="font-bold text-gray-900">{new Date(shift.start_time).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-green-600 flex items-center gap-1"><Play className="w-3 h-3" /> {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {shift.end_time ? (
                              <span className="text-red-600 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> {new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            ) : (
                              <span className="text-blue-500 font-bold animate-pulse">Active</span>
                            )}
                          </div>
                          {shift.end_time && (
                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                              Duration: {Math.round((new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60) * 10) / 10} hrs
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-medium text-gray-600">
                          <p className="flex justify-between gap-2"><span>Open:</span> <span className="font-bold">{shift.opening_meter_reading.toLocaleString()}</span></p>
                          {shift.closing_meter_reading && (
                            <p className="flex justify-between gap-2"><span>Close:</span> <span className="font-bold">{shift.closing_meter_reading.toLocaleString()}</span></p>
                          )}
                        </div>
                        {shift.shift_lubricants && shift.shift_lubricants.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-50">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Lubricants Sold</p>
                            {shift.shift_lubricants.map(l => (
                              <p key={l.id} className="text-[10px] text-gray-500">
                                {l.lubricant_inventory.name}: <span className="font-bold text-gray-700">{l.closing_stock !== null ? (l.opening_stock - l.closing_stock) : '?'}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {shift.closing_meter_reading ? (
                          <div className="text-sm font-bold text-gray-900">
                            {(shift.closing_meter_reading - shift.opening_meter_reading).toLocaleString()} L
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Total Dispensed</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {shift.status === 'closed' ? (
                          <div className="text-sm font-bold text-gray-900">
                            KES {shift.cash_collected.toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          shift.status === 'open' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {shift.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => fetchShiftDetails(shift)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {shifts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No shifts recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Shift Details Modal */}
      <AnimatePresence>
        {selectedShiftDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedShiftDetails(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-2xl">
                    <History className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Shift Details</h2>
                    <p className="text-sm text-gray-500">
                      {selectedShiftDetails.profiles?.full_name} • {selectedShiftDetails.stations.name}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedShiftDetails(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {loadingDetails ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    <p className="text-gray-500 font-medium">Loading shift data...</p>
                  </div>
                ) : (
                  <>
                    {/* Shift Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Time Period</p>
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(selectedShiftDetails.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                          {selectedShiftDetails.end_time ? new Date(selectedShiftDetails.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          {new Date(selectedShiftDetails.start_time).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Meter Reconciliation</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Dispensed:</span>
                          <span className="text-sm font-bold text-gray-900">
                            {selectedShiftDetails.volume_sold?.toLocaleString() || 0} L
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-500">Opening:</span>
                          <span className="text-sm text-gray-700">{selectedShiftDetails.opening_meter_reading.toLocaleString()} L</span>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cash Collected</p>
                        <p className="text-xl font-black text-blue-600">
                          KES {selectedShiftDetails.cash_collected.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase">
                          Status: {selectedShiftDetails.status}
                        </p>
                      </div>
                    </div>

                    {/* Fuel Sales */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Fuel className="w-5 h-5 text-blue-600" /> Fuel Sales
                        </h3>
                        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                          {shiftDetailsData.fuelSales.length} Transactions
                        </span>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="px-4 py-3">Time</th>
                              <th className="px-4 py-3">Pump / Product</th>
                              <th className="px-4 py-3">Volume</th>
                              <th className="px-4 py-3">Amount</th>
                              <th className="px-4 py-3">Method</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {shiftDetailsData.fuelSales.map((sale) => (
                              <tr key={sale.id}>
                                <td className="px-4 py-3 text-gray-500">
                                  {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-bold text-gray-900">{sale.pumps?.name}</p>
                                  <p className="text-[10px] text-gray-500">{sale.fuel_products?.name}</p>
                                </td>
                                <td className="px-4 py-3 font-medium">{sale.volume_liters.toLocaleString()} L</td>
                                <td className="px-4 py-3 font-bold text-blue-600">KES {sale.total_amount.toLocaleString()}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold uppercase">
                                    {sale.payment_method}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {shiftDetailsData.fuelSales.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">No fuel sales recorded</td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot className="bg-blue-50/50 font-bold">
                            <tr>
                              <td colSpan={2} className="px-4 py-3 text-blue-700">Total Fuel Sales</td>
                              <td className="px-4 py-3 text-blue-700">
                                {shiftDetailsData.fuelSales.reduce((sum, s) => sum + s.volume_liters, 0).toLocaleString()} L
                              </td>
                              <td colSpan={2} className="px-4 py-3 text-blue-700">
                                KES {shiftDetailsData.fuelSales.reduce((sum, s) => sum + s.total_amount, 0).toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Lubricant Sales */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Package className="w-5 h-5 text-purple-600" /> Lubricant Sales
                        </h3>
                        <span className="bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">
                          {shiftDetailsData.lubeSales.length} Transactions
                        </span>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="px-4 py-3">Product</th>
                              <th className="px-4 py-3">Qty</th>
                              <th className="px-4 py-3">Unit Price</th>
                              <th className="px-4 py-3">Total</th>
                              <th className="px-4 py-3">Method</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {shiftDetailsData.lubeSales.map((sale) => (
                              <tr key={sale.id}>
                                <td className="px-4 py-3">
                                  <p className="font-bold text-gray-900">{sale.lubricant_inventory?.name}</p>
                                  <p className="text-[10px] text-gray-500">{sale.lubricant_inventory?.unit_size}</p>
                                </td>
                                <td className="px-4 py-3 font-medium">{sale.quantity}</td>
                                <td className="px-4 py-3 text-gray-500">KES {sale.unit_price.toLocaleString()}</td>
                                <td className="px-4 py-3 font-bold text-purple-600">KES {sale.total_amount.toLocaleString()}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold uppercase">
                                    {sale.payment_method}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {shiftDetailsData.lubeSales.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">No lubricant sales recorded</td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot className="bg-purple-50/50 font-bold">
                            <tr>
                              <td colSpan={3} className="px-4 py-3 text-purple-700">Total Lubricant Sales</td>
                              <td colSpan={2} className="px-4 py-3 text-purple-700">
                                KES {shiftDetailsData.lubeSales.reduce((sum, s) => sum + s.total_amount, 0).toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Expenses */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <TrendingDown className="w-5 h-5 text-red-600" /> Shift Expenses
                        </h3>
                        <span className="bg-red-50 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                          {shiftDetailsData.expenses.length} Records
                        </span>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="px-4 py-3">Category</th>
                              <th className="px-4 py-3">Description</th>
                              <th className="px-4 py-3">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {shiftDetailsData.expenses.map((expense) => (
                              <tr key={expense.id}>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-bold uppercase">
                                    {expense.category}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{expense.description}</td>
                                <td className="px-4 py-3 font-bold text-red-600">KES {expense.amount.toLocaleString()}</td>
                              </tr>
                            ))}
                            {shiftDetailsData.expenses.length === 0 && (
                              <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">No expenses recorded</td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot className="bg-red-50/50 font-bold">
                            <tr>
                              <td colSpan={2} className="px-4 py-3 text-red-700">Total Expenses</td>
                              <td className="px-4 py-3 text-red-700">
                                KES {shiftDetailsData.expenses.reduce((sum, s) => sum + s.amount, 0).toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Final Reconciliation Summary */}
                    <div className="p-6 bg-blue-600 rounded-3xl text-white shadow-xl">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Calculator className="w-5 h-5" /> Shift Financial Summary
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                          <p className="text-[10px] text-blue-200 uppercase font-bold mb-1">Fuel Sales</p>
                          <p className="text-lg font-black">KES {shiftDetailsData.fuelSales.reduce((sum, s) => sum + s.total_amount, 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-blue-200 uppercase font-bold mb-1">Lube Sales</p>
                          <p className="text-lg font-black">KES {shiftDetailsData.lubeSales.reduce((sum, s) => sum + s.total_amount, 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-blue-200 uppercase font-bold mb-1">Expenses</p>
                          <p className="text-lg font-black text-red-300">- KES {shiftDetailsData.expenses.reduce((sum, s) => sum + s.amount, 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
                          <p className="text-[10px] text-blue-200 uppercase font-bold mb-1">Net Expected Cash</p>
                          <p className="text-xl font-black text-green-300">
                            KES {(
                              shiftDetailsData.fuelSales.reduce((sum, s) => sum + s.total_amount, 0) +
                              shiftDetailsData.lubeSales.reduce((sum, s) => sum + s.total_amount, 0) -
                              shiftDetailsData.expenses.reduce((sum, s) => sum + s.amount, 0)
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button 
                  onClick={() => setSelectedShiftDetails(null)}
                  className="px-6 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
