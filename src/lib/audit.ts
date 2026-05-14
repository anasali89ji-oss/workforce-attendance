import { supabaseAdmin } from './supabase'
import type { CurrentUser } from '@/types'

export async function logAudit(
  tenantId: string,
  action: string,
  entityType: string,
  entityId?: string,
  options?: {
    user?: CurrentUser | null
    oldValues?: Record<string, unknown>
    newValues?: Record<string, unknown>
    ipAddress?: string
  }
) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: options?.user?.id || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: options?.oldValues || null,
      new_values: options?.newValues || null,
      ip_address: options?.ipAddress || null,
    })
  } catch (err) {
    console.error('[Audit] Failed to log:', err)
  }
}
