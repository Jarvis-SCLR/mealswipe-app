# MealSwipe - Technical Architecture

> **Goal:** Tinder-style meal planning app that makes weekly meal decisions fast, fun, and automatic.

---

## 🏗️ Tech Stack

### Frontend
- **React Native** with **Expo** (managed workflow)
- **TypeScript** (type safety, better DX)
- **Expo Router** (file-based navigation, deep links)
- **React Native Reanimated** (smooth swipe animations)
- **Gesture Handler** (swipe gestures)

### Backend
- **Supabase** (PostgreSQL + Auth + Storage + Realtime)
  - User auth (email, Google, Apple)
  - Recipe database
  - User preferences & swipe history
  - Grocery lists
- **Edge Functions** (Node.js) for:
  - Recipe scraping/enrichment
  - Grocery list optimization
  - Push notifications

### Third-Party Services
- **Spoonacular API** - Recipe data source (initially)
- **RevenueCat** - Subscription management
- **Expo Notifications** - Push reminders
- **Cloudinary** or **Supabase Storage** - Image optimization

---

## 📱 Core Screens

### 1. Auth Flow
```
Splash → (Check Auth) → [Login | Signup | Home]
```
- Email/password + social (Google, Apple)
- Optional onboarding: dietary preferences, household size

### 2. Swipe Deck (Main Screen)
```
┌─────────────────────┐
│  Recipe Card Stack  │
│  ┌───────────────┐  │
│  │   Food Photo  │  │
│  │               │  │
│  │  Recipe Name  │  │
│  │  Time • Cal   │  │
│  │  Tags/Tags    │  │
│  └───────────────┘  │
│                     │
│  [Skip]  [❤️ Add]   │
└─────────────────────┘
```
- Stack of 3-5 cards visible
- Swipe left = skip (with undo toast)
- Swipe right = add to menu (celebration animation)
- Tap card = expand to full recipe view

### 3. This Week's Menu
```
┌─────────────────────┐
│ Mon  Tue  Wed  Thu  │ ← Horizontal scroll days
├─────────────────────┤
│ 🌅 Breakfast        │
│   • Oatmeal         │
│                     │
│ 🥗 Lunch            │
│   • Salad           │
│                     │
│ 🍝 Dinner           │
│   • Pasta           │
└─────────────────────┘
```
- Drag-and-drop recipes between days
- Tap to remove or swap
- "Fill gaps" button suggests recipes for empty slots

### 4. Grocery List
```
┌─────────────────────┐
│ 🔍 Search items     │
├─────────────────────┤
│ ☐ Milk (2 cups)     │
│ ☐ Eggs (6)          │
│ ☑️ Bread            │ ← Strike through when checked
│ ☐ Chicken breast    │
│                     │
│ 🗑️ Already have?    │ ← Quick remove
└─────────────────────┘
```
- Auto-grouped by store section (produce, dairy, etc.)
- Manual add items
- Share list (text/export)

### 5. Settings
- Dietary preferences (vegetarian, allergies, etc.)
- Household size (scales ingredients)
- Notification preferences
- Subscription management

---

## 🗄️ Database Schema

### users
```sql
- id: uuid (auth.users)
- email: text
- display_name: text
- household_size: int (default: 2)
- dietary_prefs: jsonb (vegetarian, vegan, allergies, etc.)
- created_at: timestamp
```

### recipes
```sql
- id: uuid
- name: text
- description: text
- image_url: text
- prep_time: int (minutes)
- cook_time: int
- calories: int
- servings: int
- ingredients: jsonb [{name, amount, unit}]
- instructions: jsonb [{step_number, text}]
- tags: text[] (quick, healthy, vegetarian, etc.)
- source_url: text (optional)
- created_at: timestamp
```

### swipes
```sql
- id: uuid
- user_id: uuid (FK → users)
- recipe_id: uuid (FK → recipes)
- direction: text ('left' | 'right')
- created_at: timestamp
- UNIQUE(user_id, recipe_id) ← One swipe per recipe per user
```

### weekly_menus
```sql
- id: uuid
- user_id: uuid (FK → users)
- week_start: date (Monday of the week)
- recipe_id: uuid (FK → recipes)
- day: text ('monday' | 'tuesday' | ...)
- meal_type: text ('breakfast' | 'lunch' | 'dinner')
- created_at: timestamp
```

### grocery_lists
```sql
- id: uuid
- user_id: uuid (FK → users)
- week_start: date
- items: jsonb [{name, amount, unit, checked, category}]
- created_at: timestamp
```

---

## 🔑 Key Features

