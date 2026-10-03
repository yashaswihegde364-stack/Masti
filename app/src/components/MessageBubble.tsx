import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

export function MessageBubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const isUser = role === "user";
  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", marginVertical: 4 },
  rowUser: { justifyContent: "flex-end" },
  bubble: { maxWidth: "82%", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleUser: { backgroundColor: colors.surfaceRaised, borderTopRightRadius: 4 },
  bubbleAssistant: { backgroundColor: colors.surface, borderTopLeftRadius: 4 },
  text: { color: colors.textPrimary, fontSize: 15, lineHeight: 21 },
});
