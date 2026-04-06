# Technical Documentation: Petrol Station Management System

This document provides a deep dive into the technical architecture, business logic, security protocols, and user experience design of the Petrol Station Management System.

---

## 1. Architecture: React & Supabase Integration

The application follows a **Serverless SPA (Single Page Application)** architecture, leveraging Supabase as a comprehensive Backend-as-a-Service (BaaS).

### Frontend (React + Vite)
- **State Management**: Uses React's built-in `useState` and `useEffect` hooks for local state. Global authentication state is managed via a dedicated `AuthContext`.
- **Real-time Synchronization**: The frontend utilizes Supabase's `onSnapshot` (PostgreSQL Change Data Capture) to listen for real-time updates in inventory levels and sales transactions.
- **API Communication**: Interaction with the database is handled through the `@supabase/supabase-js` client library, using standard RESTful queries that are automatically mapped to PostgreSQL tables.

### Backend (Supabase/PostgreSQL)
- **Database**: A relational PostgreSQL database stores all structured data.
- **Authentication**: Supabase Auth handles user identity, providing JWTs (JSON Web Tokens) that are passed with every database request to verify the user's identity.
- **Storage**: (Optional) Used for storing station logos or digital receipts.

---

## 2. Business Logic: Core Operations

The system's business logic is designed to mirror physical petrol station operations while enforcing financial accountability.

### Fuel Inventory & Tank Management
- **Automated Deduction**: Every `fuel_sale` record includes a `volume_litres` field. Upon insertion, the system (via frontend logic or database triggers) calculates the remaining volume in the linked `tanks` table.
- **Dip Reading Calibration**: To account for physical factors like evaporation or temperature-induced expansion, managers can enter "Dip Readings." This manual entry overrides the calculated digital inventory to reflect the actual physical stock.

### Pump Meter Reconciliation
- **The "Golden Rule"**: `(Closing Meter - Opening Meter) * Price = Expected Revenue`.
- **Variance Analysis**: The system compares the "Expected Revenue" (derived from physical pump meters) against the "Actual Recorded Sales" (entered by attendants). Any discrepancy is flagged as a **Variance**, which is critical for identifying theft, leaks, or unrecorded sales.

### Shift Management
- **Stateful Shifts**: A shift can be `Open` or `Closed`. The system prevents any sales from being recorded unless an active shift is assigned to the current user.
- **Reconciliation Workflow**: Closing a shift requires the attendant to report total cash, mobile money, and card payments. This "Declared Total" is then reconciled against the system's "Calculated Total" before the shift can be finalized.

---

## 3. Security: RLS & Role Management

Security is baked into the database layer using PostgreSQL **Row Level Security (RLS)**.

### Row Level Security (RLS)
- **Isolation**: RLS policies ensure that users can only see data belonging to their specific station. Even though multiple stations might share the same database tables, the `station_id` filter is enforced at the database level.
- **Policy Examples**:
    - `SELECT`: Allowed for authenticated users linked to the station.
    - `INSERT/UPDATE`: Restricted based on user roles (e.g., only Admins can update fuel prices).

### User Role Management
- **Admin**: Full access to settings, pricing, audit logs, and financial reports.
- **Staff/Attendant**: Restricted to recording sales, opening/closing their own shifts, and viewing their personal transaction history.
- **Audit Logging**: Every sensitive action (price changes, inventory overrides, shift deletions) is recorded in an `audit_logs` table with a timestamp and the user's ID.

---

## 4. User Experience: Manager Dashboard Flow

The UX is designed for high-pressure environments where speed and clarity are paramount.

### The Manager's Daily Flow:
1.  **Morning Overview**: The dashboard displays "Current Tank Levels" and "Active Shifts" at a glance.
2.  **Monitoring**: Real-time sales widgets show the "Sales Velocity" throughout the day.
3.  **Exception Handling**: If a tank hits a low-level threshold, a visual alert (red badge) appears on the sidebar.
4.  **End-of-Day**: The manager navigates to the "Reports" section to review the "Shift Reconciliation" and "Daily Variance" reports before officially closing the day's books.

---

## 5. Roadmap: Future Enhancements

The system is built to be extensible for the next generation of station management.

### Short-Term (Integration)
- **M-Pesa API Integration**: Automating the verification of mobile money payments directly within the sales flow to prevent "fake SMS" fraud.
- **Digital Receipts**: Sending automated receipts to customers via WhatsApp or Email.

### Long-Term (Automation)
- **IoT Hardware Sensors**: Integrating with digital tank gauges (ATG) to automate dip readings in real-time without manual intervention.
- **Predictive Analytics**: Using historical sales data to predict when fuel stocks will run out, allowing for automated re-ordering from suppliers.
- **Multi-Station Dashboard**: A "Bird's Eye View" for owners with multiple locations, allowing for cross-station performance comparisons.
