// src/hooks/useCoreFiles.js
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

/**
 * Filtres utilisés :
 * {
 *   cantiere?: string;
 *   commessa?: string;
 *   categoria?: string[];
 *   origine?: string[];
 *   // statoDoc?: string[];  // NOTE : pour l'instant NON utilisé dans la requête
 *   text?: string;
 *   dateFrom?: string; // ISO date (YYYY-MM-DD)
 *   dateTo?: string;   // ISO date (YYYY-MM-DD)
 * }
 */

async function fetchCoreFiles(filters) {
  let query = supabase
    .from('core_files')
    .select('*')
    .order('created_at', { ascending: false });

  const {
    cantiere,
    commessa,
    categoria,
    origine,
    // statoDoc,
    text,
    dateFrom,
    dateTo,
  } = filters || {};

  if (cantiere) {
    query = query.eq('cantiere', cantiere);
  }

  if (commessa) {
    query = query.eq('commessa', commessa);
  }

  if (categoria && categoria.length > 0) {
    query = query.in('categoria', categoria);
  }

  if (origine && origine.length > 0) {
    query = query.in('origine', origine);
  }

  // ⚠️ IMPORTANT :
  // On NE filtre PAS sur stato_doc tant qu'on ne connaît pas la vraie liste enum.
  // if (statoDoc && statoDoc.length > 0) {
  //   query = query.in('stato_doc', statoDoc);
  // }

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  if (text && text.trim() !== '') {
    const t = `%${text.trim()}%`;
    // recherche sur filename, note, kpi_ref, claim_id
    query = query.or(
      `filename.ilike.${t},note.ilike.${t},kpi_ref.ilike.${t},claim_id.ilike.${t}`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('CORE Drive · errore Supabase core_files:', error);
    throw error;
  }

  return data ?? [];
}

/**
 * Hook principal pour CORE Drive.
 */
export function useCoreFiles(filters) {
  return useQuery({
    queryKey: ['core_files', filters],
    queryFn: () => fetchCoreFiles(filters),
    keepPreviousData: true,
  });
}
