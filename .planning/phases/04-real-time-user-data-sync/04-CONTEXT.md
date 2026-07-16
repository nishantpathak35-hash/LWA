# Phase 4: Real-time User Data Sync - Context

**Gathered:** 2026-07-16
**Status:** Completed

## Phase Boundary

Implement an efficient client sync mechanism to push updates/refresh data when the user focuses the window or periodically every 30 seconds. Also integrate the PPTX exporting feature for Weekly Progress Reports (WPR).

## Implementation Decisions

### Focus/Visibility-Based Sync & Fast Polling
- Implement periodic auto-refresh every 30 seconds (down from 120 seconds) in `StateProvider.js`.
- Register window 'focus' and document 'visibilitychange' event listeners to trigger immediate data refresh when the page becomes active.

### PPTX Exporter Integration
- Install `pptxgenjs` and configure Next.js / Webpack fallback aliases for node modules like `fs`, `https`, `http`, etc.
- Build a browser-based PPTX generator that loads the slide deck template, parses and modifies slide placeholders (e.g. Project Name, dates), replaces media files (renders/actual images), and triggers a file download.

## Canonical References

- `components/StateProvider.js`
- `components/views/operations/wpr/WPRDetailView.js`
- `components/views/operations/wpr/wprPPTXExporter.js`
- `next.config.mjs`
