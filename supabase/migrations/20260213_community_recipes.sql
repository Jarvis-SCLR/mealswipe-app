-- MealSwipe Community Recipes Migration
-- Created: 2026-02-13

-- Community recipes table (user-generated content)
CREATE TABLE IF NOT EXISTS community_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  prep_time INT,
  cook_time INT,
  calories INT,
  servings INT DEFAULT 4,
  ingredients JSONB DEFAULT '[]',
  instructions JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  ai_generated BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'flagged', 'removed', 'draft')),
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  plan_add_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_community_recipes_user ON community_recipes(user_id);
CREATE INDEX idx_community_recipes_status ON community_recipes(status);
CREATE INDEX idx_community_recipes_created ON community_recipes(created_at DESC);

-- Recipe engagement tracking
CREATE TABLE IF NOT EXISTS recipe_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES community_recipes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  engagement_type TEXT NOT NULL CHECK (engagement_type IN ('view', 'like', 'add_to_plan', 'share', 'report')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(recipe_id, user_id, engagement_type)
);

CREATE INDEX idx_engagement_recipe ON recipe_engagement(recipe_id);
CREATE INDEX idx_engagement_user ON recipe_engagement(user_id);
CREATE INDEX idx_engagement_type ON recipe_engagement(engagement_type);

-- User follows (creator following)
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_follows_following ON user_follows(following_id);

-- User streaks for gamification
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE,
  streak_protectors INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Daily spins for gacha/rewards
CREATE TABLE IF NOT EXISTS daily_spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  spin_date DATE NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('recipe_unlock', 'extra_likes', 'badge', 'streak_protector', 'premium_day', 'nothing')),
  reward_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, spin_date)
);

CREATE INDEX idx_spins_user ON daily_spins(user_id);

-- User achievements/badges
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_achievements_user ON user_achievements(user_id);

-- Function to increment engagement counts on community_recipes
CREATE OR REPLACE FUNCTION update_recipe_engagement_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.engagement_type = 'view' THEN
    UPDATE community_recipes SET view_count = view_count + 1 WHERE id = NEW.recipe_id;
  ELSIF NEW.engagement_type = 'like' THEN
    UPDATE community_recipes SET like_count = like_count + 1 WHERE id = NEW.recipe_id;
  ELSIF NEW.engagement_type = 'add_to_plan' THEN
    UPDATE community_recipes SET plan_add_count = plan_add_count + 1 WHERE id = NEW.recipe_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_engagement_counts
AFTER INSERT ON recipe_engagement
FOR EACH ROW EXECUTE FUNCTION update_recipe_engagement_counts();

-- RLS Policies
ALTER TABLE community_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Community recipes: Anyone can read active, owner can CRUD their own
CREATE POLICY "Anyone can view active recipes" ON community_recipes
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can insert own recipes" ON community_recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes" ON community_recipes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes" ON community_recipes
  FOR DELETE USING (auth.uid() = user_id);

-- Engagement: Users can insert their own, read all
CREATE POLICY "Anyone can view engagement" ON recipe_engagement
  FOR SELECT USING (true);

CREATE POLICY "Users can record own engagement" ON recipe_engagement
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Follows: Users manage their own follows
CREATE POLICY "Anyone can view follows" ON user_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow" ON user_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON user_follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Streaks: Users see/update their own
CREATE POLICY "Users can view own streaks" ON user_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks" ON user_streaks
  FOR ALL USING (auth.uid() = user_id);

-- Spins: Users see/create their own
CREATE POLICY "Users can view own spins" ON daily_spins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can spin" ON daily_spins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Achievements: Users see their own
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can grant achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
