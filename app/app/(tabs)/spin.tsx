import React, { useEffect, useState, useCallback } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';

import { Colors } from '../../constants/Colors';
import {
  SPIN_REWARDS,
  canSpinToday,
  performSpin,
  getTodaySpinResult,
  getTimeUntilNextSpin,
  getUserRewards,
  type SpinReward,
} from '../../services/spinService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WHEEL_SIZE = SCREEN_WIDTH * 0.85;
const WHEEL_RADIUS = WHEEL_SIZE / 2;

export default function SpinWheelScreen() {
  const [canSpin, setCanSpin] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<SpinReward | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [extraSwipes, setExtraSwipes] = useState(0);
  
  const rotation = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const resultScale = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);

  // Check spin eligibility on mount
  useEffect(() => {
    checkSpinStatus();
    loadRewards();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!canSpin) {
      const timer = setInterval(() => {
        setCountdown(getTimeUntilNextSpin());
      }, 1000);
      setCountdown(getTimeUntilNextSpin());
      return () => clearInterval(timer);
    }
  }, [canSpin]);

  const checkSpinStatus = async () => {
    const eligible = await canSpinToday();
    setCanSpin(eligible);
    
    if (!eligible) {
      const todayResult = await getTodaySpinResult();
      if (todayResult) {
        setResult(todayResult);
      }
    }
  };

  const loadRewards = async () => {
    const rewards = await getUserRewards();
    setExtraSwipes(rewards.extraSwipes);
  };

  const handleSpinComplete = useCallback((reward: SpinReward) => {
    setResult(reward);
    setIsSpinning(false);
    setCanSpin(false);
    
    // Show result popup
    setShowResult(true);
    resultScale.value = withSpring(1, { damping: 12, stiffness: 180 });
    confettiOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 2000 })
    );
    
    // Heavy haptic for win
    if (reward.id !== 'nothing') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    
    // Reload rewards
    loadRewards();
  }, []);

  const spin = async () => {
    if (!canSpin || isSpinning) return;
    
    setIsSpinning(true);
    setShowResult(false);
    resultScale.value = 0;
    
    // Button press haptic
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Button animation
    buttonScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1, { damping: 15 })
    );
    
    try {
      // Get result first so we know where to land
      const reward = await performSpin();
      const rewardIndex = SPIN_REWARDS.findIndex(r => r.id === reward.id);
      
      // Calculate target rotation
      // Each segment is 360/8 = 45 degrees
      // We want the pointer (at top) to land on the reward
      const segmentAngle = 360 / SPIN_REWARDS.length;
      const targetSegment = segmentAngle * rewardIndex + segmentAngle / 2;
      
      // Add multiple full rotations + land on segment
      const fullRotations = 5 + Math.random() * 3; // 5-8 full spins
      const targetRotation = fullRotations * 360 + (360 - targetSegment);
      
      // Spin animation with easing
      rotation.value = withTiming(
        rotation.value + targetRotation,
        {
          duration: 4000,
          easing: Easing.out(Easing.cubic),
        },
        () => {
          runOnJS(handleSpinComplete)(reward);
        }
      );
      
      // Periodic haptics during spin
      const hapticInterval = setInterval(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 100);
      
      setTimeout(() => clearInterval(hapticInterval), 3500);
      
    } catch (error) {
      console.error('Spin error:', error);
      setIsSpinning(false);
    }
  };

  const dismissResult = () => {
    resultScale.value = withTiming(0, { duration: 200 });
    setTimeout(() => setShowResult(false), 200);
  };

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const resultAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
    opacity: resultScale.value,
  }));

  const confettiStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
  }));

  // Generate wheel segments
  const renderWheel = () => {
    const segments = SPIN_REWARDS.length;
    const angle = 360 / segments;
    
    return (
      <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
        <G rotation={-90} origin={`${WHEEL_RADIUS}, ${WHEEL_RADIUS}`}>
          {SPIN_REWARDS.map((reward, index) => {
            const startAngle = index * angle;
            const endAngle = (index + 1) * angle;
            
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            
            const x1 = WHEEL_RADIUS + WHEEL_RADIUS * Math.cos(startRad);
            const y1 = WHEEL_RADIUS + WHEEL_RADIUS * Math.sin(startRad);
            const x2 = WHEEL_RADIUS + WHEEL_RADIUS * Math.cos(endRad);
            const y2 = WHEEL_RADIUS + WHEEL_RADIUS * Math.sin(endRad);
            
            const largeArc = angle > 180 ? 1 : 0;
            
            const path = `
              M ${WHEEL_RADIUS} ${WHEEL_RADIUS}
              L ${x1} ${y1}
              A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${largeArc} 1 ${x2} ${y2}
              Z
            `;
            
            // Text position (middle of segment)
            const midAngle = (startAngle + endAngle) / 2;
            const midRad = (midAngle * Math.PI) / 180;
            const textRadius = WHEEL_RADIUS * 0.65;
            const textX = WHEEL_RADIUS + textRadius * Math.cos(midRad);
            const textY = WHEEL_RADIUS + textRadius * Math.sin(midRad);
            
            return (
              <G key={reward.id}>
                <Path d={path} fill={reward.color} stroke={Colors.milk} strokeWidth={2} />
                <SvgText
                  x={textX}
                  y={textY}
                  fill={Colors.milk}
                  fontSize={WHEEL_SIZE * 0.055}
                  fontWeight="bold"
                  textAnchor="middle"
                  rotation={midAngle + 90}
                  origin={`${textX}, ${textY}`}
                >
                  {reward.emoji}
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Daily Spin</Text>
        <Text style={styles.subtitle}>
          {canSpin ? 'Spin to win rewards!' : 'Come back tomorrow!'}
        </Text>
      </View>

      {/* Rewards Banner */}
      <View style={styles.rewardsBanner}>
        <Text style={styles.rewardsBannerText}>
          🎁 Extra Swipes: {extraSwipes}
        </Text>
      </View>

      {/* Wheel Container */}
      <View style={styles.wheelContainer}>
        {/* Pointer */}
        <View style={styles.pointer}>
          <Text style={styles.pointerEmoji}>▼</Text>
        </View>
        
        {/* Animated Wheel */}
        <Animated.View style={[styles.wheel, wheelStyle]}>
          {renderWheel()}
        </Animated.View>
        
        {/* Center button */}
        <Animated.View style={[styles.spinButtonContainer, buttonAnimStyle]}>
          <Pressable
            style={[
              styles.spinButton,
              (!canSpin || isSpinning) && styles.spinButtonDisabled,
            ]}
            onPress={spin}
            disabled={!canSpin || isSpinning}
          >
            <Text style={styles.spinButtonText}>
              {isSpinning ? '🎰' : canSpin ? 'SPIN!' : '⏰'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Countdown */}
      {!canSpin && !isSpinning && (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownLabel}>Next spin in:</Text>
          <Text style={styles.countdownText}>
            {String(countdown.hours).padStart(2, '0')}:
            {String(countdown.minutes).padStart(2, '0')}:
            {String(countdown.seconds).padStart(2, '0')}
          </Text>
        </View>
      )}

      {/* Today's Result (if already spun) */}
      {result && !showResult && !canSpin && (
        <View style={styles.todayResult}>
          <Text style={styles.todayResultLabel}>Today's reward:</Text>
          <View style={[styles.todayResultBadge, { backgroundColor: result.color }]}>
            <Text style={styles.todayResultEmoji}>{result.emoji}</Text>
            <Text style={styles.todayResultText}>{result.label}</Text>
          </View>
        </View>
      )}

      {/* Rewards Legend */}
      <View style={styles.legend}>
        {SPIN_REWARDS.slice(0, 4).map((reward) => (
          <View key={reward.id} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: reward.color }]} />
            <Text style={styles.legendText}>{reward.emoji} {reward.label}</Text>
          </View>
        ))}
      </View>

      {/* Result Popup */}
      {showResult && result && (
        <Pressable style={styles.resultOverlay} onPress={dismissResult}>
          <Animated.View style={[styles.resultCard, resultAnimStyle]}>
            {/* Confetti */}
            <Animated.View style={[styles.confetti, confettiStyle]}>
              <Text style={styles.confettiText}>🎉 ✨ 🎊 ✨ 🎉</Text>
            </Animated.View>
            
            <Text style={styles.resultTitle}>
              {result.id === 'nothing' ? 'Aww...' : 'You Won!'}
            </Text>
            <View style={[styles.resultEmojiBg, { backgroundColor: result.color }]}>
              <Text style={styles.resultEmoji}>{result.emoji}</Text>
            </View>
            <Text style={styles.resultLabel}>{result.label}</Text>
            <Text style={styles.resultHint}>Tap to continue</Text>
          </Animated.View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.milk,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Playfair Display Bold',
    fontSize: 28,
    color: Colors.espresso,
  },
  subtitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: 'rgba(45,36,32,0.6)',
    marginTop: 4,
  },
  rewardsBanner: {
    backgroundColor: Colors.foam,
    marginHorizontal: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  rewardsBannerText: {
    fontFamily: 'DM Sans Medium',
    fontSize: 14,
    color: Colors.espresso,
    textAlign: 'center',
  },
  wheelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  pointer: {
    position: 'absolute',
    top: -8,
    zIndex: 10,
  },
  pointerEmoji: {
    fontSize: 32,
    color: Colors.espresso,
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  spinButtonContainer: {
    position: 'absolute',
  },
  spinButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.apricot,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  spinButtonDisabled: {
    backgroundColor: '#ccc',
  },
  spinButtonText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 18,
    color: Colors.milk,
  },
  countdownContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  countdownLabel: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: 'rgba(45,36,32,0.6)',
  },
  countdownText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 28,
    color: Colors.espresso,
    marginTop: 4,
  },
  todayResult: {
    alignItems: 'center',
    marginTop: 16,
  },
  todayResultLabel: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: 'rgba(45,36,32,0.6)',
    marginBottom: 8,
  },
  todayResultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  todayResultEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  todayResultText: {
    fontFamily: 'DM Sans Bold',
    fontSize: 16,
    color: Colors.milk,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 16,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: Colors.espresso,
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  resultCard: {
    backgroundColor: Colors.milk,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 15,
  },
  confetti: {
    position: 'absolute',
    top: -20,
  },
  confettiText: {
    fontSize: 28,
  },
  resultTitle: {
    fontFamily: 'Playfair Display Bold',
    fontSize: 28,
    color: Colors.espresso,
    marginBottom: 16,
  },
  resultEmojiBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultEmoji: {
    fontSize: 40,
  },
  resultLabel: {
    fontFamily: 'DM Sans Bold',
    fontSize: 20,
    color: Colors.espresso,
    marginBottom: 8,
  },
  resultHint: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: 'rgba(45,36,32,0.5)',
  },
});
