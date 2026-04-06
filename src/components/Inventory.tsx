import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Package, 
  Droplets, 
  AlertTriangle, 
  RefreshCw, 
  Loader2,
  TrendingDown,
  TrendingUp,
  History,
  Activity,
  Truck,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';

interface Tank {
  id: string;
  station_id: string;
  fuel_product_id: string;
  capacity_liters: number;
  current_level_liters: number;
  reorder_threshold_liters: number;
  stations: { name: string };
  fuel_products: { name: string };
}

interface Delivery {
  id: string;
  tank_id: string;
  liters_delivered: number;
  total_cost: number | null;
  delivery_date: string;
  tanks: {
    stations: { name: string };
    fuel_products: { name: string };
  };
}

export default function Inventory() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [dipReadings, setDipReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDipModalOpen, setIsDipModalOpen] = useState(false);
  const [dipForm, setDipForm] = useState({
    tank_id: '',
    dip_reading: '' as number | ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchInventory = async () => {
    setRefreshing(true);
    try {
      const [tanksRes, deliveriesRes, dipRes] = await Promise.all([
        supabase
          .from('tanks')
          .select(`
            *,
            stations(name),
            fuel_products(name)
          `)
          .order('current_level_liters', { ascending: true }),
        supabase
          .from('fuel_deliveries')
          .select(`
            *,
            tanks (
              stations (name),
              fuel_products (name)
            )
          `)
          .order('delivery_date', { ascending: false })
          .limit(10),
        supabase
          .from('tank_dip_readings')
          .select('*, tanks(name, stations(name), fuel_products(name))')
          .order('recorded_at', { ascending: false })
          .limit(10)
      ]);

      if (tanksRes.error) throw tanksRes.error;
      if (deliveriesRes.error) throw deliveriesRes.error;
      if (dipRes.error) throw dipRes.error;

      if (tanksRes.data) {
        const mappedTanks = tanksRes.data.map((t: any) => ({
          ...t,
          stations: Array.isArray(t.stations) ? t.stations[0] : t.stations,
          fuel_products: Array.isArray(t.fuel_products) ? t.fuel_products[0] : t.fuel_products
        }));
        setTanks(mappedTanks as any);
      }
      if (deliveriesRes.data) {
        const mappedDeliveries = deliveriesRes.data.map((d: any) => ({
          ...d,
          tanks: Array.isArray(d.tanks) ? {
            ...d.tanks[0],
            stations: Array.isArray(d.tanks[0]?.stations) ? d.tanks[0].stations[0] : d.tanks[0]?.stations,
            fuel_products: Array.isArray(d.tanks[0]?.fuel_products) ? d.tanks[0].fuel_products[0] : d.tanks[0]?.fuel_products
          } : {
            ...d.tanks,
            stations: Array.isArray(d.tanks?.stations) ? d.tanks.stations[0] : d.tanks?.stations,
            fuel_products: Array.isArray(d.tanks?.fuel_products) ? d.tanks.fuel_products[0] : d.tanks?.fuel_products
          }
        }));
        setDeliveries(mappedDeliveries as any);
      }
      if (dipRes.data) {
        const mappedDip = dipRes.data.map((d: any) => ({
          ...d,
          tanks: Array.isArray(d.tanks) ? {
            ...d.tanks[0],
            stations: Array.isArray(d.tanks[0]?.stations) ? d.tanks[0].stations[0] : d.tanks[0]?.stations,
            fuel_products: Array.isArray(d.tanks[0]?.fuel_products) ? d.tanks[0].fuel_products[0] : d.tanks[0]?.fuel_products
          } : {
            ...d.tanks,
            stations: Array.isArray(d.tanks?.stations) ? d.tanks.stations[0] : d.tanks?.stations,
            fuel_products: Array.isArray(d.tanks?.fuel_products) ? d.tanks.fuel_products[0] : d.tanks?.fuel_products
          }
        }));
        setDipReadings(mappedDip as any);
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRecordDip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dipForm.tank_id || !dipForm.dip_reading) return;

    setSubmitting(true);
    try {
      const tank = tanks.find(t => t.id === dipForm.tank_id);
      if (!tank) throw new Error('Tank not found');

      const systemReading = Number(tank.current_level_liters);
      const dipReading = Number(dipForm.dip_reading);
      const variance = dipReading - systemReading;

      const { error } = await supabase.from('tank_dip_readings').insert({
        tank_id: dipForm.tank_id,
        dip_reading_liters: dipReading,
        system_reading_liters: systemReading,
        variance_liters: variance,
        recorded_at: new Date().toISOString()
      });

      if (error) throw error;

      setIsDipModalOpen(false);
      setDipForm({ tank_id: '', dip_reading: '' });
      fetchInventory();
    } catch (err) {
      console.error('Error recording dip reading:', err);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchInventory();

    // Real-time subscription to tank updates
    const tankSubscription = supabase
      .channel('inventory_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tanks' }, () => {
        fetchInventory();
      })
      .subscribe();

    // Real-time subscription to delivery updates
    const deliverySubscription = supabase
      .channel('delivery_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fuel_deliveries' }, () => {
        fetchInventory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tankSubscription);
      supabase.removeChannel(deliverySubscription);
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
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Inventory Management</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Monitor underground tank levels and fuel stock.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsDipModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Droplets className="w-5 h-5 text-blue-600" />
            Record Dip Reading
          </button>
          <button 
            onClick={fetchInventory}
            disabled={refreshing}
            className="p-2.5 md:p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tank Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tanks.map((tank) => {
          const percentage = (tank.current_level_liters / tank.capacity_liters) * 100;
          const isLow = tank.current_level_liters <= tank.reorder_threshold_liters;

          return (
            <motion.div 
              key={tank.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
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
                  <Droplets className={`w-6 h-6 ${isLow ? 'text-red-600' : 'text-blue-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 uppercase tracking-wider">{tank.fuel_products?.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Package className="w-3 h-3" /> {tank.stations?.name}
                  </p>
                </div>
              </div>

              {/* Progress Bar (Vertical Tank Style) */}
              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-extrabold text-gray-900">{tank.current_level_liters.toLocaleString()} L</p>
                    <p className="text-xs text-gray-500 font-medium uppercase mt-1">Current Level</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{percentage.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500 font-medium uppercase mt-1">Capacity</p>
                  </div>
                </div>

                <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden p-1">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className={`h-full rounded-full transition-colors duration-1000 ${
                      isLow ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                    <TrendingDown className="w-4 h-4" /> Threshold: {tank.reorder_threshold_liters.toLocaleString()} L
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                    <TrendingUp className="w-4 h-4" /> Capacity: {tank.capacity_liters.toLocaleString()} L
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Reconciliation & History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Delivery History */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Delivery History</h2>
            <History className="w-5 h-5 text-gray-400" />
          </div>
          
          {deliveries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Station / Tank</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Liters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                        {new Date(delivery.delivery_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-bold">
                        {delivery.tanks?.stations?.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 uppercase">
                          {delivery.tanks?.fuel_products?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-extrabold">
                        {delivery.liters_delivered.toLocaleString()} L
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              No recent deliveries recorded.
            </div>
          )}
        </div>

        {/* Dip Reading History */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Dip Reconciliation</h2>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          
          {dipReadings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tank</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Dip vs System</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dipReadings.map((dip) => (
                    <tr key={dip.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                        {new Date(dip.recorded_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-bold">
                        {dip.tanks?.name || `${dip.tanks?.fuel_products?.name} Tank`}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        Dip: {dip.dip_reading_liters.toLocaleString()} L<br/>
                        Sys: {dip.system_reading_liters.toLocaleString()} L
                      </td>
                      <td className={`px-6 py-4 text-sm font-black ${dip.variance_liters < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {dip.variance_liters > 0 ? '+' : ''}{dip.variance_liters.toLocaleString()} L
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              No dip readings recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Dip Modal */}
      {isDipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDipModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Record Dip Reading</h2>
              <form onSubmit={handleRecordDip} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Select Tank</label>
                  <select 
                    required
                    value={dipForm.tank_id}
                    onChange={(e) => setDipForm({ ...dipForm, tank_id: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Tank</option>
                    {tanks.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.stations?.name || 'Unknown Station'} - {t.fuel_products?.name || 'Unknown Product'} ({t.current_level_liters.toLocaleString()} L)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Physical Dip Reading (Liters)</label>
                  <input 
                    type="number"
                    required
                    step="0.01"
                    value={dipForm.dip_reading}
                    onChange={(e) => setDipForm({ ...dipForm, dip_reading: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter actual liters from dipstick"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Record & Compare'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
