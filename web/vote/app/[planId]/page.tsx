'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion';

interface Recipe {
  id: string;
  name: string;
  image: string;
  prepTime: string;
  cookTime?: string;
  tags: string[];
  description?: string;
  nutrition?: { calories?: number };
}

interface Vote {
  recipeId: string;
  vote: 'yes' | 'no';
}

type Screen = 'welcome' | 'name' | 'voting' | 'complete';

export default function VotePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const planId = params.planId as string;
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [voterName, setVoterName] = useState('');
  const [screen, setScreen] = useState<Screen>('welcome');
  
  // Get cook's name from URL
  const cookName = searchParams.get('from') || 'Your household';
  const householdName = searchParams.get('household') || '';

  useEffect(() => {
    const recipesParam = searchParams.get('recipes');
    if (recipesParam) {
      try {
        const decoded = JSON.parse(atob(recipesParam));
        setRecipes(decoded);
      } catch (e) {
        console.error('Failed to decode recipes:', e);
        setRecipes(getDemoRecipes());
      }
    } else {
      setRecipes(getDemoRecipes());
    }
    setLoading(false);
  }, [searchParams]);

  const currentRecipe = recipes[currentIndex];
  const nextRecipe = recipes[currentIndex + 1];
  const isComplete = currentIndex >= recipes.length;

  useEffect(() => {
    if (isComplete && screen === 'voting') {
      setScreen('complete');
    }
  }, [isComplete, screen]);

  const handleVote = (vote: 'yes' | 'no') => {
    if (!currentRecipe) return;
    
    const newVote = { recipeId: currentRecipe.id, vote };
    setVotes(prev => [...prev, newVote]);
    setCurrentIndex(prev => prev + 1);
    
    // Save to localStorage
    const storageKey = `votes_${planId}`;
    const existingVotes = JSON.parse(localStorage.getItem(storageKey) || '[]');
    existingVotes.push({ 
      recipeId: currentRecipe.id, 
      recipeName: currentRecipe.name,
      vote, 
      voterName, 
      timestamp: Date.now() 
    });
    localStorage.setItem(storageKey, JSON.stringify(existingVotes));
  };

  const yesCount = votes.filter(v => v.vote === 'yes').length;
  const votedRecipes = votes.filter(v => v.vote === 'yes').map(v => 
    recipes.find(r => r.id === v.recipeId)?.name
  ).filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div 
          className="text-6xl"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          🍽️
        </motion.div>
      </div>
    );
  }

  // Welcome screen - shows who invited them
  if (screen === 'welcome') {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center h-screen px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div 
          className="text-7xl mb-6"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          🍳
        </motion.div>
        <h1 
          className="text-3xl font-bold mb-3 text-center"
          style={{ fontFamily: 'Playfair Display', color: 'var(--espresso)' }}
        >
          {cookName} invited you!
        </h1>
        <p className="text-center opacity-70 mb-2 text-lg">
          Help pick meals for the week
        </p>
        {householdName && (
          <p className="text-center opacity-50 text-sm mb-6">
            {householdName}
          </p>
        )}
        <div className="flex gap-2 mb-8">
          {['🍕', '🥗', '🍜', '🌮'].map((emoji, i) => (
            <motion.span 
              key={emoji}
              className="text-3xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              {emoji}
            </motion.span>
          ))}
        </div>
        <p className="text-center opacity-60 mb-8 max-w-xs">
          Swipe right on meals you'd love to eat.
          <br />Your votes help {cookName.split(' ')[0]} plan the menu!
        </p>
        <motion.button
          onClick={() => setScreen('name')}
          className="px-10 py-4 rounded-2xl font-bold text-white text-lg shadow-lg"
          style={{ backgroundColor: 'var(--apricot)' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Let's Go! 🚀
        </motion.button>
        <p className="text-xs opacity-30 mt-8">
          {recipes.length} meals to vote on
        </p>
      </motion.div>
    );
  }

  // Name input screen
  if (screen === 'name') {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center h-screen px-6"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="text-6xl mb-4">👋</div>
        <h1 
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: 'Playfair Display' }}
        >
          What's your name?
        </h1>
        <p className="text-center mb-6 opacity-60 text-sm">
          So {cookName.split(' ')[0]} knows who voted
        </p>
        <input
          type="text"
          value={voterName}
          onChange={(e) => setVoterName(e.target.value)}
          placeholder="Your name"
          className="w-full max-w-xs px-5 py-4 rounded-2xl border-2 text-center text-lg mb-4 focus:outline-none focus:border-[var(--apricot)]"
          style={{ 
            borderColor: 'rgba(45,36,32,0.15)',
            backgroundColor: 'var(--foam)'
          }}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && voterName.trim() && setScreen('voting')}
        />
        <motion.button
          onClick={() => voterName.trim() && setScreen('voting')}
          disabled={!voterName.trim()}
          className="px-8 py-3 rounded-xl font-bold text-white transition-all disabled:opacity-40"
          style={{ backgroundColor: 'var(--apricot)' }}
          whileHover={{ scale: voterName.trim() ? 1.02 : 1 }}
          whileTap={{ scale: voterName.trim() ? 0.98 : 1 }}
        >
          Start Voting
        </motion.button>
      </motion.div>
    );
  }

  // Complete screen
  if (screen === 'complete') {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center h-screen px-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div 
          className="text-7xl mb-4"
          animate={{ rotate: [0, 10, -10, 10, 0] }}
          transition={{ duration: 0.5 }}
        >
          🎉
        </motion.div>
        <h1 
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: 'Playfair Display' }}
        >
          Thanks, {voterName}!
        </h1>
        <p className="text-center mb-6 opacity-70">
          You voted 👍 on {yesCount} meal{yesCount !== 1 ? 's' : ''}
        </p>
        
        {votedRecipes.length > 0 && (
          <div className="w-full max-w-xs mb-6">
            <p className="text-xs opacity-50 text-center mb-2">Your picks:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {votedRecipes.slice(0, 5).map((name, i) => (
                <span 
                  key={i}
                  className="px-3 py-1 rounded-full text-sm"
                  style={{ backgroundColor: 'var(--caramello)' }}
                >
                  {name}
                </span>
              ))}
              {votedRecipes.length > 5 && (
                <span className="px-3 py-1 text-sm opacity-50">
                  +{votedRecipes.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
        
        <div 
          className="p-4 rounded-2xl text-center max-w-xs"
          style={{ backgroundColor: 'var(--foam)' }}
        >
          <p className="text-sm opacity-60">
            {cookName.split(' ')[0]} will finalize the menu.
            <br />You might get a notification when it's ready!
          </p>
        </div>
        
        <p className="text-xs opacity-30 mt-8">
          Close this tab anytime
        </p>
      </motion.div>
    );
  }

  // Voting screen
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 text-center">
        <h1 className="text-xl font-semibold" style={{ fontFamily: 'Playfair Display' }}>
          Vote
        </h1>
        <p className="text-sm opacity-60 mt-1">
          {currentIndex + 1} of {recipes.length} • {yesCount} liked
        </p>
      </header>

      {/* Card Stack */}
      <div className="flex-1 relative flex items-center justify-center px-4">
        <AnimatePresence mode="popLayout">
          {nextRecipe && (
            <RecipeCard
              key={nextRecipe.id + '-next'}
              recipe={nextRecipe}
              isNext
            />
          )}
          {currentRecipe && (
            <SwipeableCard
              key={currentRecipe.id}
              recipe={currentRecipe}
              onVote={handleVote}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="pb-8 pt-4 px-12 flex justify-between items-center">
        <motion.button
          onClick={() => handleVote('no')}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
          style={{ backgroundColor: 'var(--foam)' }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <span className="text-2xl">👎</span>
        </motion.button>
        <motion.button
          onClick={() => handleVote('yes')}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
          style={{ backgroundColor: 'var(--foam)' }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <span className="text-2xl">👍</span>
        </motion.button>
      </div>
    </div>
  );
}

function RecipeCard({ recipe, isNext = false }: { recipe: Recipe; isNext?: boolean }) {
  return (
    <div
      className="absolute w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl"
      style={{
        backgroundColor: 'var(--foam)',
        transform: isNext ? 'scale(0.95)' : 'scale(1)',
        opacity: isNext ? 0.5 : 1,
        zIndex: isNext ? 0 : 1,
      }}
    >
      <div
        className="h-2/3 bg-cover bg-center"
        style={{ backgroundImage: `url(${recipe.image})` }}
      />
      <div className="p-4">
        <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'Playfair Display' }}>
          {recipe.name}
        </h2>
        <p className="text-sm opacity-60 mb-3">
          ⏱️ {recipe.prepTime} {recipe.nutrition?.calories && `• 🔥 ${recipe.nutrition.calories} cal`}
        </p>
        <div className="flex gap-2 flex-wrap">
          {recipe.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-xs text-white"
              style={{ backgroundColor: 'var(--verde)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SwipeableCard({ recipe, onVote }: { recipe: Recipe; onVote: (vote: 'yes' | 'no') => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const yesOpacity = useTransform(x, [0, 100], [0, 1]);
  const noOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      onVote('yes');
    } else if (info.offset.x < -threshold) {
      onVote('no');
    }
  };

  return (
    <motion.div
      className="absolute w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
      style={{
        backgroundColor: 'var(--foam)',
        x,
        rotate,
        zIndex: 2,
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ 
        x: x.get() > 0 ? 500 : -500, 
        opacity: 0, 
        transition: { duration: 0.3 } 
      }}
    >
      {/* YES overlay */}
      <motion.div
        className="absolute top-6 left-6 px-4 py-2 rounded-xl border-4 font-bold text-lg z-10"
        style={{
          borderColor: 'var(--verde)',
          color: 'var(--verde)',
          backgroundColor: 'rgba(255,255,255,0.95)',
          opacity: yesOpacity,
        }}
      >
        👍 YES
      </motion.div>

      {/* NO overlay */}
      <motion.div
        className="absolute top-6 right-6 px-4 py-2 rounded-xl border-4 font-bold text-lg z-10"
        style={{
          borderColor: 'var(--pepe)',
          color: 'var(--pepe)',
          backgroundColor: 'rgba(255,255,255,0.95)',
          opacity: noOpacity,
        }}
      >
        👎 NAH
      </motion.div>

      <div
        className="h-2/3 bg-cover bg-center"
        style={{ backgroundImage: `url(${recipe.image})` }}
      />
      <div className="p-4">
        <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'Playfair Display' }}>
          {recipe.name}
        </h2>
        <p className="text-sm opacity-60 mb-3">
          ⏱️ {recipe.prepTime} {recipe.nutrition?.calories && `• 🔥 ${recipe.nutrition.calories} cal`}
        </p>
        <div className="flex gap-2 flex-wrap">
          {recipe.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-xs text-white"
              style={{ backgroundColor: 'var(--verde)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function getDemoRecipes(): Recipe[] {
  return [
    {
      id: 'demo-1',
      name: 'Classic Margherita Pizza',
      description: 'Fresh tomatoes, mozzarella, and basil on a crispy crust.',
      image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
      prepTime: '20 min',
      tags: ['Italian', 'Dinner'],
      nutrition: { calories: 285 }
    },
    {
      id: 'demo-2',
      name: 'Honey Garlic Salmon',
      description: 'Glazed salmon with a sweet and savory honey garlic sauce.',
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
      prepTime: '30 min',
      tags: ['Seafood', 'Healthy'],
      nutrition: { calories: 320 }
    },
    {
      id: 'demo-3',
      name: 'Thai Green Curry',
      description: 'Creamy coconut curry with vegetables and aromatic herbs.',
      image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800',
      prepTime: '40 min',
      tags: ['Thai', 'Spicy'],
      nutrition: { calories: 380 }
    },
    {
      id: 'demo-4',
      name: 'Mediterranean Grain Bowl',
      description: 'Hearty quinoa bowl with feta, olives, and lemon dressing.',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
      prepTime: '30 min',
      tags: ['Healthy', 'Vegetarian'],
      nutrition: { calories: 420 }
    },
  ];
}
