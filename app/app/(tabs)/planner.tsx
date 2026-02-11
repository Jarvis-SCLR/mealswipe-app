import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors } from '../../constants/Colors';
import {
  createHousehold,
  getOrCreateCurrentWeekPlan,
  getScheduledMeals,
  getShareLink,
  getWeekStartMondayISO,
  scheduleMeal,
  type MealType,
  type ScheduledMeal,
  type WeeklyPlan,
} from '../../services/householdStorage';
import { getSavedRecipes, type SavedRecipe } from '../../services/menuStorage';
import { scheduleCookingReminder } from '../../services/notificationService';

type MealBySlot = Record<string, Record<MealType, SavedRecipe | null>>;

function addDaysISO(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split('-').map((n) => Number(n));
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDayLabel(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map((n) => Number(n));
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function PlannerScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [householdName, setHouseholdName] = useState<string | null>(null);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [scheduled, setScheduled] = useState<ScheduledMeal[]>([]);
  const [savedById, setSavedById] = useState<Record<string, SavedRecipe>>({});

  const weekStart = useMemo(() => getWeekStartMondayISO(), []);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)),
    [weekStart]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const load = async () => {
    setLoading(true);
    try {
      const { household, plan: currentPlan } = await getOrCreateCurrentWeekPlan();
      setHouseholdName(household?.name ?? null);
      setPlan(currentPlan);

      const saved = await getSavedRecipes();
      setSavedById(Object.fromEntries(saved.map((r) => [r.id, r])));

      if (currentPlan) {
        const meals = await getScheduledMeals(currentPlan.id);
        setScheduled(meals);
      } else {
        setScheduled([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const mealsBySlot: MealBySlot = useMemo(() => {
    const init: MealBySlot = {};
    for (const day of weekDays) {
      init[day] = { breakfast: null, lunch: null, dinner: null };
    }
    for (const meal of scheduled) {
      if (!init[meal.date]) continue;
      init[meal.date][meal.mealType] = savedById[meal.recipeId] ?? null;
    }
    return init;
  }, [scheduled, savedById, weekDays]);

  const ensureHousehold = async () => {
    const created = await createHousehold('Our Kitchen');
    setHouseholdName(created.name);
    const { plan: newPlan } = await getOrCreateCurrentWeekPlan();
    setPlan(newPlan);
  };

  const pickFromSaved = async (date: string, mealType: MealType) => {
    if (!plan) return;
    const saved = await getSavedRecipes();
    if (saved.length === 0) {
      Alert.alert('No saved recipes yet', 'Save recipes from Discover, then schedule them here.');
      return;
    }

    Alert.alert(
      'Schedule meal',
      `${formatDayLabel(date)} • ${mealType}`,
      [
        ...saved.slice(0, 8).map((r) => ({
          text: r.name,
          onPress: async () => {
            await scheduleMeal(plan.id, { recipeId: r.id, date, mealType });
            
            // Schedule a cooking reminder notification
            await scheduleCookingReminder({
              id: `${date}-${mealType}`,
              recipeId: r.id,
              recipeName: r.name,
              cookTime: r.prepTime || '30 min',
              scheduledDate: date,
              mealType,
            });
            
            const meals = await getScheduledMeals(plan.id);
            setScheduled(meals);
          },
        })),
        { text: 'Choose via planner (soon)', style: 'cancel' },
      ]
    );
  };

  const share = async () => {
    if (!plan) return;
    try {
      const link = await getShareLink(plan.id);
      Alert.alert('Share with household', link);
    } catch (e) {
      Alert.alert('Unable to share', 'Create a household first.');
    }
  };

  const goSelect = () => {
    if (!plan) return;
    router.push({ pathname: '/plan/select', params: { planId: plan.id } });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Planner</Text>
          <Text style={styles.headerSubtitle}>
            {householdName ? householdName : 'No household yet'}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            share();
          }}
          style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.shareText}>Share</Text>
        </Pressable>
      </View>

      {!householdName ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏠</Text>
          <Text style={styles.emptyTitle}>Create a household</Text>
          <Text style={styles.emptySubtitle}>
            Plan meals together. Invite your household to vote on recipes.
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              ensureHousehold();
            }}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.ctaText}>Create Household</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.weekHeaderRow}>
            <Text style={styles.weekTitle}>This week</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                goSelect();
              }}
              style={({ pressed }) => [styles.selectButton, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.selectText}>Select recipes</Text>
            </Pressable>
          </View>

          {weekDays.map((day) => (
            <View key={day} style={styles.dayCard}>
              <Text style={styles.dayTitle}>{formatDayLabel(day)}</Text>

              {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((mealType) => {
                const recipe = mealsBySlot[day]?.[mealType] ?? null;
                return (
                  <Pressable
                    key={`${day}-${mealType}`}
                    onPress={() => {
                      if (!plan) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      pickFromSaved(day, mealType);
                    }}
                    style={({ pressed }) => [styles.slotRow, pressed && { opacity: 0.9 }]}
                  >
                    <Text style={styles.slotLabel}>{mealType}</Text>
                    <Text style={[styles.slotValue, !recipe && styles.slotValueEmpty]} numberOfLines={1}>
                      {recipe ? recipe.name : 'Tap to add'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {loading ? <View pointerEvents="none" style={styles.loadingOverlay} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.milk,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontFamily: 'Playfair Display Bold',
    fontSize: 32,
    color: Colors.espresso,
  },
  headerSubtitle: {
    marginTop: 2,
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: 'rgba(45,36,32,0.6)',
  },
  shareButton: {
    backgroundColor: Colors.espresso,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  shareText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 14,
    color: Colors.foam,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekTitle: {
    fontFamily: 'Playfair Display SemiBold',
    fontSize: 18,
    color: Colors.espresso,
  },
  selectButton: {
    backgroundColor: Colors.apricot,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  selectText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 14,
    color: Colors.foam,
  },
  dayCard: {
    backgroundColor: Colors.foam,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(45,36,32,0.06)',
  },
  dayTitle: {
    fontFamily: 'DM Sans Bold',
    fontSize: 14,
    color: Colors.espresso,
    marginBottom: 10,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(45,36,32,0.06)',
  },
  slotLabel: {
    width: 86,
    fontFamily: 'DM Sans Medium',
    fontSize: 13,
    color: 'rgba(45,36,32,0.6)',
    textTransform: 'capitalize',
  },
  slotValue: {
    flex: 1,
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: Colors.espresso,
  },
  slotValueEmpty: {
    color: 'rgba(45,36,32,0.45)',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'Playfair Display SemiBold',
    fontSize: 24,
    color: Colors.espresso,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: 'rgba(45,36,32,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 18,
  },
  cta: {
    backgroundColor: Colors.apricot,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
  },
  ctaText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 16,
    color: Colors.foam,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(253,251,247,0.3)',
  },
});

