---
status: resolved
trigger: "add duplicate vendor control and vendor delete option"
created: 2026-07-30
updated: 2026-07-30
---

# Debug Session: duplicate-vendor-control-and-delete

## Symptoms
- **Expected behavior**: 
  1. Onboarding or editing a vendor should check for duplicates (Legal Name, Trade Name, GSTIN, PAN) and block or warn on exact/normalized matches.
  2. Users with appropriate permissions can delete a vendor (preventing deletion if active Purchase Orders or Payment Requests are linked).
- **Actual behavior**: 
  1. No duplicate detection previously existed in `addVendor` or `updateVendor`.
  2. No delete vendor endpoint or UI action previously existed.
- **Errors**: N/A
- **Timeline**: Feature / Control enhancement request.
- **Reproduction**: Onboard duplicate vendor or attempt vendor deletion in UI.

## Current Focus
- **hypothesis**: Added `findDuplicate`, `getLinkedRecordsCount`, and `delete` to `VendorRepository`, `checkVendorDuplicate` and `deleteVendor` to `VendorService`, exposed via RPC route, and added Delete buttons & Duplicate Warning UI banners to `VendorOnboardModal`, `VendorEditModal`, `VendorViewModal`, and `VendorsView`.
- **test**: `npx tsc --noEmit` passed cleanly.
- **expecting**: Clean compilation & complete duplicate control + delete safety checks.

## Evidence
- `VendorRepository.findDuplicate` checks legal name, trade name, GSTIN, and PAN (case-insensitive & trimmed).
- `VendorRepository.getLinkedRecordsCount` checks for existing linked Purchase Orders or Payment Requests before allowing vendor deletion.
- `VendorEditModal` and `VendorViewModal` present confirmation prompts and prevent deletion when linked records exist.

## Eliminated
- N/A

## Resolution
- **root_cause**: Missing duplicate checking logic and deletion API/UI controls.
- **fix**: Implemented backend duplicate validation, safe vendor deletion checks, RPC methods, and UI modal controls with confirmation & warning banners.
- **verification**: `npx tsc --noEmit` passed with 0 errors.
- **files_changed**:
  - `src/modules/vendors/repositories/VendorRepository.ts`
  - `src/modules/vendors/services/VendorService.ts`
  - `app/lib/api/vendors.js`
  - `app/lib/api.js`
  - `app/api/rpc/route.js`
  - `components/views/vendors/VendorOnboardModal.js`
  - `components/views/vendors/VendorEditModal.js`
  - `components/views/vendors/VendorViewModal.js`
  - `components/views/VendorsView.js`

