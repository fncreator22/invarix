# UI build tracker

Order follows `06` §2.3 / `04` §10. Each screen: real API data, loading/empty/error states, both themes, 360/1440 checked with playwright-cli.

| # | Screen | Status | Notes |
| --- | --- | --- | --- |
| 0 | Shell, landing, onboarding (foundation) | done | Verified end to end in browser with dev auth |
| 1 | Home (SCR-P-01) | done | Metrics, ranked services, why-panel (breakdown + proof), expiry runway with collisions, attention feed, Ask Steward. Trend sparkline skipped (needs history) |
| 2 | Alerts list + detail (P-03, P-04) | done | Filters in URL, load more; detail: why-it-fired, proof, breakdown, contributing exceptions, precedent, propose-review with ranked owners, acknowledge, snooze, resolve, feedback |
| 3 | Reviews inbox + detail + DecisionDialog (P-12) | done | Tabs in URL, link-profile prompt; detail: context + proof, accountable chain, precedent; DecisionDialog with conditional fields and effects summary; verified reassign end to end (alert auto-cleared, precedent recorded) |
| 4 | Graph explorer (P-02) | done | react-force-graph-2d canvas, shape per node type + legend, type filters / focus / path in URL, GSAP proof-path draw (static under reduced motion), drawer on click, accessible list view (default on mobile) |
| 5 | Steward page + panel (P-13) | done | Shared chat in page and side panel: streaming, tool trace, markdown with citation chips (open drawer), proof-path cards, proposed-action approve/dismiss, removed-claims notice, degraded banner + Quick answers (page-aware owner lookup), stop button, prompt hand-off from Home |
| 6 | Exceptions list, detail, create, drafts (P-05..P-08) | done | List (search/filters in URL, active first), detail (relationship chips → drawer, renewal chain, open alerts, timeline, activate), create form with field errors (draft or save+activate), paste-text drafts with unresolved hints and approve/reject |
| 7 | Registry: services, people, teams, controls (P-09..P-11) | done | Tabbed lists, service detail (risk breakdown, dependencies, exceptions), person detail (team history, owned, fallback-for, left warning), admin Add sheet |
| 8 | Settings: profile, AI mode; notifications (P-18) | done | Profile (name, theme), workspace (info, run Sentinel, reset sample via alert dialog), AI mode (cloud/off; private marked as coming). Members/notification prefs are R1, so their tabs were dropped. Notifications bell was built with the shell |

Libraries (added when first needed): GSAP, Lenis (marketing only), React Bits, LottieFiles.

## Visual pass (owner feedback: hero not interactive, too much text)

- Landing hero: physics graph (react-force-graph-2d), drag with spring-back, hover neighbours, click for each node's story, particles on the proof path
- How it works: animated step visuals (SVG) + GSAP ScrollTrigger connector; feature cards filled (proof chain, score stack)
- App Home: risk map (services by band, click to select), severity bar and 7-day dots in metrics, compact score breakdown, proof path graph-first
- Fixes: canvas fonts ignored CSS variables (graph labels fell back to 10px); next/dynamic does not forward refs (canvas modules are now loaded whole)

## Polish backlog

- Top-bar breadcrumb shows raw IDs on detail pages; show entity titles.
- Risk trend sparkline on Home (needs snapshot history).
