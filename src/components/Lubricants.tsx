import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import { 
  Package, 
  Plus, 
  History, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  ShoppingBag,
  Truck,
  DollarSign,
  MapPin,
  Calendar,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Lubricant {
  id: string;
  name: string;
  category: string;
  unit_price: number;
}

interface LubricantInventory {
  id: string;
  station_id: string;
  lubricant_id: string;
  current_stock: number;
  reorder_level: number;
  name: string;
  unit_size: string;
  stations: { name: string };
  lubricants: Lubricant;
}

interface LubricantDelivery {
  id: string;
  station_id: string;
  lubricant_id: string;
  quantity_delivered: number;
  delivery_date: string;
  stations: { name: string };
  lubricants: { name: string };
}

interface LubricantSale {
  id: string;
  created_at: string;
  quantity: number;
  total_amount: number;
  lubricants: { name: string };
  stations: { name: string };
  payment_method: string;
}

export default function Lubricants({ user }: { user: any }) {
  const [inventory, setInventory] = useState<LubricantInventory[]>([]);
  const [recentSales, setRecentSales] = useState<LubricantSale[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<LubricantDelivery[]>([]);
  const [stations, setStations] = useState<{id: string, name: string}[]>([]);
  const [lubricants, setLubricants] = useState<Lubricant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [customers, setCustomers] = useState<{id: string, name: string, current_balance: number}[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenuePeriod, setRevenuePeriod] = useState<'today' | 'week' | 'month'>('today');
  const [activeTab, setActiveTab] = useState<'inventory' | 'sales' | 'deliveries' | 'catalog'>('inventory');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);

  // Form States
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedLubricant, setSelectedLubricant] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [totalCost, setTotalCost] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Calculate start date based on period
      const now = new Date();
      let startDate = new Date();
      if (revenuePeriod === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (revenuePeriod === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (revenuePeriod === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      }

      const [inventoryRes, salesRes, deliveriesRes, stationsRes, lubricantsRes, revenueRes, customersRes] = await Promise.all([
        supabase
          .from('lubricant_inventory')
          .select('*, stations(name), lubricants(*)'),
        supabase
          .from('lubricant_sales')
          .select('*, lubricants(name), stations(name)')
          .order('sale_date', { ascending: false })
          .limit(10),
        supabase
          .from('lubricant_deliveries')
          .select('*, lubricants(name), stations(name)')
          .order('delivery_date', { ascending: false })
          .limit(10),
        supabase.from('stations').select('id, name'),
        supabase.from('lubricants').select('*'),
        supabase
          .from('lubricant_sales')
          .select('total_amount')
          .gte('sale_date', startDate.toISOString()),
        supabase.from('customers').select('id, name, current_balance').order('name', { ascending: true })
      ]);

      if (inventoryRes.data) {
        const mappedInventory = inventoryRes.data.map((i: any) => ({
          ...i,
          stations: Array.isArray(i.stations) ? i.stations[0] : i.stations,
          lubricants: Array.isArray(i.lubricants) ? i.lubricants[0] : i.lubricants
        }));
        setInventory(mappedInventory as any);
      }
      if (salesRes.data) {
        const mappedSales = salesRes.data.map((s: any) => ({
          ...s,
          stations: Array.isArray(s.stations) ? s.stations[0] : s.stations,
          lubricants: Array.isArray(s.lubricants) ? s.lubricants[0] : s.lubricants
        }));
        setRecentSales(mappedSales as any);
      }
      if (deliveriesRes.data) {
        const mappedDeliveries = deliveriesRes.data.map((d: any) => ({
          ...d,
          stations: Array.isArray(d.stations) ? d.stations[0] : d.stations,
          lubricants: Array.isArray(d.lubricants) ? d.lubricants[0] : d.lubricants
        }));
        setRecentDeliveries(mappedDeliveries as any);
      }
      if (stationsRes.data) setStations(stationsRes.data);
      if (lubricantsRes.data) setLubricants(lubricantsRes.data);
      if (customersRes.data) setCustomers(customersRes.data);
      
      if (revenueRes.data) {
        const total = revenueRes.data.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
        setTotalRevenue(total);
      }
    } catch (err) {
      console.error('Error fetching lubricant data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [revenuePeriod]);

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation || !selectedLubricant || !quantity || (paymentMethod === 'credit' && !selectedCustomer)) return;

    setSubmitting(true);
    setError(null);

    try {
      const lubricant = lubricants.find(l => l.id === selectedLubricant);
      if (!lubricant) throw new Error('Product not found');

      const totalAmount = lubricant.unit_price * Number(quantity);

      // 1. Record Sale
      const { data: saleData, error: saleError } = await supabase
        .from('lubricant_sales')
        .insert({
          station_id: selectedStation,
          lubricant_id: selectedLubricant,
          quantity: Number(quantity),
          total_amount: totalAmount,
          payment_method: paymentMethod,
          customer_id: paymentMethod === 'credit' ? selectedCustomer : null,
          staff_id: user?.id,
          shift_id: activeShiftId
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // 2. Update Inventory
      const invItem = inventory.find(i => i.station_id === selectedStation && i.lubricant_id === selectedLubricant);
      if (invItem) {
        const newStock = invItem.current_stock - Number(quantity);
        const { error: invError } = await supabase
          .from('lubricant_inventory')
          .update({ current_stock: newStock })
          .eq('id', invItem.id);
        
        if (invError) throw invError;

        // Check for low stock and notify
        if (newStock <= invItem.reorder_level) {
          await sendLowStockNotification(selectedStation, lubricant.name, newStock);
        }
      }

      // 3. Handle Credit Transaction
      if (paymentMethod === 'credit' && selectedCustomer) {
        // Record credit transaction
        const { error: creditTransError } = await supabase
          .from('credit_transactions')
          .insert({
            customer_id: selectedCustomer,
            station_id: selectedStation,
            amount: totalAmount,
            transaction_type: 'purchase',
            description: `Lubricant Sale: ${lubricant.name} x ${quantity}`,
            shift_id: activeShiftId
          });
        
        if (creditTransError) throw creditTransError;

        // Update customer balance
        const customer = customers.find(c => c.id === selectedCustomer);
        if (customer) {
          const { error: balanceError } = await supabase
            .from('customers')
            .update({ current_balance: customer.current_balance + totalAmount })
            .eq('id', selectedCustomer);
          
          if (balanceError) throw balanceError;
        }
      }

      // 4. Log Audit
      await logAuditAction('SALE_RECORDED', {
        type: 'LUBRICANT',
        product: lubricant.name,
        quantity: Number(quantity),
        amount: totalAmount,
        station: stations.find(s => s.id === selectedStation)?.name
      }, selectedStation);

      setSuccess(true);
      setTimeout(() => {
        setIsSaleModalOpen(false);
        setSuccess(false);
        resetForm();
        fetchData();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation || !selectedLubricant || !quantity) return;

    setSubmitting(true);
    setError(null);

    try {
      const lubricant = lubricants.find(l => l.id === selectedLubricant);
      if (!lubricant) throw new Error('Product not found');

      // 1. Record Delivery
      const { error: deliveryError } = await supabase
        .from('lubricant_deliveries')
        .insert({
          station_id: selectedStation,
          lubricant_id: selectedLubricant,
          quantity_delivered: Number(quantity),
          total_cost: totalCost || null,
          delivery_date: new Date().toISOString()
        });

      if (deliveryError) throw deliveryError;

      // 2. Update Inventory
      const invItem = inventory.find(i => i.station_id === selectedStation && i.lubricant_id === selectedLubricant);
      if (invItem) {
        const newStock = invItem.current_stock + Number(quantity);
        const { error: invError } = await supabase
          .from('lubricant_inventory')
          .update({ current_stock: newStock })
          .eq('id', invItem.id);
        
        if (invError) throw invError;

        // Check if still low stock after restock (unlikely but possible)
        if (newStock <= invItem.reorder_level) {
          await sendLowStockNotification(selectedStation, lubricant.name, newStock);
        }
      } else {
        // Create new inventory record if it doesn't exist
        const { error: invError } = await supabase
          .from('lubricant_inventory')
          .insert({
            station_id: selectedStation,
            lubricant_id: selectedLubricant,
            current_stock: Number(quantity),
            reorder_level: 5 // Default
          });
        
        if (invError) throw invError;
      }

      // 3. Log Audit
      await logAuditAction('DELIVERY_RECORDED', {
        type: 'LUBRICANT',
        product: lubricant.name,
        quantity: Number(quantity),
        total_cost: totalCost,
        station: stations.find(s => s.id === selectedStation)?.name
      }, selectedStation);

      setSuccess(true);
      setTimeout(() => {
        setIsRestockModalOpen(false);
        setSuccess(false);
        resetForm();
        fetchData();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const sendLowStockNotification = async (stationId: string, productName: string, currentStock: number) => {
    try {
      // Find station managers and supervisors
      const { data: staff } = await supabase
        .from('profiles')
        .select('id')
        .eq('station_id', stationId)
        .in('role', ['manager', 'supervisor', 'admin']);

      if (staff && staff.length > 0) {
        const stationName = stations.find(s => s.id === stationId)?.name || 'Station';
        const notifications = staff.map(member => ({
          user_id: member.id,
          title: 'Low Lubricant Stock Alert',
          message: `Stock for ${productName} at ${stationName} is low (${currentStock} units remaining). Please restock soon.`,
          type: 'low_stock' as const,
          is_read: false
        }));

        await supabase.from('notifications').insert(notifications);
      }
    } catch (err) {
      console.error('Error sending low stock notification:', err);
    }
  };

  const resetForm = () => {
    setSelectedStation('');
    setSelectedLubricant('');
    setQuantity('');
    setTotalCost('');
    setPaymentMethod('cash');
    setError(null);
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
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Lubricants & Oils</h1>
          <p className="text-gray-500 mt-1">Track motor oil, engine oils, and lubricant inventory.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setIsSaleModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <ShoppingBag className="w-5 h-5" />
            Record Sale
          </button>
          <button 
            onClick={() => setIsRestockModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all shadow-sm active:scale-95"
          >
            <Truck className="w-5 h-5" />
            Restock
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

      {/* Stats & Tabs */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Revenue Summary Statistic */}
        <div className="flex-1 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-green-50 rounded-2xl">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Sales Revenue</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">KES {totalRevenue.toLocaleString()}</h2>
                <span className="text-sm font-bold text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> {revenuePeriod.charAt(0).toUpperCase() + revenuePeriod.slice(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl w-fit">
            {(['today', 'week', 'month'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setRevenuePeriod(period)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  revenuePeriod === period 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white p-2 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(['inventory', 'sales', 'deliveries', 'catalog'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab === 'inventory' && <Package className="w-4 h-4" />}
              {tab === 'sales' && <History className="w-4 h-4" />}
              {tab === 'deliveries' && <Truck className="w-4 h-4" />}
              {tab === 'catalog' && <ShoppingBag className="w-4 h-4" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'inventory' && (
          <motion.div
            key="inventory"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Inventory Levels Across Stations
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <select 
                    value={inventoryFilter}
                    onChange={(e) => setInventoryFilter(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Stations</option>
                    {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <select 
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Products</option>
                    {lubricants.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventory
                .filter(item => (inventoryFilter === 'all' || item.station_id === inventoryFilter) && (productFilter === 'all' || item.lubricant_id === productFilter))
                .map((item) => {
                const isLow = item.current_stock <= item.reorder_level;
                return (
                  <motion.div 
                    key={item.id}
                    layout
                    className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    {isLow && (
                      <div className="absolute top-0 right-0 p-4">
                        <div className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> LOW STOCK
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mb-6">
                      <div className={`p-3 rounded-2xl ${isLow ? 'bg-red-50' : 'bg-blue-50'}`}>
                        <Package className={`w-6 h-6 ${isLow ? 'text-red-600' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                          {item.lubricants?.name || item.name}
                          {item.unit_size && <span className="ml-2 text-blue-600">({item.unit_size})</span>}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {item.stations?.name}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-3xl font-extrabold text-gray-900">{item.current_stock} Units</p>
                          <p className="text-xs text-gray-500 font-medium uppercase mt-1">Current Stock</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">KES {item.lubricants?.unit_price}</p>
                          <p className="text-xs text-gray-500 font-medium uppercase mt-1">Unit Price</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                          <TrendingDown className="w-4 h-4" /> Reorder at: {item.reorder_level} Units
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 text-right">
                          <TrendingUp className="w-4 h-4" /> Category: {item.lubricants?.category}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {inventory.length === 0 && (
                <div className="col-span-full bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No lubricant inventory recorded yet.</p>
                  <p className="text-sm text-gray-400 mt-1">Start by restocking products at your stations.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'sales' && (
          <motion.div
            key="sales"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Recent Lubricant Sales</h2>
              <History className="w-5 h-5 text-gray-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Station</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Quantity</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        {sale.stations?.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 uppercase">
                          {sale.lubricants?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-extrabold text-gray-900">
                        {sale.quantity} Units
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        KES {sale.total_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">
                        {sale.payment_method}
                      </td>
                    </tr>
                  ))}
                  {recentSales.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No sales recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'deliveries' && (
          <motion.div
            key="deliveries"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Recent Lubricant Deliveries</h2>
              <Truck className="w-5 h-5 text-gray-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Station</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Quantity Delivered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentDeliveries.map((delivery) => (
                    <tr key={delivery.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex flex-col">
                          <span className="font-bold">{new Date(delivery.delivery_date).toLocaleDateString()}</span>
                          <span className="text-xs">{new Date(delivery.delivery_date).toLocaleTimeString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        {delivery.stations?.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 uppercase">
                          {delivery.lubricants?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-extrabold text-gray-900">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          {delivery.quantity_delivered} Units
                        </div>
                      </td>
                    </tr>
                  ))}
                  {recentDeliveries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        No deliveries recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'catalog' && (
          <motion.div
            key="catalog"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                Lubricant Product Catalog
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lubricants.map((lube) => (
                <div 
                  key={lube.id}
                  className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-blue-50 rounded-2xl">
                      <ShoppingBag className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{lube.name}</p>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{lube.category}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div>
                      <p className="text-2xl font-extrabold text-gray-900">KES {lube.unit_price.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 font-medium uppercase">Standard Unit Price</p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase">
                        Available
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {lubricants.length === 0 && (
                <div className="col-span-full bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                  <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No lubricants in the catalog yet.</p>
                  <p className="text-sm text-gray-400 mt-1">Add products in the Management section.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sale Modal */}
      <Modal 
        isOpen={isSaleModalOpen} 
        onClose={() => setIsSaleModalOpen(false)} 
        title="Record Lubricant Sale"
        submitting={submitting}
      >
        {success ? (
          <SuccessView message="Sale Recorded Successfully!" />
        ) : (
          <form onSubmit={handleSale} className="space-y-6">
            {error && <ErrorView message={error} />}
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
                  {stations.length > 0 ? (
                    stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                  ) : (
                    <option disabled>No stations found.</option>
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Product</label>
                <select 
                  required
                  value={selectedLubricant}
                  onChange={(e) => setSelectedLubricant(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Product</option>
                  {lubricants.length > 0 ? (
                    lubricants.map(l => <option key={l.id} value={l.id}>{l.name} (KES {l.unit_price})</option>)
                  ) : (
                    <option disabled>No lubricants in catalog.</option>
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Quantity (Units)</label>
                <input 
                  type="number"
                  required
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {['cash', 'm-pesa', 'credit'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method as any)}
                      className={`py-3 rounded-xl border-2 font-bold transition-all ${
                        paymentMethod === method 
                        ? 'border-blue-600 bg-blue-50 text-blue-700' 
                        : 'border-gray-100 bg-gray-50 text-gray-500'
                      }`}
                    >
                      {method.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'credit' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-bold text-gray-700">Select Customer</label>
                  <select 
                    required
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Customer</option>
                    {customers.length > 0 ? (
                      customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} (Bal: KES {c.current_balance.toLocaleString()})
                        </option>
                      ))
                    ) : (
                      <option disabled>No credit customers found.</option>
                    )}
                  </select>
                </motion.div>
              )}
            </div>
            <button 
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Record Sale'}
            </button>
          </form>
        )}
      </Modal>

      {/* Restock Modal */}
      <Modal 
        isOpen={isRestockModalOpen} 
        onClose={() => setIsRestockModalOpen(false)} 
        title="Restock Lubricants"
        submitting={submitting}
      >
        {success ? (
          <SuccessView message="Restock Recorded Successfully!" />
        ) : (
          <form onSubmit={handleRestock} className="space-y-6">
            {error && <ErrorView message={error} />}
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
                  {stations.length > 0 ? (
                    stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                  ) : (
                    <option disabled>No stations found.</option>
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Product</label>
                <select 
                  required
                  value={selectedLubricant}
                  onChange={(e) => setSelectedLubricant(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Product</option>
                  {lubricants.length > 0 ? (
                    lubricants.map(l => <option key={l.id} value={l.id}>{l.name}</option>)
                  ) : (
                    <option disabled>No lubricants in catalog.</option>
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Quantity Delivered (Units)</label>
                <input 
                  type="number"
                  required
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Total Cost (Optional)</label>
                <input 
                  type="number"
                  min="0"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Record Restock'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children, submitting }: { 
  isOpen: boolean, 
  onClose: () => void, 
  title: string, 
  children: React.ReactNode,
  submitting: boolean
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !submitting && onClose()}
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
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                <button 
                  disabled={submitting}
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function SuccessView({ message }: { message: string }) {
  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 space-y-4"
    >
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
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
