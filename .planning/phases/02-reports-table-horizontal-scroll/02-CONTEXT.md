# Phase 2: Reports Table Horizontal Scroll - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

## Phase Boundary

Improve usability of wide report tables on desktop/mouse environments by converting vertical wheel movement into horizontal scrolling (when horizontal overflow exists) and increasing scrollbar thickness.

## Implementation Decisions

### Wheel to Horizontal Scroll Conversion
- Add an `onWheel` event handler to the Table container div inside `components/ui/core.js`.
- If vertical scroll delta is non-zero, detect if horizontal overflow exists and adjust `scrollLeft` by `deltaY`.

### Scrollbar Styling
- Adjust `.overflow-x-auto` custom scrollbars in `app/globals.css` or container styles to increase scrollbar height/thickness (e.g. from 6px to 10px-12px) to make it easier to click and drag.

## Canonical References

- `components/ui/core.js` — Shared Table component container.
- `app/globals.css` — Custom scrollbar styles.
