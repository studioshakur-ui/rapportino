-- core_events.source_message_id et cable_events.source_message_id sont devenus
-- polymorphes : ils référencent soit whatsapp_messages (pipeline historique),
-- soit incoming_messages (pipeline Telegram actuel). Les FK mono-table vers
-- whatsapp_messages rejetaient tous les events Telegram (classify-incoming).
-- On les retire : les lignes existantes restent valides, et le lien
-- message → event reste assuré par incoming_messages.core_event_id.
-- (Appliqué en prod le 2026-06-10 ; ce fichier garde le repo aligné.)

alter table public.core_events
  drop constraint if exists core_events_source_message_id_fkey;

alter table public.cable_events
  drop constraint if exists cable_events_source_message_id_fkey;
