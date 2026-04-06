# PSMS Pro - Extensibility Guide

This guide explains how to add new features and extend the PSMS Pro application.

## 1. Adding a New View/Component
To add a new main view (e.g., "Loyalty Program"):
1.  **Create the Component**: Create a new file in `/src/components/Loyalty.tsx`.
2.  **Define the View Type**: In `App.tsx`, add the new view name to the `View` type definition.
3.  **Update Navigation**: Add a new `NavItem` in the `App` component's sidebar and mobile menu.
4.  **Render the View**: Add a case for the new view in the main content area's `switch` or conditional rendering block.

## 2. Database Updates (Supabase)
If your feature requires new data storage:
1.  **Create the Table**: Use the Supabase SQL Editor to create the new table.
2.  **Enable RLS**: Always enable Row Level Security on new tables.
3.  **Add Policies**: Define policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
4.  **Update Types**: If you use TypeScript interfaces for database rows, update them in the relevant component or a shared `types.ts` file.

## 3. Adding a New Service/Helper
For shared logic (e.g., "M-Pesa API Integration"):
1.  **Create the Service**: Create a new file in `/src/lib/mpesa.ts`.
2.  **Export Functions**: Export reusable functions for API calls or complex calculations.
3.  **Import & Use**: Import the service into your components.

## 4. UI Patterns to Follow
### Modals
Use the standard modal pattern for consistency:
```tsx
<AnimatePresence>
  {isOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !submitting && onClose()}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Modal Content */}
      </motion.div>
    </div>
  )}
</AnimatePresence>
```

### Tables
Tables should be responsive and styled with Tailwind:
- Use `overflow-x-auto` for the container.
- Use `divide-y divide-gray-50` for row separation.
- Use `hover:bg-gray-50` for interactive feedback.

### Forms
- Use `bg-gray-50 border border-gray-200 rounded-xl px-4 py-3` for inputs.
- Use `focus:ring-2 focus:ring-blue-500` for accessibility.
- Always include a `Loader2` spinner in the submit button when `submitting` is true.

## 5. Future Feature Ideas
- **M-Pesa STK Push Integration**: Automate mobile payments.
- **Inventory Alerts**: Email/SMS notifications when fuel levels are low.
- **Advanced Analytics**: Integration with D3.js or Recharts for deeper insights.
- **Multi-Currency Support**: For operations in different regions.
- **Offline Mode**: Using Service Workers and IndexedDB for areas with poor connectivity.
