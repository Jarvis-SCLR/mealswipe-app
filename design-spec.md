# 🥗 Meal Swipe - Design Specification

> A meal planning app with Tinder-style recipe discovery

---

## 📋 Overview

Meal Swipe is a mobile-first React Native app that transforms meal planning from a chore into a delightful, game-like experience. Users discover recipes through an addictive swipe interface, build their weekly menu, and automatically generate grocery lists.

**Core Philosophy:** *Delight through simplicity - every interaction should spark joy*

---

## 🎨 Color Palette

### Primary Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Apricot** (Warm Orange) | `#F5A962` | Primary CTAs, Like button, accents |
| **Terra** (Earthy Brown) | `#7B5E4B` | Secondary elements, typography |
| **Verde** (Sage Green) | `#6B8E5E` | Success states, grocery checkmarks |
| **Caramello** (Cream) | `#FDF6E9` | Light backgrounds, cards |

### Neutral Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Espresso** | `#2D2420` | Primary text on light backgrounds |
| **Mocha** | `#5C4A42` | Secondary text |
| **Latte** | `#A89A8F` | Disabled states, placeholders |
| **Milk** | `#FDFBF7` | App background |
| **Foam** | `#FFFFFF` | Card backgrounds |

### Semantic Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Pepe** (Coral Red) | `#E76F51` | Skip button, alerts, remove |
| **Cielo** (Sky Blue) | `#4A90A4` | Info, links, interactive highlights |

### Dark Mode Palette

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Ombra** (Deep Shadow) | `#1A1512` | App background |
| **Legno** (Dark Wood) | `#2D2521` | Card backgrounds |
| **Cera** (Wax) | `#EADFD4` | Primary text on dark |
| **Panna** | `#FDF6E9` | Accent text, highlights |

---

## 🔤 Typography

### Font Families

**Primary: Playfair Display**
- Usage: Headlines, recipe titles, brand moments
- Why: Elegant, distinctive, food magazine aesthetic
- Weights: 400 (Regular), 600 (SemiBold), 700 (Bold)

**Secondary: DM Sans**
- Usage: Body text, buttons, UI labels
- Why: Modern, friendly, excellent readability
- Weights: 400 (Regular), 500 (Medium), 700 (Bold)

**Tertiary: Space Mono**
- Usage: Numbers, quantities, technical data
- Why: Creates visual rhythm, feels organized
- Weights: 400 (Regular)

### Type Scale

| Name | Font | Size | Line Height | Weight | Usage |
|------|------|------|-------------|--------|-------|
| **Hero** | Playfair | 48px | 56px | 700 | Splash screen |
| **H1** | Playfair | 32px | 40px | 700 | Recipe titles |
| **H2** | Playfair | 28px | 36px | 600 | Screen titles |
| **H3** | DM Sans | 22px | 28px | 700 | Section headers |
| **H4** | DM Sans | 18px | 24px | 600 | Card titles |
| **Body** | DM Sans | 16px | 24px | 400 | Descriptions |
| **Body Small** | DM Sans | 14px | 20px | 400 | Secondary text |
| **Caption** | DM Sans | 12px | 16px | 500 | Labels, tags |
| **Micro** | Space Mono | 11px | 14px | 400 | Quantities |
| **Price** | Space Mono | 14px | 20px | 400 | Ingredient amounts |

---

## 📱 Screen Specifications

### 1. Splash / Onboarding

**Flow:**
- Animated logo reveal
- 3-card onboarding with swipe teach
- Quick dietary preferences (skippable)

**Visual Elements:**
- Full-bleed food photography backgrounds
- Floating recipe cards previewing swipe mechanic
- Progressive dots indicator
- "Start Swiping" primary CTA

### 2. Swipe Discovery (Main Screen)

