---
status: resolved
trigger: "Error posting comment: Do not know how to serialize a BigInt"
created: 2026-07-30
updated: 2026-07-30
---

## Symptoms
- Expected: Comment with @procurement mention should post and trigger notification
- Actual: Error toast "Do not know how to serialize a BigInt"
- Timeline: Never worked (new functionality)
- Reproduction: Occurs when tagging @procurement or other roles in discussion thread

## Current Focus
- hypothesis: Turso/libSQL client returns lastInsertRowid as BigInt; JSON.stringify cannot serialize BigInt
- test: Check res.lastInsertRowid type in addComment return
- expecting: BigInt type confirmed
- next_action: Convert BigInt to Number in addComment return and other lastInsertRowid usages

## Evidence
- timestamp: 2026-07-30T16:50 — Screenshot shows error toast on comment post
- timestamp: 2026-07-30T16:53 — collaboration.js line 97 returns `res.lastInsertRowid` directly
- timestamp: 2026-07-30T16:53 — db.js uses @libsql/client which returns BigInt for lastInsertRowid
- timestamp: 2026-07-30T16:53 — RPC route.js line 222 calls NextResponse.json() which uses JSON.stringify

## Eliminated
(none)

## Resolution
- root_cause: `@libsql/client` returns `lastInsertRowid` as BigInt. collaboration.js line 97 passes it directly into the JSON response. JSON.stringify() cannot serialize BigInt, throwing the error.
- fix: Convert BigInt to Number using `Number()` wrapper on all `lastInsertRowid` usages
- verification: Post a comment with @procurement mention — should succeed without error
- files_changed:
  - app/lib/api/collaboration.js (line 97)
  - src/modules/core/repositories/TDSRepository.ts (line 31)
  - src/modules/core/repositories/ApprovalWorkflowRepository.ts (lines 26, 77)
