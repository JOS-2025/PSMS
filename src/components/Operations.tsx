import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import { fuelSaleService, PaymentMethod } from '../services/fuelSaleService';
import { meterService, MeterReading } from '../services/meterService';
import { 
  Plus, 
  Fuel, 
  CreditCard, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  X,
  RefreshCw,
  MapPin,
  Droplets,
  DollarSign,
  Edit2,
  Gauge,
  Calendar,
  AlertTriangle,
  Clock,
  Play,
  Square,
  Calculator,
  User,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Station {
  id: string;
  name: string;
}

interface Pump {
  id: string;
  name: string;
  tank_id: string;
  fuel_products?: { name: string };
  tanks: {
    fuel_product_id: string;
    fuel_products: {
      id: string;
      name: string;
      unit_price: number;
    };
  };
}

interface RecentSale {
  id: string;
  created_at: string;
  volume_liters: number;
  total_amount: number;
  fuel_products: { name: string };
  stations: { id: string; name: string };
  pumps: { name: string };
  transactions: { payment_method: string }[];
}

interface PumpReconciliation {
  pump_id: string;
  pump_name: string;
  station_id: string;
  date: string;
  meter_dispensed: number;
  actual_sales: number;
  variance: number;
  fuel_products?: { name: string };
}

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
  cash_on_hand: number;
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
  lubricant_id: string;
  station_id: string;
  current_stock: number;
  unit_size: string;
  lubricants: {
    name: string;
    unit_price: number;
  };
}

// --- Component ---

