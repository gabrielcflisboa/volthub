import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Text, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStationsStore } from '@/presentation/state/useStationsStore';
import { useFavoritesStore } from '@/presentation/state/useFavoritesStore';
import { SearchBar } from '@/presentation/components/ui/SearchBar';
import { FilterChips } from '@/presentation/components/ui/FilterChips';
import { StationCard } from '@/presentation/components/station/StationCard';
import { Station } from '@/domain/entities/Station';
import { colors } from '@/presentation/theme/colors';
import { spacing } from '@/presentation/theme/spacing';

export default function StationsListScreen() {
  const router = useRouter();
  const {
    filteredStations,
    loading,
    refreshing,
    searchQuery,
    activeFilter,
    fetchStations,
    setSearchQuery,
    setActiveFilter,
    setSelectedStation,
  } = useStationsStore();

  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const listRef = useRef<FlatList<Station>>(null);

  // Novo filtro/busca muda o conjunto exibido: volta ao topo para os primeiros resultados ficarem visíveis
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activeFilter, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Barra de Busca Superior */}
      <View style={styles.header}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por nome, bairro ou local..."
        />
        {/* Chips de Categorias e Filtros */}
        <FilterChips selected={activeFilter} onSelect={setActiveFilter} />
      </View>

      {/* Lista de Estações */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Buscando eletropostos...</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          testID="item-list-screen"
          data={filteredStations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchStations(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <StationCard
              station={item}
              isFavorite={isFavorite(item.id)}
              onToggleFavorite={toggleFavorite}
              onPress={(st) => {
                setSelectedStation(st);
                router.push(`/stations/${st.id}` as any);
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum posto encontrado</Text>
              <Text style={styles.emptySubtitle}>
                Tente ajustar os filtros ou digitar outro termo de busca.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
