# Phase 3: Performance Optimization - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

## Phase Boundary

Resolve performance bottlenecks by reducing redundant database calls, schema verification overhead, and parallelizing API queries.

## Implementation Decisions

### Schema Migration Fix
- Avoid executing multiple `ALTER TABLE` statements on every serverless function invocation.
- Convert the in-memory promise `ensureSettingsTable` check into a one-time check or store a version/flag in the database, or check only once during startup if the db migration script isn't run offline. Wait, let's review the code to see if we can use a table to track if migrations have run, or simply cache it globally in a way that is persistent or runs only once.

### RPC Session Caching/Optimization
- Reduce `getMySession(token)` DB calls on every single RPC action.
- If possible, verify if the session check can be cached in a global/in-memory Map using the token as key, or if we can run it once per request.

### Boot Bundle Parallelization
- Fold `getInvoices` query into the parallel `Promise.all` inside `getBootBundle` in `app/lib/api/dashboard.js`.

## Canonical References

- `app/lib/api/dashboard.js` — Location of `getBootBundle()`.
- `app/lib/api/core.js` — Location of `ensureSettingsTable()`.
- `app/api/rpc/route.js` — Location of RPC session validation.
