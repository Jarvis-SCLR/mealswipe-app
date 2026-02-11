import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, LogBox, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ignore API-related warnings in dev (we handle them gracefully)
LogBox.ignoreLogs(['API unavailable', 'Error loading', 'Error fetching']);
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';

import { Colors } from '../constants/Colors';
import {
  addNotificationResponseListener,
  briefLiveActivityOnAppLaunch,
  onWeeklyPlanningNotificationFired,
} from '../services/notificationService';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { SubscriptionProvider, useSubscription } from '../contexts/SubscriptionContext';
import SignInScreen from '../components/SignInScreen';
import PaywallScreen from '../components/PaywallScreen';
import { User } from '../services/authService';

function AppContent() {
  const { user, isLoading: authLoading, signIn, isAuthenticated } = useAuth();
  const { showPaywall, setShowPaywall, paywallFeature, refreshSubscription } = useSubscription();
  const [fontsLoaded] = useFonts({
    'DM Sans': DMSans_400Regular,
    'DM Sans Medium': DMSans_500Medium,
    'DM Sans Bold': DMSans_700Bold,
    'Playfair Display': PlayfairDisplay_400Regular,
    'Playfair Display SemiBold': PlayfairDisplay_600SemiBold,
    'Playfair Display Bold': PlayfairDisplay_700Bold,
  });

  const [isReady, setIsReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    checkOnboarding();
    briefLiveActivityOnAppLaunch();
  }, []);

  useEffect(() => {
    const sub = addNotificationResponseListener((response) => {
      const type = response?.notification?.request?.content?.data?.type;
      if (type === 'weekly-planning') {
        onWeeklyPlanningNotificationFired();
      }
    });

    return () => sub.remove();
  }, []);

  const checkOnboarding = async () => {
    try {
      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      const signInSkipped = await AsyncStorage.getItem('signInSkipped');
      
      setNeedsOnboarding(onboardingComplete !== 'true');
      
      // Show sign-in if not authenticated and not skipped before
      setShowSignIn(!isAuthenticated && signInSkipped !== 'true');
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setNeedsOnboarding(true);
      setShowSignIn(!isAuthenticated);
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    if (isReady && fontsLoaded && needsOnboarding && !showSignIn) {
      router.replace('/onboarding');
    }
  }, [isReady, fontsLoaded, needsOnboarding, showSignIn]);

  const handleSignIn = (signedInUser: User) => {
    signIn(signedInUser);
    setShowSignIn(false);
  };

  const handleSkipSignIn = async () => {
    await AsyncStorage.setItem('signInSkipped', 'true');
    setShowSignIn(false);
  };

  if (!fontsLoaded || !isReady || authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.milk }}>
        <ActivityIndicator size="large" color={Colors.espresso} />
      </View>
    );
  }

  // Show sign-in screen if needed
  if (showSignIn) {
    return <SignInScreen onSignIn={handleSignIn} onSkip={handleSkipSignIn} />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="recipe/[id]" options={{ presentation: 'modal' }} />
      </Stack>
      
      {/* Paywall Modal */}
      <Modal
        visible={showPaywall}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaywall(false)}
      >
        <PaywallScreen
          onClose={() => setShowPaywall(false)}
          onSuccess={() => {
            setShowPaywall(false);
            refreshSubscription();
          }}
          feature={paywallFeature}
        />
      </Modal>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <AppContent />
        </SubscriptionProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
