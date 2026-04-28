# UMI P1 Handoff Checklist

## Dependencies
- [ ] UMI P0 layout/sidebar/topbar transferred.
- [ ] P0 status dictionary available.
- [ ] P0 form/filter strategy confirmed.

## P1 pages
- [ ] contract-wizard
- [ ] brokerage
- [ ] trust-management
- [ ] agents
- [ ] middle-office-clients
- [ ] middle-office-reports
- [ ] depository
- [ ] back-office
- [ ] trading-card
- [ ] administration
- [ ] archive

## Integration checks
- [ ] Report download/resend behavior confirmed.
- [ ] Contract wizard submit behavior confirmed.
- [ ] Trading terminal actions confirmed.
- [ ] Archive restore behavior confirmed.
- [ ] Role-based access matrix aligned for admin/trading actions.
- [ ] Delivery channels dictionary mapped to project enums.
- [ ] Cross-links to subject-card route verified.


## Static extraction contract
- [ ] Confirm runtime=false/buildStep=false (extraction only).
- [ ] Confirm templates are server-rendered/static-template-first (no JS data rendering).
- [ ] Confirm only local assets are used.
- [ ] Confirm page-specific scripts are included only on matching templates (subject-card only when needed).
- [ ] Confirm selectable controls render checked + .is-active/.is-selected consistently server-side.
