import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, StyleProp, ImageStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface StationImageProps {
  uri: string;
  style: StyleProp<ImageStyle>;
  iconSize?: number;
}

/** Foto da estação; se a URL falhar (404, sem rede), mostra um placeholder em vez de um vazio. */
export const StationImage: React.FC<StationImageProps> = ({ uri, style, iconSize = 36 }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [uri]);

  if (failed || !uri) {
    return (
      <View style={[style, styles.placeholder]}>
        <Ionicons name="flash" size={iconSize} color={colors.primary} />
      </View>
    );
  }

  return <Image source={{ uri }} style={style} resizeMode="cover" onError={() => setFailed(true)} />;
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
