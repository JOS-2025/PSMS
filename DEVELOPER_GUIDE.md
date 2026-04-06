# PSMS Pro - Developer Guide

This document provides an overview of the application's architecture, tech stack, and development patterns.

## 1. Tech Stack
- **Frontend**: React 18+ with Vite.
- **Language**: TypeScript.
- **Styling**: Tailwind CSS.
- **Icons**: Lucide React.
- **Animations**: Framer Motion (`motion/react`).
- **Notifications**: Sonner.
- **Backend/Database**: Supabase (PostgreSQL + Auth + Real-time).
- **State Management**: React Hooks (`useState`, `useEffect`, `useMemo`).

## 2. Project Structure
- `/src/App.tsx`: Main entry point, routing, and navigation.
- `/src/components/`: Reusable UI components and main views.
  - `Dashboard.tsx`: Overview stats and charts.
  - `Operations.tsx`: Main sales recording and shift management.
  - `Shifts.tsx`: Shift history and details.
  - `Inventory.tsx`: Fuel tank monitoring and dip readings.
  - `Lubricants.tsx`: Lubricant stock and sales management.
  - `Expenses.tsx`: Operational cost tracking.
  - `Credit.tsx`: Customer and credit transaction management.
  - `Reports.tsx`: Data analysis and daily summaries.
  - `Management.tsx`: Admin configuration for stations, pumps, and products.
  - `Staff.tsx`: User account management.
- `/src/lib/`:
  - `supabase.ts`: Supabase client initialization.
  - `audit.ts`: Service for logging system actions.
- `/src/index.css`: Global styles and Tailwind imports.

## 3. Database Schema Overview
The application uses a relational schema in Supabase:
- **`stations`**: Petrol station locations.
- **`fuel_products`**: Types of fuel (Petrol, Diesel, etc.).
- **`tanks`**: Physical fuel storage linked to stations and products.
- **`pumps`**: Dispensing units linked to tanks and stations.
- **`shifts`**: Core operational unit (staff_id, station_id, meter readings).
- **`fuel_sales`**: Individual fuel transactions.
- **`lubricants`**: Catalog of lubricant products.
- **`lubricant_inventory`**: Stock levels per station.
- **`lubricant_sales`**: Individual lubricant transactions.
- **`customers`**: Credit clients and their balances.
- **`credit_transactions`**: History of credit purchases and payments.
- **`expenses`**: Operational costs.
- **`audit_logs`**: System-wide activity tracking.

## 4. Key Development Patterns
### Real-time Updates
The application uses Supabase's real-time capabilities (via `onSnapshot` patterns or frequent polling in `useEffect`) to ensure data is always fresh.

### Modals & Forms
Forms are typically implemented within modals using `AnimatePresence` and `motion` for smooth transitions.

### Audit Logging
Every critical action (sales, shift changes, inventory updates) should call the `logAuditAction` helper to maintain a transparent history.

### Error Handling
- Use `try-catch` blocks for all database operations.
- Display user-friendly errors using `sonner` or inline error components.
- Log detailed errors to the console for debugging.

## 5. Security
- **Supabase Auth**: Handles user login and session management.
- **Row Level Security (RLS)**: Database access is controlled via RLS policies in Supabase.
- **Admin Checks**: Sensitive views (Management, Staff) are guarded by checking the user's role or email.
