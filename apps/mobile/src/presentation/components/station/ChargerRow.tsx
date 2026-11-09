import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Charger } from '@/domain/entities/Charger';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/spacing';

interface ChargerRowProps {
  charger: Charger;
  onReserve?: (charger: Charger) => void;
  onStartCharging?: (charger: Charger) => void;
}

export const ChargerRow: React.FC<ChargerRowProps> = ({
  charger,
  onReserve,
  onStartCharging,
}) => {
  const isAvailable = charger.isAvailable;

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={charger.connector.isDC ? 'flash' : 'battery-charging'}
            size={22}
            color={isAvailable ? colors.primary : colors.textMuted}
          />
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.chargerId}>{charger.id}</Text>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: charger.status.color },
              ]}
            />
            <Text style={[styles.statusText, { color: charger.status.color }]}>
              {charger.status.label}
            </Text>
          </View>
          <Text style={styles.connectorSpec}>
            {charger.connector.displayName} · <Text style={styles.power}>{charger.powerKw} kW</Text>
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {isAvailable && (
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={() => onStartCharging?.(charger)}
          >
            <Ionicons name="play" size={14} color={colors.textInverse} style={{ marginRight: 4 }} />
            <Text style={styles.actionButtonText}>Carregar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  chargerId: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  connectorSpec: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  power: {
    color: colors.secondary,
    fontWeight: '700',
  },
  actions: {
    marginLeft: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionButtonText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
});
