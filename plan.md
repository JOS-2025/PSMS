# Project Plan: Petrol Station Management System

This document outlines the development lifecycle and architectural decisions for the Petrol Station Management System, from initial concept to production readiness.

## 1. Project Overview
A comprehensive full-stack web application designed to streamline the operations of a petrol station. Key objectives include real-time inventory tracking, sales management, shift reconciliation, and detailed financial reporting.

## 2. Tech Stack
- **Frontend**: React 18 with Vite (TypeScript)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion (`motion/react`)
- **Icons**: Lucide React
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password)
- **State Management**: React Hooks (useState, useEffect, useMemo)
- **Notifications**: React Hot Toast

## 3. Database Architecture (Supabase/PostgreSQL)
The system relies on a relational schema designed for data integrity and auditability:
- `profiles`: User account details and roles (Admin/Staff).
- `stations`: Core station configuration (Currency, Tax, Timezone).
- `fuel_products`: Catalog of available fuels (Petrol, Diesel, etc.).
- `tanks`: Real-time inventory tracking for fuel.
- `pumps`: Mapping pumps to specific tanks.
- `fuel_sales`: Granular transaction records.
- `shifts`: Tracking staff activity and cash reconciliation.
- `lubricants` & `lubricant_inventory`: Non-fuel product management.
- `expenses`: Operational cost tracking.
- `meter_readings`: Daily pump meter logs for variance detection.
- `audit_logs`: System-wide activity tracking for security.

## 4. Development Phases

### Phase 1: Foundation & Authentication
- [x] Initialize Vite project with TypeScript and Tailwind CSS.
- [x] Configure Supabase client and environment variables.
- [x] Implement Auth flow (Login/Signup/Password Reset).
- [x] Create protected route wrappers and Auth context.

### Phase 2: Core Inventory & Station Setup
- [x] Build the Station Settings module for global configurations.
- [x] Implement Fuel Product and Tank management.
- [x] Create Pump configuration UI (linking pumps to tanks).
- [x] Develop real-time inventory monitoring dashboard widgets.

### Phase 3: Sales & Transactions
- [x] Design the Fuel Sales interface with real-time price fetching.
- [x] Implement Lubricant Sales module with inventory auto-deduction.
- [x] Build transaction history views with filtering and search.
- [x] Integrate payment method tracking (Cash, M-Pesa, Card).

### Phase 4: Shift Management & Expenses
- [x] Develop Shift "Open/Close" workflow for staff accountability.
- [x] Implement Expense tracking categorized by type (Utilities, Maintenance, etc.).
- [x] Create Shift Summary reports for daily reconciliation.

### Phase 5: Reporting & Analytics
- [x] Build interactive charts using D3/Recharts for sales trends.
- [x] Implement Pump Reconciliation reports (Meter vs. Actual Sales).
- [x] Develop Daily/Monthly financial summaries.
- [x] Create "Low Stock" alert system for tanks and lubricants.

### Phase 6: Security, Settings & Polish
- [x] Implement Row Level Security (RLS) in Supabase.
- [x] Build the Audit Log viewer for administrators.
- [x] Refine the UI/UX with Framer Motion transitions.
- [x] Add comprehensive error boundaries and toast notifications.
- [x] Finalize Account and Security settings (Password reset, Email updates).

## 5. Production Readiness
- **Security**: 
    - Enable RLS on all tables.
    - Implement strict validation in Database Functions (RPCs).
    - Use environment variables for all sensitive keys.
- **Performance**:
    - Optimize database queries with appropriate indexing.
    - Implement lazy loading for heavy components.
    - Use `useMemo` and `useCallback` to prevent unnecessary re-renders.
- **Deployment**:
    - Build optimized production assets (`npm run build`).
    - Deploy to Cloud Run / Vercel / Netlify.
    - Configure custom domain and SSL.

## 6. Future Roadmap
- [ ] Integration with hardware fuel sensors for automatic dip readings.
- [ ] Mobile application for field staff.
- [ ] Multi-station management dashboard for owners with multiple locations.
- [ ] Automated tax filing exports.
