# Phase 1: UI Text Visibility and Dropdown Contrast - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

## Phase Boundary

Resolve UI text visibility bugs, contrast issues caused by blanket CSS overrides in `app/globals.css`, and unreadable native dropdown select option lists.

## Implementation Decisions

### UI Text & CSS Overrides
- Remove blanket CSS overrides remapping Tailwind classes `.text-slate-100/200/300/400` and `.bg-slate-800/900/950` in `app/globals.css`.
- Restore standard Tailwind utility class behaviors.
- Ensure all component-level styles use theme-aware tokens (`text-foreground`, `text-muted-foreground`, `bg-card`, etc.) to maintain contrast in both light and dark modes.

### Dropdown Option Contrast
- Explicitly style native `<option>` tags inside components (e.g., `VendorEditModal.js`, `InternalWhatsAppModal.js`, `VendorOnboardModal.js`, etc.) with `bg-background` and `text-foreground` to prevent browser-default background overrides, or replace them with the themed Select component.

## Canonical References

- `app/globals.css` — Global styles containing the overrides.
- `components/views/operations/wpr/WPRDetailView.js` — Example target for auditing color contrast.
