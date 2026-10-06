# MOAT: React Native (Expo + TypeScript)

This is a migration of the MOAT SwiftUI app to React Native with Expo and TypeScript. It reproduces the Swift app's screens, navigation, state, storage, networking and interactions as closely as practical.

## Run it

```bash
npm install
npx expo install --fix   # pins every package to the Expo SDK your Expo Go supports
npx expo start           # scan the QR code with Expo Go
```

The project targets Expo SDK 57. If your Expo Go app supports a different SDK, run `npx expo install expo@<sdk> --fix` first.

## Project structure

| Folder | What it holds |
|---|---|
| `src/screens` | Every screen. `games/` holds the loop and stage mini-games; `track/` holds the Biology research track. |
| `src/components` | Shared UI: `ui.tsx` (cards, buttons, images), `trackKit.tsx` (track visuals and animations), `gameKit.tsx` (code playback), `PaywallOverlay.tsx`. |
| `src/navigation` | The root stack (modals for lessons, games, the track flow and evolution) and the bottom tabs. |
| `src/hooks` | App state as React context (`useAppStore`, `useTrackStore`), plus `useReduceMotion`. |
| `src/services` | The API client, the lesson loader, the game catalog and RevenueCat. |
| `src/storage` | AsyncStorage persistence. |
| `src/types` | The data models. |
| `src/utils` | Theme, day keys, code joining, study areas, and the generated image and content registries. |
| `assets` | Robot pictures, backgrounds, the Horizon font and every lesson file, copied from the Swift project. |

## Swift to React Native mapping

| Swift | React Native / Expo | Works in Expo Go |
|---|---|---|
| SwiftUI tab view | `@react-navigation/bottom-tabs` | Yes |
| `fullScreenCover` (lessons, games, track flow) | Native stack, `presentation: 'fullScreenModal'` | Yes |
| `sheet` (evolution) | Native stack, `presentation: 'modal'` | Yes |
| `UserDefaults` (`moat.progress.v1`, `moat.track.v1`) | AsyncStorage, same keys and same JSON shape | Yes |
| `URLSession` (`/lessons`, `/explain`) | `fetch` with the same timeouts (8s, 15s) | Yes |
| Shapes, `Canvas`, `Path` | `react-native-svg` | Yes |
| SwiftUI animations, `phaseAnimator`, `keyframeAnimator` | React Native `Animated`, same timings | Yes |
| `UINotificationFeedbackGenerator`, `sensoryFeedback` | `expo-haptics` | Yes |
| Horizon, Baloo 2 and Atkinson Hyperlegible fonts | `expo-font` (Baloo 2 and Atkinson are under the SIL Open Font License, included in `assets/fonts`) | Yes |
| Paywall blur | `expo-blur` | Yes |
| `Slider` | `@react-native-community/slider` | Yes |
| SF Symbols | `@expo/vector-icons` (Ionicons) | Yes |
| RevenueCat iOS SDK | `react-native-purchases` | Partly, see below |

## Expo Go compatibility

Everything runs in Expo Go except real in-app purchases.

`react-native-purchases` detects Expo Go and switches to its **Preview API Mode**: the paywall, offerings and entitlement checks all run, but purchases are mocked. Nothing was removed.

To test real purchases, move to a **development build**:

```bash
npx expo install expo-dev-client
eas build --profile development
```

I recommend staying on Expo Go for day-to-day work, and making a development build before testing payments or releasing.

## Feature parity checklist

| Feature | Swift source | React Native |
|---|---|---|
| Splash: 1.5s, then onboarding or tabs | `MOATApp.swift` | `RootNavigator.tsx` |
| Onboarding: age slider and under-13 note, education menu, 7 areas, language step | `OnboardingView`, `LanguageStepView` | `OnboardingScreen.tsx` |
| Learn path: zig-zag, phase banners, Premium lock, scroll to current, robot by current lesson | `LearnView` | `LearnScreen.tsx` |
| Tappable streak, bolts and minutes bubbles | `StatChipsRow` | `trackKit.tsx` |
| Lessons: choice, build, judge, bug, match | `LessonView` | `LessonScreen.tsx` |
| One retry per wrong question; 5 bolts per correct answer, +10 for finishing | `LessonView` | `LessonScreen.tsx` |
| Hints always shown under 13; haptics on check | `LessonView` | `LessonScreen.tsx` |
| Explain more (hidden by `useAIExplanations = false`) | `LessonView` | `LessonScreen.tsx` |
| Custom quit warning instead of the system pop-up | `QuitSheet` | `trackKit.tsx` |
| Loop games (plant, wheel, fund) with step-by-step code playback | `LoopGames.swift` | `games/LoopGame.tsx` |
| Stage labs (GC content, duty cycle, conversion), 5 parts each | `StageGames.swift` | `games/StageGame.tsx` |
| Robot evolution when a phase unlocks a form | `EvolutionView` | `EvolutionScreen.tsx` |
| Workshop: forms, parts, rotated antennas | `WorkshopView` | `WorkshopScreen.tsx` |
| Profile v2: streak, stats, 9 badges, settings, reset, subscriptions | `ProfileView` | `ProfileScreen.tsx` |
| Paywall: Premium and Expert, confetti, purchase | `PaywallTier.swift` | `PaywallOverlay.tsx` |
| Biology research track: Option A home, phase pictures, stars, Replay | `TrackScreens` | `track/TrackHomeScreen.tsx` |
| Track lessons and checkpoints (plan, code, predict, debug, build) | `TrackPlayer` | `track/TrackPlayer.tsx` |
| Bolt counter: count-up, glow, sparks, bounce | `TrackKit` | `trackKit.tsx` (`BoltPill`) |
| Lesson complete, project built, checkpoint results | `TrackScreens` | `track/TrackResults.tsx` |
| Star rules, +30 perfect bonus, replay payouts, minutes per day | `TrackData` | `useTrackStore.tsx` |

## Fixed during migration

- **Mini-games for Healthcare and Business learners.** The Swift game catalog still checked the old area names ("Health sciences", "Business") after they were renamed, so these learners got no mini-games. `services/gameCatalog.ts` uses the current names.

## Known differences from the iOS app

- **Icons.** Ionicons replaces SF Symbols.
- **Education menu.** A modal list replaces the iOS pop-up `Menu`.
- **Reset confirmation.** A native `Alert` replaces the `confirmationDialog`.
- **Mini-game art.** The plant, wheel and fund drawings were rebuilt from the Swift drawing code. Some sizes in the Swift version came from layout modifiers, so they may differ by a few points.

## Not verified

This code was written without network access. `npm install`, the TypeScript compiler, Metro and Expo Go could not run. Every file was checked with a TypeScript and JSX parser, and every import, export, package, route and image name was cross-checked. Expect to fix a small number of type errors on the first `npx tsc --noEmit`.
