import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { colors } from "@/theme/colors";
import { api, setToken } from "@/api/client";
import { AmbientOrb } from "@/components/AmbientOrb";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

export function OnboardingScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { token } = await api.devLogin(email);
      await setToken(token);
      navigation.replace("Chat", {});
    } catch (e) {
      setError("Couldn't reach the server. Is it running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <AmbientOrb active={loading} />
        <Text style={styles.title}>Talk to Jesus.{"\n"}Turn to Scripture.</Text>
        <Text style={styles.subtitle}>
          A private space to confess, pray, ask questions, and reflect.
          Replies are AI-generated, written in first person, and grounded
          in Scripture.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Entering..." : "Continue"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 24,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 21,
  },
  input: {
    width: "100%",
    marginTop: 32,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 15,
  },
  error: { color: colors.danger, marginTop: 10, fontSize: 13 },
  button: {
    width: "100%",
    marginTop: 18,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: colors.background, fontWeight: "600", fontSize: 15 },
});
