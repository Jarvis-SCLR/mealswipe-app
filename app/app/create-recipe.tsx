/**
 * Create Recipe Screen
 * Upload and share community recipes with AI-assisted completion
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors } from '../constants/Colors';
import {
  createRecipe,
  uploadRecipeImage,
  completeRecipeWithAI,
  type Ingredient,
  type Instruction,
} from '../services/communityRecipeService';

const TAGS = [
  'Quick', 'Healthy', 'Comfort Food', 'Vegetarian', 'Vegan',
  'Keto', 'Gluten-Free', 'Dairy-Free', 'Spicy', 'Kid-Friendly',
  'Budget', 'Meal Prep', 'One-Pot', 'Air Fryer', 'Instant Pot',
];

export default function CreateRecipeScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', amount: '', unit: '' },
  ]);
  const [instructions, setInstructions] = useState<Instruction[]>([
    { step_number: 1, text: '' },
  ]);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('4');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [shareWithCommunity, setShareWithCommunity] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      setImages([...images, ...result.assets.map(a => a.uri)].slice(0, 5));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: '' }]);
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const addInstruction = () => {
    setInstructions([
      ...instructions,
      { step_number: instructions.length + 1, text: '' },
    ]);
  };

  const updateInstruction = (index: number, text: string) => {
    const updated = [...instructions];
    updated[index] = { ...updated[index], text };
    setInstructions(updated);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      const updated = instructions
        .filter((_, i) => i !== index)
        .map((inst, i) => ({ ...inst, step_number: i + 1 }));
      setInstructions(updated);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAIComplete = async () => {
    if (!name.trim()) {
      Alert.alert('Recipe Name Required', 'Please enter a recipe name first.');
      return;
    }

    setAiLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const completion = await completeRecipeWithAI(
        name,
        images,
        ingredients.filter(i => i.name.trim()).map(i => i.name)
      );

      if (completion) {
        setDescription(completion.description);
        setIngredients(completion.ingredients.length > 0 ? completion.ingredients : ingredients);
        setInstructions(completion.instructions);
        setSelectedTags([...new Set([...selectedTags, ...completion.tags])]);
        setPrepTime(String(completion.prep_time));
        setCookTime(String(completion.cook_time));
        setServings(String(completion.servings));
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('✨ AI Complete!', 'Recipe details have been filled in. Feel free to edit!');
      }
    } catch (error) {
      Alert.alert('Error', 'AI completion failed. Please fill in manually.');
    } finally {
      setAiLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Info', 'Please enter a recipe name.');
      return;
    }

    if (images.length === 0) {
      Alert.alert('Missing Photo', 'Please add at least one photo of your dish.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Upload images first
      const uploadedUrls: string[] = [];
      for (const uri of images) {
        const url = await uploadRecipeImage(uri);
        if (url) uploadedUrls.push(url);
      }

      if (uploadedUrls.length === 0) {
        // Use local URIs as fallback if upload fails
        uploadedUrls.push(...images);
      }

      // Create recipe
      const recipe = await createRecipe({
        name: name.trim(),
        description: description.trim() || undefined,
        image_urls: uploadedUrls,
        prep_time: prepTime ? parseInt(prepTime) : undefined,
        cook_time: cookTime ? parseInt(cookTime) : undefined,
        servings: parseInt(servings) || 4,
        ingredients: ingredients.filter(i => i.name.trim()),
        instructions: instructions.filter(i => i.text.trim()),
        tags: selectedTags,
        ai_generated: aiLoading,
        share_with_community: shareWithCommunity,
      });

      if (recipe) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          '🎉 Recipe Published!',
          shareWithCommunity 
            ? 'Your recipe is now live in the community feed!'
            : 'Recipe saved to your personal collection.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        throw new Error('Failed to create recipe');
      }
    } catch (error) {
      console.error('Error publishing recipe:', error);
      Alert.alert('Error', 'Failed to publish recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={28} color={Colors.espresso} />
          </Pressable>
          <Text style={styles.headerTitle}>Create Recipe</Text>
          <Pressable 
            onPress={handlePublish} 
            style={[styles.publishButton, loading && styles.publishButtonDisabled]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.publishButtonText}>Publish</Text>
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Photo Upload */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri }} style={styles.uploadedImage} />
                  <Pressable 
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={Colors.pepe} />
                  </Pressable>
                </View>
              ))}
              {images.length < 5 && (
                <Pressable style={styles.addImageButton} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={32} color={Colors.mocha} />
                  <Text style={styles.addImageText}>Add Photo</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>

          {/* Recipe Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recipe Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Grandma's Secret Pasta"
              value={name}
              onChangeText={setName}
              placeholderTextColor={Colors.latte}
            />
          </View>

          {/* AI Complete Button */}
          <Pressable 
            style={[styles.aiButton, aiLoading && styles.aiButtonLoading]}
            onPress={handleAIComplete}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.aiButtonText}>AI is thinking...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={styles.aiButtonText}>✨ AI Complete Recipe</Text>
              </>
            )}
          </Pressable>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about your dish..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholderTextColor={Colors.latte}
            />
          </View>

          {/* Time & Servings */}
          <View style={styles.row}>
            <View style={styles.halfSection}>
              <Text style={styles.sectionTitle}>Prep Time</Text>
              <TextInput
                style={styles.input}
                placeholder="15 min"
                value={prepTime}
                onChangeText={setPrepTime}
                keyboardType="numeric"
                placeholderTextColor={Colors.latte}
              />
            </View>
            <View style={styles.halfSection}>
              <Text style={styles.sectionTitle}>Cook Time</Text>
              <TextInput
                style={styles.input}
                placeholder="30 min"
                value={cookTime}
                onChangeText={setCookTime}
                keyboardType="numeric"
                placeholderTextColor={Colors.latte}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Servings</Text>
            <TextInput
              style={[styles.input, { width: 100 }]}
              placeholder="4"
              value={servings}
              onChangeText={setServings}
              keyboardType="numeric"
              placeholderTextColor={Colors.latte}
            />
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {ingredients.map((ing, index) => (
              <View key={index} style={styles.ingredientRow}>
                <TextInput
                  style={[styles.input, styles.ingredientAmount]}
                  placeholder="1"
                  value={ing.amount}
                  onChangeText={(v) => updateIngredient(index, 'amount', v)}
                  placeholderTextColor={Colors.latte}
                />
                <TextInput
                  style={[styles.input, styles.ingredientUnit]}
                  placeholder="cup"
                  value={ing.unit}
                  onChangeText={(v) => updateIngredient(index, 'unit', v)}
                  placeholderTextColor={Colors.latte}
                />
                <TextInput
                  style={[styles.input, styles.ingredientName]}
                  placeholder="flour"
                  value={ing.name}
                  onChangeText={(v) => updateIngredient(index, 'name', v)}
                  placeholderTextColor={Colors.latte}
                />
                <Pressable onPress={() => removeIngredient(index)} style={styles.removeButton}>
                  <Ionicons name="remove-circle-outline" size={24} color={Colors.pepe} />
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.addButton} onPress={addIngredient}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.apricot} />
              <Text style={styles.addButtonText}>Add Ingredient</Text>
            </Pressable>
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {instructions.map((inst, index) => (
              <View key={index} style={styles.instructionRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{inst.step_number}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.instructionInput]}
                  placeholder="Describe this step..."
                  value={inst.text}
                  onChangeText={(v) => updateInstruction(index, v)}
                  multiline
                  placeholderTextColor={Colors.latte}
                />
                <Pressable onPress={() => removeInstruction(index)} style={styles.removeButton}>
                  <Ionicons name="remove-circle-outline" size={24} color={Colors.pepe} />
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.addButton} onPress={addInstruction}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.apricot} />
              <Text style={styles.addButtonText}>Add Step</Text>
            </Pressable>
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {TAGS.map(tag => (
                <Pressable
                  key={tag}
                  style={[
                    styles.tag,
                    selectedTags.includes(tag) && styles.tagSelected
                  ]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[
                    styles.tagText,
                    selectedTags.includes(tag) && styles.tagTextSelected
                  ]}>
                    {tag}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Share Toggle */}
          <View style={[styles.section, styles.shareSection]}>
            <View>
              <Text style={styles.sectionTitle}>Share with Community</Text>
              <Text style={styles.shareDescription}>
                Make your recipe visible to all MealSwipe users
              </Text>
            </View>
            <Switch
              value={shareWithCommunity}
              onValueChange={setShareWithCommunity}
              trackColor={{ false: Colors.latte, true: Colors.apricot }}
              thumbColor="#fff"
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.milk,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.caramello,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.espresso,
    fontFamily: 'DMSans-SemiBold',
  },
  publishButton: {
    backgroundColor: Colors.apricot,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.espresso,
    marginBottom: 8,
    fontFamily: 'DMSans-SemiBold',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.espresso,
    borderWidth: 1,
    borderColor: Colors.caramello,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imageRow: {
    flexDirection: 'row',
  },
  imageContainer: {
    marginRight: 12,
    position: 'relative',
  },
  uploadedImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.caramello,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 12,
    color: Colors.mocha,
    marginTop: 4,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cielo,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  aiButtonLoading: {
    opacity: 0.7,
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  halfSection: {
    flex: 1,
  },
  ingredientRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  ingredientAmount: {
    width: 60,
    textAlign: 'center',
  },
  ingredientUnit: {
    width: 70,
  },
  ingredientName: {
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
  },
  addButtonText: {
    color: Colors.apricot,
    fontSize: 14,
    fontWeight: '500',
  },
  instructionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.apricot,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  instructionInput: {
    flex: 1,
    minHeight: 60,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.caramello,
  },
  tagSelected: {
    backgroundColor: Colors.verde,
  },
  tagText: {
    fontSize: 14,
    color: Colors.mocha,
  },
  tagTextSelected: {
    color: '#fff',
  },
  shareSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.caramello,
  },
  shareDescription: {
    fontSize: 13,
    color: Colors.mocha,
    marginTop: 2,
  },
});
