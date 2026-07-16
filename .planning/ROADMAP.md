# Roadmap: LWA - Link Legal Operations Portal

## Overview

Fixing 4 critical production bugs in the LWA application. The focus ranges from UI text contrast issues to Reports horizontal scroll, performance bottle-necks (repeated database round-trips/schema checks), and real-time user sync/polling.

## Phases

- [x] **Phase 1: UI Text Visibility and Dropdown Contrast** - Address blanket CSS override issues and unreadable dropdown native option backgrounds.
- [x] **Phase 2: Reports Table Horizontal Scroll** - Add vertical-to-horizontal wheel scroll conversion and improve scrollbar layout for wide tables.
- [x] **Phase 3: Performance Optimization** - Prevent cold-start migration checks, reduce redundant RPC session queries, and parallelize invoice fetches.
- [x] **Phase 4: Real-time User Data Sync** - Design and implement a synchronization mechanism/polling update system.

## Phase Details

### Phase 1: UI Text Visibility and Dropdown Contrast
**Goal**: Restore consistent contrast across themes and fix unreadable dropdown text in modals.
**Depends on**: Nothing (first phase)
**Requirements**: UI-01, UI-02, UI-03
**Success Criteria**:
  1. Blanket overrides in `globals.css` are removed.
  2. Tailwind color classes (`.text-slate-X`, `.bg-slate-Y`) work correctly across dark/light themes.
  3. All `<option>` tags in dropdown modals are readable with consistent backgrounds and text.
**Plans**: 1 plan

Plans:
- [x] 01-01: Fix globals.css overrides, audit and resolve text/bg contrasts, and style native select options.

### Phase 2: Reports Table Horizontal Scroll
**Goal**: Make wide report tables easy to scroll horizontally using standard mouse wheel inputs.
**Depends on**: Phase 1
**Requirements**: UI-04, UI-05
**Success Criteria**:
  1. Scrolling vertically with a mouse wheel over the Table component triggers horizontal scroll if horizontal overflow exists.
  2. Scrollbar for wide tables is visible and grab-able with mouse users (e.g. 10px-12px thickness).
**Plans**: 1 plan

Plans:
- [x] 02-01: Implement onWheel horizontal scroll conversion in Table component and increase scrollbar thickness.

### Phase 3: Performance Optimization
**Goal**: Eliminate redundant database round-trips and parallelize boot fetches to speed up client load time.
**Depends on**: Phase 2
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria**:
  1. Cold starts and standard requests do not execute 24 sequential ALTER TABLE statements.
  2. RPC route does not run a redundant `getMySession` query on every individual action if it can be combined or cached.
  3. `getBootBundle` completes faster by running `getInvoices` in parallel with other fetches.
**Plans**: 1 plan

Plans:
- [x] 03-01: Optimize database schema migrations, cache/refactor RPC session query, and parallelize boot bundle calls.

### Phase 4: Real-time User Data Sync
**Goal**: Implement an efficient client sync mechanism to push updates to other users.
**Depends on**: Phase 3
**Requirements**: SYNC-01
**Success Criteria**:
  1. Logged-in users see updates from other users' mutations in a timely manner (under 120s, or instantly via focus/SSE).
**Plans**: 1 plan

Plans:
- [x] 04-01: Propose and implement sync improvements (focus/visibility refetch, faster polling, or SSE/real-time layer).

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. UI Text Visibility and Dropdown Contrast | 1/1 | Completed | 2026-07-16 |
| 2. Reports Table Horizontal Scroll | 1/1 | Completed | 2026-07-16 |
| 3. Performance Optimization | 1/1 | Completed | 2026-07-16 |
| 4. Real-time User Data Sync | 1/1 | Completed | 2026-07-16 |
