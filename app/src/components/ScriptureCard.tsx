import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

/**
 * Deliberately styled differently from reflection/chat bubbles — the
 * product promise in docs/ARCHITECTURE.md ("Scripture says" vs. "a
 * possible interpretation") has to be visible, not just structural in
 * the API response.
 */
export function ScriptureCard({ reference, text }: { reference: string; text: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.reference}>{reference}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.scriptureCard,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    borderRadius: 10,
    padding: 14,
    marginVertical: 6,
  },
  reference: {
    color: colors.accent,
    fontWeight: "600",
    marginBottom: 4,
    fontSize: 13,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
    fontStyle: "italic",
  },
});
