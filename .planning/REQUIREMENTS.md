# Requirements: LWA - Link Legal Operations Portal

**Defined:** 2026-07-16
**Core Value:** To streamline vendor procurement, payments, and weekly progress reporting with robust approval workflows.

## v1 Requirements

### UI & Contrast

- [ ] **UI-01**: Remove blanket CSS overrides on `.text-slate-100/200/300/400` and `.bg-slate-800/900/950` in globals.css.
- [ ] **UI-02**: Audit components using text/bg color classes and fix them at the source with theme-aware tokens (`text-foreground`, `text-muted-foreground`, `bg-card` etc.) to guarantee contrast.
- [ ] **UI-03**: Style raw `<option>` elements inside all modals (e.g. `VendorEditModal.js`, `InternalWhatsAppModal.js`, `VendorOnboardModal.js`, etc.) with explicit `bg-background` and `text-foreground` (or replace with themed Select component).
- [ ] **UI-04**: Add an `onWheel` handler on the Table wrapper in `components/ui/core.js` (or similar) to convert vertical mouse wheel scroll to horizontal scroll when the table has horizontal overflow.
- [ ] **UI-05**: Increase the horizontal scrollbar thickness/visibility for wide-table containers.

### Performance

- [ ] **PERF-01**: Convert the in-memory Promise-guarded `ALTER TABLE` checks into a one-time migration or a persisted database flag/table so migration checks do not run on every cold start / request.
- [ ] **PERF-02**: Cache or reduce the redundant `getMySession(token)` DB calls run on every RPC query/call in `app/api/rpc/route.js`.
- [ ] **PERF-03**: Run the `getInvoices` query in parallel (within the same `Promise.all` block) alongside other KPI and master data queries in `getBootBundle()`.

### Live Data Sync

- [ ] **SYNC-01**: Propose, confirm, and implement a suitable sync/polling mechanism to update other logged-in users with live mutation updates without relying on long 120-second polling or manually refreshing.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-tenant database partitioning | Out of scope for simple bug fixing milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01 | Phase 1 | Pending |
| UI-02 | Phase 1 | Pending |
| UI-03 | Phase 1 | Pending |
| UI-04 | Phase 2 | Pending |
| UI-05 | Phase 2 | Pending |
| PERF-01 | Phase 3 | Pending |
| PERF-02 | Phase 3 | Pending |
| PERF-03 | Phase 3 | Pending |
| SYNC-01 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-16*
*Last updated: 2026-07-16 after initial definition*
