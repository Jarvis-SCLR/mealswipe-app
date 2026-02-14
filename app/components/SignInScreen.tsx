import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from '@expo-google-fonts/dm-sans';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import * as AppleAuthentication from 'expo-apple-authentication';
import { authService, useGoogleAuth, User } from '../services/authService';
import { Ionicons } from '@expo/vector-icons';

interface SignInScreenProps {
  onSignIn: (user: User) => void;
  onSkip?: () => void;
}

export default function SignInScreen({ onSignIn, onSkip }: SignInScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Auth hook
  const { request, response, promptAsync } = useGoogleAuth();

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    PlayfairDisplay_600SemiBold,
  });

  useEffect(() => {
    checkAppleAvailability();
  }, []);

  // Handle Google auth response
  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleAuthSuccess(response.authentication);
    } else if (response?.type === 'error') {
      setError(response.error?.message || 'Failed to sign in with Google');
      setIsLoading(false);
    } else if (response?.type === 'dismiss') {
      setIsLoading(false);
    }
  }, [response]);

  const handleGoogleAuthSuccess = async (authentication: { accessToken: string } | null) => {
    try {
      const user = await authService.processGoogleAuth(authentication);
      if (user) {
        onSignIn(user);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const checkAppleAvailability = async () => {
    const available = await authService.isAppleSignInAvailable();
    setAppleAvailable(available);
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await authService.signInWithApple();
      if (user) {
        onSignIn(user);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to sign in with Apple');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await promptAsync();
    } catch (e: any) {
      setError(e.message || 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#FF6B35', '#F7931E', '#FFD700']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Logo and Branding */}
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>🍽️</Text>
            </View>
            <Text style={styles.appName}>MealSwipe</Text>
            <Text style={styles.tagline}>
              Swipe right on dinner.{'\n'}
              Say goodbye to "what should I eat?"
            </Text>
          </View>

          {/* Sign In Section */}
          <View style={styles.signInSection}>
            <Text style={styles.signInTitle}>Get Started</Text>
            <Text style={styles.signInSubtitle}>
              Sign in to save your favorites and sync across devices
            </Text>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Apple Sign In Button */}
            {appleAvailable && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={12}
                style={styles.appleButton}
                onPress={handleAppleSignIn}
              />
            )}

            {/* Google Sign In Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={isLoading || !request}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-google" size={22} color="#333" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Skip Button */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onSkip}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Continue without signing in</Text>
            </TouchableOpacity>

            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FF6B35" />
              </View>
            )}
          </View>

          {/* Terms */}
          <View style={styles.termsSection}>
            <Text style={styles.termsText}>
              By continuing, you agree to our{'\n'}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  brandSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 48,
  },
  appName: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 42,
    color: '#FFFFFF',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
  },
  signInSection: {
    paddingBottom: 24,
  },
  signInTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  signInSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  appleButton: {
    width: '100%',
    height: 54,
    marginBottom: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 17,
    color: '#333333',
    marginLeft: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginHorizontal: 16,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipButtonText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  termsSection: {
    paddingVertical: 16,
  },
  termsText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    fontFamily: 'DMSans_500Medium',
    textDecorationLine: 'underline',
  },
});
