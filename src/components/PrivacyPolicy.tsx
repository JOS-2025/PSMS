import React from 'react';
import { Shield, ArrowLeft, Lock, Eye, FileText, Globe, Bell } from 'lucide-react';
import { motion } from 'motion/react';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-blue-600 p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            {onBack && (
              <button 
                onClick={onBack}
                className="mb-6 flex items-center gap-2 text-blue-100 hover:text-white transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Application
              </button>
            )}
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
            </div>
            <p className="text-blue-100 max-w-2xl">
              Last Updated: April 5, 2026. Your privacy is our priority. This policy explains how we collect, use, and protect your data within the PSMS Pro platform.
            </p>
          </div>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl"></div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12 space-y-12">
          {/* Section 1 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Eye className="w-6 h-6" />
              <h2 className="text-xl font-bold text-gray-900">1. Information We Collect</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2">Personal Data</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  We collect information you provide directly to us, such as your name, email address, and professional role when you create an account or update your profile.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2">Operational Data</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  This includes data related to petrol station operations: sales records, inventory levels, staff shifts, and expense reports processed through the platform.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Lock className="w-6 h-6" />
              <h2 className="text-xl font-bold text-gray-900">2. How We Use Your Information</h2>
            </div>
            <ul className="space-y-3">
              {[
                'To provide, maintain, and improve our management services.',
                'To process transactions and generate operational reports.',
                'To send technical notices, updates, and security alerts.',
                'To monitor and analyze trends and usage in connection with our services.',
                'To personalize your experience and provide relevant content.'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-600 text-sm">
                  <div className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Globe className="w-6 h-6" />
              <h2 className="text-xl font-bold text-gray-900">3. Data Sharing and Security</h2>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              We do not sell your personal data. We only share information with third-party service providers (like Supabase for database hosting) who are necessary to provide our services. We implement industry-standard security measures, including encryption and secure authentication, to protect your data from unauthorized access.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <Bell className="w-6 h-6" />
              <h2 className="text-xl font-bold text-gray-900">4. Your Rights and Choices</h2>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              You have the right to access, update, or delete your personal information at any time through your account settings. If you have questions about your data, please contact your station administrator or our support team.
            </p>
          </section>

          {/* Footer Note */}
          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wider">
              <FileText className="w-4 h-4" /> PSMS Pro Platform Policy
            </div>
            <p className="text-gray-400 text-xs">
              &copy; 2026 Petrol Station Management System. All rights reserved.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
