import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '../constants/Colors';
import type { Recipe } from '../services/recipeApi';
import { getGeneratedImage } from '../assets/generated-images';

const BUNDLED_IMAGE_PREFIX = 'bundled://';

const APPLIANCE_DATA: Record<string, { icon: string; iconSet: 'mci' | 'ion'; label: string }> = {
  'oven': { icon: 'stove', iconSet: 'mci', label: 'Oven' },
  'stovetop': { icon: 'fire', iconSet: 'mci', label: 'Stovetop' },
  'microwave': { icon: 'microwave', iconSet: 'mci', label: 'Microwave' },
  'air-fryer': { icon: 'fan', iconSet: 'mci', label: 'Air Fryer' },
  'instant-pot': { icon: 'pot-steam-outline', iconSet: 'mci', label: 'Instant Pot' },
  'slow-cooker': { icon: 'pot-outline', iconSet: 'mci', label: 'Slow Cooker' },
  'blender': { icon: 'blender-outline', iconSet: 'mci', label: 'Blender' },
  'food-processor': { icon: 'cog-outline', iconSet: 'mci', label: 'Processor' },
  'grill': { icon: 'grill-outline', iconSet: 'mci', label: 'Grill' },
  'pizza-oven': { icon: 'pizza-outline', iconSet: 'ion', label: 'Pizza Oven' },
  'toaster-oven': { icon: 'toaster-oven', iconSet: 'mci', label: 'Toaster' },
  'rice-cooker': { icon: 'rice', iconSet: 'mci', label: 'Rice Cooker' },
  'stand-mixer': { icon: 'rotate-3d-variant', iconSet: 'mci', label: 'Mixer' },
  'sous-vide': { icon: 'thermometer-outline', iconSet: 'ion', label: 'Sous Vide' },
};

function ApplianceIcon({ appliance }: { appliance: string }) {
  const data = APPLIANCE_DATA[appliance];
  if (!data) return null;
  
  if (data.iconSet === 'mci') {
    return <MaterialCommunityIcons name={data.icon as any} size={14} color={Colors.espresso} />;
  }
  return <Ionicons name={data.icon as any} size={14} color={Colors.espresso} />;
}

// Extended recipe type that may include community flag
type ExtendedRecipe = Recipe & { isCommunity?: boolean; creatorId?: string };

// Resolve image source - handles bundled images and remote URLs
function getImageSource(imageUrl: string): ImageSourcePropType {
  if (imageUrl.startsWith(BUNDLED_IMAGE_PREFIX)) {
    const recipeId = imageUrl.replace(BUNDLED_IMAGE_PREFIX, '');
    const bundledAsset = getGeneratedImage(recipeId);
    if (bundledAsset) {
      return bundledAsset;
    }
  }
  return { uri: imageUrl };
}

export function RecipeCard({ recipe }: { recipe: ExtendedRecipe }) {
  const primaryAppliance = recipe.appliances?.[0];
  const applianceData = primaryAppliance ? APPLIANCE_DATA[primaryAppliance] : null;
  const isCommunity = (recipe as ExtendedRecipe).isCommunity;
  const imageSource = getImageSource(recipe.image);
  
  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        <Image source={imageSource} style={styles.image} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.78)']}
          locations={[0, 0.58, 1]}
          style={styles.gradient}
        />

        {/* Community Recipe Badge */}
        {isCommunity && (
          <View style={styles.communityBadge}>
            <Ionicons name="people" size={12} color="#fff" />
            <Text style={styles.communityLabel}>Community</Text>
          </View>
        )}

        {primaryAppliance && applianceData && (
          <View style={styles.applianceBadge}>
            <ApplianceIcon appliance={primaryAppliance} />
            <Text style={styles.applianceLabel}>{applianceData.label}</Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {recipe.name}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.meta}>⏱ {recipe.prepTime}</Text>
            <Text style={styles.meta}>•</Text>
            <Text style={styles.meta}>{recipe.nutrition?.calories || '—'} cal</Text>
            <Text style={styles.meta}>•</Text>
            <Text style={styles.meta}>{recipe.ingredients.length} ingredients</Text>
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {recipe.description}
          </Text>

          <View style={styles.tagsRow}>
            {recipe.tags.slice(0, 4).map((tag, idx) => (
              <View key={`${tag}-${idx}`} style={styles.tagPill}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: Colors.foam,
  },
  imageWrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: Colors.caramello,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
  },
  communityBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cielo,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  communityLabel: {
    fontFamily: 'DM Sans Medium',
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  applianceBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  applianceLabel: {
    fontFamily: 'DM Sans Medium',
    fontSize: 12,
    color: Colors.espresso,
  },
  content: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
  },
  title: {
    fontFamily: 'Playfair Display Bold',
    fontSize: 28,
    lineHeight: 34,
    color: Colors.foam,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  meta: {
    fontFamily: 'DM Sans Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
  },
  description: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: {
    fontFamily: 'DM Sans Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
  },
});
