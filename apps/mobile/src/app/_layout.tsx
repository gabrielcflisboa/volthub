import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/presentation/theme/colors';
import { radii, spacing } from '@/presentation/theme/spacing';
import { useStationsStore } from '@/presentation/state/useStationsStore';
import { useFavoritesStore } from '@/presentation/state/useFavoritesStore';
import { useAuthStore } from '@/presentation/state/useAuthStore';

export default function RootLayout() {
  const fetchStations = useStationsStore((s) => s.fetchStations);
  const dataSource = useStationsStore((s) => s.dataSource);
  const loadFavorites = useFavoritesStore((s) => s.loadFavorites);
  const initializeAuth = useAuthStore((s) => s.initialize);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    initializeAuth().then(() => {
      fetchStations();
    });
    loadFavorites();
  }, []);

  const HeaderStatusBadge = () => {
    const isApi = dataSource === 'API';
    return (
      <Pressable
        style={[styles.statusBadge, isApi ? styles.statusOnline : styles.statusOffline]}
        onPress={() => fetchStations(true)}
      >
        <View style={[styles.dot, { backgroundColor: isApi ? colors.primary : colors.warning }]} />
        <Text style={[styles.statusText, { color: isApi ? colors.primary : colors.warning }]}>
          {isApi ? `API Online${user?.name ? ` · ${user.name.split(' ')[0]}` : ''}` : 'Modo Offline'}
        </Text>
      </Pressable>
    );
  };

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        initialRouteName="stations"
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
            shadowColor: 'transparent',
          },
          headerTitleStyle: {
            color: colors.textPrimary,
            fontWeight: '700',
            fontSize: 18,
          },
          headerRight: () => <HeaderStatusBadge />,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Mapa',
            tabBarButtonTestID: 'tab-map',
            headerTitle: '⚡ VoltHub · Mapa',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="stations"
          options={{
            title: 'Estações',
            tabBarButtonTestID: 'tab-stations',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="live"
          options={{
            title: 'Recarga',
            tabBarButtonTestID: 'tab-live',
            headerTitle: '⚡ Telemetria Ao Vivo',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="flash" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="favorites"
          options={{
            title: 'Favoritos',
            tabBarButtonTestID: 'tab-favorites',
            headerTitle: '⭐ Postos Favoritos',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="heart" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    marginRight: spacing.md,
    borderWidth: 1,
  },
  statusOnline: {
    backgroundColor: 'rgba(0, 245, 155, 0.12)',
    borderColor: 'rgba(0, 245, 155, 0.35)',
  },
  statusOffline: {
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    borderColor: 'rgba(255, 184, 0, 0.35)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
