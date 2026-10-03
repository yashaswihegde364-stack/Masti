import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme/colors";
import { api } from "@/api/client";

interface Entry {
  id: string;
  content: string;
  created_at: string;
}

export function JournalScreen() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");

  const load = useCallback(() => {
    api
      .listJournal()
      .then((rows) => setEntries(rows as Entry[]))
      .catch(() => setEntries([]));
  }, []);

  useEffect(load, [load]);

  async function handleAdd() {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    await api.addJournalEntry(content);
    load();
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Journal</Text>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Write a reflection..."
          placeholderTextColor={colors.textSecondary}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.entry}>
            <Text style={styles.entryDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
            <Text style={styles.entryText}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nothing written yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: "600", marginBottom: 16 },
  composer: { flexDirection: "row", gap: 10, marginBottom: 20 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  addButtonText: { color: colors.background, fontWeight: "600" },
  list: { paddingBottom: 40 },
  entry: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  entryDate: { color: colors.textSecondary, fontSize: 12, marginBottom: 6 },
  entryText: { color: colors.textPrimary, fontSize: 15, lineHeight: 20 },
  empty: { color: colors.textSecondary, textAlign: "center", marginTop: 40 },
});
