import { supabase } from './supabase';

export type AuditAction = 
  | 'PRICE_UPDATE' 
  | 'DELIVERY_RECORDED' 
  | 'STAFF_PROFILE_UPDATED' 
  | 'STAFF_MEMBER_ADDED'
  | 'SALE_RECORDED'
  | 'STATION_ADDED'
  | 'STATION_UPDATED'
  | 'LUBRICANT_ADDED'
  | 'LUBRICANT_RESTOCKED'
  | 'LUBRICANT_RESTOCK'
  | 'LUBRICANT_SALE'
  | 'LUBRICANT_SALE_RECORDED'
  | 'EXPENSE_RECORDED'
  | 'DEMO_DATA_SEEDED'
  | 'METER_READING_RECORDED'
  | 'SHIFT_STARTED'
  | 'SHIFT_CLOSED'
  | 'TANK_ADDED'
  | 'PUMP_ADDED'
  | 'TANK_DIP_RECORDED';

export async function logAuditAction(
  action: AuditAction, 
  details: any,
  related_id?: string
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: session.user.id,
        action,
        details,
        related_id,
        timestamp: new Date().toISOString()
      });

    if (error) {
      // Fallback if related_id column is missing
      if (error.code === 'PGRST204' && error.message.includes('related_id')) {
        const { error: fallbackError } = await supabase
          .from('audit_logs')
          .insert({
            user_id: session.user.id,
            action,
            details,
            timestamp: new Date().toISOString()
          });
        if (fallbackError) {
          console.error('Failed to log audit action (fallback):', fallbackError);
        }
      } else {
        console.error('Failed to log audit action:', error);
      }
    }
  } catch (err) {
    console.error('Audit logging error:', err);
  }
}
