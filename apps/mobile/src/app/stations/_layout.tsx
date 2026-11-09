import React from 'react';
import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/presentation/theme/colors';

function DetailBackButton() {
  const router = useRouter();
  return (
    <Pressable
      testID="detail-back-button"
      accessibilityLabel="Voltar"
      onPress={() => router.back()}
      hitSlop={12}
      style={{ paddingRight: 12 }}
    >
      <Ionicons name="arrow-back" size={24} color={colors.primary} />
    </Pressable>
  );
}

export default function StationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleStyle: {
          color: colors.textPrimary,
          fontWeight: '700',
        },
        headerTintColor: colors.primary,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: '⚡ Eletropostos VoltHub',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: 'Detalhes da Estação',
          headerBackVisible: false,
          headerLeft: () => <DetailBackButton />,
        }}
      />
    </Stack>
  );
}
