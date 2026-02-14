import React, { useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '../constants/Colors';
import {
  requestNotificationPermissions,
  saveNotificationPrefs,
  scheduleWeeklyPlanningReminder,
  sendTestNotification,
  getDayName,
  formatReminderTime,
  DEFAULT_PREFS,
} from '../services/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥬' },
  { id: 'vegan', label: 'Vegan', emoji: '🌱' },
  { id: 'pescatarian', label: 'Pescatarian', emoji: '🐟' },
  { id: 'keto', label: 'Keto', emoji: '🥑' },
  { id: 'paleo', label: 'Paleo', emoji: '🥩' },
  { id: 'gluten-free', label: 'Gluten-Free', emoji: '🌾' },
  { id: 'dairy-free', label: 'Dairy-Free', emoji: '🥛' },
  { id: 'low-carb', label: 'Low Carb', emoji: '📉' },
];

const ALLERGY_OPTIONS = [
  { id: 'peanuts', label: 'Peanuts', emoji: '🥜' },
  { id: 'tree-nuts', label: 'Tree Nuts', emoji: '🌰' },
  { id: 'shellfish', label: 'Shellfish', emoji: '🦐' },
  { id: 'fish', label: 'Fish', emoji: '🐟' },
  { id: 'eggs', label: 'Eggs', emoji: '🥚' },
  { id: 'milk', label: 'Milk/Dairy', emoji: '🧀' },
  { id: 'soy', label: 'Soy', emoji: '🫘' },
  { id: 'wheat', label: 'Wheat/Gluten', emoji: '🍞' },
  { id: 'sesame', label: 'Sesame', emoji: '🫓' },
];

const APPLIANCE_OPTIONS = [
  { id: 'oven', label: 'Oven', icon: 'stove', iconSet: 'mci' },
  { id: 'stovetop', label: 'Stovetop', icon: 'fire', iconSet: 'mci' },
  { id: 'microwave', label: 'Microwave', icon: 'microwave', iconSet: 'mci' },
  { id: 'air-fryer', label: 'Air Fryer', icon: 'fan', iconSet: 'mci' },
  { id: 'instant-pot', label: 'Instant Pot', icon: 'pot-steam-outline', iconSet: 'mci' },
  { id: 'slow-cooker', label: 'Slow Cooker', icon: 'pot-outline', iconSet: 'mci' },
  { id: 'blender', label: 'Blender', icon: 'blender-outline', iconSet: 'mci' },
  { id: 'food-processor', label: 'Processor', icon: 'cog-outline', iconSet: 'mci' },
  { id: 'grill', label: 'Grill', icon: 'grill-outline', iconSet: 'mci' },
  { id: 'pizza-oven', label: 'Pizza Oven', icon: 'pizza-outline', iconSet: 'ion' },
  { id: 'toaster-oven', label: 'Toaster', icon: 'toaster-oven', iconSet: 'mci' },
  { id: 'rice-cooker', label: 'Rice Cooker', icon: 'rice', iconSet: 'mci' },
  { id: 'stand-mixer', label: 'Mixer', icon: 'rotate-3d-variant', iconSet: 'mci' },
  { id: 'sous-vide', label: 'Sous Vide', icon: 'thermometer-outline', iconSet: 'ion' },
];

const STEPS = ['welcome', 'dietary', 'allergies', 'appliances', 'avoid', 'notifications', 'ready'];

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 6, label: 'Saturday' },
  { value: 5, label: 'Friday' },
  { value: 1, label: 'Monday' },
];

