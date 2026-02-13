import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/Colors';
import {
  ACHIEVEMENTS,
  getUnlockedAchievements,
  getProgress,
  getAchievementsByCategory,
  CATEGORY_NAMES,
  type Achievement,
} from '../services/achievementService';
import { getStreakData, getStreakEmoji } from '../services/streakService';

export default function AchievementsScreen() {
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [streakData, setStreakData] = useState({ currentStreak: 0, longestStreak: 0 });
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    const [unlockedData, progressData, streak] = await Promise.all([
      getUnlockedAchievements(),
      getProgress(),
      getStreakData(),
    ]);
    
    setUnlocked(Object.keys(unlockedData));
    setProgress(progressData);
    setStreakData(streak);
  };
  
  const grouped = getAchievementsByCategory();
  const totalUnlocked = unlocked.length;
  const totalAchievements = ACHIEVEMENTS.length;
  
  const renderAchievement = (achievement: Achievement) => {
    const isUnlocked = unlocked.includes(achievement.id);
    const current = progress[achievement.progressKey] || 0;
    const progressPercent = Math.min(current / achievement.requirement, 1);
    
    return (
      <View
        key={achievement.id}
        style={[
          styles.achievementCard,
          isUnlocked && styles.achievementCardUnlocked,
        ]}
      >
        <View style={[
          styles.achievementEmoji,
          !isUnlocked && styles.achievementEmojiLocked,
        ]}>
          <Text style={styles.emojiText}>
            {isUnlocked ? achievement.emoji : '🔒'}
          </Text>
        </View>
        
        <View style={styles.achievementInfo}>
          <Text style={[
            styles.achievementName,
            !isUnlocked && styles.achievementNameLocked,
          ]}>
            {achievement.name}
          </Text>
          <Text style={styles.achievementDesc}>{achievement.description}</Text>
          
          {!isUnlocked && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercent * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {current}/{achievement.requirement}
              </Text>
            </View>
          )}
        </View>
        
        {isUnlocked && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.verde} />
          </View>
        )}
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={Colors.espresso} />
        </Pressable>
        <Text style={styles.title}>Achievements</Text>
        <View style={styles.backButton} />
      </View>
      
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>{getStreakEmoji(streakData.currentStreak)}</Text>
              <Text style={styles.statValue}>{streakData.currentStreak}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>🏅</Text>
              <Text style={styles.statValue}>{totalUnlocked}/{totalAchievements}</Text>
              <Text style={styles.statLabel}>Unlocked</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statEmoji}>🏆</Text>
              <Text style={styles.statValue}>{streakData.longestStreak}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
          </View>
        </View>
        
        {/* Achievement Categories */}
        {Object.entries(grouped).map(([category, achievements]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>
              {CATEGORY_NAMES[category] || category}
            </Text>
            <Text style={styles.categorySubtitle}>
              {achievements.filter(a => unlocked.includes(a.id)).length}/
              {achievements.length} completed
            </Text>
            
            {achievements.map(renderAchievement)}
          </View>
        ))}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
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
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Playfair Display Bold',
    fontSize: 22,
    color: Colors.espresso,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  statsCard: {
    backgroundColor: Colors.foam,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'DM Sans Bold',
    fontSize: 24,
    color: Colors.espresso,
  },
  statLabel: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: 'rgba(45,36,32,0.6)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(45,36,32,0.1)',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontFamily: 'Playfair Display SemiBold',
    fontSize: 20,
    color: Colors.espresso,
    marginBottom: 4,
  },
  categorySubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: 'rgba(45,36,32,0.5)',
    marginBottom: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  achievementCardUnlocked: {
    backgroundColor: 'rgba(107,142,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(107,142,94,0.2)',
  },
  achievementEmoji: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.foam,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  achievementEmojiLocked: {
    backgroundColor: 'rgba(45,36,32,0.08)',
  },
  emojiText: {
    fontSize: 24,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontFamily: 'DM Sans Bold',
    fontSize: 16,
    color: Colors.espresso,
    marginBottom: 2,
  },
  achievementNameLocked: {
    color: 'rgba(45,36,32,0.6)',
  },
  achievementDesc: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: 'rgba(45,36,32,0.6)',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(45,36,32,0.1)',
    borderRadius: 3,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.apricot,
    borderRadius: 3,
  },
  progressText: {
    fontFamily: 'DM Sans Medium',
    fontSize: 12,
    color: 'rgba(45,36,32,0.5)',
    minWidth: 40,
    textAlign: 'right',
  },
  checkmark: {
    marginLeft: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
