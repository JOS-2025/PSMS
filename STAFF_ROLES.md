# Staff Roles and Permissions Matrix

This document outlines the access levels, responsibilities, and restrictions for the different user roles within the Petrol Station Management System (PSMS Pro).

---

## 1. Admin (Administrator)
The **Admin** has full, unrestricted access to the entire system across all stations. This role is intended for the business owner or top-level management.

### **Key Responsibilities:**
*   **Global Configuration**: Manage system-wide settings, currencies, and tax rates.
*   **Station Management**: Create, edit, or delete petrol stations and their infrastructure (tanks, pumps, nozzles).
*   **Staff Oversight**: Add, edit, or remove any staff member (including other Admins and Managers).
*   **Financial Auditing**: Access deep financial analytics, profit/loss reports, and full audit logs for every transaction.
*   **Price Control**: Set and update fuel prices for any station.

### **Restrictions:**
*   **None**: The Admin can perform any action within the application.

---

## 2. Manager
The **Manager** is responsible for the day-to-day oversight of a specific station. They bridge the gap between high-level administration and ground-level operations.

### **Key Responsibilities:**
*   **Inventory Control**: Manage fuel tank levels, receive fuel deliveries, and oversee lubricant stock.
*   **Shift Supervision**: Review and approve shifts closed by attendants. Reconcile cash and volume discrepancies.
*   **Station Reporting**: View daily, weekly, and monthly reports specifically for their assigned station.
*   **Customer Management**: Manage credit customers, set credit limits, and record payments.
*   **Expense Approval**: Record and monitor station-specific expenses.

### **Restrictions:**
*   **No Global Settings**: Cannot change system-wide configurations (e.g., currency, timezone).
*   **Limited Staff Management**: Can view staff but cannot create new Admin accounts or delete other Managers.
*   **Station-Locked**: Access is typically restricted to the data of their assigned station (unless granted "Global" access).
*   **No System Deletion**: Cannot delete a station or its core infrastructure (tanks/pumps) once created.

---

## 3. Attendant
The **Attendant** is the front-line user focused on sales and shift operations. Their access is strictly limited to operational tasks.

### **Key Responsibilities:**
*   **Shift Operations**: Open and close their own shifts. Record opening/closing meter readings and cash on hand.
*   **Sales Entry**: Record every fuel and lubricant sale in real-time.
*   **Expense Recording**: Log small, authorized station expenses incurred during their shift.
*   **Meter Reconciliation**: Ensure physical pump readings match the digital sales records.

### **Restrictions:**
*   **No Price Editing**: Can see the current price but cannot modify it.
*   **No Record Deletion**: Cannot delete or "void" a sale once submitted. Corrections must be handled by a Manager.
*   **No Inventory Management**: Cannot record fuel deliveries or manually adjust tank levels.
*   **No Staff Access**: Cannot see the "Staff" or "Management" modules.
*   **No Financial Analytics**: Cannot see station-wide profit/loss or sensitive financial reports.
*   **Shift-Locked**: Cannot perform sales operations without an active, open shift assigned to them.

---

## Summary Table

| Feature | Admin | Manager | Attendant |
| :--- | :---: | :---: | :---: |
| **Record Sales** | ✅ | ✅ | ✅ |
| **Manage Shifts** | ✅ | ✅ | ✅ (Own Only) |
| **View Station Reports** | ✅ | ✅ | ❌ |
| **Manage Inventory** | ✅ | ✅ | ❌ |
| **Update Fuel Prices** | ✅ | ✅ | ❌ |
| **Add/Edit Staff** | ✅ | ❌ | ❌ |
| **Global Settings** | ✅ | ❌ | ❌ |
| **Delete Stations/Data** | ✅ | ❌ | ❌ |
| **Audit Logs** | ✅ | ✅ (Station) | ❌ |

---

## Security Enforcement
These roles are enforced through:
1.  **Row Level Security (RLS)**: Database-level policies in Supabase that prevent unauthorized data access even if the API is called directly.
2.  **UI Conditional Rendering**: The React frontend hides buttons, tabs, and navigation links that do not match the user's role.
3.  **Audit Logging**: Every sensitive action is recorded with the user's ID, providing a permanent trail for accountability.
