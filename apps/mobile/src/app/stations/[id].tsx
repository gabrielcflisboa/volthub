import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStationsStore } from '@/presentation/state/useStationsStore';
import { useFavoritesStore } from '@/presentation/state/useFavoritesStore';
import { useLiveChargingStore } from '@/presentation/state/useLiveChargingStore';
import { ChargerRow } from '@/presentation/components/station/ChargerRow';
import { Station } from '@/domain/entities/Station';
import { Charger } from '@/domain/entities/Charger';
import { colors } from '@/presentation/theme/colors';
import { spacing, radii } from '@/presentation/theme/spacing';

export default function StationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { stations, fetchStationById } = useStationsStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { startCharging } = useLiveChargingStore();

  const [station, setStation] = useState<Station | null>(
    stations.find((s) => s.id === id) ?? null
  );
  const [loading, setLoading] = useState(!station);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetchStationById(id).then((res) => {
      if (res) setStation(res);
      setLoading(false);
    });
  }, [id]);

  if (!station) {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    // Busca terminou sem estação (id inexistente ou API/seed sem ela): não deixa o spinner girando para sempre
    return (
      <View testID="detail-not-found" style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={styles.notFoundTitle}>Estação não encontrada</Text>
        <Text style={styles.notFoundSubtitle}>
          Ela pode ter sido removida ou o link está incorreto.
        </Text>
      </View>
    );
  }

  const isFav = isFavorite(station.id);
  const availableCount = station.availableChargersCount;

  const handleStartCharge = (charger: Charger) => {
    startCharging(station.name, charger.id, charger.powerKw, station.pricePerKwh.amount);
    router.push('/live' as any);
  };

  return (
    <ScrollView testID="detail-screen" style={styles.container} contentContainerStyle={styles.content}>
      {/* Imagem de Capa */}
      <View style={styles.heroContainer}>
        <Image source={{ uri: station.imageUrl }} style={styles.heroImage} resizeMode="cover" />
        <View style={styles.heroOverlay} />

        {/* Botão de Favorito no Canto Superior */}
        <Pressable
          testID="detail-favorite-button"
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(station.id)}
          hitSlop={8}
        >
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={24}
            color={isFav ? colors.danger : colors.textPrimary}
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        {/* Título e Avaliação */}
        <View style={styles.titleRow}>
          <Text testID="detail-title" style={styles.title}>{station.name}</Text>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={14} color="#FFB800" style={{ marginRight: 4 }} />
            <Text style={styles.ratingText}>{station.rating.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={styles.address}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />{' '}
          {station.address}
        </Text>

        {/* Cards de Métricas Principais */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Tarifa</Text>
            <Text style={styles.metricValuePrimary}>{station.pricePerKwh.formatPerKwh()}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Disponibilidade</Text>
            <Text
              style={[
                styles.metricValue,
                { color: availableCount > 0 ? colors.primary : colors.statusFaulted },
              ]}
            >
              {availableCount} de {station.totalChargers} livres
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Funcionamento</Text>
            <Text style={styles.metricValue}>{station.openHours}</Text>
          </View>
        </View>

        {/* Comodidades do Local */}
        <Text style={styles.sectionTitle}>Comodidades no Local</Text>
        <View style={styles.amenitiesRow}>
          {station.amenities.map((amenity, idx) => (
            <View key={idx} style={styles.amenityChip}>
              <Text style={styles.amenityText}>✓ {amenity}</Text>
            </View>
          ))}
        </View>

        {/* Lista de Carregadores */}
        <View style={styles.chargersHeader}>
          <Text style={styles.sectionTitle}>Carregadores e Conectores</Text>
          <Text style={styles.chargersCountText}>{station.totalChargers} pontos</Text>
        </View>

        {station.chargers.map((charger) => (
          <ChargerRow
            key={charger.id}
            charger={charger}
            onStartCharging={handleStartCharge}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  notFoundTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  notFoundSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  heroContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 15, 25, 0.35)',
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11, 15, 25, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  body: {
    padding: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  address: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricValuePrimary: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  amenityChip: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amenityText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chargersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  chargersCountText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
