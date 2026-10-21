import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompletedInvoice } from '../../state/useLiveChargingStore';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/spacing';

interface LiveChargingGaugeProps {
  isCharging: boolean;
  powerKw: number;
  energyKwh: number;
  targetKwh: number;
  batteryPercent: number;
  pricePerKwh: number;
  elapsedSeconds: number;
  stationName: string;
  chargerId: string;
  lastInvoice: CompletedInvoice | null;
  onStop: () => void;
  onStart: () => void;
  onClearInvoice: () => void;
}

export const LiveChargingGauge: React.FC<LiveChargingGaugeProps> = ({
  isCharging,
  powerKw,
  energyKwh,
  targetKwh,
  batteryPercent,
  pricePerKwh,
  elapsedSeconds,
  stationName,
  chargerId,
  lastInvoice,
  onStop,
  onStart,
  onClearInvoice,
}) => {
  const estimatedCost = (energyKwh * pricePerKwh).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (lastInvoice && !isCharging) {
    return (
      <View style={styles.container}>
        <View style={[styles.outerRing, styles.outerRingActive]}>
          <View style={styles.innerRing}>
            <Ionicons name="checkmark-circle" size={44} color={colors.primary} />
            <Text style={styles.completedTitle}>Recarga Concluída!</Text>
            <Text style={styles.energyValue}>{lastInvoice.energyKwh.toFixed(2)}</Text>
            <Text style={styles.energyUnit}>kWh entregues · Bateria 100%</Text>
          </View>
        </View>

        <View style={styles.invoiceCard}>
          <View style={styles.invoiceHeader}>
            <Text style={styles.invoiceTitle}>⚡ Fatura da Sessão</Text>
            <Text style={styles.invoiceTime}>{lastInvoice.issuedAt}</Text>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Eletroposto</Text>
            <Text style={styles.invoiceValue}>{lastInvoice.stationName}</Text>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Conector</Text>
            <Text style={styles.invoiceValue}>{lastInvoice.chargerId}</Text>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Duração</Text>
            <Text style={styles.invoiceValue}>{formatTime(lastInvoice.elapsedSeconds)}</Text>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Tarifa aplicada</Text>
            <Text style={styles.invoiceValue}>
              {lastInvoice.pricePerKwh.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
              /kWh
            </Text>
          </View>
          <View style={[styles.invoiceRow, styles.invoiceTotalRow]}>
            <Text style={styles.invoiceTotalLabel}>Total Faturado</Text>
            <Text style={styles.costAmount}>
              {lastInvoice.totalAmount.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.actionBtnStart, pressed && { opacity: 0.88 }]}
          onPress={onClearInvoice}
        >
          <Ionicons name="refresh" size={18} color={colors.textInverse} style={{ marginRight: 8 }} />
          <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>
            Nova Sessão de Recarga
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Círculo Principal de Telemetria */}
      <View style={[styles.outerRing, isCharging && styles.outerRingActive]}>
        <View style={styles.innerRing}>
          {isCharging ? (
            <>
              <View style={styles.pulseLiveRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveLabel}>AO VIVO · {chargerId}</Text>
              </View>

              <Text style={styles.energyValue}>{energyKwh.toFixed(2)}</Text>
              <Text style={styles.energyUnit}>
                de {targetKwh.toFixed(0)} kWh · Bateria {batteryPercent}%
              </Text>

              {/* Barra de Progresso da Bateria */}
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${batteryPercent}%` as any }]} />
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{powerKw.toFixed(1)} kW</Text>
                  <Text style={styles.metricSub}>Potência</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{formatTime(elapsedSeconds)}</Text>
                  <Text style={styles.metricSub}>Tempo</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.idleState}>
              <Ionicons name="flash-off" size={48} color={colors.textMuted} />
              <Text style={styles.idleTitle}>Nenhuma recarga ativa</Text>
              <Text style={styles.idleSubtitle}>
                Selecione uma estação para plugar seu veículo
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Card de Faturamento Estimado */}
      {isCharging && (
        <View style={styles.costCard}>
          <View>
            <Text style={styles.costLabel}>Valor Estimado da Sessão</Text>
            <Text style={styles.stationLabel}>{stationName}</Text>
          </View>
          <Text style={styles.costAmount}>{estimatedCost}</Text>
        </View>
      )}

      {/* Botão de Controle (Iniciar/Parar) */}
      <Pressable
        style={({ pressed }) => [
          styles.actionBtn,
          isCharging ? styles.actionBtnStop : styles.actionBtnStart,
          pressed && { opacity: 0.88 },
        ]}
        onPress={isCharging ? onStop : onStart}
      >
        <Ionicons
          name={isCharging ? 'stop' : 'flash'}
          size={18}
          color={isCharging ? colors.textPrimary : colors.textInverse}
          style={{ marginRight: 8 }}
        />
        <Text
          style={[
            styles.actionBtnText,
            { color: isCharging ? colors.textPrimary : colors.textInverse },
          ]}
        >
          {isCharging ? 'Encerrar Recarga' : 'Simular Início de Recarga'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  outerRing: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  outerRingActive: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  innerRing: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  pulseLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 6,
  },
  liveLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  energyValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 52,
  },
  energyUnit: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  completedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 4,
  },
  progressTrack: {
    width: 150,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  divider: {
    width: 140,
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 10,
  },
  invoiceCard: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    gap: 8,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    marginBottom: 4,
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  invoiceTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  invoiceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  invoiceTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  invoiceTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
  },
  metricSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  idleState: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  idleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  idleSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  costCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  costLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  stationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  costAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    borderRadius: radii.md,
  },
  actionBtnStart: {
    backgroundColor: colors.primary,
  },
  actionBtnStop: {
    backgroundColor: colors.danger,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
