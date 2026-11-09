import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/spacing';

export type FilterOption = 'ALL' | 'AVAILABLE' | 'FAST' | 'CCS2' | 'TYPE2';

interface FilterChipsProps {
  selected: FilterOption;
  onSelect: (filter: FilterOption) => void;
}

const FILTERS: { id: FilterOption; label: string; icon?: string }[] = [
  { id: 'ALL', label: 'Todos' },
  { id: 'AVAILABLE', label: 'Vagas Livres' },
  { id: 'FAST', label: 'Rápido (>50kW)' },
  { id: 'CCS2', label: 'Plug CCS 2' },
  { id: 'TYPE2', label: 'Plug Tipo 2' },
];

export const FilterChips: React.FC<FilterChipsProps> = ({ selected, onSelect }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTERS.map((item) => {
        const isSelected = selected === item.id;
        return (
          <Pressable
            key={item.id}
            testID={`category-chip-${item.id.toLowerCase()}`}
            onPress={() => onSelect(item.id)}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
});
