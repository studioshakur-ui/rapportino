# SCHEMA CANONIQUE – CORE

## Principles
- This document is a **readable map**, not the technical truth
- The technical truth is `schema_snapshot.sql`
- Organized by functional modules

---

## MODULE: AUTH & PROFILES
### Tables
- profiles
  - id (uuid, PK)
  - role (enum)
  - display_name
  - created_at

---

## MODULE: SHIPS
### Tables
- ships
  - id (uuid, PK)
  - ship_code (unique)
  - name
  - costr
  - commessa

---

## MODULE: RAPPORTINO
### Tables
- rapportini
- rapportino_rows
- rapportino_files

### Views
- ufficio_rapportini_list_v1
- archive_rapportini_v1

---

## MODULE: INCA
### Tables
- inca_files
- inca_cavi
- inca_percorsi

---

## MODULE: NAVEMASTER
### Tables
- navemaster_files
- navemaster_imports

---

## RLS OVERVIEW
- Enabled on most business tables
- Disabled only where strictly required
