---
status: resolved
trigger: "p.o table distorted when sending over email to vendor"
created: 2026-07-30
updated: 2026-07-30
---

# Debug Session: po-table-distorted-email-vendor

## Symptoms
- **Expected behavior**: Line items table in PO print / PDF preview has balanced, fixed column widths matching professional Purchase Order layout.
- **Actual behavior**: Line items table column widths are distorted (HSN/SAC column stretched excessively wide, while Rate/Amount/Qty columns are compressed/squished) when line descriptions are long.
- **Errors**: Layout distortion under browser auto-table calculation (`table-auto`).
- **Timeline**: Discovered during vendor PO email / print testing.
- **Reproduction**: Create PO with long line item description and view/print PO page.

## Current Focus
- **hypothesis**: `app/po/[poNo]/page.js` used `table-auto` with arbitrary pixel width classes (`w-8`, `w-20`, `w-12`, `w-14`, `w-24`, `w-28`), lacking `table-layout: fixed` and percentage column width allocations.
- **test**: Apply `tableLayout: 'fixed'`, set explicit column width percentages (`5%`, `43%`, `11%`, `7%`, `8%`, `13%`, `13%`), and add `wordBreak: 'break-word'` to description cells.
- **expecting**: Table columns stay perfectly proportioned regardless of description length.

## Evidence
- Screenshots show `HSN/SAC` column stretched wide and `Rate (INR)` / `Amount` squeezed together when description text is long.
- `app/po/[poNo]/page.js` table element lacked `table-fixed` / `tableLayout: 'fixed'`.

## Eliminated
- N/A

## Resolution
- **root_cause**: `app/po/[poNo]/page.js` table rendered using default browser auto table calculation (`table-auto`), causing cell content width algorithms to distort column proportions when descriptions were long.
- **fix**: Added `table-fixed` (`tableLayout: 'fixed'`), set explicit column width percentages (`#`: 5%, `Description`: 43%, `HSN/SAC`: 11%, `Qty`: 7%, `Unit`: 8%, `Rate`: 13%, `Amount`: 13%), and added `wordBreak: 'break-word'` to description cells in `app/po/[poNo]/page.js`. Fixed missing `actionCount` variable reference in `NotificationsPanel.js`.
- **verification**: `npx tsc --noEmit` passed with 0 errors and commit `52ce894` pushed to `origin/main`.
- **files_changed**:
  - `app/po/[poNo]/page.js`
  - `components/ui/NotificationsPanel.js`