export default function Operations({ onEditStation, user }: { onEditStation?: (id: string) => void, user: any }) {
  const [stations, setStations] = useState<Station[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [recentReadings, setRecentReadings] = useState<MeterReading[]>([]);
  const [reconciliation, setReconciliation] = useState<PumpReconciliation[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shiftSales, setShiftSales] = useState<any[]>([]);
  const [shiftLubricantSales, setShiftLubricantSales] = useState<any[]>([]);
  const [shiftExpenses, setShiftExpenses] = useState<any[]>([]);
  const [lubricants, setLubricants] = useState<LubricantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMeterModalOpen, setIsMeterModalOpen] = useState(false);
  const [isLubeModalOpen, setIsLubeModalOpen] = useState(false);
  const [isEndShiftModalOpen, setIsEndShiftModalOpen] = useState(false);
  const [selectedLubricant, setSelectedLubricant] = useState('');
  const [lubeQuantity, setLubeQuantity] = useState<number | ''>('');
  const [lubePaymentMethod, setLubePaymentMethod] = useState<PaymentMethod>('cash');
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'activity' | 'reconciliation' | 'shifts'>('activity');
  
  // Global Filters
  const [globalStation, setGlobalStation] = useState('');
  const [globalDate, setGlobalDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State (Sale)
  const [selectedStation, setSelectedStation] = useState('');
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [selectedPump, setSelectedPump] = useState('');
  const [liters, setLiters] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customers, setCustomers] = useState<{id: string, name: string, current_balance: number, credit_limit: number}[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State (Meter Reading)
  const [meterFormData, setMeterFormData] = useState({
    opening: '' as number | '',
    closing: '' as number | ''
  });
  const [meterSuccess, setMeterSuccess] = useState(false);

  // Form State (Shift)
  const [openingReading, setOpeningReading] = useState<number | ''>('');
  const [closingReading, setClosingReading] = useState<number | ''>('');
  const [cashCollected, setCashCollected] = useState<number | ''>('');
  const [cashOnHand, setCashOnHand] = useState<number | ''>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [shiftLubricants, setShiftLubricants] = useState<{lubricant_id: string, opening_stock: number}[]>([]);
  const [closingLubricantStocks, setClosingLubricantStocks] = useState<{[key: string]: number}>({});
  const [shiftSuccess, setShiftSuccess] = useState<string | null>(null);

  const [summary, setSummary] = useState({
    totalVolume: 0,
    totalCash: 0,
    totalExpected: 0,
    cashDiscrepancy: 0,
    volumeDiscrepancy: 0
  });

  // Shift Reconciliation Calculations
  const expectedFuelSales = shiftSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total_amount), 0);
  const expectedLubeSales = shiftLubricantSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total_amount), 0);
  const totalExpenses = shiftExpenses.reduce((sum, s) => sum + Number(s.amount), 0);
  const expectedCash = expectedFuelSales + expectedLubeSales - totalExpenses;

  const expectedVolume = shiftSales.reduce((sum, s) => sum + Number(s.volume_liters), 0);
  const actualVolume = closingReading ? (Number(closingReading) - (activeShift?.opening_meter_reading || 0)) : 0;
  const volumeDiscrepancy = actualVolume - expectedVolume;

  const cashDiscrepancy = cashOnHand ? (Number(cashOnHand) - expectedCash) : 0;

  // Derived Data
  const selectedPumpData = useMemo(() => 
    pumps.find(p => p.id === selectedPump), 
  [pumps, selectedPump]);

  const fuelType = selectedPumpData?.tanks?.fuel_products?.name || '';
  const fuelProductId = selectedPumpData?.tanks?.fuel_product_id || '';
  const totalAmount = useMemo(() => {
    if (typeof liters === 'number' && currentPrice) {
      return liters * currentPrice;
    }
    return 0;
  }, [liters, currentPrice]);

  // Initial Data Fetch
  useEffect(() => {
    fetchInitialData();
  }, [globalStation, globalDate]);

  // Fetch pumps when station changes in modal
  useEffect(() => {
    setSelectedPump('');
    if (selectedStation) {
      fetchPumps(selectedStation);
    } else {
      setPumps([]);
    }
  }, [selectedStation]);

  const [selectedShiftDetails, setSelectedShiftDetails] = useState<Shift | null>(null);
  const [shiftDetailsData, setShiftDetailsData] = useState<{sales: any[], lubeSales: any[], expenses: any[]}>({sales: [], lubeSales: [], expenses: []});
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch price when pump/station changes in modal
  useEffect(() => {
    if (selectedStation && fuelProductId) {
      fetchPrice(selectedStation, fuelProductId);
    } else {
      setCurrentPrice(null);
    }
  }, [selectedStation, fuelProductId]);

  const fetchShiftDetails = async (shift: Shift) => {
    setSelectedShiftDetails(shift);
    setLoadingDetails(true);
    try {
      const [salesRes, lubeSalesRes, expensesRes] = await Promise.all([
        supabase.from('fuel_sales').select('*, fuel_products(name), pumps(name)').eq('shift_id', shift.id),
        supabase.from('lubricant_sales').select('*, lubricants(name), unit_price').eq('shift_id', shift.id),
        supabase.from('expenses').select('*').eq('shift_id', shift.id)
      ]);
      setShiftDetailsData({
        sales: salesRes.data || [],
        lubeSales: lubeSalesRes.data || [],
        expenses: expensesRes.data || []
      });
    } catch (err) {
      console.error('Error fetching shift details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchInitialData = async () => {
    if (!loading) setRefreshing(true);
    else setLoading(true);
    
    try {
      const userId = user?.id;

      // Fetch active shift for current user
      if (userId) {
        const { data: shiftData } = await supabase
          .from('shifts')
          .select('*, stations(name), profiles:staff_id(full_name, email), shift_lubricants(*, lubricant_inventory(name, unit_size))')
          .eq('staff_id', userId)
          .eq('status', 'open')
          .maybeSingle();
        
        if (shiftData) {
          setActiveShift(shiftData as any);
          setActiveShiftId(shiftData.id);
          
          // Fetch shift-related data
          const [salesRes, lubeSalesRes, expensesRes] = await Promise.all([
            supabase.from('fuel_sales').select('*').eq('shift_id', shiftData.id),
            supabase.from('lubricant_sales').select('*').eq('shift_id', shiftData.id),
            supabase.from('expenses').select('*').eq('shift_id', shiftData.id)
          ]);
          if (salesRes.data) setShiftSales(salesRes.data);
          if (lubeSalesRes.data) setShiftLubricantSales(lubeSalesRes.data);
          if (expensesRes.data) setShiftExpenses(expensesRes.data);
        } else {
          setActiveShift(null);
          setActiveShiftId(null);
          setShiftSales([]);
          setShiftLubricantSales([]);
          setShiftExpenses([]);
        }
      }

      let salesQuery = supabase.from('fuel_sales')
        .select(`
          id, 
          created_at, 
          volume_liters, 
          total_amount,
          fuel_products(name),
          stations(name),
          pumps(name),
          transactions(payment_method)
        `);

      if (globalStation) {
        salesQuery = salesQuery.eq('station_id', globalStation);
      }

      const [stationsRes, salesRes, readingsRes, reconRes, shiftsRes, lubesRes, customersRes] = await Promise.all([
        supabase.from('stations').select('id, name'),
        salesQuery.order('created_at', { ascending: false }).limit(20),
        meterService.getRecentReadings(globalStation || undefined, 20),
        globalStation ? meterService.getPumpReconciliation(globalStation, globalDate) : Promise.resolve([]),
        supabase
          .from('shifts')
          .select('*, stations(name), profiles:staff_id(full_name, email), shift_lubricants(*, lubricant_inventory(name, unit_size))')
          .order('start_time', { ascending: false }),
        supabase.from('lubricant_inventory').select('*, lubricants(name, unit_price)'),
        supabase.from('customers').select('*').order('name')
      ]);

      if (stationsRes.data) setStations(stationsRes.data);
      if (salesRes.data) {
        const mappedSales = salesRes.data.map((s: any) => ({
          ...s,
          fuel_products: Array.isArray(s.fuel_products) ? s.fuel_products[0] : s.fuel_products,
          stations: Array.isArray(s.stations) ? s.stations[0] : s.stations,
          pumps: Array.isArray(s.pumps) ? s.pumps[0] : s.pumps,
          transactions: Array.isArray(s.transactions) ? s.transactions : [s.transactions]
        }));
        setRecentSales(mappedSales as any);
      }
      if (readingsRes) setRecentReadings(readingsRes);
      if (reconRes) setReconciliation(reconRes);
      if (customersRes.data) setCustomers(customersRes.data);
      if (shiftsRes.data) {
        const fetchedShifts = shiftsRes.data as Shift[];
        setShifts(fetchedShifts);

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
      if (lubesRes.data) {
        const mappedLubes = lubesRes.data.map((l: any) => ({
          ...l,
          lubricants: Array.isArray(l.lubricants) ? l.lubricants[0] : l.lubricants
        }));
        setLubricants(mappedLubes as any);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
      toast.error('Failed to load operations data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPumps = async (stationId: string) => {
    try {
      const { data, error } = await supabase
        .from('pumps')
        .select(`
          id, 
          name, 
          tank_id,
          tanks(
            fuel_product_id,
            fuel_products(id, name)
          )
        `)
        .eq('station_id', stationId)
        .eq('status', 'active');
      
      if (error) throw error;

      if (data) {
        const mappedPumps = data.map((p: any) => {
          const tank = Array.isArray(p.tanks) ? p.tanks[0] : p.tanks;
          return {
            ...p,
            tanks: tank ? {
              ...tank,
              fuel_products: Array.isArray(tank.fuel_products) ? tank.fuel_products[0] : tank.fuel_products
            } : null
          };
        });
        setPumps(mappedPumps as any);
      } else {
        setPumps([]);
      }
    } catch (err) {
      console.error('Error fetching pumps:', err);
      setPumps([]);
    }
  };

  const fetchPrice = async (stationId: string, productId: string) => {
    const price = await fuelSaleService.getCurrentPrice(stationId, productId);
    setCurrentPrice(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation || !selectedPump || !liters || !fuelProductId) return;

    setSubmitting(true);
    setError(null);

    const result = await fuelSaleService.recordFuelSale({
      stationId: selectedStation,
      pumpId: selectedPump,
      fuelProductId: fuelProductId,
      liters: Number(liters),
      paymentMethod,
      staffId: user?.id || '00000000-0000-0000-0000-000000000000', // Fallback for demo if no auth
      shiftId: activeShiftId || undefined
    });

    if (result.success) {
      // If it's a credit sale, record the credit transaction
      if (paymentMethod === 'credit' && selectedCustomer) {
        try {
          const customer = customers.find(c => c.id === selectedCustomer);
          if (customer) {
            // 1. Record credit transaction
            const { error: transError } = await supabase.from('credit_transactions').insert({
              customer_id: selectedCustomer,
              station_id: selectedStation,
              amount: result.total_amount || 0,
              transaction_type: 'purchase',
              description: `Fuel Sale: ${fuelType} - ${liters}L @ ${selectedPumpData?.name}`
            });

            if (transError) throw transError;

            // 2. Update customer balance
            const { error: balanceError } = await supabase
              .from('customers')
              .update({ current_balance: customer.current_balance + (result.total_amount || 0) })
              .eq('id', selectedCustomer);

            if (balanceError) throw balanceError;
          }
        } catch (creditErr) {
          console.error('Failed to record credit transaction:', creditErr);
          toast.error('Sale recorded but failed to update credit account.');
        }
      }

      // Log audit action
      await logAuditAction('SALE_RECORDED', {
        station: stations.find(s => s.id === selectedStation)?.name,
        product: fuelType,
        liters: Number(liters),
        amount: totalAmount,
        payment_method: paymentMethod
      }, selectedStation);

      setSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess(false);
        resetForm();
        fetchInitialData();
      }, 2000);
    } else {
      setError(result.error || 'Failed to record sale');
    }
    setSubmitting(false);
  };

  const handleMeterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { opening, closing } = meterFormData;
    if (!selectedStation || !selectedPump || opening === '' || closing === '') return;

    setSubmitting(true);
    setError(null);

    const staffId = user?.id || '00000000-0000-0000-0000-000000000000';

    const result = await meterService.recordMeterReading({
      stationId: selectedStation,
      pumpId: selectedPump,
      openingReading: Number(opening),
      closingReading: Number(closing),
      staffId,
      shiftId: activeShiftId || undefined
    });

    if (result.success) {
      await logAuditAction('METER_READING_RECORDED', {
        station: stations.find(s => s.id === selectedStation)?.name,
        pump: pumps.find(p => p.id === selectedPump)?.name,
        opening,
        closing,
        liters: result.liters_sold,
        amount: result.total_amount
      }, selectedStation);

      setMeterSuccess(true);
      setTimeout(() => {
        setIsMeterModalOpen(false);
        setMeterSuccess(false);
        setMeterFormData({ opening: '', closing: '' });
        resetForm();
        fetchInitialData();
      }, 2000);
    } else {
      setError(result.error || 'Failed to record meter reading');
    }
    setSubmitting(false);
  };

  const handleLubeSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLubricant || !lubeQuantity) return;

    setSubmitting(true);
    setError(null);

    try {
      const lubricant = lubricants.find(l => l.id === selectedLubricant);
      if (!lubricant) throw new Error('Product not found');

      const stationId = globalStation || lubricant.station_id || activeShift?.station_id;
      if (!stationId) throw new Error('Station not identified');

      const totalAmount = lubricant.lubricants.unit_price * Number(lubeQuantity);

      // 1. Record Sale
      const { error: saleError } = await supabase
        .from('lubricant_sales')
        .insert({
          station_id: stationId,
          lubricant_id: lubricant.lubricant_id,
          quantity: Number(lubeQuantity),
          unit_price: lubricant.lubricants.unit_price,
          total_amount: totalAmount,
          payment_method: lubePaymentMethod,
          staff_id: user?.id,
          shift_id: activeShiftId
        });

      if (saleError) throw saleError;

      // If it's a credit sale, record the credit transaction
      if (lubePaymentMethod === 'credit' && selectedCustomer) {
        const customer = customers.find(c => c.id === selectedCustomer);
        if (customer) {
          // 1. Record credit transaction
          const { error: transError } = await supabase.from('credit_transactions').insert({
            customer_id: selectedCustomer,
            station_id: stationId,
            amount: totalAmount,
            transaction_type: 'purchase',
            description: `Lubricant Sale: ${lubricant.lubricants.name} - ${lubeQuantity} units`
          });

          if (transError) throw transError;

          // 2. Update customer balance
          const { error: balanceError } = await supabase
            .from('customers')
            .update({ current_balance: customer.current_balance + totalAmount })
            .eq('id', selectedCustomer);

          if (balanceError) throw balanceError;
        }
      }

      // 2. Update Inventory
      const { error: invError } = await supabase
        .from('lubricant_inventory')
        .update({ current_stock: lubricant.current_stock - Number(lubeQuantity) })
        .eq('id', lubricant.id);
      
      if (invError) throw invError;

      await logAuditAction('LUBRICANT_SALE_RECORDED', {
        product: lubricant.lubricants.name,
        quantity: lubeQuantity,
        amount: totalAmount,
        station: stations.find(s => s.id === stationId)?.name
      }, stationId);

      setSuccess(true);
      setTimeout(() => {
        setIsLubeModalOpen(false);
        setSuccess(false);
        resetForm();
        fetchInitialData();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to record lubricant sale');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    const initialStation = globalStation || '';
    setSelectedStation(initialStation);
    if (initialStation) {
      fetchPumps(initialStation);
    } else {
      setPumps([]);
      setSelectedPump('');
    }
    setSelectedPump('');
    setLiters('');
    setPaymentMethod('cash');
    setSelectedLubricant('');
    setLubeQuantity('');
    setLubePaymentMethod('cash');
    setSelectedCustomer('');
    setMeterFormData({ opening: '', closing: '' });
    setOpeningReading('');
    setClosingReading('');
    setCashCollected('');
    setCashOnHand('');
    setStartTime('');
    setEndTime('');
    setShiftLubricants([]);
    setClosingLubricantStocks({});
    setError(null);
    setSuccess(false);
    setMeterSuccess(false);
  };

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

      setShiftSuccess('Shift started successfully!');
      setShiftLubricants([]);
      setStartTime('');
      setTimeout(() => setShiftSuccess(null), 3000);
      fetchInitialData();
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

      setShiftSuccess('Shift closed successfully!');
      setClosingLubricantStocks({});
      setEndTime('');
      setIsEndShiftModalOpen(false);
      setTimeout(() => setShiftSuccess(null), 3000);
      fetchInitialData();
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
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Shift Operations</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Manage shifts, fuel sales, and pump meter readings in one place.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex gap-2">
            <select 
              value={globalStation}
              onChange={(e) => setGlobalStation(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
            >
              <option value="">All Stations</option>
              {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input 
              type="date"
              value={globalDate}
              onChange={(e) => setGlobalDate(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                resetForm();
                setIsMeterModalOpen(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2.5 rounded-xl font-semibold transition-all shadow-sm active:scale-95 text-sm"
            >
              <Gauge className="w-4 h-4" />
              + Meter Reading
            </button>
            <button 
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200 active:scale-95 text-sm"
            >
              <Plus className="w-4 h-4" />
              Record Sale
            </button>
            {activeShiftId && (
              <button 
                onClick={() => {
                  resetForm();
                  setIsEndShiftModalOpen(true);
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-red-200 active:scale-95 text-sm"
              >
                <Square className="w-4 h-4" />
                End Shift
              </button>
            )}
            <button 
              onClick={fetchInitialData}
              disabled={refreshing}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'activity' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Dashboard & Activity
        </button>
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'reconciliation' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Variance Report
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'shifts' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Shift History
        </button>
      </div>

      {activeTab === 'activity' ? (
        <>
          {/* Shift Status & Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Shift Status Card */}
            <div className={`lg:col-span-2 p-6 rounded-2xl shadow-sm border transition-all ${
              activeShiftId 
                ? 'bg-blue-600 border-blue-700 text-white shadow-blue-200' 
                : 'bg-white border-gray-100 text-gray-900'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${activeShiftId ? 'bg-blue-500' : 'bg-blue-50'}`}>
                    <Clock className={`w-6 h-6 ${activeShiftId ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${activeShiftId ? 'text-white' : 'text-gray-900'}`}>
                      {activeShiftId ? 'Shift in Progress' : 'No Active Shift'}
                    </h3>
                    <p className={`text-sm ${activeShiftId ? 'text-blue-100' : 'text-gray-500'}`}>
                      {activeShiftId 
                        ? `Started at ${new Date(shifts.find(s => s.id === activeShiftId)?.start_time || '').toLocaleTimeString()}`
                        : 'Start a shift to begin recording sales and meter readings.'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {activeShiftId ? (
                    <>
                      <button 
                        onClick={() => {
                          resetForm();
                          setIsEndShiftModalOpen(true);
                        }}
                        className="px-6 py-2.5 bg-white text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all active:scale-95 text-sm shadow-sm"
                      >
                        End Active Shift
                      </button>
                      <button 
                        onClick={() => setActiveTab('shifts')}
                        className="px-6 py-2.5 bg-white/20 text-white hover:bg-white/30 rounded-xl font-bold transition-all active:scale-95 text-sm shadow-sm"
                      >
                        Shift Details
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setActiveTab('shifts')}
                      className="px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold transition-all active:scale-95 text-sm shadow-sm"
                    >
                      Start New Shift
                    </button>
                  )}
                  <button 
                    onClick={() => setActiveTab('shifts')}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all active:scale-95 text-sm shadow-sm ${
                      activeShiftId 
                        ? 'bg-white/20 text-white hover:bg-white/30' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    View History
                  </button>
                </div>
              </div>
            </div>

            {/* Today's Cash Summary */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-50 rounded-xl">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Today's Cash</p>
                  <p className="text-2xl font-bold text-gray-900">KES {summary.totalCash.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Activity Feed */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                  <div className="flex gap-2">
                    <History className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Details</th>
                        <th className="px-6 py-4">Value</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        ...recentSales.map(s => ({ ...s, activityType: 'sale' })),
                        ...recentReadings.map(r => ({ ...r, activityType: 'meter' })),
                        ...shifts.map(s => ({ ...s, activityType: 'shift', created_at: s.start_time }))
                      ]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 15)
                      .map((item: any) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {item.activityType === 'sale' ? (
                                <div className="p-1.5 bg-blue-50 rounded-lg">
                                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                              ) : item.activityType === 'meter' ? (
                                <div className="p-1.5 bg-green-50 rounded-lg">
                                  <Gauge className="w-3.5 h-3.5 text-green-600" />
                                </div>
                              ) : (
                                <div className="p-1.5 bg-purple-50 rounded-lg">
                                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                                </div>
                              )}
                              <span className={`text-[10px] font-bold uppercase ${
                                item.activityType === 'sale' ? 'text-blue-600' : 
                                item.activityType === 'meter' ? 'text-green-600' : 
                                'text-purple-600'
                              }`}>
                                {item.activityType === 'sale' ? 'Fuel Sale' : 
                                 item.activityType === 'meter' ? 'Meter Reading' : 
                                 item.status === 'open' ? 'Shift Started' : 'Shift Closed'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <p className="text-sm font-semibold text-gray-900">
                                {item.activityType === 'shift' ? (item.profiles?.full_name || 'Staff') : item.pumps?.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.activityType === 'sale' ? item.fuel_products?.name : 
                                 item.activityType === 'meter' ? `Reading: ${item.closing_reading.toFixed(2)}` :
                                 item.stations?.name}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-gray-900">
                              {item.activityType === 'sale' ? `KES ${item.total_amount.toLocaleString()}` : 
                               item.activityType === 'meter' ? `${item.liters_sold.toFixed(2)} L` :
                               item.status === 'closed' ? `KES ${item.cash_collected.toLocaleString()}` : '---'}
                            </p>
                            {item.activityType === 'sale' && (
                              <p className="text-xs text-gray-500">{item.volume_liters.toFixed(2)} L</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                              {item.activityType === 'sale' ? (item.transactions?.[0]?.payment_method || 'Cash') : 
                               item.activityType === 'shift' ? item.status : 'Recorded'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {recentSales.length === 0 && recentReadings.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            No activity recorded yet for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Side Stats/Info */}
            <div className="space-y-6">
              {/* Pump Status Summary */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">Pump Status</h2>
                </div>
                <div className="p-6 space-y-4">
                  {pumps.map(pump => {
                    const lastReading = recentReadings.find(r => r.pump_id === pump.id);
                    return (
                      <div key={pump.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{pump.name}</p>
                          <p className="text-xs text-gray-500">{pump.tanks?.fuel_products?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold text-blue-600">
                            {lastReading ? lastReading.closing_reading.toFixed(2) : '---'}
                          </p>
                          <p className="text-[10px] text-gray-400 uppercase">Last Reading</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                <h3 className="text-blue-900 font-bold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="w-full flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition-all text-blue-600 font-bold text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Record New Sale
                  </button>
                  <button 
                    onClick={() => { resetForm(); setIsMeterModalOpen(true); }}
                    className="w-full flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition-all text-green-600 font-bold text-sm"
                  >
                    <Gauge className="w-4 h-4" />
                    Add Meter Reading
                  </button>
                  <button 
                    onClick={() => { resetForm(); setIsLubeModalOpen(true); }}
                    className="w-full flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition-all text-purple-600 font-bold text-sm"
                  >
                    <Droplets className="w-4 h-4" />
                    Record Lubricant Sale
                  </button>
                  {activeShiftId && (
                    <button 
                      onClick={() => { resetForm(); setIsEndShiftModalOpen(true); }}
                      className="w-full flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition-all text-red-600 font-bold text-sm"
                    >
                      <Square className="w-4 h-4" />
                      End Active Shift
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'shifts' ? (
        <div className="space-y-8">
          {/* Summary Stats for Shifts */}
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
                        <label className="text-xs font-bold text-blue-100 uppercase">Cash on Hand (Physical Cash) (KES)</label>
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
                                <span className="text-sm font-bold text-white">KES {Number(cashOnHand).toLocaleString()}</span>
                              </div>
                              <div className={`flex items-center justify-between pt-1 border-t border-white/10 ${Math.abs(cashDiscrepancy) > 1 ? 'text-red-300' : 'text-green-300'}`}>
                                <span className="text-xs font-bold">Discrepancy:</span>
                                <span className="text-sm font-black">KES {cashDiscrepancy.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 pt-2 border-t border-white/10">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-blue-200">Total Recorded Revenue:</span>
                              <span className="text-xs font-bold text-white">KES {(expectedFuelSales + expectedLubeSales).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-blue-200">Reported Cash Collected:</span>
                              <span className="text-xs font-bold text-white">KES {Number(cashCollected).toLocaleString()}</span>
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
                                {lubricants.map(l => <option key={l.id} value={l.id}>{l.lubricants.name} ({l.unit_size})</option>)}
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
                {shiftSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-700 font-medium"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {shiftSuccess}
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
                        <th className="px-6 py-4">Cash Details</th>
                        <th className="px-6 py-4">Status</th>
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
                              <div className="space-y-1">
                                <div className="text-sm font-bold text-gray-900">
                                  KES {shift.cash_collected.toLocaleString()}
                                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Reported Collected</p>
                                </div>
                                <div className="text-sm font-bold text-blue-600">
                                  KES {shift.cash_on_hand.toLocaleString()}
                                  <p className="text-[10px] text-blue-400 font-medium uppercase tracking-tighter">Physical on Hand</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic">Pending</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                shift.status === 'open' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {shift.status}
                              </span>
                              <button 
                                onClick={() => fetchShiftDetails(shift)}
                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {shifts.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-blue-600" /> Pump Variance Report
              </h3>
              {!globalStation && (
                <p className="text-xs font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                  Select a station to see variance
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-50">
                    <th className="pb-4">Pump</th>
                    <th className="pb-4">Meter Dispensed</th>
                    <th className="pb-4">Actual Sales</th>
                    <th className="pb-4">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reconciliation.map((item) => (
                    <tr key={item.pump_id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 font-bold text-gray-900">{item.pump_name}</td>
                      <td className="py-4 text-gray-600">{item.meter_dispensed.toLocaleString()} L</td>
                      <td className="py-4 text-gray-600">{item.actual_sales.toLocaleString()} L</td>
                      <td className={`py-4 font-bold ${item.variance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.variance > 0 ? '+' : ''}{item.variance.toFixed(2)} L
                      </td>
                    </tr>
                  ))}
                  {reconciliation.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-400 italic">
                        {globalStation 
                          ? `No reconciliation data for ${globalDate}. Ensure meter readings are recorded.` 
                          : 'Please select a station from the filters above.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-100">
            <h3 className="text-lg font-bold mb-4">Understanding Variance</h3>
            <p className="text-blue-100 text-sm leading-relaxed">
              Variance is the difference between what the physical pump meter says was dispensed and what was recorded as sales in the system.
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-white/20 rounded-lg mt-1">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-sm text-blue-50">Positive Variance: More fuel recorded in sales than dispensed by meter.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-white/20 rounded-lg mt-1">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-sm text-blue-50">Negative Variance: More fuel dispensed by meter than recorded in sales (Potential loss/leakage).</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Sale Modal */}
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
              className="relative bg-white w-full max-w-lg rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5 md:p-8">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Record Fuel Sale</h2>
                  <button 
                    disabled={submitting}
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
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
                    <p className="text-xl font-bold text-gray-900">Sale Recorded Successfully!</p>
                    <p className="text-gray-500">Updating transaction history...</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                      {/* Station Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <MapPin className="w-4 h-4" /> Station
                        </label>
                        <select 
                          required
                          value={selectedStation}
                          onChange={(e) => {
                            setSelectedStation(e.target.value);
                            setSelectedPump('');
                          }}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        >
                          <option value="">Select Station</option>
                          {stations.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Pump Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Fuel className="w-4 h-4" /> Pump
                        </label>
                        <select 
                          required
                          disabled={!selectedStation}
                          value={selectedPump}
                          onChange={(e) => setSelectedPump(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
                        >
                          <option value="">Select Pump</option>
                          {pumps.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.tanks?.fuel_products?.name})</option>
                          ))}
                        </select>
                      </div>

                      {/* Liters Input */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Droplets className="w-4 h-4" /> Liters
                          </label>
                          <input 
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={liters}
                            onChange={(e) => setLiters(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Price/L
                          </label>
                          <div className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 font-medium">
                            {currentPrice ? `KES ${currentPrice.toFixed(2)}` : '---'}
                          </div>
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" /> Payment Method
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {(['cash', 'm-pesa', 'credit'] as const).map((method) => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setPaymentMethod(method)}
                              className={`py-3 rounded-xl border-2 font-semibold transition-all ${
                                paymentMethod === method 
                                ? 'border-blue-600 bg-blue-50 text-blue-700' 
                                : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                              }`}
                            >
                              {method.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Customer Selection for Credit */}
                      {paymentMethod === 'credit' && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <User className="w-4 h-4" /> Select Customer
                          </label>
                          <select 
                            required
                            value={selectedCustomer}
                            onChange={(e) => setSelectedCustomer(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          >
                            <option value="">Select Customer</option>
                            {customers.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} (Bal: KES {c.current_balance.toLocaleString()})
                              </option>
                            ))}
                          </select>
                          {selectedCustomer && (
                            <p className="text-[10px] font-bold text-gray-400 px-1">
                              Credit Limit: KES {customers.find(c => c.id === selectedCustomer)?.credit_limit.toLocaleString()}
                            </p>
                          )}
                        </motion.div>
                      )}
                    </div>

                    {/* Summary & Submit */}
                    <div className="pt-6 border-t border-gray-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Total Amount</span>
                        <span className="text-2xl font-bold text-gray-900">KES {totalAmount.toLocaleString()}</span>
                      </div>
                      <button 
                        type="submit"
                        disabled={submitting || !selectedPump || !liters}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Confirm & Record Sale'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Meter Reading Modal */}
      <AnimatePresence>
        {isMeterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setIsMeterModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5 md:p-8">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Add Meter Reading</h2>
                  <button 
                    disabled={submitting}
                    onClick={() => setIsMeterModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                  </button>
                </div>

                {meterSuccess ? (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 space-y-4"
                  >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-900">Reading Recorded Successfully!</p>
                    <p className="text-gray-500">Updating inventory and logs...</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleMeterSubmit} className="space-y-6">
                    {error && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                      {/* Station & Pump Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Station
                          </label>
                          <select 
                            required
                            value={selectedStation}
                            onChange={(e) => {
                              setSelectedStation(e.target.value);
                              setSelectedPump('');
                            }}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          >
                            <option value="">Select Station</option>
                            {stations.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Fuel className="w-4 h-4" /> Pump
                          </label>
                          <select 
                            required
                            disabled={!selectedStation}
                            value={selectedPump}
                            onChange={(e) => setSelectedPump(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
                          >
                            <option value="">Select Pump</option>
                            {pumps.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Fuel Type Display */}
                      {fuelType && (
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Droplets className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fuel Type</p>
                              <p className="font-bold text-gray-900">{fuelType}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Price</p>
                            <p className="font-bold text-blue-600">{currentPrice ? `KES ${currentPrice.toLocaleString()}/L` : '---'}</p>
                          </div>
                        </div>
                      )}

                      {/* Meter Readings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Gauge className="w-4 h-4" /> Opening Reading
                          </label>
                          <input 
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={meterFormData.opening}
                            onChange={(e) => setMeterFormData(prev => ({ ...prev, opening: e.target.value === '' ? '' : Number(e.target.value) }))}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Gauge className="w-4 h-4" /> Closing Reading
                          </label>
                          <input 
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={meterFormData.closing}
                            onChange={(e) => setMeterFormData(prev => ({ ...prev, closing: e.target.value === '' ? '' : Number(e.target.value) }))}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Auto-calculated Info */}
                      {typeof meterFormData.opening === 'number' && typeof meterFormData.closing === 'number' && meterFormData.closing > meterFormData.opening && (
                        <div className="p-4 bg-blue-50 rounded-2xl space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Liters Sold:</span>
                            <span className="font-bold text-blue-700">{(meterFormData.closing - meterFormData.opening).toFixed(2)} L</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Est. Amount:</span>
                            <span className="font-bold text-gray-900">
                              {currentPrice ? `KES ${((meterFormData.closing - meterFormData.opening) * currentPrice).toLocaleString()}` : 'Price not set'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                      <button 
                        type="submit"
                        disabled={submitting || !selectedPump || meterFormData.closing === '' || (typeof meterFormData.closing === 'number' && typeof meterFormData.opening === 'number' && meterFormData.closing <= meterFormData.opening)}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Record Meter Reading'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {isLubeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setIsLubeModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5 md:p-8">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-xl">
                      <Droplets className="w-6 h-6 text-purple-600" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">Record Lubricant Sale</h2>
                  </div>
                  <button 
                    disabled={submitting}
                    onClick={() => setIsLubeModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
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
                    <p className="text-xl font-bold text-gray-900">Sale Recorded Successfully!</p>
                    <p className="text-gray-500">Updating inventory and logs...</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleLubeSale} className="space-y-6">
                    {error && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Droplets className="w-4 h-4" /> Lubricant Product
                        </label>
                        <select 
                          required
                          value={selectedLubricant}
                          onChange={(e) => setSelectedLubricant(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        >
                          <option value="">Select Lubricant</option>
                          {lubricants
                            .filter(l => !globalStation || l.station_id === globalStation)
                            .map(l => (
                              <option key={l.id} value={l.id}>
                                {l.lubricants.name} ({l.unit_size}) - KES {l.lubricants.unit_price.toLocaleString()} (Stock: {l.current_stock})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Quantity
                          </label>
                          <input 
                            type="number"
                            required
                            min="1"
                            max={lubricants.find(l => l.id === selectedLubricant)?.current_stock || 999}
                            placeholder="0"
                            value={lubeQuantity}
                            onChange={(e) => setLubeQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <CreditCard className="w-4 h-4" /> Payment Method
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['cash', 'm-pesa', 'credit'] as PaymentMethod[]).map((method) => (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setLubePaymentMethod(method)}
                                className={`
                                  py-3 px-2 rounded-xl text-xs font-bold border-2 transition-all capitalize
                                  ${lubePaymentMethod === method 
                                    ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-100' 
                                    : 'bg-white border-gray-100 text-gray-500 hover:border-purple-200 hover:bg-purple-50'}
                                `}
                              >
                                {method}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Customer Selection for Credit */}
                      {lubePaymentMethod === 'credit' && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <User className="w-4 h-4" /> Select Customer
                          </label>
                          <select 
                            required
                            value={selectedCustomer}
                            onChange={(e) => setSelectedCustomer(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          >
                            <option value="">Select Customer</option>
                            {customers.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} (Bal: KES {c.current_balance.toLocaleString()})
                              </option>
                            ))}
                          </select>
                        </motion.div>
                      )}
                    </div>

                      {/* Auto-calculated Info */}
                      {selectedLubricant && lubeQuantity && (
                        <div className="p-4 bg-purple-50 rounded-2xl space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Unit Price:</span>
                            <span className="font-bold text-gray-900">
                              KES {lubricants.find(l => l.id === selectedLubricant)?.lubricants.unit_price.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Total Amount:</span>
                            <span className="font-bold text-purple-700 text-lg">
                              KES {(Number(lubeQuantity) * (lubricants.find(l => l.id === selectedLubricant)?.lubricants.unit_price || 0)).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}

                    <div className="pt-6 border-t border-gray-100">
                      <button 
                        type="submit"
                        disabled={submitting || !selectedLubricant || !lubeQuantity}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-purple-100 flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Record Sale'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Shift Details</h2>
                  <p className="text-sm text-gray-500">
                    {selectedShiftDetails.profiles?.full_name} • {selectedShiftDetails.stations.name}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedShiftDetails(null)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {loadingDetails ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-gray-500 font-medium">Loading shift data...</p>
                  </div>
                ) : (
                  <>
                    {/* Shift Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Fuel Sales</p>
                        <p className="text-xl font-black text-blue-900">
                          KES {shiftDetailsData.sales.reduce((sum, s) => sum + Number(s.total_amount), 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-blue-500 mt-1">
                          {shiftDetailsData.sales.reduce((sum, s) => sum + Number(s.volume_liters), 0).toFixed(2)} Liters Sold
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Lubricant Sales</p>
                        <p className="text-xl font-black text-purple-900">
                          KES {shiftDetailsData.lubeSales.reduce((sum, s) => sum + Number(s.total_amount), 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-purple-500 mt-1">
                          {shiftDetailsData.lubeSales.reduce((sum, s) => sum + Number(s.quantity), 0)} Items Sold
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                        <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Expenses</p>
                        <p className="text-xl font-black text-red-900">
                          KES {shiftDetailsData.expenses.reduce((sum, s) => sum + Number(s.amount), 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-red-500 mt-1">
                          {shiftDetailsData.expenses.length} Transactions
                        </p>
                      </div>
                    </div>

                    {/* Detailed Tables */}
                    <div className="space-y-6">
                      {/* Fuel Sales */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <Fuel className="w-4 h-4 text-blue-600" /> Fuel Sales Breakdown
                        </h3>
                        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                              <tr>
                                <th className="px-4 py-3">Time</th>
                                <th className="px-4 py-3">Pump</th>
                                <th className="px-4 py-3">Product</th>
                                <th className="px-4 py-3">Liters</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {shiftDetailsData.sales.map(sale => (
                                <tr key={sale.id}>
                                  <td className="px-4 py-3 text-gray-500">{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                  <td className="px-4 py-3 font-medium">{sale.pumps?.name}</td>
                                  <td className="px-4 py-3">{sale.fuel_products?.name}</td>
                                  <td className="px-4 py-3">{sale.volume_liters.toFixed(2)} L</td>
                                  <td className="px-4 py-3 text-right font-bold">KES {sale.total_amount.toLocaleString()}</td>
                                </tr>
                              ))}
                              {shiftDetailsData.sales.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">No fuel sales recorded</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Lubricant Sales */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-purple-600" /> Lubricant Sales Breakdown
                        </h3>
                        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                              <tr>
                                <th className="px-4 py-3">Product</th>
                                <th className="px-4 py-3">Qty</th>
                                <th className="px-4 py-3 text-right">Unit Price</th>
                                <th className="px-4 py-3 text-right">Total Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {shiftDetailsData.lubeSales.map(sale => (
                                <tr key={sale.id}>
                                  <td className="px-4 py-3 font-medium">{sale.lubricants?.name}</td>
                                  <td className="px-4 py-3">{sale.quantity}</td>
                                  <td className="px-4 py-3 text-right">KES {sale.unit_price?.toLocaleString() || '---'}</td>
                                  <td className="px-4 py-3 text-right font-bold">KES {sale.total_amount.toLocaleString()}</td>
                                </tr>
                              ))}
                              {shiftDetailsData.lubeSales.length === 0 && (
                                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">No lubricant sales recorded</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Expenses */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-red-600" /> Expenses Breakdown
                        </h3>
                        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                              <tr>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {shiftDetailsData.expenses.map(expense => (
                                <tr key={expense.id}>
                                  <td className="px-4 py-3 font-medium uppercase">{expense.category}</td>
                                  <td className="px-4 py-3 text-gray-600">{expense.description}</td>
                                  <td className="px-4 py-3 text-right font-bold text-red-600">KES {expense.amount.toLocaleString()}</td>
                                </tr>
                              ))}
                              {shiftDetailsData.expenses.length === 0 && (
                                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">No expenses recorded</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div className="flex gap-4">
                  <div className="text-xs">
                    <p className="text-gray-500 uppercase font-bold tracking-wider">Shift Start</p>
                    <p className="font-bold text-gray-900">{new Date(selectedShiftDetails.start_time).toLocaleString()}</p>
                  </div>
                  {selectedShiftDetails.end_time && (
                    <div className="text-xs">
                      <p className="text-gray-500 uppercase font-bold tracking-wider">Shift End</p>
                      <p className="font-bold text-gray-900">{new Date(selectedShiftDetails.end_time).toLocaleString()}</p>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedShiftDetails(null)}
                  className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isEndShiftModalOpen && activeShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setIsEndShiftModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-blue-600 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto text-white"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Square className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-white">End Active Shift</h2>
                  </div>
                  <button 
                    disabled={submitting}
                    onClick={() => setIsEndShiftModalOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 md:w-6 md:h-6 text-white/60" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Fuel Sales</p>
                    <p className="text-xl font-extrabold text-white">
                      KES {shiftSales.reduce((sum, s) => sum + Number(s.total_amount), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Expenses</p>
                    <p className="text-xl font-extrabold text-red-300">
                      KES {shiftExpenses.reduce((sum, s) => sum + Number(s.amount), 0).toLocaleString()}
                    </p>
                  </div>
                </div>

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

                  {/* Reconciliation Preview */}
                  {(closingReading !== '' || cashCollected !== '') && (
                    <div className="bg-white/10 p-5 rounded-2xl border border-white/20 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-blue-200 uppercase">Volume Var</p>
                          <p className={`text-sm font-black ${Math.abs(volumeDiscrepancy) > 0.1 ? 'text-red-300' : 'text-green-300'}`}>
                            {volumeDiscrepancy.toLocaleString()} L
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-blue-200 uppercase">Cash Var</p>
                          <p className={`text-sm font-black ${Math.abs(cashDiscrepancy) > 1 ? 'text-red-300' : 'text-green-300'}`}>
                            KES {cashDiscrepancy.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-white text-blue-600 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Square className="w-5 h-5" /> End Shift Now</>}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
