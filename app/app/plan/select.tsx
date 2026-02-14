import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors } from '../../constants/Colors';
import { RecipeCard } from '../../components/RecipeCard';
import { getSavedRecipes, type SavedRecipe } from '../../services/menuStorage';
import { addProposedRecipe, getShareLink, getHousehold } from '../../services/householdStorage';
import { applyGeneratedImages } from '../../services/recipeImageService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.72;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;

export default function PlanSelectScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Record<string, true>>({});

  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const saved = await getSavedRecipes();
      const withImages = await applyGeneratedImages(saved);
      setRecipes(withImages);
    } finally {
      setLoading(false);
    }
  };

  const current = recipes[index];
  const next = recipes[index + 1];
  const emptyState = !current;

  const counterText = useMemo(
    () => `${selectedCount} recipes selected for voting`,
    [selectedCount]
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

  const onSelect = async () => {
    if (!planId || !current) return;

    if (selectedIds[current.id]) return;
    await addProposedRecipe(planId, current);
    setSelectedIds((prev) => ({ ...prev, [current.id]: true }));
    setSelectedCount((prev) => prev + 1);
  };

  const completeSwipe = async (direction: 'left' | 'right') => {
    const targetX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

    if (direction === 'right') {
      await onSelect();
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

  const sendToHousehold = async () => {
    if (!planId) return;
    try {
      const household = await getHousehold();
      const cookName = household?.members[0]?.name || 'Your household';
      const link = await getShareLink(planId, cookName);
      
      await Share.share({
        message: `🍽️ Help me pick meals for the week!\n\n${link}`,
        title: 'Vote on meals',
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      if (e?.message !== 'User did not share') {
        Alert.alert('Unable to share', 'Create a household first.');
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.apricot} />
          <Text style={styles.loadingText}>Loading saved recipes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerChip, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.headerChipText}>Back</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Select</Text>
          <Text style={styles.headerSubtitle}>{counterText}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.deck}>
        {emptyState ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Done selecting</Text>
            <Text style={styles.emptySubtitle}>
              Share the voting link with your household.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
              onPress={sendToHousehold}
            >
              <Text style={styles.primaryText}>Send to Household</Text>
            </Pressable>
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
                <Text style={[styles.overlayText, { color: Colors.apricot }]}>✔ SELECT</Text>
              </Animated.View>

              <Animated.View style={[styles.overlay, styles.nopeOverlay, { opacity: nopeOpacity }]}>
                <Text style={[styles.overlayText, { color: Colors.pepe }]}>✕ SKIP</Text>
              </Animated.View>
            </Animated.View>
          </>
        )}
      </View>

      <View style={styles.actionBar}>
        <Pressable style={styles.actionPill} onPress={() => completeSwipe('left')}>
          <Text style={[styles.actionText, { color: Colors.pepe }]}>✕</Text>
        </Pressable>
        <Pressable
          style={[styles.actionPill, styles.actionPillCenter]}
          onPress={() => {
            if (selectedCount > 0) sendToHousehold();
          }}
        >
          <Text style={styles.actionText}>↗</Text>
        </Pressable>
        <Pressable style={styles.actionPill} onPress={() => completeSwipe('right')}>
          <Text style={[styles.actionText, { color: Colors.apricot }]}>❤</Text>
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
  headerChip: {
    backgroundColor: Colors.foam,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(45,36,32,0.08)',
  },
  headerChipText: {
    fontFamily: 'DM Sans Medium',
    color: Colors.espresso,
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
    borderColor: Colors.apricot,
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
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: Colors.apricot,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 16,
    color: Colors.foam,
  },
  actionBar: {
    paddingHorizontal: 34,
    paddingBottom: 18,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionPill: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.foam,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  actionPillCenter: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  actionText: {
    fontSize: 22,
  },
});
