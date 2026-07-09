---
status: investigating
trigger: sidebar is not visible . p.o are not visible
created: 2026-07-09T14:45:00+05:30
updated: 2026-07-09T14:45:00+05:30
---

# Symptoms
- **Expected behavior**: The sidebar should show on all main pages, with the Purchase Orders link/section visible and functional.
- **Actual behavior**: The sidebar is completely hidden/missing, and Purchase Orders list/button is not appearing.
- **Error messages**: No error messages visible.
- **Timeline**: It worked recently and broke after a recent change.
- **Reproduction**: Open the home/dashboard page and check the sidebar visibility.

# Current Focus
- hypothesis: The sidebar is hidden or disabled due to conditional rendering checks (such as active views, feature flags, routing, user roles, or screen sizing classes).
- test: Inspect the routing/view rendering in MainLayout.js, Sidebar.js, and package.json to identify what view/route controls the sidebar and Purchase Orders list.
- expecting: Identify visibility/rendering logic checks that cause the sidebar or POs list to be omitted.
- next_action: gather initial evidence

# Evidence
- timestamp: 2026-07-09T14:45:00+05:30
  event: session started
