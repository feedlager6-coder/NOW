---
name: Route parameter boundary
description: Wouter route parameters must be read inside the component rendered by the matching parameterized route.
---

Read `useParams` from the component attached to the parameterized route, not from a parent router component.

**Why:** A parent `Switch` has no parameter context; reading params above the matching `Route` produces undefined IDs and false not-found states.

**How to apply:** Create a small route adapter component that calls `useParams` and passes the ID into the screen component.