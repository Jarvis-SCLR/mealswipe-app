import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/Colors';
import { clearAllRecipes, getSavedCount } from '../../services/menuStorage';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  scheduleWeeklyPlanningReminder,
  sendTestNotification,
  getDayName,
  formatReminderTime,
  type NotificationPrefs,
} from '../../services/notificationService';
import { getStreakData, recordDailyActivity, getStreakEmoji, type StreakData } from '../../services/streakService';
import { getAchievementStatus } from '../../services/achievementService';

const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥬' },
  { id: 'vegan', label: 'Vegan', emoji: '🌱' },
  { id: 'pescatarian', label: 'Pescatarian', emoji: '🐟' },
  { id: 'keto', label: 'Keto', emoji: '🥑' },
  { id: 'paleo', label: 'Paleo', emoji: '🥩' },
  { id: 'gluten-free', label: 'Gluten-Free', emoji: '🌾' },
  { id: 'dairy-free', label: 'Dairy-Free', emoji: '🥛' },
];

const ALLERGY_OPTIONS = [
  { id: 'peanuts', label: 'Peanuts', emoji: '🥜' },
  { id: 'tree-nuts', label: 'Tree Nuts', emoji: '🌰' },
  { id: 'shellfish', label: 'Shellfish', emoji: '🦐' },
  { id: 'eggs', label: 'Eggs', emoji: '🥚' },
  { id: 'milk', label: 'Dairy', emoji: '🧀' },
  { id: 'soy', label: 'Soy', emoji: '🫘' },
  { id: 'wheat', label: 'Gluten', emoji: '🍞' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [diets, setDiets] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs | null>(null);
  const [streakData, setStreakData] = useState<StreakData>({ currentStreak: 0, longestStreak: 0, lastActivityDate: null, streakProtectors: 0, totalDaysActive: 0 });
  const [achievementCount, setAchievementCount] = useState({ unlocked: 0, total: 0 });

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
      loadStats();
      loadNotificationPrefs();
      loadStreakAndAchievements();
    }, [])
  );

  const loadStreakAndAchievements = async () => {
    // Record daily activity and get streak
    const streak = await recordDailyActivity();
    setStreakData(streak);
    
    // Get achievement count
    const status = await getAchievementStatus();
    setAchievementCount({ unlocked: status.unlocked.length, total: status.total });
  };

  const loadNotificationPrefs = async () => {
    const prefs = await getNotificationPrefs();
    setNotifPrefs(prefs);
  };

  const updateNotifPref = async (key: keyof NotificationPrefs, value: any) => {
    if (!notifPrefs) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    await saveNotificationPrefs({ [key]: value });
  };

  const testNotification = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await sendTestNotification();
  };

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem('userPreferences');
      if (stored) {
        const prefs = JSON.parse(stored);
        setDiets(prefs.dietaryRestrictions || []);
        setAllergies(prefs.allergies || []);
      }
    } catch (error) {
      console.warn('Error loading preferences:', error);
    }
  };

  const loadStats = async () => {
    const count = await getSavedCount();
    setSavedCount(count);
  };

  const toggleDiet = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDiets = diets.includes(id)
      ? diets.filter(d => d !== id)
      : [...diets, id];
    setDiets(newDiets);
    await savePreferences(newDiets, allergies);
  };

  const toggleAllergy = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newAllergies = allergies.includes(id)
      ? allergies.filter(a => a !== id)
      : [...allergies, id];
    setAllergies(newAllergies);
    await savePreferences(diets, newAllergies);
  };

  const savePreferences = async (newDiets: string[], newAllergies: string[]) => {
    try {
      const stored = await AsyncStorage.getItem('userPreferences');
      const existing = stored ? JSON.parse(stored) : {};
      const updated = {
        ...existing,
        dietaryRestrictions: newDiets,
        allergies: newAllergies,
      };
      await AsyncStorage.setItem('userPreferences', JSON.stringify(updated));
    } catch (error) {
      console.warn('Error saving preferences:', error);
    }
  };

  const handleClearMenu = () => {
    Alert.alert(
      'Clear Menu',
      'Remove all saved recipes? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllRecipes();
            setSavedCount(0);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will show the welcome screens again next time you open the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            await AsyncStorage.removeItem('onboardingComplete');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Done', 'Restart the app to see onboarding again.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top + 12 }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.headerTitle}>Settings</Text>

      {/* Streak Banner */}
      <TouchableOpacity 
        style={styles.streakBanner}
        onPress={() => router.push('/achievements')}
      >
        <View style={styles.streakLeft}>
          <Text style={styles.streakEmoji}>{getStreakEmoji(streakData.currentStreak)}</Text>
          <View>
            <Text style={styles.streakCount}>{streakData.currentStreak} Day Streak</Text>
            <Text style={styles.streakBest}>Best: {streakData.longestStreak} days</Text>
          </View>
        </View>
        <View style={styles.achievementsBadge}>
          <Text style={styles.achievementsBadgeText}>🏅 {achievementCount.unlocked}/{achievementCount.total}</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.espresso} />
        </View>
      </TouchableOpacity>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{savedCount}</Text>
          <Text style={styles.statLabel}>Recipes Saved</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{streakData.totalDaysActive}</Text>
          <Text style={styles.statLabel}>Days Active</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{streakData.streakProtectors}</Text>
          <Text style={styles.statLabel}>Protectors</Text>
        </View>
      </View>

      {/* Dietary Preferences */}
      <Text style={styles.sectionTitle}>Dietary Preferences</Text>
      <View style={styles.optionsWrap}>
        {DIETARY_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionPill,
              diets.includes(option.id) && styles.optionPillSelected,
            ]}
            onPress={() => toggleDiet(option.id)}
          >
            <Text style={styles.optionEmoji}>{option.emoji}</Text>
            <Text style={[
              styles.optionLabel,
              diets.includes(option.id) && styles.optionLabelSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Allergies */}
      <Text style={styles.sectionTitle}>Allergies</Text>
      <View style={styles.optionsWrap}>
        {ALLERGY_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionPill,
              allergies.includes(option.id) && styles.optionPillDanger,
            ]}
            onPress={() => toggleAllergy(option.id)}
          >
            <Text style={styles.optionEmoji}>{option.emoji}</Text>
            <Text style={[
              styles.optionLabel,
              allergies.includes(option.id) && styles.optionLabelSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notifications */}
      <Text style={styles.sectionTitle}>Notifications</Text>
      {notifPrefs && (
        <View style={styles.notifSection}>
          <TouchableOpacity 
            style={styles.notifRow}
            onPress={() => updateNotifPref('enabled', !notifPrefs.enabled)}
          >
            <View>
              <Text style={styles.notifRowTitle}>Enable Notifications</Text>
              <Text style={styles.notifRowSubtitle}>Get reminders for planning & cooking</Text>
            </View>
            <Switch
              value={notifPrefs.enabled}
              onValueChange={(v) => updateNotifPref('enabled', v)}
              trackColor={{ true: Colors.verde, false: '#E0E0E0' }}
              thumbColor={Colors.foam}
            />
          </TouchableOpacity>

          {notifPrefs.enabled && (
            <>
              <View style={styles.notifRow}>
                <View>
                  <Text style={styles.notifRowTitle}>Weekly Planning Day</Text>
                  <Text style={styles.notifRowSubtitle}>{getDayName(notifPrefs.weeklyPlanningDay)} at {notifPrefs.weeklyPlanningTime}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.notifEditButton}
                  onPress={() => {
                    const days = [0, 6, 5, 1, 2, 3, 4];
                    const currentIdx = days.indexOf(notifPrefs.weeklyPlanningDay);
                    const nextIdx = (currentIdx + 1) % days.length;
                    updateNotifPref('weeklyPlanningDay', days[nextIdx]);
                  }}
                >
                  <Text style={styles.notifEditText}>Change</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.notifRow}>
                <View>
                  <Text style={styles.notifRowTitle}>Cooking Reminder</Text>
                  <Text style={styles.notifRowSubtitle}>{formatReminderTime(notifPrefs.cookingReminderBuffer)}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.notifEditButton}
                  onPress={() => {
                    const buffers = [15, 30, 45, 60, 90];
                    const currentIdx = buffers.indexOf(notifPrefs.cookingReminderBuffer);
                    const nextIdx = (currentIdx + 1) % buffers.length;
                    updateNotifPref('cookingReminderBuffer', buffers[nextIdx]);
                  }}
                >
                  <Text style={styles.notifEditText}>Change</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.testNotifButton} onPress={testNotification}>
                <Text style={styles.testNotifText}>🔔 Test Notification</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Actions */}
      <Text style={styles.sectionTitle}>Data</Text>
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton} onPress={handleClearMenu}>
          <Text style={styles.actionButtonText}>Clear Saved Recipes</Text>
          <Text style={styles.actionButtonIcon}>🗑️</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleResetOnboarding}>
          <Text style={styles.actionButtonText}>Reset Onboarding</Text>
          <Text style={styles.actionButtonIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appName}>MealSwipe</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.milk,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontFamily: 'Playfair Display Bold',
    fontSize: 32,
    color: Colors.espresso,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.foam,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(45,36,32,0.06)',
  },
  statNumber: {
    fontFamily: 'Playfair Display Bold',
    fontSize: 28,
    color: Colors.espresso,
  },
  statLabel: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: '#7A7067',
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: 'DM Sans Bold',
    fontSize: 16,
    color: Colors.espresso,
    marginBottom: 12,
    marginTop: 8,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  optionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.foam,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionPillSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: Colors.verde,
  },
  optionPillDanger: {
    backgroundColor: '#FFEBEE',
    borderColor: '#EF5350',
  },
  optionEmoji: {
    fontSize: 16,
  },
  optionLabel: {
    fontFamily: 'DM Sans Medium',
    fontSize: 14,
    color: Colors.espresso,
  },
  optionLabelSelected: {
    color: Colors.espresso,
  },
  actionsSection: {
    gap: 10,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.foam,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(45,36,32,0.06)',
  },
  actionButtonText: {
    fontFamily: 'DM Sans Medium',
    fontSize: 16,
    color: Colors.espresso,
  },
  actionButtonIcon: {
    fontSize: 18,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appName: {
    fontFamily: 'Playfair Display SemiBold',
    fontSize: 18,
    color: Colors.espresso,
  },
  appVersion: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#A89F91',
    marginTop: 2,
  },
  bottomPadding: {
    height: 100,
  },
  // Streak banner styles
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245,169,98,0.08)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245,169,98,0.3)',
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakEmoji: {
    fontSize: 36,
  },
  streakCount: {
    fontFamily: 'DM Sans Bold',
    fontSize: 18,
    color: Colors.espresso,
  },
  streakBest: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: 'rgba(45,36,32,0.6)',
    marginTop: 2,
  },
  achievementsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.milk,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  achievementsBadgeText: {
    fontFamily: 'DM Sans Medium',
    fontSize: 14,
    color: Colors.espresso,
  },
  // Notification styles
  notifSection: {
    backgroundColor: Colors.foam,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(45,36,32,0.06)',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(45,36,32,0.06)',
  },
  notifRowTitle: {
    fontFamily: 'DM Sans Medium',
    fontSize: 16,
    color: Colors.espresso,
  },
  notifRowSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: '#7A7067',
    marginTop: 2,
  },
  notifEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.caramello,
    borderRadius: 8,
  },
  notifEditText: {
    fontFamily: 'DM Sans Medium',
    fontSize: 14,
    color: Colors.espresso,
  },
  testNotifButton: {
    padding: 16,
    alignItems: 'center',
  },
  testNotifText: {
    fontFamily: 'DM Sans Medium',
    fontSize: 15,
    color: Colors.apricot,
  },
});
