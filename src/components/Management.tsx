import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import { fuelSaleService } from '../services/fuelSaleService';
import { 
  Settings, 
  DollarSign, 
  Truck, 
  Plus, 
  Package,
  Building2,
  Edit2,
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  MapPin,
  Droplets,
  History,
  Fuel,
  Activity,
  Calendar,
  User,
  RefreshCw,
  Database,
  Sparkles
} from 'lucide-react';
import { startOfDay, subDays, format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface Station {
  id: string;
  name: string;
  address?: string;
}

interface Manager {
  id: string;
  full_name: string | null;
  email: string;
  station_id: string | null;
}

interface FuelProduct {
  id: string;
  name: string;
}

interface Tank {
  id: string;
  station_id: string;
  fuel_product_id: string;
  name?: string | null;
  capacity_liters: number;
  current_level_liters: number;
  reorder_threshold_liters?: number;
  stations?: { name: string };
  fuel_products?: { name: string };
}

interface Pump {
  id: string;
  station_id: string;
  tank_id: string;
  name: string;
  status: string;
  stations?: { name: string };
  tanks?: { 
    id: string;
    name?: string | null; 
    fuel_products?: { name: string } 
  };
}

interface AuditLog {
  id: string;
  action: string;
  details: any;
  timestamp: string;
  user_id: string;
  profiles?: { full_name: string | null; email: string };
}

export default function Management({ initialStationId, onClearInitialStation }: { 
  initialStationId?: string | null, 
  onClearInitialStation?: () => void 
}) {
  const [stations, setStations] = useState<Station[]>([]);
  const [products, setProducts] = useState<FuelProduct[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'prices' | 'deliveries' | 'lubricants' | 'stations' | 'infrastructure'>('prices');

  // Form States
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Station Form
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stationName, setStationName] = useState('');
  const [stationAddress, setStationAddress] = useState('');
  const [stationManagerId, setStationManagerId] = useState('');

  // Infrastructure Forms
  const [isAddingTank, setIsAddingTank] = useState(false);
  const [isAddingPump, setIsAddingPump] = useState(false);
  const [tankForm, setTankForm] = useState({
    station_id: '',
    fuel_product_id: '',
    name: '',
    capacity: '' as number | '',
    threshold: '' as number | ''
  });
  const [pumpForm, setPumpForm] = useState({
    station_id: '',
    tank_id: '',
    name: ''
  });

  // Price Form
  const [priceStation, setPriceStation] = useState('');
  const [priceProduct, setPriceProduct] = useState('');
  const [newPrice, setNewPrice] = useState<number | ''>('');

  // Delivery Form
  const [deliveryTank, setDeliveryTank] = useState('');
  const [deliveryLiters, setDeliveryLiters] = useState<number | ''>('');
  const [deliveryCost, setDeliveryCost] = useState<number | ''>('');

  // Lubricant Form
  const [lubeName, setLubeName] = useState('');
  const [lubeCategory, setLubeCategory] = useState('Engine Oil');
  const [lubePrice, setLubePrice] = useState<number | ''>('');

  useEffect(() => {
    fetchData();
  }, []);

  const [isAddingStation, setIsAddingStation] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const seedDemoData = async () => {
    setIsSeeding(true);
    try {
      // 1. Get existing stations, products, and pumps
      let { data: stationsData } = await supabase.from('stations').select('id, name');
      let { data: productsData } = await supabase.from('fuel_products').select('id, name');
      let { data: tanksData } = await supabase.from('tanks').select('id, station_id, fuel_product_id');
      let { data: pumpsData } = await supabase.from('pumps').select('id, station_id, tank_id');

      // 2. If no data exists, create initial setup
      if (!stationsData?.length) {
        const { data: newStation, error: sErr } = await supabase.from('stations').insert({
          name: 'Main Station (Demo)',
          location: 'Nairobi, Kenya'
        }).select().single();
        if (sErr) throw sErr;
        stationsData = [newStation];
      }

      if (!productsData?.length) {
        const { data: newProducts, error: pErr } = await supabase.from('fuel_products').insert([
          { name: 'Petrol' },
          { name: 'Diesel' }
        ]).select();
        if (pErr) throw pErr;
        productsData = newProducts;
      }

      if (!tanksData?.length && stationsData?.length && productsData?.length) {
        const newTanks = productsData.map(p => ({
          station_id: stationsData![0].id,
          fuel_product_id: p.id,
          capacity_liters: 10000,
          current_level_liters: 5000,
          reorder_threshold_liters: 1000
        }));
        const { data: createdTanks, error: tErr } = await supabase.from('tanks').insert(newTanks).select();
        if (tErr) throw tErr;
        tanksData = createdTanks;
      }

      if (!pumpsData?.length && tanksData?.length) {
        const newPumps = tanksData.map((t, i) => ({
          station_id: t.station_id,
          tank_id: t.id,
          name: `Pump ${i + 1}`,
          status: 'active'
        }));
        const { data: createdPumps, error: pumpErr } = await supabase.from('pumps').insert(newPumps).select();
        if (pumpErr) throw pumpErr;
        pumpsData = createdPumps;
      }

      // Ensure we have prices for the products
      const { data: pricesData } = await supabase.from('fuel_prices').select('id');
      if (!pricesData?.length && stationsData?.length && productsData?.length) {
        const initialPrices = productsData.map(p => ({
          station_id: stationsData![0].id,
          fuel_product_id: p.id,
          price_per_liter: p.name === 'Petrol' ? 175.50 : 162.30,
          effective_from: new Date().toISOString()
        }));
        await supabase.from('fuel_prices').insert(initialPrices);
      }

      if (!stationsData?.length || !productsData?.length || !pumpsData?.length) {
        throw new Error('Failed to initialize demo data setup.');
      }

      const sales = [];
      const expenses = [];
      const deliveries = [];

      // Generate data for the last 7 days
      for (let i = 0; i < 7; i++) {
        const date = subDays(new Date(), i);
        const dateStr = date.toISOString();
        const shortDateStr = format(date, 'yyyy-MM-dd');

        // Random sales for each day
        const numSales = 5 + Math.floor(Math.random() * 10);
        for (let j = 0; j < numSales; j++) {
          const pump = pumpsData[Math.floor(Math.random() * pumpsData.length)];
          const tank = tanksData?.find(t => t.id === pump.tank_id);
          const liters = 10 + Math.random() * 50;
          const price = 150 + Math.random() * 20;
          
          sales.push({
            station_id: pump.station_id,
            pump_id: pump.id,
            fuel_product_id: tank?.fuel_product_id || productsData[0].id,
            volume_liters: liters,
            total_amount: liters * price,
            sale_date: dateStr,
            created_at: dateStr
          });
        }

        // Random expense for each day
        expenses.push({
          category: ['Utilities', 'Maintenance', 'Staff', 'Other'][Math.floor(Math.random() * 4)],
          amount: 500 + Math.random() * 2000,
          description: 'Automated demo expense',
          expense_date: shortDateStr
        });

        // Random delivery every 2 days
        if (i % 2 === 0) {
          const tank = tanksData?.[Math.floor(Math.random() * (tanksData?.length || 1))];
          if (tank) {
            deliveries.push({
              tank_id: tank.id,
              liters_delivered: 1000 + Math.random() * 2000,
              total_cost: 150000 + Math.random() * 50000,
              delivery_date: dateStr
            });
          }
        }
      }

      // Insert data
      const { data: insertedSales, error: salesErr } = await supabase.from('fuel_sales').insert(sales).select();
      if (salesErr) throw salesErr;

      // Create transactions for each sale
      if (insertedSales) {
        const transactions = insertedSales.map(sale => ({
          sale_id: sale.id,
          amount: sale.total_amount,
          payment_method: ['cash', 'mpesa', 'card'][Math.floor(Math.random() * 3)]
        }));
        const { error: transErr } = await supabase.from('transactions').insert(transactions);
        if (transErr) throw transErr;
      }

      const results = await Promise.all([
        supabase.from('expenses').insert(expenses),
        supabase.from('fuel_deliveries').insert(deliveries)
      ]);

      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw new Error(errors[0].error?.message);

      await logAuditAction('DEMO_DATA_SEEDED', { days: 7, sales_count: sales.length });
      
      alert(`Successfully seeded ${sales.length} sales, ${expenses.length} expenses, and ${deliveries.length} deliveries!`);
      fetchData();
    } catch (err) {
      console.error('Error seeding data:', err);
      alert(err instanceof Error ? err.message : 'Failed to seed data');
    } finally {
      setIsSeeding(false);
    }
  };

  const [lubricants, setLubricants] = useState<any[]>([]);

  const fetchData = async () => {
    if (!loading) setRefreshing(true);
    else setLoading(true);
    
    try {
      // Fetch stations with fallback for missing address/location column
      let stationsRes = await supabase.from('stations').select('*').order('name');
      
      if (stationsRes.error && (stationsRes.error.code === 'PGRST204' || stationsRes.error.message.includes('address'))) {
        stationsRes = await supabase.from('stations').select('id, name, location').order('name');
        if (stationsRes.error && (stationsRes.error.code === 'PGRST204' || stationsRes.error.message.includes('location'))) {
          stationsRes = await supabase.from('stations').select('id, name').order('name');
        }
      }

      if (stationsRes.data) {
        const mappedStations = stationsRes.data.map((s: any) => ({
          id: s.id,
          name: s.name,
          address: s.address || s.location || ''
        }));
        setStations(mappedStations);
      }

      // Fetch other data individually to prevent one failure from blocking others
      const fetchProducts = async () => {
        const { data, error } = await supabase.from('fuel_products').select('id, name').order('name');
        if (data) setProducts(data);
        if (error) console.error('Error fetching products:', error);
      };

      const fetchTanks = async () => {
        const { data, error } = await supabase.from('tanks').select('*, stations(name), fuel_products(name)').order('name');
        if (data) {
          const mappedTanks = data.map((t: any) => ({
            ...t,
            stations: Array.isArray(t.stations) ? t.stations[0] : t.stations,
            fuel_products: Array.isArray(t.fuel_products) ? t.fuel_products[0] : t.fuel_products
          }));
          setTanks(mappedTanks);
        }
        if (error) console.error('Error fetching tanks:', error);
      };

      const fetchPumps = async () => {
        const { data, error } = await supabase.from('pumps').select('*, stations(name), tanks(*, fuel_products(name))').order('name');
        if (data) {
          const mappedPumps = data.map((p: any) => ({
            ...p,
            stations: Array.isArray(p.stations) ? p.stations[0] : p.stations,
            tanks: Array.isArray(p.tanks) ? {
              ...p.tanks[0],
              fuel_products: Array.isArray(p.tanks[0]?.fuel_products) ? p.tanks[0].fuel_products[0] : p.tanks[0]?.fuel_products
            } : {
              ...p.tanks,
              fuel_products: Array.isArray(p.tanks?.fuel_products) ? p.tanks.fuel_products[0] : p.tanks?.fuel_products
            }
          }));
          setPumps(mappedPumps);
        }
        if (error) console.error('Error fetching pumps:', error);
      };

      const fetchLogs = async () => {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*, profiles(full_name, email)')
          .order('timestamp', { ascending: false })
          .limit(10);
        if (data) {
          const mappedLogs = data.map((l: any) => ({
            ...l,
            profiles: Array.isArray(l.profiles) ? l.profiles[0] : l.profiles
          }));
          setAuditLogs(mappedLogs as any);
        }
        if (error) console.error('Error fetching logs:', error);
      };

      const fetchManagers = async () => {
        const { data, error } = await supabase.from('profiles').select('id, full_name, email, station_id').eq('role', 'manager');
        if (data) setManagers(data as any);
        if (error) console.error('Error fetching managers:', error);
      };

      const fetchLubricants = async () => {
        const { data, error } = await supabase.from('lubricants').select('*').order('name');
        if (data) setLubricants(data);
        if (error) console.error('Error fetching lubricants:', error);
      };

      await Promise.all([
        fetchProducts(),
        fetchTanks(),
        fetchPumps(),
        fetchLogs(),
        fetchManagers(),
        fetchLubricants()
      ]);

    } catch (err) {
      console.error('Error fetching management data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceStation || !priceProduct || !newPrice) return;

    setSubmitting(true);
    setError(null);

    try {
      // Fetch old price before update
      const oldPrice = await fuelSaleService.getCurrentPrice(priceStation, priceProduct);

      const { error } = await supabase.from('fuel_prices').insert({
        station_id: priceStation,
        fuel_product_id: priceProduct,
        price_per_liter: Number(newPrice),
        effective_from: new Date().toISOString()
      });

      if (error) throw error;

      // Log audit action
      await logAuditAction('PRICE_UPDATE', { 
        station: stations.find(s => s.id === priceStation)?.name,
        product: products.find(p => p.id === priceProduct)?.name,
        old_price: oldPrice,
        new_price: newPrice 
      }, priceStation);

      setSuccess(true);
      fetchData(); // Refresh logs
      setTimeout(() => {
        setSuccess(false);
        setNewPrice('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update price');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryTank || !deliveryLiters) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Get current tank level
      const { data: tankData, error: fetchError } = await supabase
        .from('tanks')
        .select('current_level_liters')
        .eq('id', deliveryTank)
        .single();

      if (fetchError) throw fetchError;

      // 2. Update tank level
      const newLevel = Number(tankData.current_level_liters) + Number(deliveryLiters);
      const { error: updateError } = await supabase
        .from('tanks')
        .update({ current_level_liters: newLevel })
        .eq('id', deliveryTank);

      if (updateError) throw updateError;

      // 3. Log delivery in fuel_deliveries table
      const { error: deliveryError } = await supabase
        .from('fuel_deliveries')
        .insert({
          tank_id: deliveryTank,
          liters_delivered: Number(deliveryLiters),
          total_cost: deliveryCost ? Number(deliveryCost) : null,
          delivery_date: new Date().toISOString()
        });

      if (deliveryError) throw deliveryError;

      // Log audit action
      const tank = tanks.find(t => t.id === deliveryTank);
      await logAuditAction('DELIVERY_RECORDED', { 
        station: tank?.stations?.name,
        product: tank?.fuel_products?.name,
        liters: deliveryLiters,
        cost: deliveryCost
      }, deliveryTank);

      setSuccess(true);
      fetchData(); // Refresh logs
      setTimeout(() => {
        setSuccess(false);
        setDeliveryLiters('');
        setDeliveryCost('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLubricant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lubeName || !lubePrice) return;

    setSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase.from('lubricants').insert({
        name: lubeName,
        category: lubeCategory,
        unit_price: Number(lubePrice)
      });

      if (error) throw error;

      await logAuditAction('LUBRICANT_ADDED', {
        name: lubeName,
        price: lubePrice
      });

      setSuccess(true);
      fetchData();
      setTimeout(() => {
        setSuccess(false);
        setLubeName('');
        setLubePrice('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add lubricant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationName) return;

    setSubmitting(true);
    setError(null);
    try {
      // Try to insert with address first
      let { error: insertError } = await supabase.from('stations').insert({
        name: stationName,
        address: stationAddress
      });

      // If address column doesn't exist, try location
      if (insertError && (
        insertError.code === 'PGRST204' || 
        insertError.message.includes('column "address" of relation "stations" does not exist') ||
        insertError.message.includes("Could not find the 'address' column")
      )) {
        const { error: locationError } = await supabase.from('stations').insert({
          name: stationName,
          location: stationAddress
        });
        insertError = locationError;
      }

      if (insertError) throw insertError;

      // Log audit action without blocking UI
      logAuditAction('STATION_ADDED', `Added new station: ${stationName}`);
      
      setSuccess(true);
      setStationName('');
      setStationAddress('');
      setIsAddingStation(false);
      fetchData();
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error adding station:', err);
      setError(err instanceof Error ? err.message : 'Failed to add station');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tankForm.station_id || !tankForm.fuel_product_id || !tankForm.capacity) return;

    setSubmitting(true);
    setError(null);
    try {
      // Use the column names that are confirmed to exist in the database (capacity_liters, current_level_liters)
      const { error } = await supabase.from('tanks').insert({
        station_id: tankForm.station_id,
        fuel_product_id: tankForm.fuel_product_id,
        name: tankForm.name || null,
        capacity_liters: Number(tankForm.capacity),
        current_level_liters: 0,
        reorder_threshold_liters: tankForm.threshold ? Number(tankForm.threshold) : 1000
      });

      if (error) throw error;

      await logAuditAction('TANK_ADDED', {
        station: stations.find(s => s.id === tankForm.station_id)?.name,
        product: products.find(p => p.id === tankForm.fuel_product_id)?.name,
        capacity: tankForm.capacity
      }, tankForm.station_id);

      setSuccess(true);
      setIsAddingTank(false);
      setTankForm({ station_id: '', fuel_product_id: '', name: '', capacity: '', threshold: '' });
      fetchData();
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('Error adding tank:', err);
      setError(err instanceof Error ? err.message : 'Failed to add tank');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPump = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pumpForm.station_id || !pumpForm.tank_id || !pumpForm.name) return;

    setSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase.from('pumps').insert({
        station_id: pumpForm.station_id,
        tank_id: pumpForm.tank_id,
        name: pumpForm.name,
        status: 'active'
      });

      if (error) throw error;

      await logAuditAction('PUMP_ADDED', {
        station: stations.find(s => s.id === pumpForm.station_id)?.name,
        tank: tanks.find(t => t.id === pumpForm.tank_id)?.name || 'Unnamed Tank',
        pump_name: pumpForm.name
      }, pumpForm.station_id);

      setSuccess(true);
      setIsAddingPump(false);
      setPumpForm({ station_id: '', tank_id: '', name: '' });
      fetchData();
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add pump');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation || !stationName) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Update station details
      let { error: stationError } = await supabase
        .from('stations')
        .update({
          name: stationName,
          address: stationAddress
        })
        .eq('id', selectedStation.id);

      // If address column doesn't exist, try location
      if (stationError && (
        stationError.code === 'PGRST204' || 
        stationError.message.includes('column "address" of relation "stations" does not exist') ||
        stationError.message.includes("Could not find the 'address' column")
      )) {
        const { error: locationError } = await supabase
          .from('stations')
          .update({
            name: stationName,
            location: stationAddress
          })
          .eq('id', selectedStation.id);
        stationError = locationError;
      }

      if (stationError) throw stationError;

      // 2. Update manager assignment in profiles table
      // First, unassign any manager currently assigned to this station
      await supabase
        .from('profiles')
        .update({ station_id: null })
        .eq('station_id', selectedStation.id)
        .eq('role', 'manager');

      // Then, assign the new manager if one is selected
      if (stationManagerId) {
        const { error: managerError } = await supabase
          .from('profiles')
          .update({ station_id: selectedStation.id })
          .eq('id', stationManagerId);

        if (managerError) throw managerError;
      }

      await logAuditAction('STATION_UPDATED', {
        station_name: stationName,
        manager_id: stationManagerId
      }, selectedStation.id);

      setSuccess(true);
      fetchData();
      setTimeout(() => {
        setSuccess(false);
        setSelectedStation(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update station');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStation = (station: Station) => {
    setSelectedStation(station);
    setStationName(station.name);
    setStationAddress(station.address || '');
    const currentManager = managers.find(m => m.station_id === station.id);
    setStationManagerId(currentManager?.id || '');
    setActiveTab('stations');
  };

  useEffect(() => {
    if (initialStationId && stations.length > 0 && !loading) {
      const station = stations.find(s => s.id === initialStationId);
      if (station) {
        handleEditStation(station);
      }
      onClearInitialStation?.();
    }
  }, [initialStationId, stations, loading, onClearInitialStation]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Management</h1>
          <p className="text-sm md:text-base text-gray-500 mt-1">Control prices, inventory refills, and station settings.</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={fetchData}
            disabled={refreshing}
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={seedDemoData}
            disabled={isSeeding}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-purple-100 shadow-sm active:scale-95"
            title="Generate sample data for testing"
          >
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span className="whitespace-nowrap">Seed Demo Data</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-max md:w-fit min-w-full md:min-w-0">
          <button 
            onClick={() => setActiveTab('prices')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all whitespace-nowrap text-sm md:text-base ${
              activeTab === 'prices' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
            Price Management
          </button>
          <button 
            onClick={() => setActiveTab('deliveries')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all whitespace-nowrap text-sm md:text-base ${
              activeTab === 'deliveries' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Truck className="w-4 h-4 md:w-5 md:h-5" />
            Fuel Deliveries
          </button>
          <button 
            onClick={() => setActiveTab('lubricants')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all whitespace-nowrap text-sm md:text-base ${
              activeTab === 'lubricants' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package className="w-4 h-4 md:w-5 md:h-5" />
            Lubricant Catalog
          </button>
          <button 
            onClick={() => setActiveTab('stations')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all whitespace-nowrap text-sm md:text-base ${
              activeTab === 'stations' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="w-4 h-4 md:w-5 md:h-5" />
            Stations
          </button>
          <button 
            onClick={() => setActiveTab('infrastructure')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all whitespace-nowrap text-sm md:text-base ${
              activeTab === 'infrastructure' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database className="w-4 h-4 md:w-5 md:h-5" />
            Pumps & Tanks
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Form Section */}
        <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-gray-100">
          <AnimatePresence mode="wait">
            {activeTab === 'prices' ? (
              <motion.div 
                key="prices"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Update Fuel Price</h2>
                </div>

                <form onSubmit={handleUpdatePrice} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Station
                      </label>
                      <select 
                        required
                        value={priceStation}
                        onChange={(e) => setPriceStation(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Station</option>
                        {stations.length > 0 ? (
                          stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                        ) : (
                          <option disabled>No stations found. Please add one first.</option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Fuel className="w-4 h-4" /> Fuel Product
                      </label>
                      <select 
                        required
                        value={priceProduct}
                        onChange={(e) => setPriceProduct(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Product</option>
                        {products.length > 0 ? (
                          products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                        ) : (
                          <option disabled>No products found. Please add them in database.</option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> New Price (KES per Liter)
                      </label>
                      <input 
                        type="number"
                        step="0.01"
                        required
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Price'}
                  </button>
                </form>
              </motion.div>
            ) : activeTab === 'deliveries' ? (
              <motion.div 
                key="deliveries"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Record Tank Refill</h2>
                </div>

                <form onSubmit={handleRecordDelivery} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Droplets className="w-4 h-4" /> Target Tank
                      </label>
                        <select 
                          required
                          value={deliveryTank}
                          onChange={(e) => setDeliveryTank(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">Select Tank</option>
                          {tanks.length > 0 ? (
                            tanks.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.stations?.name || 'Unknown Station'} - {t.name || `${t.fuel_products?.name || 'Unknown Product'} Tank`}
                              </option>
                            ))
                          ) : (
                            <option disabled>No tanks found. Please add them in Infrastructure tab.</option>
                          )}
                        </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Droplets className="w-4 h-4" /> Liters Delivered
                      </label>
                      <input 
                        type="number"
                        required
                        value={deliveryLiters}
                        onChange={(e) => setDeliveryLiters(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> Total Cost (Optional)
                      </label>
                      <input 
                        type="number"
                        value={deliveryCost}
                        onChange={(e) => setDeliveryCost(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Record Delivery'}
                  </button>
                </form>
              </motion.div>
            ) : activeTab === 'stations' ? (
              <motion.div 
                key="stations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {isAddingStation ? 'Add New Station' : selectedStation ? 'Edit Station' : 'Station Management'}
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    {!isAddingStation && !selectedStation && (
                      <button 
                        onClick={() => {
                          setIsAddingStation(true);
                          setStationName('');
                          setStationAddress('');
                        }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
                      >
                        <Plus className="w-4 h-4" /> Add Station
                      </button>
                    )}
                    {(isAddingStation || selectedStation) && (
                      <button 
                        onClick={() => {
                          setIsAddingStation(false);
                          setSelectedStation(null);
                        }}
                        className="text-sm text-blue-600 font-bold hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {isAddingStation ? (
                  <form onSubmit={handleAddStation} className="space-y-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Station Name</label>
                        <input 
                          type="text"
                          required
                          value={stationName}
                          onChange={(e) => setStationName(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="e.g. Shell Westlands"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Address / Location</label>
                        <input 
                          type="text"
                          value={stationAddress}
                          onChange={(e) => setStationAddress(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="e.g. Westlands, Nairobi"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Station'}
                    </button>
                  </form>
                ) : selectedStation ? (
                  <form onSubmit={handleUpdateStation} className="space-y-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Station Name</label>
                        <input 
                          type="text"
                          required
                          value={stationName}
                          onChange={(e) => setStationName(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Address / Location</label>
                        <input 
                          type="text"
                          value={stationAddress}
                          onChange={(e) => setStationAddress(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="e.g. Nairobi-Mombasa Highway"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Assign Manager</label>
                        <select 
                          value={stationManagerId}
                          onChange={(e) => setStationManagerId(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">No Manager Assigned</option>
                          {managers.length > 0 ? (
                            managers.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.full_name || m.email} {m.station_id && m.station_id !== selectedStation.id ? `(Currently at ${stations.find(s => s.id === m.station_id)?.name})` : ''}
                              </option>
                            ))
                          ) : (
                            <option disabled>No managers found in profiles.</option>
                          )}
                        </select>
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Station Details'}
                    </button>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {stations.map(station => (
                      <div key={station.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <MapPin className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{station.name}</p>
                            <p className="text-xs text-gray-500">{station.address || 'No address set'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleEditStation(station)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : activeTab === 'infrastructure' ? (
              <motion.div 
                key="infrastructure"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Tanks Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Droplets className="w-5 h-5 text-blue-600" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">Underground Tanks</h2>
                    </div>
                    <button 
                      onClick={() => setIsAddingTank(!isAddingTank)}
                      className="text-sm font-bold text-blue-600 hover:underline"
                    >
                      {isAddingTank ? 'Cancel' : '+ Add Tank'}
                    </button>
                  </div>

                  {isAddingTank && (
                    <form onSubmit={handleAddTank} className="p-6 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">Station</label>
                          <select 
                            required
                            value={tankForm.station_id}
                            onChange={(e) => setTankForm(prev => ({ ...prev, station_id: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
                          <label className="text-xs font-bold text-gray-500 uppercase">Fuel Product</label>
                          <select 
                            required
                            value={tankForm.fuel_product_id}
                            onChange={(e) => setTankForm(prev => ({ ...prev, fuel_product_id: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="">Select Product</option>
                            {products.length > 0 ? (
                              products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                            ) : (
                              <option disabled>No products found.</option>
                            )}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">Tank Name (Optional)</label>
                          <input 
                            type="text"
                            value={tankForm.name}
                            onChange={(e) => setTankForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. Tank A"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">Capacity (Liters)</label>
                          <input 
                            type="number"
                            required
                            value={tankForm.capacity}
                            onChange={(e) => setTankForm(prev => ({ ...prev, capacity: e.target.value === '' ? '' : Number(e.target.value) }))}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="10000"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">Low Stock Threshold (Liters)</label>
                          <input 
                            type="number"
                            value={tankForm.threshold}
                            onChange={(e) => setTankForm(prev => ({ ...prev, threshold: e.target.value === '' ? '' : Number(e.target.value) }))}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="1000"
                          />
                        </div>
                      </div>
                      <button 
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Tank'}
                      </button>
                    </form>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    {tanks.map(tank => (
                      <div key={tank.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Droplets className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{tank.name || `${tank.fuel_products?.name} Tank`}</p>
                            <p className="text-xs text-gray-500">
                              {tank.stations?.name} • {(tank.capacity_liters || 0).toLocaleString()}L Capacity
                              {tank.reorder_threshold_liters && ` • Threshold: ${tank.reorder_threshold_liters.toLocaleString()}L`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{(tank.current_level_liters || 0).toLocaleString()}L</p>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Current Stock</p>
                        </div>
                      </div>
                    ))}
                    {tanks.length === 0 && !isAddingTank && (
                      <p className="text-center py-8 text-gray-500 italic">No tanks added yet. Add a tank to connect pumps.</p>
                    )}
                  </div>
                </div>

                {/* Pumps Section */}
                <div className="space-y-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Fuel className="w-5 h-5 text-blue-600" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">Fuel Pumps</h2>
                    </div>
                    <button 
                      onClick={() => setIsAddingPump(!isAddingPump)}
                      className="text-sm font-bold text-blue-600 hover:underline"
                    >
                      {isAddingPump ? 'Cancel' : '+ Add Pump'}
                    </button>
                  </div>

                  {isAddingPump && (
                    <form onSubmit={handleAddPump} className="p-6 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">Station</label>
                          <select 
                            required
                            value={pumpForm.station_id}
                            onChange={(e) => setPumpForm(prev => ({ ...prev, station_id: e.target.value, tank_id: '' }))}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
                          <label className="text-xs font-bold text-gray-500 uppercase">Source Tank</label>
                          <select 
                            required
                            disabled={!pumpForm.station_id}
                            value={pumpForm.tank_id}
                            onChange={(e) => setPumpForm(prev => ({ ...prev, tank_id: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                          >
                            <option value="">Select Tank</option>
                            {tanks.filter(t => t.station_id === pumpForm.station_id).length > 0 ? (
                              tanks.filter(t => t.station_id === pumpForm.station_id).map(t => (
                                <option key={t.id} value={t.id}>
                                  {t.name || `${t.fuel_products?.name || 'Unknown Product'} Tank`}
                                </option>
                              ))
                            ) : (
                              <option disabled>No tanks found for this station.</option>
                            )}
                          </select>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase">Pump Name</label>
                          <input 
                            type="text"
                            required
                            value={pumpForm.name}
                            onChange={(e) => setPumpForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. Pump 1"
                          />
                        </div>
                      </div>
                      <button 
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Pump'}
                      </button>
                    </form>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pumps.map(pump => (
                      <div key={pump.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Fuel className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{pump.name}</p>
                            <p className="text-xs text-gray-500">{pump.stations?.name} • {pump.tanks?.fuel_products?.name}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          pump.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {pump.status}
                        </span>
                      </div>
                    ))}
                    {pumps.length === 0 && !isAddingPump && (
                      <div className="md:col-span-2 text-center py-8 text-gray-500 italic">
                        No pumps added yet. Add a pump to start recording sales.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="lubricants"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Add New Lubricant</h2>
                </div>

                <form onSubmit={handleAddLubricant} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Product Name</label>
                      <input 
                        type="text"
                        required
                        value={lubeName}
                        onChange={(e) => setLubeName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Shell Helix 5W-30"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Category</label>
                      <select 
                        required
                        value={lubeCategory}
                        onChange={(e) => setLubeCategory(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Category</option>
                        <option value="Engine Oil">Engine Oil</option>
                        <option value="Motor Oil">Motor Oil</option>
                        <option value="Lubricant">Lubricant</option>
                        <option value="Brake Fluid">Brake Fluid</option>
                        <option value="Coolant">Coolant</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Unit Price (KES)</label>
                      <input 
                        type="number"
                        required
                        value={lubePrice}
                        onChange={(e) => setLubePrice(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Product'}
                  </button>
                </form>

                <div className="mt-8 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Current Catalog</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {lubricants.map(lube => (
                      <div key={lube.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div>
                          <p className="font-bold text-gray-900">{lube.name}</p>
                          <p className="text-xs text-gray-500">{lube.category}</p>
                        </div>
                        <p className="font-bold text-blue-600">KES {lube.unit_price}</p>
                      </div>
                    ))}
                    {lubricants.length === 0 && (
                      <p className="text-center py-4 text-gray-500 italic text-sm">No lubricants in catalog.</p>
                    )}
                  </div>
                </div>
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
                className="mt-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-700"
              >
                <CheckCircle2 className="w-5 h-5" />
                Action completed successfully!
              </motion.div>
            )}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700"
              >
                <AlertCircle className="w-5 h-5" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Info/Help Section */}
        <div className="space-y-6">
          <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-100">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Settings className="w-6 h-6" /> Management Tips
            </h3>
            <ul className="space-y-4 text-blue-50 text-sm">
              <li className="flex gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold">1</div>
                <p>Updating a price creates a new record in the history. The Operations module always fetches the most recent "Effective From" price.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold">2</div>
                <p>Recording a delivery instantly updates the tank's current level. Real-time alerts will disappear once the level is above the threshold.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold">3</div>
                <p>Ensure you select the correct tank for deliveries to maintain accurate inventory reconciliation.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold">4</div>
                <p>Assign managers to specific stations to help track responsibility and performance across your network.</p>
              </li>
            </ul>
          </div>

          <div className="bg-white p-5 md:p-8 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" /> System Activity
            </h3>
            <div className="space-y-6">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div key={log.id} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                      <div className="w-px flex-1 bg-gray-100 my-1 group-last:hidden" />
                    </div>
                    <div className="flex-1 pb-6 group-last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                          {log.action.replace(/_/g, ' ')}
                        </p>
                        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {log.action === 'PRICE_UPDATE' && (
                          <>
                            Updated <span className="font-bold">{log.details.product}</span> price at <span className="font-bold">{log.details.station}</span> to <span className="font-bold">KES {log.details.new_price}</span>
                            {log.details.old_price !== null && log.details.old_price !== undefined && (
                              <span className="text-xs text-gray-400 ml-1">(was KES {log.details.old_price})</span>
                            )}
                          </>
                        )}
                        {log.action === 'DELIVERY_RECORDED' && (
                          <>
                            {log.details.type === 'LUBRICANT' ? (
                              <>Restocked <span className="font-bold">{log.details.quantity} units</span> of <span className="font-bold">{log.details.product}</span> at <span className="font-bold">{log.details.station}</span></>
                            ) : (
                              <>Recorded <span className="font-bold">{log.details.liters}L</span> of <span className="font-bold">{log.details.product}</span> delivery at <span className="font-bold">{log.details.station}</span></>
                            )}
                          </>
                        )}
                        {log.action === 'STATION_UPDATED' && (
                          <>Updated details for <span className="font-bold">{log.details.station_name}</span></>
                        )}
                        {log.action === 'STATION_ADDED' && (
                          <>Added new station <span className="font-bold">{typeof log.details === 'string' ? log.details.replace('Added new station: ', '') : log.details.name}</span></>
                        )}
                        {log.action === 'STAFF_PROFILE_UPDATED' && (
                          <>Updated profile for <span className="font-bold">{log.details.full_name}</span> ({log.details.role})</>
                        )}
                        {log.action === 'SALE_RECORDED' && (
                          <>
                            {log.details.type === 'LUBRICANT' ? (
                              <>Sold <span className="font-bold">{log.details.quantity} units</span> of <span className="font-bold">{log.details.product}</span> at <span className="font-bold">{log.details.station}</span> for <span className="font-bold">KES {log.details.amount.toLocaleString()}</span></>
                            ) : (
                              <>Recorded sale of <span className="font-bold">{log.details.liters}L</span> of <span className="font-bold">{log.details.product}</span> at <span className="font-bold">{log.details.station}</span> for <span className="font-bold">KES {log.details.amount.toLocaleString()}</span></>
                            )}
                          </>
                        )}
                        {log.action === 'LUBRICANT_ADDED' && (
                          <>Added new lubricant <span className="font-bold">{log.details.name}</span> to the catalog at <span className="font-bold">KES {log.details.price}</span></>
                        )}
                        {log.action === 'TANK_ADDED' && (
                          <>Added new tank for <span className="font-bold">{log.details.product}</span> at <span className="font-bold">{log.details.station}</span> (Cap: {log.details.capacity}L)</>
                        )}
                        {log.action === 'PUMP_ADDED' && (
                          <>Added new pump <span className="font-bold">{log.details.pump_name}</span> at <span className="font-bold">{log.details.station}</span> connected to <span className="font-bold">{log.details.tank}</span></>
                        )}
                        {log.action === 'STAFF_MEMBER_ADDED' && (
                          <>Added new staff member <span className="font-bold">{log.details.full_name || log.details.email}</span></>
                        )}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
                        <User className="w-3 h-3" /> {log.profiles?.full_name || log.profiles?.email}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic text-center py-4">No recent activity recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