**Layout:**
```
┌─────────────────────────────┐
│ 🤍 125  Kitchen             │ ← Header (saved count, profile)
├─────────────────────────────┤
│                             │
│     ┌─────────────────┐     │ ← Recipe Card (70% of screen)
│     │                 │     │
│     │   Food Photo    │     │
│     │   (Aspect 4:5)  │     │
│     │                 │     │
│     │   ┌─────────┐   │     │
│     │   │ ❤️ LIKE  │   │     │
│     │   └─────────┘   │     │
│     ├─────────────────┤     │
│     │ Recipe Name     │     │
│     │ ⏱️ 25 min ✨ 4.5 │     │
│     │ Category tags   │     │
│     └─────────────────┘     │
│                             │
│  ✕         🤤         ❤️    │ ← Action Bar
│ SKIP     DETAILS     LIKE   │
└─────────────────────────────┘
```

**Card Anatomy:**
- **Image Area:** 4:5 aspect ratio, full width
- **Overlay Gradient:** Bottom 40% for text readability
- **Title:** Playfair H1, white, slight text shadow
- **Meta Row:** Clock icon + time, Flame icon + calories
- **Tags:** Rounded pills, Verde background
- **Action Hints:** Ghost icons that appear on drag

### 3. Recipe Detail Modal

**Layout:**
- **Header:** Sticky, collapsible with back arrow
- **Hero Image:** Full width, parallax scroll
- **Title Section:** Recipe name, rating, time, servings
- **Ingredients:** Expandable accordion, checkable items
- **Instructions:** Numbered steps with photos
- **Footer:** "Add to Menu" fixed button

### 4. This Week's Menu

**Layout:**
```
┌─────────────────────────────┐
│ ← Your Menu         Share   │
├─────────────────────────────┤
│ 📅 Mon, Jan 12              │
├─────────────────────────────┤
│ ┌───┐  Grilled Salmon       │
│ │ 🐟 │  With asparagus      │
│ └───┘  [x] Remove          │
├─────────────────────────────┤
│ (Empty - "+" to add)        │
├─────────────────────────────┤
│ 📅 Tue, Jan 13              │
│ ...                         │
│                             │
│ ┌─────────────────────────┐ │
│ │ 🛒 Generate Grocery List│ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Features:**
- Day-by-day accordion or vertical stack
- Drag to reorder recipes
- Swipe to remove with undo
- Empty day placeholder with "+" to browse

### 5. Grocery List

**Layout:**
- Grouped by store aisle (Produce, Dairy, Meats, etc.)
- Checkboxes with satisfying animation
- Auto-collapse completed items after 2 seconds
- Smart grouping (combining duplicate ingredients)
- "Shop in store" mode with larger checkboxes

### 6. Profile / Settings

**Sections:**
- Dietary preferences (vegan, GF, allergies)
- Household size (affects portion calculations)
- Notification settings
- Meal history / stats
- Account management

---

## 👆 Swipe Interaction Design

### Swipe Mechanics

**Tinder-Style Card Stack:**
- Cards stacked 3 deep with scale + translation offset
- Foreground card responds to touch
- Background cards subtly animate in

**Swipe Physics:**
```
Thresholds:
- Minimum swipe distance: 80px
- Commit velocity: 300px/s
- Resistance: 0.8 (slows down near center)
- Snap back: Spring animation (damping: 0.7)
- Exit animation: 300ms ease-out
```

**Card Rotation:**
```
Rotation = (dx / screenWidth) * 15°
// Max ±15° rotation for natural feel
```

**Background Card Animation:**
```
Card 2 (next card):
- Scale: 0.92 → 1.0 (as Card 1 exits)
- TranslateY: 8px → 0px
- Opacity: 0.7 → 1.0

