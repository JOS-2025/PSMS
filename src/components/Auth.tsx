import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Fuel, Loader2, AlertCircle, Mail, Lock, Shield } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthProps {
  onShowPrivacy?: () => void;
}

export default function Auth({ onShowPrivacy }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      if (message.includes('Failed to fetch')) {
        setError('Connection error. Please check your internet connection and Supabase configuration.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 mb-4">
            <Fuel className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">PSMS Pro</h1>
          <p className="text-gray-500">Petrol Station Management System</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email Address
              </label>
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="name@company.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Password
              </label>
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        <div className="text-center space-y-4">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>

          <div className="pt-4 border-t border-gray-100">
            <button 
              onClick={onShowPrivacy}
              className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Shield className="w-3 h-3" /> Privacy Policy
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
