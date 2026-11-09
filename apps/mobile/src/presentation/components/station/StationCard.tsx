import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Station } from '@/domain/entities/Station';
import { colors } from '../../theme/colors';
import { StationImage } from './StationImage';
import { spacing, radii } from '../../theme/spacing';

interface StationCardProps {
  station: Station;
  isFavorite: boolean;
  onToggleFavorite: (stationId: string) => void;
  onPress: (station: Station) => void;
  /** testID do card (padrão: `item-card-<id>`; a aba Favoritos usa `favorite-item-<id>`). */
  testID?: string;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  isFavorite,
  onToggleFavorite,
  onPress,
  testID,
}) => {
  const availableCount = station.availableChargersCount;
  const hasAvailable = availableCount > 0;

  return (
    <Pressable
      testID={testID ?? `item-card-${station.id}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(station)}
    >
      <View style={styles.imageContainer}>
        <StationImage uri={station.imageUrl} style={styles.image} />
        <View style={styles.imageOverlay} />

        {/* Badge de Disponibilidade */}
        <View
          style={[
            styles.availabilityBadge,
            { backgroundColor: hasAvailable ? colors.statusAvailable : colors.statusOffline },
          ]}
        >
          <View style={styles.pulseDot} />
          <Text style={styles.availabilityText}>
            {hasAvailable
              ? `${availableCount}/${station.totalChargers} Livres`
              : 'Ocupado'}
          </Text>
        </View>

        {/* Botão de Favorito com Coração */}
        <Pressable
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite(station.id);
          }}
          hitSlop={8}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorite ? colors.danger : colors.textPrimary}
          />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {station.name}
          </Text>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={13} color="#FFB800" style={{ marginRight: 3 }} />
            <Text style={styles.ratingText}>{station.rating.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={styles.address} numberOfLines={1}>
          {station.address}
        </Text>

        <View style={styles.metaRow}>
          {/* Potência Máxima */}
          <View style={styles.metaItem}>
            <Ionicons name="flash" size={14} color={colors.secondary} style={{ marginRight: 4 }} />
            <Text style={styles.metaText}>{station.maxPowerKw} kW máx</Text>
          </View>

          {/* Tarifa */}
          <View style={styles.metaItem}>
            <Text style={styles.priceText}>{station.pricePerKwh.formatPerKwh()}</Text>
          </View>
        </View>

        {/* Tags de conectores disponíveis */}
        <View style={styles.connectorsRow}>
          {station.chargers.map((c) => (
            <View
              key={c.id}
              style={[
                styles.connectorPill,
                c.isAvailable ? styles.connectorPillAvailable : styles.connectorPillBusy,
              ]}
            >
              <Text style={styles.connectorText}>
                {c.connector.value} · {c.powerKw}kW
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  imageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 15, 25, 0.35)',
  },
  availabilityBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textInverse,
    marginRight: 6,
  },
  availabilityText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(11, 15, 25, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  content: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  address: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: colors.secondary,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  connectorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  connectorPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  connectorPillAvailable: {
    backgroundColor: 'rgba(0, 245, 155, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 155, 0.3)',
  },
  connectorPillBusy: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  connectorText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
