import React, { useState, useEffect } from 'react';
import Operations from './components/Operations';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Lubricants from './components/Lubricants';
import Management from './components/Management';
import Staff from './components/Staff';
import Shifts from './components/Shifts';
import Expenses from './components/Expenses';
import Credit from './components/Credit';
import Reports from './components/Reports';
import DailyReports from './components/DailyReports';
import Notifications from './components/Notifications';
import PrivacyPolicy from './components/PrivacyPolicy';
import Settings from './components/Settings';
import Auth from './components/Auth';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import { supabase, checkSupabaseConnection } from './lib/supabase';
import { 
  Fuel, 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  Users, 
  Package, 
  Droplets,
  LogOut, 
  Loader2, 
  User as UserIcon,
  ShieldCheck,
  Shield,
  Clock,
  AlertCircle,
  Receipt,
  CreditCard,
  BarChart3,
  Gauge,
  Menu,
  X
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'motion/react';

type View = 'dashboard' | 'operations' | 'inventory' | 'lubricants' | 'management' | 'staff' | 'shifts' | 'expenses' | 'credit' | 'reports' | 'daily-reports' | 'privacy' | 'auth' | 'settings';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'attendant' | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleEditStation = (stationId: string) => {
    setEditingStationId(stationId);
    setActiveView('management');
    setIsMobileMenuOpen(false);
  };

  const handleViewChange = (view: View) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const initApp = async () => {
      // Check connection first if configured
      const isConfigured = import.meta.env.VITE_SUPABASE_URL && 
                          !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');
      
      if (isConfigured) {
        const { success, error } = await checkSupabaseConnection();
        if (!success) {
          setConnectionError(error || 'Failed to connect to Supabase');
          setLoading(false);
          return;
        }
      }

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        if (session) {
          // Fetch user role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            setUserRole(profile.role as any);
          }
        } else {
          setUserRole(null);
        }
        setLoading(false);
      });

      return subscription;
    };

    let subscription: { unsubscribe: () => void } | undefined;
    initApp().then(sub => {
      subscription = sub;
    });

    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      if (subscription) subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6 border border-gray-100">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Connection Error</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              {connectionError}
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-100"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (activeView === 'privacy') {
    return (
      <ErrorBoundary>
        <PrivacyPolicy onBack={() => setActiveView(session ? 'dashboard' : 'auth')} />
        <Toaster position="top-right" richColors />
      </ErrorBoundary>
    );
  }

  const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && 
                             !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id') &&
                             import.meta.env.VITE_SUPABASE_ANON_KEY &&
                             import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-anon-key';

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6 border border-gray-100">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
            <SettingsIcon className="w-10 h-10 text-orange-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configuration Required</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Please set your Supabase environment variables in the Secrets panel to start using the application.
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl text-left space-y-2">
            <p className="text-xs font-mono text-gray-600">VITE_SUPABASE_URL</p>
            <p className="text-xs font-mono text-gray-600">VITE_SUPABASE_ANON_KEY</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <ErrorBoundary>
        <Auth onShowPrivacy={() => setActiveView('privacy')} />
        <Toaster position="top-right" richColors />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-gray-50 font-sans antialiased">
        {/* Mobile Header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 px-4 flex items-center justify-between z-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg shadow-md shadow-blue-100">
              <Fuel className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">PSMS Pro</span>
          </div>
          <div className="flex items-center gap-2">
            <Notifications />
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 hover:bg-gray-50 rounded-xl text-gray-600 transition-all"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="lg:hidden fixed inset-0 bg-white z-40 pt-20 p-6 flex flex-col"
            >
              <nav className="flex-1 space-y-1 overflow-y-auto">
                <NavItem 
                  icon={<LayoutDashboard className="w-5 h-5" />} 
                  label="Dashboard" 
                  active={activeView === 'dashboard'} 
                  onClick={() => handleViewChange('dashboard')}
                />
                <NavItem 
                  icon={<Fuel className="w-5 h-5" />} 
                  label="Shift Operations" 
                  active={activeView === 'operations'} 
                  onClick={() => handleViewChange('operations')}
                />
                <NavItem 
                  icon={<Package className="w-5 h-5" />} 
                  label="Inventory" 
                  active={activeView === 'inventory'} 
                  onClick={() => handleViewChange('inventory')}
                />
                <NavItem 
                  icon={<Droplets className="w-5 h-5" />} 
                  label="Lubricants" 
                  active={activeView === 'lubricants'} 
                  onClick={() => handleViewChange('lubricants')}
                />
                <NavItem 
                  icon={<Receipt className="w-5 h-5" />} 
                  label="Expenses" 
                  active={activeView === 'expenses'} 
                  onClick={() => handleViewChange('expenses')}
                />
                <NavItem 
                  icon={<CreditCard className="w-5 h-5" />} 
                  label="Credit" 
                  active={activeView === 'credit'} 
                  onClick={() => handleViewChange('credit')}
                />
                <NavItem 
                  icon={<BarChart3 className="w-5 h-5" />} 
                  label="Reports" 
                  active={activeView === 'reports'} 
                  onClick={() => handleViewChange('reports')}
                />
                <NavItem 
                  icon={<BarChart3 className="w-5 h-5" />} 
                  label="Daily Reports" 
                  active={activeView === 'daily-reports'} 
                  onClick={() => handleViewChange('daily-reports')}
                />
                <NavItem 
                  icon={<Clock className="w-5 h-5" />} 
                  label="Shifts" 
                  active={activeView === 'shifts'} 
                  onClick={() => handleViewChange('shifts')}
                />
                {(userRole === 'admin' || userRole === 'manager') && (
                  <>
                    <NavItem 
                      icon={<ShieldCheck className="w-5 h-5" />} 
                      label="Management" 
                      active={activeView === 'management'} 
                      onClick={() => handleViewChange('management')}
                    />
                    <NavItem 
                      icon={<Users className="w-5 h-5" />} 
                      label="Staff" 
                      active={activeView === 'staff'} 
                      onClick={() => handleViewChange('staff')}
                    />
                  </>
                )}
                <NavItem 
                  icon={<SettingsIcon className="w-5 h-5" />} 
                  label="Settings" 
                  active={activeView === 'settings'} 
                  onClick={() => handleViewChange('settings')}
                />
                <NavItem 
                  icon={<Shield className="w-5 h-5" />} 
                  label="Privacy Policy" 
                  active={activeView === ('privacy' as View)} 
                  onClick={() => handleViewChange('privacy')}
                />
              </nav>
              <div className="pt-6 border-t border-gray-100">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-semibold text-red-500 hover:bg-red-50 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar (Desktop Only) */}
        <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-gray-100 p-6 space-y-8 sticky top-0 h-screen">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
              <Fuel className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-extrabold text-gray-900 tracking-tight">PSMS Pro</span>
          </div>

          <nav className="flex-1 space-y-2">
            <NavItem 
              icon={<LayoutDashboard className="w-5 h-5" />} 
              label="Dashboard" 
              active={activeView === 'dashboard'} 
              onClick={() => handleViewChange('dashboard')}
            />
            <NavItem 
              icon={<Fuel className="w-5 h-5" />} 
              label="Shift Operations" 
              active={activeView === 'operations'} 
              onClick={() => handleViewChange('operations')}
            />
            <NavItem 
              icon={<Package className="w-5 h-5" />} 
              label="Inventory" 
              active={activeView === 'inventory'} 
              onClick={() => handleViewChange('inventory')}
            />
            <NavItem 
              icon={<Droplets className="w-5 h-5" />} 
              label="Lubricants" 
              active={activeView === 'lubricants'} 
              onClick={() => handleViewChange('lubricants')}
            />
            <NavItem 
              icon={<Receipt className="w-5 h-5" />} 
              label="Expenses" 
              active={activeView === 'expenses'} 
              onClick={() => handleViewChange('expenses')}
            />
            <NavItem 
              icon={<CreditCard className="w-5 h-5" />} 
              label="Credit" 
              active={activeView === 'credit'} 
              onClick={() => handleViewChange('credit')}
            />
            <NavItem 
              icon={<BarChart3 className="w-5 h-5" />} 
              label="Reports" 
              active={activeView === 'reports'} 
              onClick={() => handleViewChange('reports')}
            />
            <NavItem 
              icon={<BarChart3 className="w-5 h-5" />} 
              label="Daily Reports" 
              active={activeView === 'daily-reports'} 
              onClick={() => handleViewChange('daily-reports')}
            />
            <NavItem 
              icon={<Clock className="w-5 h-5" />} 
              label="Shifts" 
              active={activeView === 'shifts'} 
              onClick={() => handleViewChange('shifts')}
            />
            {(userRole === 'admin' || userRole === 'manager') && (
              <>
                <NavItem 
                  icon={<ShieldCheck className="w-5 h-5" />} 
                  label="Management" 
                  active={activeView === 'management'} 
                  onClick={() => handleViewChange('management')}
                />
                <NavItem 
                  icon={<Users className="w-5 h-5" />} 
                  label="Staff" 
                  active={activeView === 'staff'} 
                  onClick={() => handleViewChange('staff')}
                />
              </>
            )}
            <NavItem 
              icon={<SettingsIcon className="w-5 h-5" />} 
              label="Settings" 
              active={activeView === 'settings'} 
              onClick={() => handleViewChange('settings')}
            />
            <NavItem 
              icon={<Shield className="w-5 h-5" />} 
              label="Privacy Policy" 
              active={activeView === ('privacy' as View)} 
              onClick={() => handleViewChange('privacy')}
            />
          </nav>

          <div className="pt-6 border-t border-gray-100 space-y-4">
            <div className="flex items-center justify-between px-4 mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Alerts</span>
              <Notifications />
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{session.user.email}</p>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                  {userRole || 'Active Staff'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-semibold text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto pt-16 lg:pt-0">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {activeView === 'dashboard' && <Dashboard onEditStation={handleEditStation} />}
            {activeView === 'operations' && <Operations onEditStation={handleEditStation} user={session.user} />}
            {activeView === 'inventory' && <Inventory />}
            {activeView === 'lubricants' && <Lubricants user={session.user} />}
            {activeView === 'management' && (
              <Management 
                initialStationId={editingStationId} 
                onClearInitialStation={() => setEditingStationId(null)} 
              />
            )}
            {activeView === 'staff' && <Staff onEditStation={handleEditStation} />}
            {activeView === 'shifts' && <Shifts user={session.user} />}
            {activeView === 'expenses' && <Expenses user={session.user} />}
            {activeView === 'credit' && <Credit />}
            {activeView === 'reports' && <Reports />}
            {activeView === 'daily-reports' && <DailyReports />}
            {activeView === 'settings' && <Settings user={session.user} />}
            {activeView === ('privacy' as View) && <PrivacyPolicy onBack={() => setActiveView(session ? 'dashboard' : 'auth')} />}
          </div>
        </main>
        <Toaster position="top-right" richColors />
      </div>
    </ErrorBoundary>
  );
}

function NavItem({ icon, label, active = false, onClick }: { 
  icon: React.ReactNode, 
  label: string, 
  active?: boolean,
  onClick?: () => void
}) {
  return (
    <button 
      onClick={onClick}
      className={`
      flex items-center gap-3 w-full px-4 py-3 rounded-xl font-semibold transition-all
      ${active 
        ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-50' 
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
    `}>
      {icon}
      {label}
    </button>
  );
}
