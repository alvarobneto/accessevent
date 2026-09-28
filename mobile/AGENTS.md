This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Every file under `src/app/` is a route; `_layout.tsx` files define the navigators. Keep non-route code (components, hooks, services, utils) outside `src/app/`.
- Import `Link`, `router`, `useLocalSearchParams`, and `Stack`/`Tabs` from `expo-router`. Do **not** hand-roll navigators with React Navigation — Expo Router already wraps it, and deep links come for free.
- `typedRoutes` is enabled, so `<Link href>` and `router.push` are checked at compile time. The generated types live in `.expo/types/router.d.ts` and are produced by the dev server; run `npx expo start` once after adding or renaming a route.
- Docs: https://docs.expo.dev/router/introduction.md

## Project structure

```text
src/
├── app/            # Expo Router routes — every file here is a screen
│   ├── _layout.tsx # root navigator + global providers
│   └── index.tsx
├── components/     # shared UI (Screen, Card, Button)
├── config/         # env access — process.env must be read statically (expo/no-dynamic-env-var)
├── hooks/          # reusable data/logic hooks
├── services/       # API client, location service
├── theme/          # colors, spacing, typography
└── types/          # shared domain types
```

User-facing strings are pt-BR; identifiers are English. The app's own UI must stay accessible (RNF04) — see `src/theme/theme.ts` for the min touch target and contrast tokens.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- **Prefer the official Expo solution.** Whenever the Expo ecosystem provides a module or API for a problem, use it instead of a third-party library — Expo Router over hand-rolled React Navigation, `expo-location` over bare geolocation packages, `expo-camera` over bare camera packages, `expo-secure-store` over keychain wrappers. Reach for an external library only when the Expo ecosystem has no adequate option, or when there is a clear technical justification recorded in this file.
- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
