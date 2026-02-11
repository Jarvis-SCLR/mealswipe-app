import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { stripeService, PRICING, getSavingsPercent } from '../services/stripeService';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface PaywallScreenProps {
  onClose: () => void;
  onSuccess: () => void;
  feature?: string;
}

const PREMIUM_FEATURES = [
  { icon: '♾️', title: 'Unlimited Recipes', desc: 'Save as many recipes as you want' },
  { icon: '👨‍👩‍👧‍👦', title: 'Family Voting', desc: 'Let everyone vote on meals' },
  { icon: '🤖', title: 'AI Suggestions', desc: 'Smart meal recommendations' },
  { icon: '📊', title: 'Nutrition Tracking', desc: 'Calories, macros & more' },
  { icon: '🔔', title: 'Meal Reminders', desc: 'Never forget to start cooking' },
  { icon: '📝', title: 'Custom Recipes', desc: 'Add your own favorites' },
];

export default function PaywallScreen({ onClose, onSuccess, feature }: PaywallScreenProps) {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to subscribe.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await stripeService.createCheckoutSession(
        user.id,
        user.email,
        selectedPlan
      );

      if (!result.success) {
        Alert.alert('Error', result.error || 'Something went wrong. Please try again.');
      }
      // If success, user is redirected to Stripe Checkout
      // The app will handle the return via deep link
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to restore purchases.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await stripeService.restorePurchases(user.id, user.email);
      if (result.success) {
        Alert.alert(
          'Purchases Restored! 🎉',
          'Your Premium subscription has been restored.',
          [{ text: 'Great!', onPress: onSuccess }]
        );
      } else {
        Alert.alert('No Subscription Found', 'We couldn\'t find any previous purchases for your account.');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B35', '#FF8F5C']}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>✨</Text>
            <Text style={styles.heroTitle}>Upgrade to Premium</Text>
            <Text style={styles.heroSubtitle}>
              {feature 
                ? `Unlock "${feature}" and all premium features`
                : 'Get the most out of MealSwipe'
              }
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Features Grid */}
        <View style={styles.featuresGrid}>
          {PREMIUM_FEATURES.map((item, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{item.icon}</Text>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>

        {/* Plan Selection */}
        <View style={styles.planSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>

          {/* Annual Plan */}
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('annual')}
          >
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>BEST VALUE</Text>
            </View>
            <View style={styles.planInfo}>
              <View style={styles.planRadio}>
                <View style={[styles.radioOuter, selectedPlan === 'annual' && styles.radioOuterSelected]}>
                  {selectedPlan === 'annual' && <View style={styles.radioInner} />}
                </View>
              </View>
              <View style={styles.planDetails}>
                <Text style={styles.planName}>Annual</Text>
                <Text style={styles.planSubtext}>Billed yearly</Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>${PRICING.annual.monthlyEquivalent.toFixed(2)}</Text>
                <Text style={styles.planPeriod}>/month</Text>
              </View>
            </View>
            <View style={styles.savingsRow}>
              <Ionicons name="pricetag" size={14} color="#4CAF50" />
              <Text style={styles.savingsText}>Save {getSavingsPercent()}% vs monthly</Text>
            </View>
          </TouchableOpacity>

          {/* Monthly Plan */}
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.planInfo}>
              <View style={styles.planRadio}>
                <View style={[styles.radioOuter, selectedPlan === 'monthly' && styles.radioOuterSelected]}>
                  {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
                </View>
              </View>
              <View style={styles.planDetails}>
                <Text style={styles.planName}>Monthly</Text>
                <Text style={styles.planSubtext}>Billed monthly</Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>${PRICING.monthly.price.toFixed(2)}</Text>
                <Text style={styles.planPeriod}>/month</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Restore */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} disabled={isLoading}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.terms}>
          {selectedPlan === 'annual' 
            ? `You'll be charged $${PRICING.annual.price} for a 1-year subscription.`
            : `You'll be charged $${PRICING.monthly.price} monthly.`
          }
          {' '}Cancel anytime. By subscribing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>

      {/* Bottom CTA */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.ctaButton, isLoading && styles.ctaButtonDisabled]}
          onPress={handlePurchase}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.ctaText}>
                Start Premium{selectedPlan === 'annual' ? ' — $29.99/year' : ' — $3.99/month'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF8F4',
  },
  headerGradient: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: 'Playfair Display SemiBold',
    color: '#fff',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: 'DM Sans',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FDF8F4',
  },
  contentContainer: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 24,
  },
  featureItem: {
    width: (width - 56) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: 'DM Sans SemiBold',
    color: '#2D2420',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    fontFamily: 'DM Sans',
    color: '#666',
    lineHeight: 18,
  },
  planSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Playfair Display SemiBold',
    color: '#2D2420',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF9F5',
  },
  planBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  planBadgeText: {
    fontSize: 10,
    fontFamily: 'DM Sans Bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planRadio: {
    marginRight: 12,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#FF6B35',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B35',
  },
  planDetails: {
    flex: 1,
  },
  planName: {
    fontSize: 17,
    fontFamily: 'DM Sans SemiBold',
    color: '#2D2420',
  },
  planSubtext: {
    fontSize: 13,
    fontFamily: 'DM Sans',
    color: '#666',
    marginTop: 2,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 24,
    fontFamily: 'DM Sans Bold',
    color: '#2D2420',
  },
  planPeriod: {
    fontSize: 14,
    fontFamily: 'DM Sans',
    color: '#666',
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0E8E0',
  },
  savingsText: {
    fontSize: 13,
    fontFamily: 'DM Sans Medium',
    color: '#4CAF50',
    marginLeft: 6,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  restoreText: {
    fontSize: 15,
    fontFamily: 'DM Sans Medium',
    color: '#666',
  },
  terms: {
    fontSize: 12,
    fontFamily: 'DM Sans',
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 0 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E5DDD5',
    backgroundColor: '#fff',
  },
  ctaButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    fontSize: 18,
    fontFamily: 'DM Sans Bold',
    color: '#fff',
  },
});
