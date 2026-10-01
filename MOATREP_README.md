# MOAT

**Learn to code with a robot friend.** MOAT is an iOS app that teaches beginners the basics of programming through short, game-like questions. Every correct answer helps your robot grow.

Built for the RevenueCat Shipaton 2026 (Next Gen Award).

## What it does

- **Lessons in your field.** Pick a study area (for example health sciences, engineering or business) and the examples use that world.
- **Pick a language.** Python has the full course. R, SQL, JavaScript, MATLAB and Java each have a Phase 1 of 4 lessons, 20 questions.
- **Five question types.** Fill the blank, predict the output, build the line, find the bug, and match.
- **Mini-games.** A loop game and a stage game that turn a lesson idea into something to play with.
- **A robot that reacts.** The robot shows a question mark while you think, cheers when you are right and looks surprised when you are not.
- **Premium with RevenueCat.** A paywall offers a 7-day free trial. Purchases run through the RevenueCat SDK.

## Try the purchase (no paid developer account needed)

The app uses RevenueCat's **Test Store**, so you can test a purchase in the iOS simulator.

1. Open `MOAT.xcodeproj` in Xcode.
2. Wait for Swift Package Manager to fetch the RevenueCat package, then build and run on an iPhone simulator.
3. On the Learn tab, tap a locked phase (or the Premium crown on the Profile tab) to open the paywall.
4. Tap **Start FREE 7-day Trial**. The Test Store dialog appears. Choose the successful purchase option.
5. Premium unlocks.

`RevenueCatKeys.swift` holds the RevenueCat **public SDK key** for the Test Store. Public SDK keys are designed to be included in apps. No secret (`sk_`) key is in this repository. To use your own project, replace the key with yours.

## Tech

- SwiftUI, iOS
- RevenueCat SDK (`purchases-ios`) through Swift Package Manager
- Lessons are JSON files in `Resources/` (one per study area, plus one per extra language)
- An optional Python backend gives AI explanations for wrong answers. The app works without it.

## Project layout

- `MOAT/Views` — screens
- `MOAT/Store` — app state, purchases, progress
- `MOAT/Games` — the mini-games
- `MOAT/Resources` — lesson JSON files and images

## License

MIT. See `LICENSE`.
