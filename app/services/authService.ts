import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes, User as GoogleUser } from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface User {
  id: string;
  email: string;
  name: string;
  provider: 'apple' | 'google';
  photo?: string;
}

const USER_KEY = 'mealswipe_user';

// Configure Google Sign In
GoogleSignin.configure({
  webClientId: '1081935763088-tnajr0tr00fjlssbsee100sblci5s2m2.apps.googleusercontent.com',
  iosClientId: '1081935763088-4qf60k4369r5pitnlr2bbf5mipf8l1eo.apps.googleusercontent.com',
});

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

  // Sign in with Google
  async signInWithGoogle(): Promise<User | null> {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      const googleUser = userInfo.data as GoogleUser;
      if (!googleUser) return null;

      const user: User = {
        id: googleUser.user.id,
        email: googleUser.user.email,
        name: googleUser.user.name || 'Google User',
        provider: 'google',
        photo: googleUser.user.photo || undefined,
      };

      await this.storeUser(user);
      return user;
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User canceled the sign-in flow
        return null;
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Operation (e.g. sign in) is in progress already
        console.log('Sign in already in progress');
        return null;
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // Play services not available or outdated
        console.log('Play services not available');
        return null;
      }
      throw error;
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      // Sign out from Google if signed in with Google
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // Ignore if not signed in with Google
      }
      
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
