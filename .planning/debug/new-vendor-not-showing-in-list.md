---
status: resolved
trigger: "new vendor not showing in the list when added"
created: 2026-07-30
updated: 2026-07-30
---

# Debug Session: new-vendor-not-showing-in-list

## Symptoms
- **Expected behavior**: Newly added vendor should appear in the vendors list immediately or upon refetch.
- **Actual behavior**: New vendor does not appear in the vendors list after being added.
- **Errors**: None reported explicitly.
- **Timeline**: Present issue.
- **Reproduction**: Create a new vendor and view the vendors list.

## Current Focus
- **hypothesis**: `VendorRepository.findAll` lacked an `ORDER BY` clause, causing `SELECT * FROM vendors LIMIT 50` to return the 50 oldest vendors in physical table order. Newly inserted vendors (higher `id`) were excluded from the top 50 page fetched on boot / refresh.
- **test**: Add `ORDER BY id DESC` to `VendorRepository.findAll`.
- **expecting**: Newly created vendors are returned at the top of the list upon `refreshData()`.

## Evidence
- `VendorRepository.findAll` ran `SELECT * FROM vendors LIMIT ? OFFSET ?` without `ORDER BY`.
- `getMasterData` fetches 50 vendors by default (`limit: 50, offset: 0`).
- SQLite returned oldest records first; when total vendor count exceeded 50, newly created vendors fell outside offset 0..49.

## Resolution
- **root_cause**: `VendorRepository.findAll` queried `vendors` without `ORDER BY id DESC`. With pagination (`limit: 50`), new vendors were placed after offset 50 and excluded from initial data refresh.
- **fix**: Added `ORDER BY id DESC` to `VendorRepository.findAll`.
- **verification**: `VendorRepository.findAll` now orders by `id DESC`.
- **files_changed**:
  - `src/modules/vendors/repositories/VendorRepository.ts`

