-- Community Recipes Feature Migration
-- Created: 2025-02-13

-- Table for community/user-uploaded recipes
CREATE TABLE IF NOT EXISTS community_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Recipe content
    name VARCHAR(255) NOT NULL,
    description TEXT,
    ingredients TEXT[] DEFAULT '{}',
    instructions TEXT[] DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Metadata
    prep_time VARCHAR(50),
    cook_time VARCHAR(50),
    servings INTEGER DEFAULT 4,
    difficulty VARCHAR(20) DEFAULT 'Medium',
    meal_type VARCHAR(50) DEFAULT 'dinner',
    
    -- Nutrition (estimated)
    nutrition JSONB DEFAULT '{"calories": 0, "protein": 0, "carbs": 0, "fat": 0}',
    
    -- Engagement tracking
    swipe_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    meal_plan_adds INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    
    -- Visibility
    is_community_visible BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_recipes_user_id ON community_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_community_recipes_visible ON community_recipes(is_community_visible) WHERE is_community_visible = true;
CREATE INDEX IF NOT EXISTS idx_community_recipes_like_count ON community_recipes(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_recipes_created_at ON community_recipes(created_at DESC);

-- Table for recipe engagement events
CREATE TABLE IF NOT EXISTS recipe_engagement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES community_recipes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'swipe_right', 'swipe_left', 'add_to_plan', 'view'
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(recipe_id, user_id, action_type)
);

CREATE INDEX IF NOT EXISTS idx_recipe_engagement_recipe_id ON recipe_engagement(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_engagement_user_id ON recipe_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_engagement_action ON recipe_engagement(action_type);

-- Table for creator metrics (cached weekly summaries)
CREATE TABLE IF NOT EXISTS creator_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Aggregated stats
    total_recipes INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    total_meal_plan_adds INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    
    -- Weekly snapshot
    week_start DATE NOT NULL,
    likes_this_week INTEGER DEFAULT 0,
    adds_this_week INTEGER DEFAULT 0,
    views_this_week INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_creator_metrics_user_id ON creator_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_metrics_week ON creator_metrics(week_start DESC);

-- Function to update engagement counts
CREATE OR REPLACE FUNCTION update_recipe_engagement_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.action_type = 'swipe_right' THEN
        UPDATE community_recipes 
        SET like_count = like_count + 1 
        WHERE id = NEW.recipe_id;
    ELSIF NEW.action_type = 'add_to_plan' THEN
        UPDATE community_recipes 
        SET meal_plan_adds = meal_plan_adds + 1 
        WHERE id = NEW.recipe_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for engagement
DROP TRIGGER IF EXISTS tr_update_engagement ON recipe_engagement;
CREATE TRIGGER tr_update_engagement
    AFTER INSERT ON recipe_engagement
    FOR EACH ROW
    EXECUTE FUNCTION update_recipe_engagement_counts();

-- Row Level Security policies
ALTER TABLE community_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_metrics ENABLE ROW LEVEL SECURITY;

-- Community recipes policies
CREATE POLICY "Community recipes are viewable by everyone" 
    ON community_recipes FOR SELECT 
    USING (is_community_visible = true OR user_id = auth.uid());

CREATE POLICY "Users can create their own recipes" 
    ON community_recipes FOR INSERT 
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own recipes" 
    ON community_recipes FOR UPDATE 
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own recipes" 
    ON community_recipes FOR DELETE 
    USING (user_id = auth.uid());

-- Engagement policies
CREATE POLICY "Users can view their own engagement" 
    ON recipe_engagement FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can create engagement" 
    ON recipe_engagement FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Creator metrics policies
CREATE POLICY "Users can view their own metrics" 
    ON creator_metrics FOR SELECT 
    USING (user_id = auth.uid());

-- Function to get creator stats
CREATE OR REPLACE FUNCTION get_creator_stats(creator_user_id UUID)
RETURNS TABLE (
    total_recipes BIGINT,
    total_likes BIGINT,
    total_plan_adds BIGINT,
    total_views BIGINT,
    recipes_this_week BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT cr.id) as total_recipes,
        COALESCE(SUM(cr.like_count), 0) as total_likes,
        COALESCE(SUM(cr.meal_plan_adds), 0) as total_plan_adds,
        COALESCE(SUM(cr.view_count), 0) as total_views,
        COUNT(DISTINCT CASE WHEN cr.created_at > now() - interval '7 days' THEN cr.id END) as recipes_this_week
    FROM community_recipes cr
    WHERE cr.user_id = creator_user_id AND cr.is_community_visible = true;
END;
$$ LANGUAGE plpgsql;
