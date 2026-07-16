# LWA - Link Legal Operations Portal

## What This Is

An enterprise operations management dashboard for Dentons Link legal. It tracks projects, vendors, purchase orders, invoices, payments, and weekly progress reports (WPR).

## Core Value

To streamline vendor procurement, payments, and weekly progress reporting with robust approval workflows.

## Current Milestone: v1.0 production-bug-fixes

**Goal:** Fix 4 known production bugs in the LWA app (UI text visibility, reports scroll, performance, live data sync).

**Target features:**
- UI text visibility and themed dropdowns (Phase 1)
- Reports table horizontal scroll behavior (Phase 2)
- Performance optimization and query/fetch reduction (Phase 3)
- Live data sync/polling improvements (Phase 4)

## Requirements

### Validated

- ✓ User Authentication & Role Management (procurement, maker, finance, accountant, director) — v0.1
- ✓ Purchase Order (PO) creation, tracking, and approval engine — v0.1
- ✓ Invoice uploading and tracking — v0.1
- ✓ Payments scheduling, execution, and split-payment handling — v0.1
- ✓ Vendors directory and onboarding — v0.1
- ✓ Project master and site details — v0.1
- ✓ Weekly Progress Report (WPR) view and PPTX exporting — v0.1 / v1.0
- ✓ **UI-01**: Remove blanket CSS override on `.text-slate-100/200/300/400` and `.bg-slate-800/900/950` — v1.0
- ✓ **UI-02**: Audit components and replace raw color overrides with theme-aware tokens — v1.0
- ✓ **UI-03**: Style raw `<option>` elements with explicit background/text colors or replace with themed Select component — v1.0
- ✓ **UI-04**: Add vertical-to-horizontal wheel scroll handler to Table component — v1.0
- ✓ **UI-05**: Increase scrollbar thickness/visibility for wide-table containers — v1.0
- ✓ **PERF-01**: Move ALTER TABLE schema checks to a one-time migration or persisted database flag — v1.0
- ✓ **PERF-02**: Reduce redundant session lookups in RPC route — v1.0
- ✓ **PERF-03**: Parallelize invoice fetches with other KPI/master data in `getBootBundle()` — v1.0
- ✓ **SYNC-01**: Implement low-effort or real-time sync mechanism (focus/visibility refetch + fast polling) — v1.0

### Active

(No active requirements. Milestone complete.)

### Out of Scope

(None yet)

## Context

- Next.js web application using React, SQLite database, custom CSS/Tailwind, and libraries like jspdf, pptxgenjs, tesseract.js.
- Contains direct Tally integration and WhatsApp notification scripts.

## Constraints

- **Stack**: Next.js, React, SQLite.
- **Environment**: Local dev server, deployable to Vercel/Railway.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite database | Lightweight local storage for dev/testing | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-16 after manual bootstrap*
