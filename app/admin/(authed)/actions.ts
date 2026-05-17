'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

function parseIds(formData: FormData): string[] {
  const raw = formData.get('ids');
  if (typeof raw !== 'string' || !raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Passe N demandes en `status='archived'`. Réversible (les lignes
 * restent en base, juste filtrées de la liste par défaut).
 */
export async function archiveRequestsBulk(formData: FormData): Promise<void> {
  const ids = parseIds(formData);
  if (ids.length === 0) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('quote_requests')
    .update({ status: 'archived' })
    .in('id', ids);
  if (error) throw new Error(`Archivage : ${error.message}`);

  revalidatePath('/admin');
}

/**
 * Supprime définitivement N demandes. Action irréversible — la page
 * client demande confirmation avant de lancer.
 * Les `quotes` qui référencent ces requests ont `on delete set null`
 * en FK (cf. schema.sql), donc la suppression est safe.
 */
export async function deleteRequestsBulk(formData: FormData): Promise<void> {
  const ids = parseIds(formData);
  if (ids.length === 0) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('quote_requests')
    .delete()
    .in('id', ids);
  if (error) throw new Error(`Suppression : ${error.message}`);

  revalidatePath('/admin');
}
