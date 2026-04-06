import React from 'react';
import { motion } from 'motion/react';
import { FileText, ArrowLeft, Shield, Lock, CheckCircle } from 'lucide-react';

interface TermsAndConditionsProps {
  onBack?: () => void;
}

export default function TermsAndConditions({ onBack }: TermsAndConditionsProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
    >
      {/* Header */}
      <div className="p-8 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Terms and Conditions</h1>
            <p className="text-sm text-gray-500 font-medium">Last Updated: April 6, 2026</p>
          </div>
        </div>
        {onBack && (
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-white hover:text-blue-600 rounded-xl transition-all font-semibold border border-transparent hover:border-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-8 space-y-12">
        {/* Section 1 */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-blue-600">
            <Shield className="w-5 h-5" />
            <h2 className="text-lg font-bold uppercase tracking-wider">1. Acceptance of Terms</h2>
          </div>
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <p className="text-gray-600 leading-relaxed">
              By accessing or using the PSMS Pro application, you agree to be bound by these Terms and Conditions. 
              These terms govern your use of our petrol station management services, including fuel tracking, 
              inventory management, and staff reporting.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-blue-600">
            <Lock className="w-5 h-5" />
            <h2 className="text-lg font-bold uppercase tracking-wider">2. Data Privacy & Security</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
              <h3 className="font-bold text-blue-900 mb-2">Supabase Security</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                We utilize Supabase's enterprise-grade security infrastructure. Your data is protected by 
                Row Level Security (RLS), ensuring that each user can only access data they are explicitly 
                authorized to see.
              </p>
            </div>
            <div className="bg-green-50/50 rounded-2xl p-6 border border-green-100">
              <h3 className="font-bold text-green-900 mb-2">Encrypted Storage</h3>
              <p className="text-sm text-green-800 leading-relaxed">
                All sensitive information, including authentication tokens and business metrics, is stored 
                using industry-standard encryption protocols.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-blue-600">
            <CheckCircle className="w-5 h-5" />
            <h2 className="text-lg font-bold uppercase tracking-wider">3. User Responsibilities</h2>
          </div>
          <ul className="space-y-3">
            {[
              'Maintaining the confidentiality of your login credentials.',
              'Ensuring all entered fuel and inventory data is accurate.',
              'Reporting any unauthorized access to your account immediately.',
              'Using the system solely for legitimate business management purposes.'
            ].map((item, index) => (
              <li key={index} className="flex items-start gap-3 text-gray-600">
                <div className="mt-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-blue-600">
            <Shield className="w-5 h-5" />
            <h2 className="text-lg font-bold uppercase tracking-wider">4. Limitation of Liability</h2>
          </div>
          <div className="bg-red-50/30 rounded-2xl p-6 border border-red-100/50">
            <p className="text-sm text-gray-600 leading-relaxed italic">
              PSMS Pro is provided "as is" without any warranties. While we strive for 100% uptime and 
              data accuracy, we are not liable for any business losses resulting from system downtime 
              or data entry errors by staff.
            </p>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="p-8 bg-gray-50 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-500">
          Questions about our terms? Contact us at <span className="text-blue-600 font-bold">legal@psmspro.com</span>
        </p>
      </div>
    </motion.div>
  );
}
