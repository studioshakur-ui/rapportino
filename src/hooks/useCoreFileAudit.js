// src/hooks/useCoreFileAudit.js
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

async function fetchCoreFileAudit(coreFileId) {
  if (!coreFileId) return [];

  const { data, error } = await supabase
    .from('core_file_audit')
    .select('*')
    .eq('core_file_id', coreFileId)
    .order('performed_at', { ascending: false });

  if (error) {
    console.error('Error fetching core_file_audit', error);
    throw error;
  }

  return data ?? [];
}

export function useCoreFileAudit(coreFileId) {
  return useQuery({
    queryKey: ['core_file_audit', coreFileId],
    queryFn: () => fetchCoreFileAudit(coreFileId),
    enabled: !!coreFileId,
    staleTime: 60_000,
  });
}
