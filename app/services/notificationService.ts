import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  startMealPlanningActivity,
  stopMealPlanningActivity,
  type LiveActivityRecipe,
} from './liveActivityService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Storage keys
const STORAGE_KEYS = {
  notificationPrefs: 'notificationPrefs:v1',
  scheduledReminders: 'scheduledReminders:v1',
  pushToken: 'pushToken:v1',
} as const;

// Types
export interface NotificationPrefs {
  enabled: boolean;
  weeklyPlanningDay: number; // 0-6 (Sunday-Saturday)
  weeklyPlanningTime: string; // HH:MM format
  cookingReminderBuffer: number; // minutes before cooking time
  dailyReminderEnabled: boolean;
}

export interface CookingReminder {
  id: string;
  recipeId: string;
  recipeName: string;
  cookTime: string; // e.g., "30 min"
  scheduledDate: string; // ISO date
  mealType: 'breakfast' | 'lunch' | 'dinner';
  notificationId?: string;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  weeklyPlanningDay: 0, // Sunday
  weeklyPlanningTime: '10:00',
  cookingReminderBuffer: 30, // 30 min before
  dailyReminderEnabled: true,
};

// Request permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notifications require a physical device');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }

  // Get push token for potential future use
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F5A962',
    });

    await Notifications.setNotificationChannelAsync('cooking', {
      name: 'Cooking Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F5A962',
    });

    await Notifications.setNotificationChannelAsync('planning', {
      name: 'Meal Planning',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#F5A962',
    });
  }

  return true;
}

// Get/Save preferences
export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.notificationPrefs);
    if (stored) {
      return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Error loading notification prefs:', error);
  }
  return DEFAULT_PREFS;
}

export async function saveNotificationPrefs(prefs: Partial<NotificationPrefs>): Promise<void> {
  try {
    const current = await getNotificationPrefs();
    const updated = { ...current, ...prefs };
    await AsyncStorage.setItem(STORAGE_KEYS.notificationPrefs, JSON.stringify(updated));
    
    // Reschedule weekly reminder if time/day changed
    if (prefs.weeklyPlanningDay !== undefined || prefs.weeklyPlanningTime !== undefined) {
      await scheduleWeeklyPlanningReminder();
    }
  } catch (error) {
    console.warn('Error saving notification prefs:', error);
  }
}

// Schedule weekly planning reminder
export async function scheduleWeeklyPlanningReminder(): Promise<string | null> {
  const prefs = await getNotificationPrefs();
  
  if (!prefs.enabled) return null;

  // Cancel existing weekly reminder
  await cancelNotificationsByTag('weekly-planning');

  const [hours, minutes] = prefs.weeklyPlanningTime.split(':').map(Number);
  
  // Calculate next occurrence
  const now = new Date();
  const targetDay = prefs.weeklyPlanningDay;
  const currentDay = now.getDay();
  
  let daysUntilTarget = targetDay - currentDay;
  if (daysUntilTarget < 0) daysUntilTarget += 7;
  if (daysUntilTarget === 0) {
    // Check if time already passed today
    const targetTime = new Date(now);
    targetTime.setHours(hours, minutes, 0, 0);
    if (now > targetTime) {
      daysUntilTarget = 7;
    }
  }

  const triggerDate = new Date(now);
  triggerDate.setDate(now.getDate() + daysUntilTarget);
  triggerDate.setHours(hours, minutes, 0, 0);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🍽️ Time to plan your meals!',
      body: 'Swipe through recipes and set up your week. Your household is waiting!',
      data: { type: 'weekly-planning', tag: 'weekly-planning' },
      sound: true,
      ...(Platform.OS === 'android' && { channelId: 'planning' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: targetDay + 1, // 1-7 for Notifications API
      hour: hours,
      minute: minutes,
    },
  });

  console.log(`Scheduled weekly planning reminder for ${dayNames[targetDay]} at ${prefs.weeklyPlanningTime}`);
  return notificationId;
}

export async function briefLiveActivityOnAppLaunch(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const prefs = await getNotificationPrefs();
  if (!prefs.enabled) return;

  const placeholderRecipes: LiveActivityRecipe[] = [
    { name: 'Apricot Chicken', imageName: 'fork.knife' },
    { name: 'Espresso Oats', imageName: 'cup.and.saucer' },
    { name: 'Verde Salad', imageName: 'leaf' },
  ];

  try {
    await startMealPlanningActivity({ recipes: placeholderRecipes, count: placeholderRecipes.length });
    setTimeout(() => {
      stopMealPlanningActivity().catch(() => undefined);
    }, 8000);
  } catch {
    // Native module may not be installed in managed workflow/dev.
  }
}

