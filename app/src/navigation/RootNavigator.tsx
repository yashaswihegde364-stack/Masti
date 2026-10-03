import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { OnboardingScreen } from "@/screens/OnboardingScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { DailyVerseScreen } from "@/screens/DailyVerseScreen";
import { JournalScreen } from "@/screens/JournalScreen";
import { PaywallScreen } from "@/screens/PaywallScreen";

export type RootStackParamList = {
  Onboarding: undefined;
  Chat: { conversationId?: string } | undefined;
  DailyVerse: undefined;
  Journal: undefined;
  Paywall: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: colors.accent,
          background: colors.background,
          card: colors.surface,
          text: colors.textPrimary,
          border: colors.divider,
          notification: colors.accent,
        },
      }}
    >
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DailyVerse" component={DailyVerseScreen} options={{ title: "Today's Verse" }} />
        <Stack.Screen name="Journal" component={JournalScreen} options={{ title: "Journal" }} />
        <Stack.Screen name="Paywall" component={PaywallScreen} options={{ title: "Masti Plus" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
