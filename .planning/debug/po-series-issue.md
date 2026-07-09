---
status: investigating
trigger: "p.o series issue where unnessary 0 were coming in the number and when click new po and close the series utilized"
---

# Symptoms
- **Expected behavior**: When opening a P.O., the new series should show with the correct number of zeros, but it shouldn't be booked/consumed until the P.O. is saved.
- **Actual behavior**: When clicking 'New P.O.', a new series is utilized with excess zeros, and it gets consumed even if closed without saving.
- **Error messages**: N/A
- **Timeline**: After today's major upgrade.
- **Reproduction**: Click 'New P.O.', observe the number has excess zeros, close the modal/page without saving, and observe that the number was still consumed.

# Current Focus
- **next_action**: gather initial evidence
