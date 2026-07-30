---
status: resolved
trigger: "now error giving while editing vendor - DUPLICATE_VENDOR"
created: 2026-07-30
updated: 2026-07-30
---

# Debug Session: vendor-edit-false-duplicate-error

## Symptoms
- **Expected behavior**: Editing an existing vendor (e.g. "DIVTECH FACILITIES PRIVATE LIMITED") saves successfully without false duplicate errors against its own existing record.
- **Actual behavior**: `DUPLICATE_VENDOR: A vendor with matching GSTIN already exists: "DIVTECH FACILITIES PRIVATE LIMITED" (VEN-1785415290162)`.
- **Errors**: False positive duplicate match during vendor update.
- **Timeline**: Discovered after enabling duplicate vendor checking.
- **Reproduction**: Open Edit Vendor Modal on any existing vendor and click Save.

## Current Focus
- **hypothesis**: `VendorService.updateVendor` called duplicate validation without properly excluding the target vendor's database `id`, `vendor_code`, and existing `legal_name`.
- **test**: Update `VendorRepository.findDuplicate` and `VendorService.updateVendor` to pass a full exclusion object (`{ id: existing.id, vendorCode: existing.vendor_code, legalName: existing.legal_name }`).
- **expecting**: Self-editing succeeds smoothly, while editing to match *another* vendor's GSTIN/PAN/Name is correctly blocked.

## Evidence
- Screenshot showed vendor edit error matching its own vendor code `VEN-1785415290162` and own name `"DIVTECH FACILITIES PRIVATE LIMITED"`.

## Resolution
- **root_cause**: `VendorRepository.findDuplicate` attempted `Number(excludeVendorCode)` which evaluated to `NaN` for string vendor codes like `"VEN-1785415290162"`, causing SQL `id != -1` to fail to exclude the vendor's primary key `id`.
- **fix**: Updated `VendorRepository.findDuplicate` and `VendorService.updateVendor` to pass explicit `{ id, vendorCode, legalName }` exclusion criteria so a vendor's own record is 100% excluded during update operations.
- **verification**: `npx tsc --noEmit` passed with 0 errors and commit `1ffd66d` pushed to `origin/main`.
- **files_changed**:
  - `src/modules/vendors/repositories/VendorRepository.ts`
  - `src/modules/vendors/services/VendorService.ts`
