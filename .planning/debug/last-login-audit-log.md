---
status: fixing
trigger: "Last Login always shows Never & Audit Log not visible"
created: 2026-06-24T11:25:00+05:30
updated: 2026-06-24T11:25:00+05:30
---

# Debug Session: Last Login & Audit Log Issues

## Root Cause Analysis

### ISSUE 1 — Last Login Always Shows "Never"

**Root Cause Found:**

1. **No `last_login` column in `users` table schema** — The `setup-db.js` creates the users table WITHOUT a `last_login` column.
2. **`loginUser()` never updates `last_login`** — After successful authentication (line 157-210 in api.js), the function generates a token and returns it but NEVER updates any `last_login` timestamp in the database.
3. **`listUsersAdmin()` doesn't SELECT `last_login`** — The query at line 1238 only selects `email, name, roles, active, invite_token` — no `last_login` column.
4. **`listUsersAdmin()` return object doesn't include `lastLogin`** — The mapped return object (lines 1239-1246) has no `lastLogin` property.
5. **Frontend reads `u.lastLogin`** — SettingsView.js line 482 checks `u.lastLogin` which is always `undefined` → shows "never".

**Fix Plan:**
1. Add `last_login` column to users table (safe ALTER TABLE with try/catch).
2. Update `loginUser()` to SET `last_login = NOW()` after successful authentication.
3. Update `listUsersAdmin()` to SELECT and return `last_login` as `lastLogin`.
4. Log audit entry for login.

### ISSUE 2 — Audit Log Not Visible

**Root Cause Found:**

1. **No Audit Log UI component exists** — There is NO audit log view/tab anywhere in the frontend. The sidebar has no "Audit Log" menu entry.
2. **Backend function `listAuditLog()` exists** — At line 1950 in api.js, it correctly queries the `audit_logs` table.
3. **Audit writes ARE happening** — The `logAudit()` function is called from vendor ops, user ops, PO ops, etc.
4. **No frontend page calls `listAuditLog`** — Only a scratch test file references it.

**Fix Plan:**
1. Add an "Audit Log" tab inside Settings view (since it's an admin/director feature).
2. Implement audit log display with table, pagination, filtering, and sorting.
3. Ensure the backend returns all required fields.

## Current Focus
- hypothesis: Missing DB column + missing DB write for last_login; Missing frontend audit log component
- next_action: Implement fixes for both issues