Card 3:
- Scale: 0.85
- TranslateY: 16px
- Opacity: 0.5
```

### Action Feedback

**Like (Swipe Right):**
1. Heart icon fades in + scales from 0.5 → 1.0
2. Icon pulses once (scale 1.0 → 1.2 → 1.0)
3. Card exits right with rotation
4. Verde flash overlay (10% opacity)
5. Haptic: Light tap
6. Sound: Subtle "ding" or "pop" (optional, user-controlled)

**Skip (Swipe Left):**
1. X icon fades in + scales from 0.5 → 1.0
2. Card exits left with rotation
3. Subtle Pepe (coral) tint on icon
4. Haptic: Light tap (softer than like)

**Super Like (Swipe Up):**
1. Star icon explodes outward with particle effects
2. Card scales up momentarily
3. Exits top with fade
4. Haptic: Double tap + success vibration
5. Recipe added to "Must Make" collection

**Undo (Button / Shake):**
1. Card slides back from off-screen
2. Elastic bounce animation
3. Haptic: Soft warning

---

## ✨ Micro-Interactions

### 1. Card Entry

**Sequence:**
```
0ms:   Card appears off-screen bottom (translateY: 100%)
50ms:  Card begins slide up
200ms: Card reaches position with slight overshoot
250ms: Spring settles to final position

