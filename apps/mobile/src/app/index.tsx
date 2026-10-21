import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStationsStore } from '@/presentation/state/useStationsStore';
import { useFavoritesStore } from '@/presentation/state/useFavoritesStore';
import { InteractiveMap } from '@/presentation/components/map/InteractiveMap';
import { StationImage } from '@/presentation/components/station/StationImage';
import { colors } from '@/presentation/theme/colors';
import { spacing, radii } from '@/presentation/theme/spacing';

export default function MapScreen() {
  const router = useRouter();
  const { stations, selectedStation, setSelectedStation } = useStationsStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();

  return (
    <View style={styles.container}>
      {/* Mapa Interativo com Pins das Estações */}
      <InteractiveMap
        stations={stations}
        selectedStation={selectedStation}
        onSelectStation={setSelectedStation}
      />

      {/* Card Inferior Flutuante da Estação Selecionada */}
      {selectedStation && (
        <View style={styles.bottomCardWrapper}>
          <Pressable
            style={styles.bottomCard}
            onPress={() => router.push(`/stations/${selectedStation.id}` as any)}
          >
            <StationImage uri={selectedStation.imageUrl} style={styles.cardImage} iconSize={28} />
            <View style={styles.cardDetails}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {selectedStation.name}
                </Text>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleFavorite(selectedStation.id);
                  }}
                  hitSlop={8}
                >
                  <Ionicons
                    name={isFavorite(selectedStation.id) ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isFavorite(selectedStation.id) ? colors.danger : colors.textPrimary}
                  />
                </Pressable>
              </View>

              <Text style={styles.cardAddress} numberOfLines={1}>
                {selectedStation.address}
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.availDot,
                      {
                        backgroundColor: selectedStation.hasAvailableChargers
                          ? colors.primary
                          : colors.statusFaulted,
                      },
                    ]}
                  />
                  <Text style={styles.availText}>
                    {selectedStation.availableChargersCount} de {selectedStation.totalChargers} livres
                  </Text>
                </View>

                <Text style={styles.cardPrice}>
                  {selectedStation.pricePerKwh.formatPerKwh()}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bottomCardWrapper: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
  },
  bottomCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  cardImage: {
    width: 110,
    height: 110,
  },
  cardDetails: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  cardAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  availText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
});
