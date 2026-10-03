import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";

const FREE_FEATURES = ["5 conversations / month", "Scripture search", "Daily verse"];
const PLUS_FEATURES = [
  "Unlimited conversations",
  "Deeper, Scripture-grounded responses",
  "Guided confession",
  "Prayer generation",
  "Personal spiritual journal",
  "Conversation history",
];

export function PaywallScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Masti Plus</Text>
      <Text style={styles.subtitle}>
        $4.99/month or $39.99/year — no payment processor wired up yet, this
        is the pricing UI from the product plan.
      </Text>

      <PlanCard title="Free" items={FREE_FEATURES} />
      <PlanCard title="Plus" items={PLUS_FEATURES} highlight />

      <TouchableOpacity style={styles.cta} disabled>
        <Text style={styles.ctaText}>Subscribe (coming soon)</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function PlanCard({
  title,
  items,
  highlight,
}: {
  title: string;
  items: string[];
  highlight?: boolean;
}) {
  return (
    <View style={[styles.card, highlight && styles.cardHighlight]}>
      <Text style={styles.cardTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.cardItem}>
          · {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 8, marginBottom: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 14 },
  cardHighlight: { borderWidth: 1, borderColor: colors.accent },
  cardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "600", marginBottom: 8 },
  cardItem: { color: colors.textSecondary, fontSize: 14, marginBottom: 4 },
  cta: {
    marginTop: 10,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaText: { color: colors.textSecondary, fontWeight: "600" },
});
