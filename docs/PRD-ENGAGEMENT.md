# MealSwipe PRD: Engagement & Community Features

> **Status:** In Development | **Priority:** P0 | **Target:** Build #12

---

## 📋 Overview

MealSwipe is a Tinder-style meal planning app. This PRD covers the new engagement layer features that transform MealSwipe from a "meal planning tool" into a **social recipe discovery platform** with addictive retention mechanics.

**Goal:** Increase daily active usage, retention, and viral growth through community features and gamification.

---

## 🎯 Core Features

### 1. Community Recipes (User-Generated Content)

**Flow:**
1. User taps "+" to create recipe
2. Uploads photo(s), recipe name, rough ingredients (optional)
3. AI fills in: description, tags, prep/cook time, nutrition estimate, formatting
4. User reviews/edits AI suggestions
5. Posts to:
   - Their personal "My Recipes" deck
   - Community feed (mixed into everyone's main swipe pool)

**Key Decisions:**
- Community recipes are **mixed into the main swipe feed** (tagged "From Community")
- NOT a separate swipe deck - integrated experience
- Simple flag/report system for moderation
- AI auto-flags inappropriate content

### 2. Engagement & Social Proof

**Creator Dashboard:**
- Total recipe views (swipes)
- Total likes (right swipes)
- Total "added to meal plan" count
- Follower count (people following creator)
- Weekly metrics summary

**Notifications:**
- "Your Spicy Tacos got 12 likes! 🔥"
- "Added to 5 meal plans this week!"
- "You have 3 new followers!"
- **Batch daily** (not instant spam) for non-urgent updates

**Creator Profile (Chef Page):**
- All their recipes listed
- Total engagement stats
- Follow button
- Bio/description

### 3. AI Recipe Completion

**Stack:**
- Vision model (Claude/Gemini) for photo → ingredients detection
- Recipe LLM to complete/format the card
- Similar recipe matching for nutrition estimates

**User Experience:**
1. Upload blurry photo + "Spicy Chicken Tacos"
2. AI fills: proper description, tags, nutrition, cook time, ingredient quantities
3. User reviews and accepts/edits
4. One-tap publish

**This is the "magic" that justifies Premium subscription.**

### 4. Gamification Layer

~~**Daily Spin / Gacha:** (REMOVED - out of scope)~~

**Streaks:**
- Consecutive days opening app / planning meals
- Visual streak counter
- Streak rewards at milestones (7 days, 30 days, 100 days)
- Streak protector item

**Achievements / Badges:**
- "Recipe Creator" - Upload first recipe
- "Community Chef" - 10 recipes with 100+ likes
- "Meal Planner" - Plan meals for 4 weeks straight
- "Streak Master" - 30 day streak

### 5. Creator Program (Post-Launch)

**Strategy:**
1. Partner with food TikTok/IG creators
2. Creators post recipes on MealSwipe
3. Tell followers: "Save my weekly meal plan on MealSwipe!"
4. Followers download → discover other creators → follow them
5. More creators want in → flywheel

**Onboarding Flow for Creators:**
- "Apply to Creator Program" in settings
- Verified badge after approval
- Priority placement in feed
- Analytics dashboard

---

## 🗄️ Database Schema Additions

### community_recipes
```sql
CREATE TABLE community_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_urls TEXT[] NOT NULL,
  prep_time INT,
  cook_time INT,
  calories INT,
  servings INT DEFAULT 4,
  ingredients JSONB,  -- [{name, amount, unit}]
  instructions JSONB, -- [{step_number, text}]
  tags TEXT[],
  ai_generated BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active', -- active, flagged, removed
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_community_recipes_user ON community_recipes(user_id);
CREATE INDEX idx_community_recipes_status ON community_recipes(status);
```

### recipe_engagement
```sql
CREATE TABLE recipe_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES community_recipes(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  engagement_type TEXT NOT NULL, -- 'view', 'like', 'add_to_plan', 'share'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(recipe_id, user_id, engagement_type)
);

CREATE INDEX idx_engagement_recipe ON recipe_engagement(recipe_id);
CREATE INDEX idx_engagement_user ON recipe_engagement(user_id);
```

### user_follows
```sql
CREATE TABLE user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) NOT NULL,
  following_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);
```

### user_streaks
```sql
CREATE TABLE user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE,
  streak_protectors INT DEFAULT 0
);
```

### user_achievements
```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);
```

---

## 📱 UI Screens to Build

### 1. Create Recipe Screen
- Photo upload (multiple images)
- Recipe name input
- "AI Complete" button → shows loading → fills fields
- Ingredients list (editable)
- Instructions (editable)
- Tags selector
- "Share with Community" toggle
- Publish button

### 2. Creator Dashboard
- Stats cards: Views, Likes, Meal Plans, Followers
- Weekly chart
- Recent activity feed
- "My Recipes" list

### 3. Chef Profile Page
- Header with avatar, name, bio
- Stats row
- Follow button
- Recipe grid

### 4. Achievements Screen
- Grid of badges (locked/unlocked)
- Progress bars for in-progress achievements
- Streak display with fire emoji

---

## 🎨 Design Tokens (from existing spec)

Use existing MealSwipe design system:
- Primary: Apricot (#F5A962)
- Success: Verde (#6B8E5E)
- Background: Milk (#FDFBF7)
- Text: Espresso (#2D2420)
- Font: Playfair Display (headers), DM Sans (body)

---

## 🚀 Implementation Priority

**Phase 1 (This Build):**
1. ✅ Community recipes table + CRUD
2. ✅ Create recipe screen with photo upload
3. ✅ AI recipe completion (basic)
4. ✅ Mix community recipes into swipe feed
5. ✅ Basic engagement tracking (views, likes)

**Phase 2 (Post-Launch):**
1. Creator dashboard
2. Follow system
3. Notifications (batch daily)
4. Chef profile pages

**Phase 3 (Growth):**
1. Streak system
2. Achievements
3. Creator program onboarding

---

## 📊 Success Metrics

- **Engagement:** Daily recipe uploads
- **Retention:** 7-day return rate
- **Viral:** Recipes shared externally
- **Monetization:** Premium conversion rate

---

*PRD by Jarvis | Feb 13, 2026*
