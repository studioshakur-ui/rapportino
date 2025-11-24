import { supabase } from '../lib/supabaseClient'

/* ============ HELPERS ============ */

export function makeReportKey(date, capoId, roleKey) {
  return `${date}__${capoId}__${roleKey}`
}

/* ============ PROFILES ============ */
export async function ensureProfile(user) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (existing) return existing

  const full_name = (user.user_metadata?.full_name || user.email || '').toUpperCase()

  const { data, error } = await supabase
    .from('profiles')
    .insert([{ id: user.id, full_name, role: 'CAPO' }])
    .select()
    .single()

  if (error) throw error
  return data
}

/* ============ OPERATORS ============ */
export async function listOperators() {
  const { data, error } = await supabase.from('operators').select('*').order('name')
  if (error) throw error
  return data || []
}

export async function upsertOperator(op) {
  const { data, error } = await supabase.from('operators').upsert(op).select().single()
  if (error) throw error
  return data
}

/* ============ MODELS ============ */
export async function getModel(capoId, roleKey) {
  const { data, error } = await supabase
    .from('models')
    .select('*')
    .eq('capo_id', capoId)
    .eq('role_key', roleKey)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertModel(capoId, roleKey, righe) {
  const payload = { capo_id: capoId, role_key: roleKey, righe }
  const { data, error } = await supabase
    .from('models')
    .upsert(payload, { onConflict: 'capo_id,role_key' })
    .select()
    .single()

  if (error) throw error
  return data
}

/* ============ REPORTS ============ */
export async function getOrCreateReport({ date, capoId, capoName, roleKey }) {
  const { data: existing, error: e1 } = await supabase
    .from('reports')
    .select('*')
    .eq('report_date', date)
    .eq('capo_id', capoId)
    .eq('role_key', roleKey)
    .maybeSingle()

  if (e1) throw e1
  if (existing) return existing

  const { data, error } = await supabase
    .from('reports')
    .insert([{
      report_date: date,
      capo_id: capoId,
      capo_name: capoName,
      role_key: roleKey,
      status: 'DRAFT',
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function loadReportRows(reportId) {
  const { data, error } = await supabase
    .from('report_rows')
    .select('*')
    .eq('report_id', reportId)
    .order('order_index')

  if (error) throw error
  return data || []
}

export async function saveReportFull(reportId, reportPatch, rows) {
  const { error: e1 } = await supabase
    .from('reports')
    .update(reportPatch)
    .eq('id', reportId)

  if (e1) throw e1

  // replace rows: delete then insert (simple & safe)
  const { error: e2 } = await supabase
    .from('report_rows')
    .delete()
    .eq('report_id', reportId)

  if (e2) throw e2

  if (rows.length > 0) {
    const payload = rows.map((r, i) => ({
      report_id: reportId,
      order_index: i,
      categoria: r.categoria,
      descrizione: r.descrizione,
      assegnazioni: r.assegnazioni,
      operatori: r.operatori,
      tempo: r.tempo,
      previsto: r.previsto,
      prodotto: Number(r.prodotto || 0),
      note: r.note,
    }))
    const { error: e3 } = await supabase.from('report_rows').insert(payload)
    if (e3) throw e3
  }
}

export async function validateReportByCapo(reportId) {
  const { error } = await supabase
    .from('reports')
    .update({ status: 'VALIDATED_CAPO', validated_by_capo_at: new Date().toISOString() })
    .eq('id', reportId)

  if (error) throw error
}

export async function listArchivio(filters = {}) {
  let q = supabase.from('reports').select('*')
  if (filters.capo_id) q = q.eq('capo_id', filters.capo_id)
  if (filters.role_key) q = q.eq('role_key', filters.role_key)
  if (filters.status) q = q.eq('status', filters.status)
  const { data, error } = await q.order('report_date', { ascending: false })
  if (error) throw error
  return data || []
}

/* ============ UFFICIO ============ */
export async function approveByUfficio(reportId, ufficioUserId, ufficioName) {
  const { error } = await supabase
    .from('reports')
    .update({
      status: 'APPROVED_UFFICIO',
      approved_by_ufficio_at: new Date().toISOString(),
      approved_by_ufficio: ufficioUserId,
      ufficio_note: null,
    })
    .eq('id', reportId)

  if (error) throw error
  return true
}

export async function returnToCapo(reportId, ufficioUserId, note) {
  const { error } = await supabase
    .from('reports')
    .update({
      status: 'RETURNED',
      returned_by_ufficio_at: new Date().toISOString(),
      returned_by_ufficio: ufficioUserId,
      ufficio_note: note,
    })
    .eq('id', reportId)

  if (error) throw error
  return true
}

/* ============ CABLES ============ */
export async function loadCables(reportId) {
  const { data, error } = await supabase
    .from('cables')
    .select('*')
    .eq('report_id', reportId)
    .order('codice')
  if (error) throw error
  return data || []
}

export async function saveCables(reportId, cables) {
  const { error: e1 } = await supabase
    .from('cables')
    .delete()
    .eq('report_id', reportId)
  if (e1) throw e1

  if (cables.length > 0) {
    const payload = cables.map(c => ({
      report_id: reportId,
      codice: c.codice || '',
      descrizione: c.descrizione || '',
      metri_totali: Number(c.metriTotali || 0),
      percentuale: Number(c.percentuale || 0),
      metri_posati: Number(c.metriPosati || 0),
      source_file: c.sourceFile || '',
    }))
    const { error: e2 } = await supabase.from('cables').insert(payload)
    if (e2) throw e2
  }
}

/* ============ PATTERNS ============ */
export async function bumpPattern({ capoId, roleKey, commessa, descrizione, opsKey, ops }) {
  const { data: existing } = await supabase
    .from('patterns')
    .select('*')
    .eq('capo_id', capoId)
    .eq('role_key', roleKey)
    .eq('commessa', commessa)
    .eq('descrizione', descrizione)
    .eq('ops_key', opsKey)
    .maybeSingle()

  if (!existing) {
    const { error } = await supabase.from('patterns').insert([{
      capo_id: capoId, role_key: roleKey, commessa, descrizione, ops_key: opsKey, ops, count: 1
    }])
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('patterns')
    .update({ count: existing.count + 1, ops, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
  if (error) throw error
}

export async function listPatterns(capoId) {
  const { data, error } = await supabase
    .from('patterns')
    .select('*')
    .eq('capo_id', capoId)
  if (error) throw error
  return data || []
}

/* ============ OBJECTIVES ============ */
export async function listObjectives() {
  const { data, error } = await supabase.from('objectives').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createObjective(payload) {
  const { data, error } = await supabase.from('objectives').insert([payload]).select().single()
  if (error) throw error
  return data
}
