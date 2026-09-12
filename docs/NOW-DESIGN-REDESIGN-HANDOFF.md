# NOW / IRL — Design Redesign Handoff

## Mission

Work on the existing NOW / IRL Replit workspace. Do not create a new artifact and
do not treat the previous Vercel-to-Replit migration as the finished design task.
The goal is to implement the complete visual foundation and redesign the existing
MVP described by the NOW Design Director brief.

The original brief is preserved in the project attachment when available:

`attached_assets/Pasted--ROLE-You-are-the-Design-Director-of-NOW-You-previously_1789221204715.txt`

This handoff is the operational version of that brief. Read both when the
attachment exists.

## Existing artifacts

- `artifacts/now-irl` — the current Vite + React web app
- `artifacts/now-design-system` — the shared NOW design system
- `artifacts/api-server` — the current demo API
- `artifacts/mockup-sandbox` — isolated UI mockup and canvas preview server
- `lib/api-client-react` — generated React Query client
- `lib/api-spec/openapi.yaml` — API contract

The current web app is functional but visually incomplete. The main UI is still
mostly a monolithic `artifacts/now-irl/src/App.tsx` built from generic primitives.
The API is intentionally demo/in-memory and must not be presented as production
authentication or persistent storage.

## Skills to read and use

Read these before editing:

- `.local/skills/react-vite/SKILL.md`
- `.local/skills/design/SKILL.md`
- `.local/skills/mockup-extract/SKILL.md`
- `.local/skills/mockup-sandbox/SKILL.md`
- `.local/skills/mockup-graduate/SKILL.md`
- `.local/skills/artifacts/SKILL.md`
- `.local/skills/workflows/SKILL.md`
- `.local/skills/validation/SKILL.md`
- `.local/skills/follow-up-tasks/SKILL.md`
- `.local/skills/pnpm-workspace/SKILL.md` when dependencies or API contracts change
- `artifacts/now-design-system/docs/AGENTS.md`
- `artifacts/now-design-system/docs/consuming-web.md`
- `artifacts/now-design-system/docs/migrating-web.md`
- `artifacts/now-design-system/docs/references/component-inventory.md`

Use the `design` skill to delegate the frontend visual work to a DESIGN
subagent. Because existing UI is being redesigned, use `mockup-extract` first;
do not hand-code an approximation from memory. Use `mockup-sandbox` for live
Current/redesign previews and responsive comparisons. Use `mockup-graduate` when
an approved mockup is moved into production code.

## Non-negotiable rules

1. Preserve the existing MVP functionality and routes.
2. Do not invent unrelated features or future product areas.
3. Do not create a second artifact or a second token source.
4. Do not stop after changing only colors, tokens, imports, or generic cards.
5. Do not use emojis in the UI.
6. Do not remove API behavior to make the visual work easier.
7. Use the NOW design-system package directly for every primitive it provides.
8. Keep product-specific, data-aware compositions in the app unless they are
   genuinely reusable across artifacts.
9. Do not edit generated design-system CSS or generated token files by hand.
10. Do not mark the task complete until screenshots show a clear redesign on
    mobile and desktop.

## Required process

Before editing:

1. Check `git status`, current branch, remote, and current artifact state.
2. Inspect the existing application and take baseline screenshots at:
   - mobile: `390x844`;
   - desktop: `1280x720`.
3. Restart the managed workflows only when needed:
   - `artifacts/now-irl: web`
   - `artifacts/api-server: API Server`
   - `artifacts/mockup-sandbox: Component Preview Server`
   - `artifacts/now-design-system: web`
4. Read the design-system docs and component inventory.
5. Call `getCanvasState()` before placing mockups. Do not iframe the main app
   directly into the canvas.
6. Extract the real existing UI into the mockup sandbox and label the baseline
   `Current`.
7. Build the redesign against `@workspace/now-design-system`.
8. Screenshot the mockup and the production app at mobile and desktop sizes.
9. Integrate the verified design into `artifacts/now-irl`.
10. Verify workflows, browser console, typechecks, build, API smoke flows, and
    visual consistency before finishing.

## Product identity

NOW is a real-time social operating system for cities. It is not a dating app,
generic social network, or ordinary messenger. Users discover what is happening
near them right now and join a concrete activity in a public place.

The signature identity is **CITY LIGHTS**: the city should feel alive through
activity signals and soft light, while the interface remains calm, safe, legible,
and usable with one thumb.

The product should feel cinematic and immediately understandable within the first
three seconds. It must remain a real production interface, not a Dribbble-only
concept.

## Design-system requirements

Use `artifacts/now-design-system/tokens.json` as the single source of truth and
regenerate outputs through the existing token script.

Required semantic dark values:

- background: `#050608`
- surface/card: `#0E1014`
- elevated surface: `#151922`
- border: `#232836`
- primary text: white
- secondary text: `#B7BFCA`
- muted text: `#7B8593`
- accent: electric blue

Add or complete semantic tokens for:

- primary;
- secondary;
- danger;
- success;
- warning;
- disabled;
- overlay;
- glow;
- shadow;
- focus/ring;
- activity-specific glow.

Activity glow tokens:

- walk: soft blue;
- coffee: warm amber;
- sport: green;
- games: purple;
- music: pink, prepared only if useful for future use and not exposed as a
  new activity unless it already exists in the MVP.

Each glow needs documented states:

- idle;
- breathing;
- join pulse;
- celebration burst.

Breathing should be soft and approximately `2400ms`, never flashy.

Typography must provide a clear hierarchy:

- Hero XL;
- Hero L;
- H1;
- H2;
- H3;
- Body Large;
- Body;
- Caption;
- Label.

Use the system SF Pro Display / SF Pro Text fallback stack already defined by the
project. Do not add an unrelated font without a clear reason.

Use an 8pt spacing grid:

`4, 8, 12, 16, 24, 32, 40, 48, 64`

Create a consistent radius family for buttons, cards, sheets, avatars, and badges.
Use depth through elevation, blur, contrast, and glow rather than heavy shadows.

Document a single motion language:

- `120ms` — press, focus, micro feedback;
- `180ms` and `250ms` — filters, chips, selected states, content transitions;
- `350ms` — cards and bottom sheets;
- `500ms` — hero moments, countdowns, and success;
- every animation must have a reduced-motion fallback.

If existing docs contain conflicting timings, reconcile them into one documented
system instead of leaving contradictions.

## Component foundation

Complete the reusable component families needed by the current MVP:

- Primary, Secondary, Ghost, Floating, and Icon buttons;
- Meetup Card;
- Activity Card;
- User Card;
- City Lights surface/map placeholder;
- Activity Chips;
- Bottom Navigation;
- Floating Action Button;
- Top Bar;
- Map Controls;
- Bottom Sheet;
- Modal;
- Toast;
- Avatar and Avatar Stack;
- Badge;
- Progress Ring;
- Countdown Badge;
- Skeleton Loader;
- Empty State.

Each component needs an accessible API and relevant idle, pressed, loading,
disabled, empty, or error states. Add implementation guidance and usage stories
where the design-system conventions require them.

Use the design system's component whenever it provides the component. Do not
restyle primitives through arbitrary appearance overrides when a proper variant
or new reusable family is appropriate.

## Existing routes to redesign

Preserve and visually redesign:

- `/` — discover/home;
- `/welcome` — safety and product introduction;
- `/auth/login` — phone login;
- `/auth/verify` — OTP verification;
- `/onboarding/age-gate` — 18+ gate;
- `/onboarding/profile` — profile onboarding;
- `/profile` — profile and reliability;
- `/meetups/:id` — live meetup, join, check-in, chat, completion, and share;
- not-found;
- loading, empty, error, joined, checked-in, and completed states.

Supporting screens must receive the same level of polish as the home screen.

## Home-screen requirements

The home screen must:

- make the live City Lights context immediately clear;
- reduce unnecessary copy;
- make Create Meetup the strongest action;
- present activity filters as tactile chips;
- improve the top bar and safety/status layer;
- preserve the current public-zone concept;
- support loading, empty, error, and retry states;
- remain one-thumb friendly.

Each meetup card must communicate within one second:

- activity;
- distance;
- public place;
- people joined;
- remaining spots;
- time urgency;
- next available action.

Cards should feel alive through restrained activity glow, clear hierarchy, soft
depth, and useful state changes. They must not become decorative cards that hide
the important information.

## Existing API hooks

Use the generated client from `@workspace/api-client-react`. Verify exact
signatures in `lib/api-client-react/src/generated/api.ts` before coding.

The current surface includes:

- `useHealthCheck`
- `useListMeetups`
- `useCreateMeetup`
- `useGetMeetup`
- `useJoinMeetup`
- `useLeaveMeetup`
- `useCheckInMeetup`
- `useCompleteMeetup`
- `useListMessages`
- `useCreateMessage`
- `useGetShareCard`
- `useGetProfile`
- `useUpdateProfile`
- `useGetAuthMe`
- `useLogout`
- `useListInterests`

Do not replace these with fake client-side data. Keep mutation results visible,
invalidate or patch affected React Query caches, preserve route parameters, and
render loading/error/empty states safely.

The API is currently demo/in-memory. Do not claim persistence or real OTP
authentication. Do not expand backend scope unless the design cannot work
without it. If the API changes, update the OpenAPI contract and regenerate the
client.

## Visual acceptance criteria

The result is not complete if it still looks like the old generic interface with
different colors.

The finished app must visibly demonstrate:

- a new City Lights visual language;
- a redesigned home composition;
- premium, information-first meetup cards;
- tactile chips and button press feedback;
- coherent bottom navigation and top safety/status layer;
- polished bottom sheets and meetup detail;
- coherent auth/onboarding/profile screens;
- activity-specific glow states;
- loading skeletons, empty states, and error states;
- touch targets of at least 44pt;
- keyboard focus, labels, contrast, and reduced motion;
- responsive behavior at mobile and desktop sizes.

## Verification commands

Run the relevant managed workflows and inspect logs. Then run:

```bash
pnpm run typecheck
pnpm run typecheck:libs
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/now-design-system run typecheck
pnpm --filter @workspace/now-irl run typecheck
PORT=23038 BASE_PATH=/ pnpm --filter @workspace/now-irl run build
git diff --check
```

Also smoke-test through the Replit proxy:

- `/api/healthz`;
- list meetups;
- create meetup;
- join;
- leave;
- message;
- check-in;
- complete;
- profile.

Check browser console output and screenshots for:

- `/`;
- `/welcome`;
- `/profile`;
- `/auth/login`;
- `/meetups/:id`;
- mobile;
- desktop.

Do not report success based only on a passing build. The final decision must
include a visual comparison against the baseline and a direct audit against this
document and the original Design Director brief.

## Scope and follow-up discipline

Do not duplicate the existing project tasks:

- Port imported Vercel app to Replit
- Take your app mobile
- Create a pitch deck for your app
- Make a promo video for your app

Do not create mobile, slides, or video artifacts during this redesign. Keep this
task focused on the existing web app and its shared design system.