### 1. Smart Recipe Recommendations
- Don't show recipes user already swiped on
- Prioritize recipes matching dietary prefs
- Learn from swipes (if user loves chicken recipes, show more)
- Time-based suggestions (quick meals on weekdays, elaborate on weekends)

### 2. Grocery List Intelligence
- Combine duplicate ingredients (2 cups milk + 1 cup milk = 3 cups milk)
- Group by store section for efficient shopping
- Scale ingredients based on household size
- Allow manual edits/additions

### 3. Swipe Mechanics (Addicting UX)
- Card rotation on swipe (like Tinder)
- "Like" stamp animation on right swipe
- Satisfying "whoosh" haptic + sound
- Undo button for accidental skips
- Streak counter (consecutive days planning meals)

### 4. Onboarding Flow
1. Quick signup (email or social)
2. Optional: Select dietary preferences
3. Optional: Set household size
4. Start swiping immediately (no forced tutorial)

### 5. Monetization (Freemium)
**Free:**
- 10 swipes per day
- 1 week menu planning
- Basic grocery list

**Premium ($4.99/mo or $29.99/yr):**
- Unlimited swipes
- 4-week menu planning
- Grocery list sharing
- Nutritional tracking
- Custom recipe uploads
- Family sharing (up to 4 members)

---

## 🚀 Development Phases

### Phase 1: MVP (4-6 weeks)
- [ ] Expo project setup
- [ ] Auth flow (email + Google)
- [ ] Swipe deck with 50 sample recipes
- [ ] Weekly menu view (read-only)
- [ ] Grocery list (auto-generated)
- [ ] Basic onboarding

### Phase 2: Polish (2-3 weeks)
- [ ] Swipe animations (reanimated)
- [ ] Haptics + sound effects
- [ ] Undo functionality
- [ ] Dark mode
- [ ] Settings screen
- [ ] Recipe detail view

### Phase 3: Intelligence (2-3 weeks)
- [ ] Preference-based recommendations
- [ ] Swipe learning algorithm
- [ ] Grocery list optimization
- [ ] "Fill gaps" suggestions

### Phase 4: Monetization (2 weeks)
- [ ] RevenueCat integration
- [ ] Paywall implementation
- [ ] Premium feature gating
- [ ] Subscription management

### Phase 5: Launch (2 weeks)
- [ ] App Store assets
- [ ] TestFlight beta
- [ ] Bug fixes + performance
- [ ] Marketing site (web)

---

## 🔒 Security & Privacy

- **Auth:** Supabase Row Level Security (users can only access their own data)
- **Storage:** Recipes are public, menus/lists are private
- **Payments:** RevenueCat handles all payment data (we never see credit cards)
- **Privacy:** No selling user data, GDPR-compliant export/delete

---

## 📊 Analytics Events

Track these key events:
- `swipe_left` / `swipe_right`
- `recipe_viewed` (expanded card)
- `menu_created` (first recipe added)
- `grocery_list_viewed`
- `grocery_list_shared`
- `subscription_started`
- `onboarding_completed`

Use **Mixpanel** or **Amplitude** (free tier sufficient initially).

---

## 🧪 Testing Strategy

- **Unit tests:** Jest for utility functions
- **Component tests:** React Native Testing Library
- **E2E tests:** Detox (critical flows: auth, swipe, menu)
- **Manual testing:** TestFlight beta group

---

## 🚢 Deployment

### Mobile
- **Expo Application Services (EAS)** for builds
- Automatic versioning + code signing
- Separate builds for dev/staging/prod

### Backend
- Supabase handles scaling automatically
- Edge Functions for serverless compute
- Monitor with Supabase dashboard + Sentry for errors

---

## 📈 Success Metrics

**Week 1:**
- 100 TestFlight users
- 70% complete onboarding
- 50% add 5+ recipes to menu

**Month 1:**
- 500 users
- 30% weekly retention
- 10% conversion to premium

**Month 3:**
- 2,000 users
- 40% weekly retention
- 15% conversion to premium
- $1,000+ MRR

---

## 🛠️ Dev Setup

```bash
# Clone repo
git clone https://github.com/yourname/mealswipe.git
cd mealswipe

# Install dependencies
npm install

# Start Expo
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

**Environment variables:**
```
EXPO_PUBLIC_SUPABASE_URL=your-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key
SPOONACULAR_API_KEY=your-key
REVENUECAT_API_KEY=your-key
```

---

## 🎯 Next Steps

1. **Setup:** `npx create-expo-app mealswipe --template tabs`
2. **Supabase:** Create project, run migrations
3. **Spoonacular:** Get API key, import 100 starter recipes
4. **Build swipe UI:** Start with hardcoded recipes
5. **Iterate:** Get feedback early, refine constantly

---

*Architecture by Jarvis | Design spec in progress by Kimi*