Easing: cubic-bezier(0.34, 1.56, 0.64, 1) (overshoot)
```

### 2. Checkbox Completion (Grocery List)

**Sequence:**
```
0ms:   User taps checkbox
50ms:  Checkmark draws in (stroke animation)
100ms: Item scales down slightly (0.95)
150ms: Text strikethrough animates in
200ms: Item fades to 50% opacity
500ms: Item slides out or collapses
```

### 3. Recipe Added to Menu (Match)

**Sequence:**
```
0ms:    Card exits right
100ms:  Confetti burst from center (5-8 particles)
200ms:  Toast slides up: "Added to Monday!"
400ms:  Counter in header increments with bounce
1000ms: Toast slides down, disappears
```

### 4. Empty State Wiggle

When user tries to swipe but no cards left:
- Card stack shakes left/right (±5px, 3 times)
- Haptic: Triple tap
- Toast: "You've seen it all! 🎉"

### 5. Pull to Refresh

**Sequence:**
```
0-80px:  Cards pull down, reveal "Keep swiping?" text
80px+:   Spinner appears, text changes to "Release for new recipes"
Release: Spinner spins, cards shuffle/fade
Completion: Fresh cards slide up
```

---

## 🎭 Empty & Loading States

### Empty Swipe Deck

**Visual:**
- Illustration of chef hat or empty plate
- Headline: "You're all caught up! 🎉"
- Subtext: "Check back tomorrow for new recipes"
- CTA: "Browse your saved recipes"

### Empty Menu

**Visual:**
- Illustration of calendar with hearts
- Headline: "Time to plan your week!"
- Subtext: "Swipe right on recipes you love"
- CTA: "Start Swiping" → Navigates to deck

### Empty Grocery List

**Visual:**
- Illustration of shopping bag
- Headline: "Your list is empty"
- Subtext: "Add recipes to your menu first"
- CTA: "Go to Menu"

### Loading States

**Recipe Cards Loading:**
- Shimmer effect over card silhouette
- Show 2-3 placeholder cards with gradient animation
- Never show empty white space

**Image Loading:**
- Progressive blur-up (blur placeholder → sharp image)
- Or solid Caramello background with food emoji

---

## 🎯 Icon Style

**Primary Set: Phosphor Icons (Light)**
- Style: Light weight, rounded caps
- Consistent 24px grid
- Color: Inherits from parent (usually Espresso or white)

**Custom Icons:**
- Logo: Custom fork + heart combination
- Tab bar: Custom filled variants for active state

**Tab Bar Icons:**
| Tab | Icon (Inactive) | Icon (Active) |
|-----|-----------------|---------------|
| Discover | Fork/Knife outline | Fork/Knife filled |
| Menu | Calendar outline | Calendar filled |
| Groceries | Shopping bag outline | Shopping bag filled |
| Profile | User outline | User filled |

---

## 🌙 Dark Mode

### Design Principles

**Not just inverted:** Dark mode uses warmer, softer colors to reduce eye strain while maintaining brand personality.

**Key Differences:**
- Background: Ombra (#1A1512) instead of Milk
- Cards: Legno (#2D2521) instead of Foam
- Text: Cera (#EADFD4) instead of Espresso
- Reduced contrast on images (85% opacity)
- Shadows become highlights (subtle glow)

**Automatic Switching:**
- Follows system preference by default
- Manual override in settings
- Persists across sessions

### Color Mapping

| Light Mode | Dark Mode | Notes |
|------------|-----------|-------|
| Milk (#FDFBF7) | Ombra (#1A1512) | Background |
| Foam (#FFFFFF) | Legno (#2D2521) | Cards |
| Espresso (#2D2420) | Cera (#EADFD4) | Primary text |
| Mocha (#5C4A42) | Latte (#A89A8F) | Secondary text |
| Apricot (#F5A962) | Apricot (#F5A962) | Accent (unchanged) |
| Verde (#6B8E5E) | Verde (#6B8E5E) | Success (unchanged) |

---

## 📐 Spacing System

**Base Unit:** 4px

| Name | Value | Usage |
|------|-------|-------|
| **xs** | 4px | Icon padding, tight gaps |
| **sm** | 8px | Card internal padding |
| **md** | 16px | Section gaps, button padding |
| **lg** | 24px | Screen margins, major sections |
| **xl** | 32px | Hero spacing, bottom sheets |
| **2xl** | 48px | Screen top/bottom padding |

---

## 🔔 Notifications

### Push Notification Styles

**Daily Reminder:**
```
Title: "What's for dinner tonight? 🍽️"
Body: "You have 3 recipes waiting. Swipe to decide!"
```

**New Recipes Available:**
```
Title: "Fresh recipes just dropped! 👨‍🍳"
Body: "15 new meals based on your preferences"
```

**Grocery Day Reminder:**
```
Title: "Shopping day tomorrow! 🛒"
Body: "Review your list for this week"
```

### In-App Notifications

- **Toast messages:** Slide up from bottom, auto-dismiss after 2s
- **Banners:** Slide down from top, manual dismiss
- **Modals:** Center of screen, backdrop blur

---

## 🎵 Sound Design (Optional)

**Toggle:** Off by default, enable in settings

| Event | Sound | Volume |
|-------|-------|--------|
| Swipe Right | Soft "pop" | 30% |
| Swipe Left | Subtle "whoosh" | 20% |
| Match | Satisfying "ding" | 40% |
| Undo | Quick "zip" | 25% |
| Checkbox | Click | 15% |

---

## 🧪 A/B Test Considerations

**Variables to test:**
1. **Swipe direction:** Right = like vs Left = like (cultural)
2. **Card size:** Full screen vs 80% height
3. **Action buttons:** Show always vs show on hover only
4. **Onboarding:** Forced vs skippable
5. **Match animation:** Confetti vs simple toast

---

## 📏 Responsive Considerations

**Target Devices:**
- iPhone SE (375px) → iPhone 15 Pro Max (430px)
- Android Pixel (360px) → Samsung Galaxy (412px)

**Breakpoints:**
- Small: < 380px (iPhone SE, compact)
- Medium: 380-414px (most phones)
- Large: > 414px (Pro Max, Android large)

**Adaptations:**
- Card height scales with viewport
- Font sizes adjust ±2px at extremes
- Tab bar icons remain 24px

---

## 🚀 Motion Principles

**Brand Feel:** Playful but refined, snappy but smooth

**Timing:**
- Quick interactions: 150-250ms
- Page transitions: 300-400ms
- Deliberate reveals: 500-800ms

**Easing:**
- Entry: `cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot)
- Exit: `cubic-bezier(0.4, 0, 1, 1)` (ease-in)
- Standard: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out)

---

## ✅ Design Checklist

Before handoff to development:

- [ ] All screens designed in Figma
- [ ] Light & dark mode variants
- [ ] Empty states for all screens
- [ ] Loading states defined
- [ ] Error states defined
- [ ] Accessibility labels added
- [ ] Animation specs documented
- [ ] Responsive breakpoints tested
- [ ] Icon set exported
- [ ] Design tokens in code-ready format

---

*Design spec by Kimi + Jarvis | Ready for development*
