# DATABASE CHANGELOG – CORE

## Format (mandatory)
- Date
- Author
- Business reason
- Technical change
- Migration file(s)
- Impact / Risk
- Rollback

---
## 2025-12-31
Author: Hamidou  
Reason: Ajout gestion Navemaster PDF  
Change: Added table navemaster_imports, indexes, RLS  
Migration: 20251231__add_navemaster_imports.sql  
Impact: Nouveau flux import PDF  
Rollback: Drop table navemaster_imports


## 2025-12-30
Author: Hamidou  
Reason: Introduce DB documentation and canonical snapshot  
Change: Added schema_snapshot.sql and documentation structure  
Migrations: none  
Impact: Documentation only  
Rollback: Remove docs folder

## 2025-12-30
Author: <your-name>
Reason: <business reason>
Change: <what changed>
Migration(s): <file(s) under supabase/migrations/>
Impact/Risk: <impact>
Rollback: <rollback plan>

## 2025-12-30
Author: <name>
Reason:
Change:
Migration:
Impact:
Rollback:

