# NOW component inventory

This inventory translates the NOW product brief and the imported MVP into
reusable visual families. The design-system package owns primitives; the app
owns product-specific compositions and data.

## UX architecture

### Screen hierarchy

1. **Discover** — live City Lights map, activity filters, and one primary “create
   a meetup” action.
2. **Decide** — a meetup bottom sheet with activity, distance, people, time, and
   safety context.
3. **Commit** — join, leave, check in, complete, share, and report flows.
4. **Trust** — age gate, profile reliability, safety help, and public-zone rules.

### Navigation architecture

- Mobile uses a persistent top safety/status layer and a single bottom-oriented
  action model.
- Secondary routes are entered from the current context, not from a dense menu.
- The desktop web shell may center the mobile-width product surface while keeping
  the same hierarchy and touch sizes.

### Motion specification

- 120ms: button compression, focus, and micro feedback.
- 220ms: filters, selected states, and content transitions.
- 350ms: bottom sheets, meetup cards, and map zoom.
- 500ms: countdown start, success celebration, and shared-element hero moments.
- Every animated glow, pulse, and ripple has a reduced-motion fallback.

## Component families

| Family | Reference | Dependencies | Chunk | Status |
| --- | --- | --- | --- | --- |
| Button | `components/button.md` | none | 1 | implemented |
| Card | `components/card.md` | none | 1 | implemented |
| Badge | `components/badge.md` | none | 1 | implemented |
| Input | `components/input.md` | Label | 1 | implemented |
| Switch | `components/switch.md` | Label | 1 | implemented |
| Meetup card | `components/meetup-card.md` | Card, Badge, Button | 2 | pending |
| City Lights map | `components/city-lights-map.md` | Card, Badge | 2 | pending |
| Bottom bar | `components/bottom-bar.md` | Button | 2 | pending |
| Floating action button | `components/floating-action-button.md` | Button | 2 | pending |
| Avatar | `components/avatar.md` | none | 2 | pending |
| Bottom sheet | `components/bottom-sheet.md` | Button, Card | 3 | pending |
| Modal | `components/modal.md` | Button | 3 | pending |
| Toast | `components/toast.md` | none | 3 | pending |
| Skeleton loader | `components/skeleton-loader.md` | none | 3 | pending |
| Empty state | `components/empty-state.md` | Button | 3 | pending |

The first chunk is the shared primitive foundation needed by every consuming
surface. Later chunks are product compositions and feedback patterns that stay
in this package when they become reusable across artifacts.