export async function onWeeklyPlanningNotificationFired(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const placeholderRecipes: LiveActivityRecipe[] = [
    { name: 'Tap to swipe recipes', imageName: 'fork.knife' },
    { name: 'Find dinner ideas', imageName: 'takeoutbag.and.cup.and.straw' },
    { name: 'Build your week', imageName: 'calendar' },
  ];

  try {
    await startMealPlanningActivity({ recipes: placeholderRecipes, count: placeholderRecipes.length });
  } catch {
    // Native module may not be installed in managed workflow/dev.
  }
}

// Schedule a cooking reminder
export async function scheduleCookingReminder(reminder: CookingReminder): Promise<string | null> {
  const prefs = await getNotificationPrefs();
  
  if (!prefs.enabled || !prefs.dailyReminderEnabled) return null;

  // Parse the scheduled date and meal type to get cooking time
  const mealTimes: Record<string, number> = {
    breakfast: 8,  // 8 AM
    lunch: 12,     // 12 PM
    dinner: 18,    // 6 PM
  };

  const cookingHour = mealTimes[reminder.mealType] || 18;
  
  // Parse cook time to minutes (e.g., "30 min" -> 30)
  const cookTimeMatch = reminder.cookTime.match(/(\d+)/);
  const cookTimeMinutes = cookTimeMatch ? parseInt(cookTimeMatch[1], 10) : 30;
  
  // Calculate notification time: meal time - cook time - buffer
  const scheduledDate = new Date(reminder.scheduledDate);
  scheduledDate.setHours(cookingHour, 0, 0, 0);
  
  const notifyTime = new Date(scheduledDate.getTime() - (cookTimeMinutes + prefs.cookingReminderBuffer) * 60 * 1000);
  
  // Don't schedule if in the past
  if (notifyTime <= new Date()) {
    console.log('Cooking reminder time already passed');
    return null;
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `🍳 Time to start cooking!`,
      body: `${reminder.recipeName} • ${reminder.cookTime} cook time`,
      subtitle: `${reminder.mealType.charAt(0).toUpperCase() + reminder.mealType.slice(1)} is coming up`,
      data: { 
        type: 'cooking-reminder', 
        recipeId: reminder.recipeId,
        reminderId: reminder.id,
      },
      sound: true,
      ...(Platform.OS === 'android' && { channelId: 'cooking' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: notifyTime,
    },
  });

  // Save the notification ID with the reminder
  await saveScheduledReminder({ ...reminder, notificationId });
  
  console.log(`Scheduled cooking reminder for ${reminder.recipeName} at ${notifyTime.toLocaleString()}`);
  return notificationId;
}

// Schedule multiple cooking reminders for a week
export async function scheduleWeekCookingReminders(
  meals: Array<{
    recipeId: string;
    recipeName: string;
    cookTime: string;
    date: string;
    mealType: 'breakfast' | 'lunch' | 'dinner';
  }>
): Promise<void> {
  // Cancel existing cooking reminders
  await cancelNotificationsByTag('cooking-reminder');
  
  for (const meal of meals) {
    await scheduleCookingReminder({
      id: `${meal.date}-${meal.mealType}`,
      recipeId: meal.recipeId,
      recipeName: meal.recipeName,
      cookTime: meal.cookTime,
      scheduledDate: meal.date,
      mealType: meal.mealType,
    });
  }
}

// Helper to save scheduled reminders
async function saveScheduledReminder(reminder: CookingReminder): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.scheduledReminders);
    const reminders: CookingReminder[] = stored ? JSON.parse(stored) : [];
    
    // Update or add
    const existingIndex = reminders.findIndex(r => r.id === reminder.id);
    if (existingIndex >= 0) {
      reminders[existingIndex] = reminder;
    } else {
      reminders.push(reminder);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.scheduledReminders, JSON.stringify(reminders));
  } catch (error) {
    console.warn('Error saving scheduled reminder:', error);
  }
}

// Cancel notifications by tag/type
async function cancelNotificationsByTag(tag: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  
  for (const notification of scheduled) {
    if (notification.content.data?.tag === tag || notification.content.data?.type === tag) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

// Cancel all scheduled notifications
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(STORAGE_KEYS.scheduledReminders);
}

// Get all scheduled notifications (for debugging/display)
export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}

// Listen for notification interactions
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// Listen for notifications received while app is foregrounded
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

// Send immediate test notification
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🍽️ MealSwipe',
      body: 'Notifications are working! You\'ll get reminders for meal planning and cooking.',
      sound: true,
    },
    trigger: null, // Immediate
  });
}

// Format time for display
export function formatReminderTime(buffer: number): string {
  if (buffer < 60) {
    return `${buffer} minutes before`;
  }
  const hours = Math.floor(buffer / 60);
  const mins = buffer % 60;
  if (mins === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} before`;
  }
  return `${hours}h ${mins}m before`;
}

// Get day name
export function getDayName(dayIndex: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex] || 'Sunday';
}
