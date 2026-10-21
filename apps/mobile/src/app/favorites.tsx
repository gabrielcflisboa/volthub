import React from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStationsStore } from '@/presentation/state/useStationsStore';
import { useFavoritesStore } from '@/presentation/state/useFavoritesStore';
import { StationCard } from '@/presentation/components/station/StationCard';
import { colors } from '@/presentation/theme/colors';
import { spacing } from '@/presentation/theme/spacing';

export default function FavoritesScreen() {
  const router = useRouter();
  const { stations, setSelectedStation } = useStationsStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();

  const favoriteStations = stations.filter((s) => isFavorite(s.id));

  return (
    <View style={styles.container}>
      <FlatList
        data={favoriteStations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <StationCard
            station={item}
            testID={`favorite-item-${item.id}`}
            isFavorite={true}
            onToggleFavorite={toggleFavorite}
            onPress={(st) => {
              setSelectedStation(st);
              router.push(`/stations/${st.id}` as any);
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.heartIconCircle}>
              <Ionicons name="heart" size={36} color={colors.danger} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum posto favoritado</Text>
            <Text style={styles.emptySubtitle}>
              Toque no coração de qualquer eletroposto na aba Mapa ou Estações para salvá-lo aqui.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: spacing.xl,
  },
  heartIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 71, 87, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
