import { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { colors } from "@/theme/colors";
import { api } from "@/api/client";
import { AmbientOrb } from "@/components/AmbientOrb";
import { MessageBubble } from "@/components/MessageBubble";
import { ScriptureCard } from "@/components/ScriptureCard";

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  verses?: { id: number; reference: string; text: string }[];
}

export function ChatScreen({ navigation }: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const listRef = useRef<FlatList<DisplayMessage>>(null);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);
    setSending(true);

    try {
      const response = await api.sendMessage(text, conversationId);
      setConversationId(response.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: response.reflection,
          verses: response.verses,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          text: "Something went wrong reaching the server. Try again in a moment.",
        },
      ]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Masti</Text>
        <View style={styles.headerLinks}>
          <TouchableOpacity onPress={() => navigation.navigate("Journal")}>
            <Text style={styles.headerLink}>Journal</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("DailyVerse")}>
            <Text style={styles.headerLink}>Today's verse</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Paywall")}>
            <Text style={styles.headerLink}>Plus</Text>
          </TouchableOpacity>
        </View>
      </View>

      {messages.length === 0 && (
        <View style={styles.empty}>
          <AmbientOrb active={false} />
          <Text style={styles.emptyText}>What's on your mind?</Text>
        </View>
      )}

      <FlatList<DisplayMessage>
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: DisplayMessage }) => (
          <View>
            {item.verses?.map((v) => (
              <ScriptureCard key={v.id} reference={v.reference} text={v.text} />
            ))}
            <MessageBubble role={item.role} text={item.text} />
          </View>
        )}
      />

      {sending && (
        <View style={styles.typing}>
          <AmbientOrb active />
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Say what's on your heart..."
            placeholderTextColor={colors.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={sending}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "600" },
  headerLinks: { flexDirection: "row", gap: 16 },
  headerLink: { color: colors.accent, fontSize: 13 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.textSecondary, marginTop: 12, fontSize: 15 },
  list: { paddingHorizontal: 16, paddingVertical: 12 },
  typing: { alignItems: "center", paddingVertical: 4 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendText: { color: colors.background, fontWeight: "600" },
});