const BUFFER_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedAppliances, setSelectedAppliances] = useState<string[]>(['oven', 'stovetop', 'microwave']);
  const [avoidIngredients, setAvoidIngredients] = useState('');
  const [fadeAnim] = useState(new Animated.Value(1));
  
  // Notification preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [planningDay, setPlanningDay] = useState(0); // Sunday
  const [planningTime, setPlanningTime] = useState('10:00');
  const [cookingBuffer, setCookingBuffer] = useState(30);

  const currentStep = STEPS[step];

  const toggleDiet = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDiets(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const toggleAllergy = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAllergies(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const toggleAppliance = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAppliances(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const animateTransition = (callback: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const nextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step < STEPS.length - 1) {
      animateTransition(() => setStep(step + 1));
    }
  };

  const prevStep = () => {
    if (step > 0) {
      animateTransition(() => setStep(step - 1));
    }
  };

  const finishOnboarding = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Save dietary preferences
    const preferences = {
      dietaryRestrictions: selectedDiets,
      allergies: selectedAllergies,
      appliances: selectedAppliances,
      avoidIngredients: avoidIngredients
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0),
      onboardingComplete: true,
      setupDate: new Date().toISOString(),
    };

    await AsyncStorage.setItem('userPreferences', JSON.stringify(preferences));
    await AsyncStorage.setItem('onboardingComplete', 'true');

    // Set up notifications if enabled
    if (notificationsEnabled) {
      const permissionGranted = await requestNotificationPermissions();
      
      if (permissionGranted) {
        // Save notification preferences
        await saveNotificationPrefs({
          enabled: true,
          weeklyPlanningDay: planningDay,
          weeklyPlanningTime: planningTime,
          cookingReminderBuffer: cookingBuffer,
          dailyReminderEnabled: true,
        });
        
        // Schedule weekly planning reminder
        await scheduleWeeklyPlanningReminder();
        
        // Send a test notification
        await sendTestNotification();
      }
    } else {
      await saveNotificationPrefs({ enabled: false });
    }

    // Navigate to main app
    router.replace('/(tabs)');
  };

  const renderWelcome = () => (
    <View style={styles.stepContent}>
      <Text style={styles.emoji}>🍽️</Text>
      <Text style={styles.title}>Welcome to{'\n'}MealSwipe</Text>
      <Text style={styles.subtitle}>
        Discover delicious recipes with a simple swipe.{'\n'}
        Let's personalize your experience.
      </Text>
    </View>
  );

  const renderDietary = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Any dietary preferences?</Text>
      <Text style={styles.stepSubtitle}>Select all that apply (or skip)</Text>
      <View style={styles.optionsGrid}>
        {DIETARY_OPTIONS.map(option => (
          <Pressable
            key={option.id}
            style={[
              styles.optionPill,
              selectedDiets.includes(option.id) && styles.optionPillSelected,
            ]}
            onPress={() => toggleDiet(option.id)}
          >
            <Text style={styles.optionEmoji}>{option.emoji}</Text>
            <Text
              style={[
                styles.optionLabel,
                selectedDiets.includes(option.id) && styles.optionLabelSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderAllergies = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Any food allergies?</Text>
      <Text style={styles.stepSubtitle}>We'll filter these out completely</Text>
      <View style={styles.optionsGrid}>
        {ALLERGY_OPTIONS.map(option => (
          <Pressable
            key={option.id}
            style={[
              styles.optionPill,
              selectedAllergies.includes(option.id) && styles.optionPillDanger,
            ]}
            onPress={() => toggleAllergy(option.id)}
          >
            <Text style={styles.optionEmoji}>{option.emoji}</Text>
            <Text
              style={[
                styles.optionLabel,
                selectedAllergies.includes(option.id) && styles.optionLabelSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderApplianceIcon = (icon: string, iconSet: string, isSelected: boolean) => {
    const color = isSelected ? Colors.verde : '#9A9189';
    const size = 36;
    
    if (iconSet === 'mci') {
      return <MaterialCommunityIcons name={icon as any} size={size} color={color} />;
    }
    return <Ionicons name={icon as any} size={size} color={color} />;
  };

  const renderAppliances = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What's in your kitchen?</Text>
      <Text style={styles.stepSubtitle}>Select the appliances you have</Text>
      <View style={styles.appliancesGrid}>
        {APPLIANCE_OPTIONS.map(option => (
          <Pressable
            key={option.id}
            style={[
              styles.applianceItem,
              selectedAppliances.includes(option.id) && styles.applianceItemSelected,
            ]}
            onPress={() => toggleAppliance(option.id)}
          >
            <View style={styles.applianceIconWrap}>
              {renderApplianceIcon(option.icon, option.iconSet, selectedAppliances.includes(option.id))}
            </View>
            <Text
              style={[
                styles.applianceLabel,
                selectedAppliances.includes(option.id) && styles.applianceLabelSelected,
              ]}
            >
              {option.label}
            </Text>
            {selectedAppliances.includes(option.id) && (
              <View style={styles.applianceCheck}>
                <Text style={styles.applianceCheckText}>✓</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderAvoid = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Anything else to avoid?</Text>
      <Text style={styles.stepSubtitle}>
        Ingredients you don't like (comma separated)
      </Text>
      <TextInput
        style={styles.textInput}
        placeholder="e.g., cilantro, olives, anchovies"
        placeholderTextColor="#A89F91"
        value={avoidIngredients}
        onChangeText={setAvoidIngredients}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.hint}>
        💡 You can always update this later in settings
      </Text>
    </View>
  );

  const renderNotifications = () => (
    <View style={styles.stepContent}>
      <Text style={styles.notifEmoji}>🔔</Text>
      <Text style={styles.notifTitle}>Stay on track</Text>
      <Text style={styles.notifSubtitle}>
        Get reminders to plan meals and start cooking
      </Text>
      
      {/* Enable notifications toggle */}
      <Pressable
        style={[styles.notifToggle, notificationsEnabled && styles.notifToggleActive]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setNotificationsEnabled(!notificationsEnabled);
        }}
      >
        <Text style={styles.notifToggleText}>
          {notificationsEnabled ? '✓ Notifications On' : 'Enable Notifications'}
        </Text>
      </Pressable>
      
      {notificationsEnabled && (
        <>
          {/* Weekly planning day */}
          <View style={styles.notifSectionCompact}>
            <Text style={styles.notifLabelCompact}>📅 Remind me to plan on</Text>
            <View style={styles.notifOptionsRow}>
              {DAYS.map(day => (
                <Pressable
                  key={day.value}
                  style={[
                    styles.notifOptionCompact,
                    planningDay === day.value && styles.notifOptionSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPlanningDay(day.value);
                  }}
                >
                  <Text style={[
                    styles.notifOptionTextCompact,
                    planningDay === day.value && styles.notifOptionTextSelected,
                  ]}>
                    {day.label.slice(0, 3)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          
          {/* Cooking buffer */}
          <View style={styles.notifSectionCompact}>
            <Text style={styles.notifLabelCompact}>🍳 Notify me to start cooking</Text>
            <View style={styles.notifOptionsRow}>
              {BUFFER_OPTIONS.map(option => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.notifOptionCompact,
                    cookingBuffer === option.value && styles.notifOptionSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCookingBuffer(option.value);
                  }}
                >
                  <Text style={[
                    styles.notifOptionTextCompact,
                    cookingBuffer === option.value && styles.notifOptionTextSelected,
                  ]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );

  const renderReady = () => (
    <View style={styles.stepContent}>
      <Text style={styles.emoji}>✨</Text>
      <Text style={styles.title}>You're all set!</Text>
      <Text style={styles.subtitle}>
        Swipe right on recipes you love,{'\n'}
        left on ones you don't.{'\n\n'}
        Your personalized menu awaits.
      </Text>
      
      {(selectedDiets.length > 0 || selectedAllergies.length > 0 || selectedAppliances.length > 0) && (
        <View style={styles.summaryBox}>
          {selectedAppliances.length > 0 && (
            <Text style={styles.summaryText}>
              🍳 {selectedAppliances.length} kitchen appliance{selectedAppliances.length > 1 ? 's' : ''}
            </Text>
          )}
          {selectedDiets.length > 0 && (
            <Text style={styles.summaryText}>
              🥗 {selectedDiets.length} dietary preference{selectedDiets.length > 1 ? 's' : ''}
            </Text>
          )}
          {selectedAllergies.length > 0 && (
            <Text style={styles.summaryText}>
              ⚠️ {selectedAllergies.length} allerg{selectedAllergies.length > 1 ? 'ies' : 'y'} filtered
            </Text>
          )}
        </View>
      )}
    </View>
  );

  const renderContent = () => {
    switch (currentStep) {
      case 'welcome':
        return renderWelcome();
      case 'dietary':
        return renderDietary();
      case 'allergies':
        return renderAllergies();
      case 'appliances':
        return renderAppliances();
      case 'avoid':
        return renderAvoid();
      case 'notifications':
        return renderNotifications();
      case 'ready':
        return renderReady();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {STEPS.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.progressDot,
              idx === step && styles.progressDotActive,
              idx < step && styles.progressDotComplete,
            ]}
          />
        ))}
      </View>

      {/* Back button */}
      {step > 0 && (
        <Pressable style={styles.backButton} onPress={prevStep}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
      )}

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {renderContent()}
        </Animated.View>
      </ScrollView>

      {/* Bottom button */}
      <View style={styles.bottomContainer}>
        {currentStep === 'ready' ? (
          <Pressable style={styles.primaryButton} onPress={finishOnboarding}>
            <Text style={styles.primaryButtonText}>Start Swiping 🚀</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryButton} onPress={nextStep}>
            <Text style={styles.primaryButtonText}>
              {currentStep === 'welcome' ? "Let's Go" : 'Continue'}
            </Text>
          </Pressable>
        )}

        {currentStep !== 'welcome' && currentStep !== 'ready' && (
          <Pressable style={styles.skipButton} onPress={nextStep}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.milk,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.foam,
    borderWidth: 1,
    borderColor: Colors.caramello,
  },
  progressDotActive: {
    backgroundColor: Colors.espresso,
    borderColor: Colors.espresso,
    width: 24,
  },
  progressDotComplete: {
    backgroundColor: Colors.verde,
    borderColor: Colors.verde,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  backButtonText: {
    fontFamily: 'DM Sans Medium',
    fontSize: 16,
    color: Colors.espresso,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  stepContent: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Playfair Display Bold',
    fontSize: 36,
    color: Colors.espresso,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 44,
  },
  subtitle: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    color: '#7A7067',
    textAlign: 'center',
    lineHeight: 26,
  },
  stepTitle: {
    fontFamily: 'Playfair Display SemiBold',
    fontSize: 28,
    color: Colors.espresso,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: '#7A7067',
    textAlign: 'center',
    marginBottom: 32,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  appliancesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  applianceItem: {
    width: '30%',
    height: 95,
    backgroundColor: Colors.foam,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  applianceItemSelected: {
    backgroundColor: '#FFF3E8',
    borderColor: Colors.verde,
  },
  applianceIconWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applianceLabel: {
    fontFamily: 'DM Sans Medium',
    fontSize: 11,
    color: Colors.espresso,
    textAlign: 'center',
  },
  applianceLabelSelected: {
    color: Colors.verde,
    fontFamily: 'DM Sans Bold',
  },
  applianceCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.verde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applianceCheckText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: Colors.foam,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionPillSelected: {
    backgroundColor: '#FFF3E8',
    borderColor: Colors.verde,
  },
  optionPillDanger: {
    backgroundColor: '#FFEBEE',
    borderColor: '#EF5350',
  },
  optionEmoji: {
    fontSize: 20,
  },
  optionLabel: {
    fontFamily: 'DM Sans Medium',
    fontSize: 15,
    color: Colors.espresso,
  },
  optionLabelSelected: {
    color: Colors.espresso,
  },
  textInput: {
    width: '100%',
    minHeight: 100,
    backgroundColor: Colors.foam,
    borderRadius: 16,
    padding: 16,
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: Colors.espresso,
    textAlignVertical: 'top',
  },
  hint: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#7A7067',
    marginTop: 16,
    textAlign: 'center',
  },
  summaryBox: {
    marginTop: 32,
    padding: 20,
    backgroundColor: Colors.foam,
    borderRadius: 16,
    gap: 8,
  },
  summaryText: {
    fontFamily: 'DM Sans Medium',
    fontSize: 16,
    color: Colors.espresso,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
    backgroundColor: Colors.milk,
  },
  primaryButton: {
    backgroundColor: Colors.espresso,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 17,
    color: Colors.foam,
  },
  skipButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  skipButtonText: {
    fontFamily: 'DM Sans Medium',
    fontSize: 16,
    color: '#7A7067',
  },
  // Notification styles
  notifEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  notifTitle: {
    fontFamily: 'Playfair Display SemiBold',
    fontSize: 24,
    color: Colors.espresso,
    textAlign: 'center',
    marginBottom: 4,
  },
  notifSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#7A7067',
    textAlign: 'center',
    marginBottom: 16,
  },
  notifToggle: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.foam,
    borderWidth: 2,
    borderColor: 'rgba(45,36,32,0.1)',
    marginBottom: 16,
  },
  notifToggleActive: {
    backgroundColor: '#FFF3E8',
    borderColor: Colors.verde,
  },
  notifToggleText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 15,
    color: Colors.espresso,
    textAlign: 'center',
  },
  notifSection: {
    width: '100%',
    marginBottom: 20,
  },
  notifSectionCompact: {
    width: '100%',
    marginBottom: 12,
  },
  notifLabel: {
    fontFamily: 'DM Sans Medium',
    fontSize: 15,
    color: Colors.espresso,
    marginBottom: 12,
    textAlign: 'center',
  },
  notifLabelCompact: {
    fontFamily: 'DM Sans Medium',
    fontSize: 13,
    color: Colors.espresso,
    marginBottom: 8,
    textAlign: 'center',
  },
  notifOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  notifOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  notifOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.foam,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  notifOptionCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.foam,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  notifOptionSelected: {
    backgroundColor: Colors.caramello,
    borderColor: Colors.apricot,
  },
  notifOptionText: {
    fontFamily: 'DM Sans Medium',
    fontSize: 14,
    color: Colors.espresso,
  },
  notifOptionTextCompact: {
    fontFamily: 'DM Sans Medium',
    fontSize: 13,
    color: Colors.espresso,
  },
  notifOptionTextSelected: {
    color: Colors.espresso,
  },
});
