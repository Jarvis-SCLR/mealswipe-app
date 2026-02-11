# MealSwipe Database & Security Documentation

## User Authentication

### Sign-In Options
- **Apple Sign In** - Native iOS authentication
- **Google Sign In** - OAuth 2.0 integration
- **Skip/Anonymous** - Continue without account (limited features)

### Security Measures

#### Authentication Security
- ✅ Rate limiting: Max 5 login attempts before 15-minute lockout
- ✅ Session timeout: 30 days
- ✅ Secure token storage in iOS Keychain (expo-secure-store)
- ✅ Email validation and sanitization
- ✅ Input sanitization to prevent injection attacks

#### Data Security
- ✅ All sensitive data encrypted at rest
- ✅ Secure storage using iOS Keychain
- ✅ No passwords stored (social auth only)
- ✅ User IDs hashed for privacy
- ✅ Audit logging for auth events

## User Database Schema

```typescript
interface UserProfile {
  // Identity
  id: string;
  email: string;
  name: string;
  photo?: string;
  provider: 'apple' | 'google' | 'email';
  
  // Subscription
  subscriptionTier: 'free' | 'pro' | 'business';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  
  // Preferences
  dietaryPreferences: DietaryPreferences;
  allergies: string[];
  appliances: string[];
  
  // Usage Tracking
  likedRecipesCount: number;
  weeklyPlansCreated: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  
  // Security
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}
```

## Subscription Tiers

### Free Tier ($0)
- 20 liked recipes max
- 1 weekly plan
- 5 recipes per plan
- Basic swipe features only
- No grocery lists
- No family sharing
- No custom recipes

### Pro Tier ($4.99/mo or $39.99/yr)
- 200 liked recipes
- 4 weekly plans
- 21 recipes per plan
- ✅ Grocery lists
- ✅ Custom recipes
- ✅ Nutrition info
- ✅ Meal reminders
- ✅ Export plans

### Business Tier ($19.99/mo or $199.99/yr)
- **Unlimited** liked recipes
- **Unlimited** weekly plans
- **Unlimited** recipes per plan
- ✅ Everything in Pro
- ✅ Family sharing (10 members)
- ✅ Team analytics
- ✅ Priority support
- ✅ API access
- ✅ Branded reports

## Feature Gating

All features are gated by subscription tier:

```typescript
// Check if user can like a recipe
const result = canPerformAction(profile, 'like_recipe');
if (!result.allowed) {
  // Show upgrade prompt with reason
  showError(result.reason);
}

// Check feature access
const hasGroceryLists = await userService.canAccessFeature('groceryLists');
```

## Files Created

### Database & Schema
- `database/schema.ts` - User schema, tier definitions, feature flags
- `services/userService.ts` - User CRUD operations, security checks

### Authentication
- `services/authService.ts` - Apple/Google auth handling
- `components/SignInScreen.tsx` - Beautiful sign-in UI
- `contexts/AuthContext.tsx` - Auth state management

### Subscription
- `components/SubscriptionScreen.tsx` - Plan selection UI

### Configuration
- `app.json` - Updated with auth plugin configs

## Setup Required

### Google Sign In
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add to `app.json`:
   ```json
   {
     "iosClientId": "YOUR_IOS_CLIENT_ID",
     "webClientId": "YOUR_WEB_CLIENT_ID"
   }
   ```

### Apple Sign In
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Enable "Sign In with Apple" capability
3. Add Team ID to `app.json`

### Stripe (for payments)
1. Create Stripe account
2. Add products for Pro and Business tiers
3. Implement payment flow (would need React Native Stripe SDK)

## Security Checklist

- ✅ No hardcoded secrets
- ✅ All auth tokens in secure storage
- ✅ Input validation on all user data
- ✅ Rate limiting on auth endpoints
- ✅ Session management
- ✅ Audit logging ready
- ✅ Feature gating enforced client-side
- ⚠️ Backend validation needed (implement with Supabase/Firebase)

## Next Steps for Production

1. **Backend Setup** - Use Supabase or Firebase for:
   - User data persistence
   - Server-side validation
   - Payment processing
   - Real-time sync

2. **Payment Integration** - Add Stripe for subscriptions

3. **Analytics** - Track subscription conversions

4. **Testing** - Add unit tests for security functions

5. **App Store Review** - Prepare for Apple's review process
