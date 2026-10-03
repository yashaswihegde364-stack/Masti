import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";
import { api } from "@/api/client";
import { ScriptureCard } from "@/components/ScriptureCard";

export function DailyVerseScreen() {
  const [verse, setVerse] = useState<{ reference: string; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .dailyVerse()
      .then(setVerse)
      .catch(() => setVerse(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Today</Text>
      <View style={styles.body}>
        {loading && <ActivityIndicator color={colors.accent} />}
        {!loading && verse && <ScriptureCard reference={verse.reference} text={verse.text} />}
        {!loading && !verse && (
          <Text style={styles.empty}>
            No verse loaded yet — the Bible text needs to be ingested on the server.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: "600", marginBottom: 16 },
  body: { flex: 1, justifyContent: "center" },
  empty: { color: colors.textSecondary, fontSize: 14, textAlign: "center" },
});
