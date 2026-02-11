import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors } from '../../constants/Colors';
import { RecipeCard } from '../../components/RecipeCard';
import { getWeeklyPlan, recordVote, type WeeklyPlan } from '../../services/householdStorage';
import type { Recipe } from '../../services/recipeApi';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.72;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;

// Generate a simple voter ID for this device session
function getVoterId() {
  return `voter_${Math.random().toString(36).slice(2, 10)}`;
}

export default function PlanVoteScreen() {
  const { planId, code } = useLocalSearchParams<{ planId: string; code?: string }>();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [votedCount, setVotedCount] = useState(0);
  const [voterId] = useState(getVoterId);

  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    load();
  }, [planId]);

  const load = async () => {
    if (!planId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const fetchedPlan = await getWeeklyPlan(planId);
      if (fetchedPlan) {
        setPlan(fetchedPlan);
        setRecipes(fetchedPlan.proposedRecipes);
      }
    } finally {
      setLoading(false);
    }
  };

  const current = recipes[index];
  const next = recipes[index + 1];
  const emptyState = !current;

  const counterText = useMemo(
    () => `${votedCount} votes cast`,
    [votedCount]
  );

  const resetCard = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const advance = () => {
    setIndex((prev) => prev + 1);
    position.setValue({ x: 0, y: 0 });
  };

  const onVote = async () => {
    if (!planId || !current) return;

    try {
      await recordVote(planId, current.id, voterId);
      setVotedCount((prev) => prev + 1);
    } catch (error) {
      console.warn('Error recording vote:', error);
    }
  };

  const completeSwipe = async (direction: 'left' | 'right') => {
    const targetX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

    if (direction === 'right') {
      await onVote();
    }

    Animated.timing(position, {
      toValue: { x: targetX, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      advance();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        position.stopAnimation();
      },
      onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: async (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          completeSwipe('right');
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          completeSwipe('left');
        } else {
          resetCard();
        }
      },
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const nextCardScale = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: [1, 0.95, 1],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.apricot} />
          <Text style={styles.loadingText}>Loading meal options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plan || recipes.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={styles.emptyTitle}>No meals to vote on</Text>
          <Text style={styles.emptySubtitle}>
            The cook hasn't proposed any recipes yet.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={{ width: 60 }} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Vote</Text>
          <Text style={styles.headerSubtitle}>{counterText}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.deck}>
        {emptyState ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyTitle}>All done!</Text>
            <Text style={styles.emptySubtitle}>
              Your votes have been recorded.{'\n'}The cook will finalize the weekly menu.
            </Text>
          </View>
        ) : (
          <>
            {next && (
              <Animated.View
                style={[styles.cardContainer, { transform: [{ scale: nextCardScale }] }]}
                pointerEvents="none"
              >
                <RecipeCard recipe={next} />
              </Animated.View>
            )}

            <Animated.View
              style={[
                styles.cardContainer,
                {
                  transform: [
                    { translateX: position.x },
                    { translateY: position.y },
                    { rotate },
                  ],
                },
              ]}
              {...panResponder.panHandlers}
            >
              <RecipeCard recipe={current} />

              <Animated.View style={[styles.overlay, styles.likeOverlay, { opacity: likeOpacity }]}>
                <Text style={[styles.overlayText, { color: Colors.verde }]}>👍 YES</Text>
              </Animated.View>

              <Animated.View style={[styles.overlay, styles.nopeOverlay, { opacity: nopeOpacity }]}>
                <Text style={[styles.overlayText, { color: Colors.pepe }]}>👎 NAH</Text>
              </Animated.View>
            </Animated.View>
          </>
        )}
      </View>

      <View style={styles.actionBar}>
        <Pressable style={styles.actionPill} onPress={() => completeSwipe('left')}>
          <Text style={[styles.actionText, { color: Colors.pepe }]}>👎</Text>
        </Pressable>
        <Pressable style={styles.actionPill} onPress={() => completeSwipe('right')}>
          <Text style={[styles.actionText, { color: Colors.verde }]}>👍</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.milk,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
  },
  loadingText: {
    marginTop: 16,
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: Colors.espresso,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Playfair Display SemiBold',
    fontSize: 20,
    color: Colors.espresso,
  },
  headerSubtitle: {
    marginTop: 2,
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: 'rgba(45,36,32,0.6)',
  },
  deck: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  overlay: {
    position: 'absolute',
    top: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  likeOverlay: {
    left: 20,
    borderColor: Colors.verde,
  },
  nopeOverlay: {
    right: 20,
    borderColor: Colors.pepe,
  },
  overlayText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 34,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'Playfair Display Bold',
    fontSize: 26,
    color: Colors.espresso,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: 'rgba(45,36,32,0.6)',
    textAlign: 'center',
    lineHeight: 24,
  },
  actionBar: {
    paddingHorizontal: 50,
    paddingBottom: 18,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionPill: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.foam,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  actionText: {
    fontSize: 28,
  },
});
