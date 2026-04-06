import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Settings as SettingsIcon, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Coins, 
  Percent, 
  Save, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
  Shield,
  Bell,
  Lock,
  Key,
  LogOut,
  Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface StationSettings {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  tax_rate: number;
  timezone: string;
}

type SettingsTabType = 'profile' | 'localization' | 'security' | 'account' | 'notifications';

export default function Settings({ user }: { user: SupabaseUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTabType>('profile');
  const [settings, setSettings] = useState<StationSettings | null>(null);

  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          id: data.id,
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '', 
          email: data.email || '',
          currency: data.currency || 'KES',
          tax_rate: data.tax_rate || 16,
          timezone: data.timezone || 'Africa/Nairobi'
        });
      } else {
        setSettings({
          id: '',
          name: 'My Petrol Station',
          address: '',
          phone: '',
          email: '',
          currency: 'KES',
          tax_rate: 16,
          timezone: 'Africa/Nairobi'
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('stations')
        .upsert({
          id: settings.id || undefined,
          name: settings.name,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          currency: settings.currency,
          tax_rate: settings.tax_rate,
          timezone: settings.timezone,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user.email) return;
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      toast.success('Password reset link sent to your email');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to send reset link');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-gray-500">Manage your station configuration and account preferences</p>
        </div>
        {activeTab !== 'security' && activeTab !== 'account' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Navigation Tabs */}
        <div className="lg:col-span-1 space-y-2">
          <SettingsTab 
            icon={<Building2 className="w-5 h-5" />} 
            label="Station Profile" 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')}
          />
          <SettingsTab 
            icon={<Globe className="w-5 h-5" />} 
            label="Localization" 
            active={activeTab === 'localization'} 
            onClick={() => setActiveTab('localization')}
          />
          <SettingsTab 
            icon={<Shield className="w-5 h-5" />} 
            label="Security" 
            active={activeTab === 'security'} 
            onClick={() => setActiveTab('security')}
          />
          <SettingsTab 
            icon={<Bell className="w-5 h-5" />} 
            label="Notifications" 
            active={activeTab === 'notifications'} 
            onClick={() => setActiveTab('notifications')}
          />
          <SettingsTab 
            icon={<User className="w-5 h-5" />} 
            label="Account" 
            active={activeTab === 'account'} 
            onClick={() => setActiveTab('account')}
          />
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-8"
              >
                <section className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Station Profile</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Station Name</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={settings?.name}
                          onChange={(e) => setSettings(s => s ? { ...s, name: e.target.value } : null)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="Enter station name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Contact Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={settings?.email}
                          onChange={(e) => setSettings(s => s ? { ...s, email: e.target.value } : null)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="station@example.com"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Physical Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
                        <textarea
                          value={settings?.address}
                          onChange={(e) => setSettings(s => s ? { ...s, address: e.target.value } : null)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[100px]"
                          placeholder="Enter full address"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={settings?.phone}
                          onChange={(e) => setSettings(s => s ? { ...s, phone: e.target.value } : null)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="+254..."
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'localization' && (
              <motion.div 
                key="localization"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-8"
              >
                <section className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Globe className="w-5 h-5 text-orange-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Localization & Finance</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Currency</label>
                      <div className="relative">
                        <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                          value={settings?.currency}
                          onChange={(e) => setSettings(s => s ? { ...s, currency: e.target.value } : null)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                        >
                          <option value="KES">Kenyan Shilling (KES)</option>
                          <option value="USD">US Dollar (USD)</option>
                          <option value="EUR">Euro (EUR)</option>
                          <option value="GBP">British Pound (GBP)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Tax Rate (%)</label>
                      <div className="relative">
                        <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          value={settings?.tax_rate}
                          onChange={(e) => setSettings(s => s ? { ...s, tax_rate: parseFloat(e.target.value) } : null)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <div className="p-4 bg-blue-50 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-bold">Pro Tip</p>
                    <p>Changes to tax rates will only apply to new transactions and shift reports.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div 
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-8"
              >
                <section className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                    <div className="p-2 bg-red-50 rounded-lg">
                      <Shield className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm">
                          <Lock className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Password</p>
                          <p className="text-sm text-gray-500">Change your account password regularly</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleResetPassword}
                        disabled={passwordLoading}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2"
                      >
                        {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                        Reset via Email
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm">
                          <Fingerprint className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Two-Factor Authentication</p>
                          <p className="text-sm text-gray-500">Add an extra layer of security (Coming Soon)</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-gray-200 text-gray-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Disabled
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100 space-y-3">
                    <div className="flex items-center gap-2 text-red-700 font-bold">
                      <AlertCircle className="w-5 h-5" />
                      Security Recommendations
                    </div>
                    <ul className="text-sm text-red-600 space-y-1 list-disc list-inside">
                      <li>Use a unique password for this application</li>
                      <li>Never share your login credentials with anyone</li>
                      <li>Log out when using a public or shared device</li>
                      <li>Enable 2FA once it becomes available</li>
                    </ul>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'account' && (
              <motion.div 
                key="account"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-8"
              >
                <section className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Account Information</h2>
                  </div>

                  <div className="flex flex-col items-center gap-6 py-4">
                    <div className="relative">
                      <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-3xl font-bold text-blue-600 border-4 border-white shadow-lg">
                        {user.email?.[0].toUpperCase()}
                      </div>
                      <div className="absolute bottom-0 right-0 p-1.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-900">{user.email}</p>
                      <p className="text-sm text-gray-500">System Administrator</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Email Address</label>
                      <input
                        type="text"
                        value={user.email}
                        disabled
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">User ID</label>
                      <input
                        type="text"
                        value={user.id}
                        disabled
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 truncate cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Last Sign In</label>
                      <input
                        type="text"
                        value={user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}
                        disabled
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Account Created</label>
                      <input
                        type="text"
                        value={user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}
                        disabled
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100">
                    <button 
                      onClick={() => supabase.auth.signOut()}
                      className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out of All Devices
                    </button>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-8"
              >
                <section className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
                  </div>

                  <div className="space-y-4">
                    <NotificationToggle label="Email Alerts" description="Receive daily shift summaries via email" enabled />
                    <NotificationToggle label="Low Inventory Alerts" description="Notify when fuel levels drop below 15%" enabled />
                    <NotificationToggle label="Security Alerts" description="Notify on suspicious login attempts" enabled />
                    <NotificationToggle label="System Updates" description="Stay informed about new features and maintenance" />
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`
      flex items-center gap-3 w-full px-4 py-3 rounded-xl font-semibold transition-all
      ${active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}
    `}>
      {icon}
      {label}
    </button>
  );
}

function NotificationToggle({ label, description, enabled = false }: { label: string, description: string, enabled?: boolean }) {
  const [isOn, setIsOn] = useState(enabled);
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
      <div>
        <p className="font-bold text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button 
        onClick={() => setIsOn(!isOn)}
        className={`w-12 h-6 rounded-full transition-all relative ${isOn ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isOn ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
}
