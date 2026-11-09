import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLiveChargingStore } from '@/presentation/state/useLiveChargingStore';
import { LiveChargingGauge } from '@/presentation/components/charging/LiveChargingGauge';
import { colors } from '@/presentation/theme/colors';
import { spacing, radii } from '@/presentation/theme/spacing';

export default function LiveChargingScreen() {
  const {
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
    invoiceHistory,
    degradedServices,
    startCharging,
    stopCharging,
    clearInvoice,
    fetchDashboardInvoices,
  } = useLiveChargingStore();

  useEffect(() => {
    fetchDashboardInvoices();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {degradedServices.length > 0 && (
        <View style={styles.degradedBanner}>
          <Ionicons name="warning" size={16} color={colors.warning} style={{ marginRight: 6 }} />
          <Text style={styles.degradedText}>
            Circuit Breaker ativo: {degradedServices.join(', ')} temporariamente indisponível.
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>Sessão de Recarga</Text>
        <Text style={styles.subtitle}>
          Acompanhe os kWh e o valor da recarga transmitidos em tempo real.
        </Text>
      </View>

      <LiveChargingGauge
        isCharging={isCharging}
        powerKw={powerKw}
        energyKwh={energyKwh}
        targetKwh={targetKwh}
        batteryPercent={batteryPercent}
        pricePerKwh={pricePerKwh}
        elapsedSeconds={elapsedSeconds}
        stationName={stationName}
        chargerId={chargerId}
        lastInvoice={lastInvoice}
        onStop={stopCharging}
        onClearInvoice={clearInvoice}
        onStart={() =>
          startCharging('VoltHub Diamond Lourdes', 'BH-LOU-01', 150, 2.29)
        }
      />

      {/* Histórico de Faturas do Billing Service (/api/v1/dashboard) */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <View style={styles.historyTitleRow}>
            <Ionicons name="receipt-outline" size={18} color={colors.primary} />
            <Text style={styles.historyTitle}>Histórico de Faturas (Billing Service)</Text>
          </View>
          <Pressable
            onPress={() => fetchDashboardInvoices()}
            style={styles.refreshBtn}
            hitSlop={8}
          >
            <Ionicons name="refresh" size={16} color={colors.secondary} />
          </Pressable>
        </View>

        {invoiceHistory.length === 0 ? (
          <View style={styles.emptyInvoices}>
            <Text style={styles.emptyInvoicesText}>
              Nenhuma fatura registrada no billing-service ainda. Conclua uma recarga para gerar!
            </Text>
          </View>
        ) : (
          invoiceHistory.slice(0, 10).map((inv) => (
            <View key={inv.id} style={styles.invoiceItem}>
              <View style={styles.invoiceLeft}>
                <View style={styles.invoiceBadgeRow}>
                  <Text style={styles.invoiceCharger}>{inv.chargerId}</Text>
                  <Text style={styles.invoiceTime}>{inv.formattedTime}</Text>
                </View>
                <Text style={styles.invoiceEnergy}>
                  {inv.energyKwh.toFixed(2)} kWh · {inv.pricePerKwh.formatPerKwh()}
                </Text>
              </View>
              <Text style={styles.invoiceAmount}>{inv.amount.format()}</Text>
            </View>
          ))
        )}
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
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  degradedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  degradedText: {
    flex: 1,
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  historySection: {
    marginTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  refreshBtn: {
    padding: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyInvoices: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyInvoicesText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  invoiceLeft: {
    flex: 1,
  },
  invoiceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  invoiceCharger: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  invoiceTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  invoiceEnergy: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
});
