import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';

// Complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession();

export interface User {
  id: string;
  email: string;
  name: string;
  provider: 'apple' | 'google';
  photo?: string;
}

const USER_KEY = 'mealswipe_user';

// Google OAuth config
const GOOGLE_WEB_CLIENT_ID = '1081935763088-tnajr0tr00fjlssbsee100sblci5s2m2.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '1081935763088-4qf60k4369r5pitnlr2bbf5mipf8l1eo.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = '1081935763088-tnajr0tr00fjlssbsee100sblci5s2m2.apps.googleusercontent.com';

export const authService = {
  // Check if user is already logged in
  async getStoredUser(): Promise<User | null> {
    try {
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error getting stored user:', error);
      return null;
    }
  },

  // Store user after successful login
  async storeUser(user: User): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user:', error);
    }
  },

  // Sign in with Apple
  async signInWithApple(): Promise<User | null> {
    try {
      if (Platform.OS !== 'ios') {
        console.log('Apple Sign In is only available on iOS');
        return null;
      }

      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        console.log('Apple Sign In is not available on this device');
        return null;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const user: User = {
        id: credential.user,
        email: credential.email || '',
        name: credential.fullName?.givenName 
          ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`.trim()
          : 'Apple User',
        provider: 'apple',
      };

      await this.storeUser(user);
      return user;
    } catch (error: any) {
      console.error('Apple Sign In Error:', error);
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User canceled the sign-in flow
        return null;
      }
      throw error;
    }
  },

  // Get Google Auth config for the hook
  getGoogleAuthConfig() {
    return {
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    };
  },

  // Process Google auth response and return user
  async processGoogleAuth(authentication: { accessToken: string } | null): Promise<User | null> {
    if (!authentication?.accessToken) {
      return null;
    }

    try {
      // Fetch user info from Google
      const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${authentication.accessToken}` },
      });
      
      const googleUser = await response.json();
      
      const user: User = {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name || 'Google User',
        provider: 'google',
        photo: googleUser.picture || undefined,
      };

      await this.storeUser(user);
      return user;
    } catch (error) {
      console.error('Error fetching Google user info:', error);
      throw error;
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      // Clear stored user
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },

  // Check if Apple Sign In is available
  async isAppleSignInAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    return await AppleAuthentication.isAvailableAsync();
  },
};

// Export the Google auth hook for use in components
export function useGoogleAuth() {
  const config = authService.getGoogleAuthConfig();
  
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: config.webClientId,
    iosClientId: config.iosClientId,
    androidClientId: config.androidClientId,
  });

  return { request, response, promptAsync };
}
