import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { Colors } from '../constants/Colors';

export function ActionOverlay({
  translateX,
  threshold,
}: {
  translateX: SharedValue<number>;
  threshold: number;
}) {
  const likeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [threshold * 0.5, threshold],
      [0, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [threshold * 0.5, threshold],
      [0.96, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const nopeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-threshold, -threshold * 0.5],
      [1, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [-threshold, -threshold * 0.5],
      [1, 0.96],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.stamp, styles.likeStamp, likeStyle]}>
        <Text style={styles.likeIcon}>❤</Text>
        <Text style={styles.likeText}>LIKE</Text>
      </Animated.View>

      <Animated.View style={[styles.stamp, styles.nopeStamp, nopeStyle]}>
        <Text style={styles.nopeIcon}>✕</Text>
        <Text style={styles.nopeText}>NOPE</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    height: 120,
  },
  stamp: {
    position: 'absolute',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likeStamp: {
    left: 0,
    borderColor: Colors.apricot,
  },
  nopeStamp: {
    right: 0,
    borderColor: Colors.pepe,
  },
  likeIcon: {
    fontSize: 18,
    color: Colors.apricot,
  },
  nopeIcon: {
    fontSize: 18,
    color: Colors.pepe,
  },
  likeText: {
    fontFamily: 'DM Sans Bold',
    letterSpacing: 1.1,
    color: Colors.apricot,
  },
  nopeText: {
    fontFamily: 'DM Sans Bold',
    letterSpacing: 1.1,
    color: Colors.pepe,
  },
});

