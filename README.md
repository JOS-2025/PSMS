# Petrol Station Management System (PSMS Pro)

A comprehensive, production-ready management system for petrol stations, built with React, Vite, and Supabase.

## 🚀 Features

- **Real-time Dashboard**: Monitor sales velocity, tank levels, and active shifts at a glance.
- **Shift Operations**: Secure opening/closing of shifts with meter reconciliation.
- **Inventory Management**: Track fuel tanks and lubricant stock with automated deductions.
- **Staff Management**: Role-based access control (Admin, Manager, Attendant).
- **Financial Reporting**: Daily variance reports, expense tracking, and credit management.
- **Audit Logging**: Every sensitive action is recorded for accountability.
- **Mobile Responsive**: Fully functional on mobile, tablet, and desktop.

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion.
- **Backend**: Supabase (PostgreSQL, Auth, RLS).
- **Icons**: Lucide React.
- **Notifications**: Sonner.
- **Charts**: Recharts.

## 📦 Deployment (Vercel)

1. **Environment Variables**:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
   - `GEMINI_API_KEY`: (Optional) For AI features.

2. **Supabase Setup**:
   - Run the provided SQL scripts in your Supabase SQL Editor.
   - Enable Google Auth or Email Auth in Supabase settings.
   - Add your Vercel URL to the Auth Redirect URLs.

## 📖 Documentation

- [Technical Documentation](./TECHNICAL_DOCUMENTATION.md)
- [Staff Roles & Permissions](./STAFF_ROLES.md)
- [Development Plan](./plan.md)

## 📄 License

MIT License.
