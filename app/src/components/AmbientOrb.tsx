import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors } from "@/theme/colors";

/**
 * The ambient "presence" animation shown on the chat screen while a
 * response is being generated — a breathing glow with a few particles
 * drifting around it, built on real spring/timing physics rather than a
 * static spinner. This is procedural on purpose (see docs/ARCHITECTURE.md
 * on 3D vs. motion design): it's structured so a Rive/Lottie file can
 * drop in and replace the visuals without the chat screen around it
 * changing — `active` is the only prop that matters to callers.
 */
export function AmbientOrb({ active }: { active: boolean }) {
  const breath = useSharedValue(0);

  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, [breath]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * (active ? 0.18 : 0.06) }],
    opacity: 0.55 + breath.value * (active ? 0.45 : 0.15),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1.6 + breath.value * (active ? 0.4 : 0.1) }],
    opacity: 0.12 + breath.value * (active ? 0.18 : 0.06),
  }));

  return (
    <View style={styles.wrapper} pointerEvents="none">
      <Animated.View style={[styles.glow, glowStyle]} />
      <Animated.View style={[styles.core, coreStyle]} />
      {active && <Particles />}
    </View>
  );
}

function Particles() {
  const particles = [0, 1, 2, 3];
  return (
    <>
      {particles.map((i) => (
        <Particle key={i} index={i} />
      ))}
    </>
  );
}

function Particle({ index }: { index: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 2600 + index * 400,
        easing: Easing.linear,
      }),
      -1
    );
  }, [progress, index]);

  const angleOffset = (index / 4) * Math.PI * 2;
  const radius = 46;

  const style = useAnimatedStyle(() => {
    const angle = angleOffset + progress.value * Math.PI * 2;
    return {
      transform: [
        { translateX: Math.cos(angle) * radius },
        { translateY: Math.sin(angle) * radius },
      ],
      opacity: 0.3 + 0.4 * Math.abs(Math.sin(angle)),
    };
  });

  return <Animated.View style={[styles.particle, style]} />;
}

const styles = StyleSheet.create({
  wrapper: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  core: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
  },
  glow: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
  },
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
});
