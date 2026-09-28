# AGENTS.md — AccessEvent

## Repo state (read first)

This is a **monorepo** with two apps. `PRD.md` = what to build and why. `Sprints.md` = the order to build it. Both are in Brazilian Portuguese and are the source of truth for scope.

```text
accessEvent/
├── mobile/     # Expo + React Native + TypeScript
├── backend/    # NestJS + PostgreSQL (TypeORM)
└── docker-compose.yml
```

## Commands

There is no root `package.json` — run these inside `mobile/` or `backend/`.

```bash
# ---- Full stack via Docker (from the repo root) ----
docker compose up -d --build
curl http://localhost:3333/health

# ---- Backend (cd backend) ----
npm install
npm run start:dev      # watch mode on :3333
npm run build          # tsc -> dist/
npm run start:prod     # node dist/main.js
npm run lint           # oxlint --type-aware
npm run typecheck      # tsc --noEmit
npm run format         # prettier --write
npm run test           # vitest unit
npm run test:e2e       # vitest e2e
npm run test:cov

# ---- Mobile (cd mobile) ----
npm install
npm start              # expo start
npm run ios            # iOS simulator
npm run android        # Android emulator
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run format         # prettier --write
npm run doctor         # expo-doctor
```

**Run lint and typecheck in both apps before declaring a task done.**

## Environment

- `backend/.env.example` → `backend/.env` (validated at boot by `src/config/env.validation.ts`; the process aborts on invalid values).
- `mobile/.env.example` → `mobile/.env` (Expo only inlines `EXPO_PUBLIC_*`; read them **statically** in `mobile/src/config/env.ts` or the `expo/no-dynamic-env-var` lint rule fails).
- Root `.env.example` → root `.env`, read only by `docker-compose.yml`.
- Reaching the API: iOS simulator and web use `http://localhost:3333`; the Android emulator needs `http://10.0.2.2:3333`; a physical device needs the host's LAN IP.
- `.env` files are gitignored. Never commit secrets.

## Stack

Per `PRD.md` §24, treat as the project stack:

- **Mobile:** **Expo** (SDK 57) + React Native + TypeScript, **Expo Router**, **Expo Location**.
- **Backend:** NestJS 12 (Node ESM), REST API, PostgreSQL 17, TypeORM, Docker.
- **Maps: `react-native-maps`. QR scanning: `expo-camera`.** Both are settled in §24 — do not substitute alternatives. Because the scan path is Expo-specific, do not introduce bare React Native camera/geolocation packages.
- **Prefer the official Expo solution over third-party libraries.** Whenever the Expo ecosystem provides a module or API for a problem, use it: Expo Router instead of hand-rolled React Navigation, `expo-location` instead of bare geolocation packages, `expo-camera` instead of bare camera packages, `expo-secure-store` instead of keychain wrappers, and so on. Add an external library only when Expo has no adequate option, or when there is a clear technical justification — and record the justification in `mobile/AGENTS.md`. This applies to the whole mobile app, not just navigation.
- **`PRD.md` §24 is the source of truth for technology decisions.** If `Sprints.md` and the PRD ever disagree, the PRD wins. Where a decision is settled by the team rather than by the PRD, update the PRD so it stays the single source of truth.
- **PostGIS is optional** (§25). `LINESTRING` / `POINT` / `POLYGON` columns are not required; storing coordinates as JSON to keep the MVP infrastructure small is explicitly sanctioned. `synchronize` is off — add real migrations when entities land (Sprint 2).
- Remember location access and background GPS tracking are platform-permission-heavy. This is native/hardware-dependent work — the acceptance scenario (§27) and `Sprints.md` Sprint 21 both require testing on a physical device.
- `react-native-maps` and `expo-camera` ship native code, so **Expo Go will not work**; use `npx expo run:ios|android` or an EAS development build once Sprint 3 starts.

## Hard scope boundary

`PRD.md` §5 lists what is **out of the MVP**. Do not implement these, and do not add them as "improvements" when asked to polish the app:

computer vision / floor-plan recognition, 3D reconstruction, indoor Street View, Bluetooth beacon or high-precision indoor positioning, real-time turn-by-turn navigation, automatic obstacle detection, automatic corridor width or ramp slope measurement, external map integrations, event-management system integrations, organizer↔participant chat, and map rating/reputation systems.

If work seems to require one of these, it is out of scope — flag it instead.

## Product constraints an agent will otherwise break

- **Never claim a route is safe.** §19 and §30 are explicit: accessibility data is supplied by the organizer and is not automatically verified. The app must present data as organizer-reported, and surface the last-verification date and verification status where they exist. Do not write copy like "rota segura" or "rota ideal".
- **Restrictions filter edges out; they are not weights.** §17 and `Sprints.md` Sprint 17: incompatible paths are *removed from the graph* before the search runs, then the shortest remaining path is found (Dijkstra or A*, Sprint 16). Do not implement penalties or soft costs for stairs/inaccessible paths.
- **Participants only see `PUBLISHED` maps** (Sprint 19). Map states are `DRAFT` / `PUBLISHED` / `ARCHIVED`; organizers edit drafts and can unpublish.
- **Path recording must survive temporary loss of connectivity** (RNF05). Recording does not block on the network; sync can happen later.
- **The app's own UI must be accessible** (RNF04): adequate touch target sizes, contrast, screen-reader support where possible, clear text, visible feedback. This is dogfooding — apply it to the UI you write, not just to the accessibility data model.

## Domain model

`PRD.md` §23 defines the entities; use these names rather than inventing new ones: `User`, `Event`, `Map`, `Path`, `PointOfInterest`, `Area`, `QRCode`.

The map is a **graph**: POIs are nodes, `Path` records are edges (`startNodeId` / `endNodeId` plus geometry and distance), and `Area` records are polygons. Path accessibility attributes: `accessibilityStatus`, `hasStairs`, `hasRamp`, `width`, `floorType`, `notes`.

## Conventions

- **English** for identifiers, API responses, and database columns. **Portuguese (pt-BR)** for all user-facing strings, labels, and error messages — the product copy and mockups in the docs are pt-BR, so match them.
- Each sprint must end with an integrated, runnable state (`Sprints.md` §10). Do not leave several features half-implemented; the project should always be demonstrable.
- **Definition of done is the §27 scenario**: organizer creates an event and map, walks ≥3 paths, adds an entrance/elevator/stairs/restroom, flags which paths have stairs, generates a QR code for the entrance; participant scans it, picks the restroom, sets "avoid stairs", and gets an alternative route rendered on the map. This is also the demo script (§28) — build toward it rather than toward feature parity.
- **If time runs short, cut from the back** (`Sprints.md` §9). QR codes are cut before routing, and must never block the routing algorithm; manual location setting ("Estou aqui") is the acceptable fallback during development.
