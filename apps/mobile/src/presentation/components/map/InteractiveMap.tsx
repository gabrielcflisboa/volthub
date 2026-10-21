import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  PanResponder,
  Image,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Station } from '@/domain/entities/Station';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/spacing';

interface InteractiveMapProps {
  stations: Station[];
  selectedStation: Station | null;
  onSelectStation: (station: Station) => void;
}

const BH_DOWNTOWN = { lat: -19.932, lng: -43.938, zoom: 13 };
const BH_METRO = { lat: -19.82, lng: -43.95, zoom: 11 };

const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const CARTO_API_KEY = 'cb1_4qgo_1_add9e41153ffaeb5f66f73ba';
const DARK_TILE_URL = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`;

let leafletLoadPromise: Promise<any> | null = null;

function ensureVolthubLeafletStyles() {
  if (typeof document === 'undefined') return;
  let style = document.getElementById('volthub-leaflet-custom-style') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'volthub-leaflet-custom-style';
    document.head.appendChild(style);
  }
  style.textContent = `
        .volthub-leaflet-container {
          background: #070A11 !important;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .volthub-pin-icon {
          background: transparent !important;
          border: none !important;
        }
        .volthub-pin-anchor {
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: translate(-50%, -50%);
          cursor: pointer;
          user-select: none;
          transition: transform 0.18s ease;
        }
        .volthub-pin-anchor:hover {
          transform: translate(-50%, -50%) scale(1.08);
        }
        .volthub-pin-pill {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 3px;
          background: #1E293B;
          padding: 5px 9px;
          border-radius: 9999px;
          border: 2px solid #00E676;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.65);
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .volthub-pin-pill.selected {
          background: #26354D;
          transform: scale(1.18);
          box-shadow: 0 0 16px rgba(0, 230, 118, 0.75);
        }
        .volthub-pin-pill.occupied.selected {
          box-shadow: 0 0 16px rgba(255, 82, 82, 0.75);
        }
        .volthub-pin-bolt {
          font-size: 13px;
          line-height: 1;
        }
        .volthub-pin-count {
          font-size: 12px;
          font-weight: 800;
          color: #F9FAFB;
          line-height: 1;
        }
        .volthub-pin-callout {
          margin-top: 6px;
          background: rgba(17, 24, 39, 0.95);
          border: 1px solid #00E676;
          border-radius: 6px;
          padding: 3px 8px;
          color: #00E676;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
        }
        .leaflet-control-attribution {
          background: rgba(11, 15, 25, 0.75) !important;
          color: #6B7280 !important;
          font-size: 10px !important;
          border-top-left-radius: 6px;
        }
        .leaflet-control-attribution a {
          color: #9CA3AF !important;
        }
      `;
}

function loadLeafletOnWeb(): Promise<any> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  ensureVolthubLeafletStyles();
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (leafletLoadPromise) return leafletLoadPromise;

  leafletLoadPromise = new Promise((resolve, reject) => {
    if (!document.getElementById('volthub-leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'volthub-leaflet-css';
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS_URL;
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById('volthub-leaflet-js') as HTMLScriptElement | null;
    if (existingScript) {
      if (w.L) {
        resolve(w.L);
      } else {
        existingScript.addEventListener('load', () => resolve(w.L));
        existingScript.addEventListener('error', reject);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'volthub-leaflet-js';
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.onload = () => resolve(w.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return leafletLoadPromise;
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[c] ?? c;
  });
}

// Funções auxiliares Web Mercator para o modo nativo (Android/iOS)
const TILE_SIZE = 256;
function lng2tileX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * Math.pow(2, zoom);
}
function lat2tileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}
function tileX2lng(x: number, zoom: number): number {
  return (x / Math.pow(2, zoom)) * 360 - 180;
}
function tileY2lat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  stations,
  selectedStation,
  onSelectStation,
}) => {
  const [mapScope, setMapScope] = useState<'downtown' | 'city'>('downtown');
  const [leafletReady, setLeafletReady] = useState(false);

  // Refs para o mapa Leaflet na Web
  const webContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const onSelectRef = useRef(onSelectStation);
  onSelectRef.current = onSelectStation;

  // Estado para o mapa interativo nativo (fallback Android/iOS)
  const [nativeView, setNativeView] = useState({
    lat: BH_DOWNTOWN.lat,
    lng: BH_DOWNTOWN.lng,
    zoom: BH_DOWNTOWN.zoom,
  });
  const [layout, setLayout] = useState({ width: 400, height: 600 });
  const dragStartRef = useRef({ lat: BH_DOWNTOWN.lat, lng: BH_DOWNTOWN.lng, zoom: BH_DOWNTOWN.zoom });

  // Inicializa o Leaflet na Web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;

    loadLeafletOnWeb()
      .then((L) => {
        if (cancelled || !L || !webContainerRef.current || leafletMapRef.current) return;

        const initialCenter = selectedStation
          ? [selectedStation.coordinates.latitude, selectedStation.coordinates.longitude]
          : [BH_DOWNTOWN.lat, BH_DOWNTOWN.lng];

        const map = L.map(webContainerRef.current, {
          center: initialCenter,
          zoom: BH_DOWNTOWN.zoom,
          zoomControl: false,
          attributionControl: true,
          scrollWheelZoom: true,
          dragging: true,
          doubleClickZoom: true,
          touchZoom: true,
        });

        webContainerRef.current.classList.add('volthub-leaflet-container');

        L.tileLayer(DARK_TILE_URL, {
          subdomains: 'abcd',
          maxZoom: 19,
          minZoom: 9,
          attribution: '&copy; OpenStreetMap &copy; CARTO',
        }).addTo(map);

        const markersLayer = L.layerGroup().addTo(map);
        leafletMapRef.current = map;
        markersLayerRef.current = markersLayer;
        setLeafletReady(true);

        // Garante que o tamanho do container seja recalculado após o layout
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      })
      .catch((err) => {
        console.error('Erro ao carregar Leaflet:', err);
      });

    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Atualiza os pins no Leaflet sempre que as estações ou a estação selecionada mudarem
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const L = (typeof window !== 'undefined' && (window as any).L) || null;
    const map = leafletMapRef.current;
    const layer = markersLayerRef.current;
    if (!L || !map || !layer) return;

    layer.clearLayers();

    stations.forEach((st) => {
      const isSelected = selectedStation?.id === st.id;
      const available = st.availableChargersCount;
      const hasFree = available > 0;
      const borderColor = hasFree ? colors.primary : colors.statusFaulted;

      const html = `
        <div class="volthub-pin-anchor">
          <div class="volthub-pin-pill ${isSelected ? 'selected' : ''} ${!hasFree ? 'occupied' : ''}" style="border-color: ${borderColor};">
            <span class="volthub-pin-bolt" style="color: ${borderColor};">⚡</span>
            <span class="volthub-pin-count">${available}</span>
          </div>
          ${
            isSelected
              ? `<div class="volthub-pin-callout" style="border-color: ${borderColor}; color: ${borderColor};">${escapeHtml(st.name)}</div>`
              : ''
          }
        </div>
      `;

      const icon = L.divIcon({
        className: 'volthub-pin-icon',
        html,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([st.coordinates.latitude, st.coordinates.longitude], {
        icon,
        zIndexOffset: isSelected ? 1000 : 0,
      });

      marker.on('click', () => {
        onSelectRef.current(st);
        map.flyTo([st.coordinates.latitude, st.coordinates.longitude], Math.max(map.getZoom(), 14), {
          duration: 0.6,
        });
      });

      marker.addTo(layer);
    });
  }, [stations, selectedStation, leafletReady]);

  // Ações dos botões de controle (Web + Mobile)
  const handleZoomIn = useCallback(() => {
    if (Platform.OS === 'web' && leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    } else {
      setNativeView((v) => ({ ...v, zoom: Math.min(18, v.zoom + 1) }));
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (Platform.OS === 'web' && leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    } else {
      setNativeView((v) => ({ ...v, zoom: Math.max(9, v.zoom - 1) }));
    }
  }, []);

  const handleToggleScope = useCallback(() => {
    const nextScope = mapScope === 'downtown' ? 'city' : 'downtown';
    setMapScope(nextScope);
    const target = nextScope === 'downtown' ? BH_DOWNTOWN : BH_METRO;

    if (Platform.OS === 'web' && leafletMapRef.current) {
      leafletMapRef.current.flyTo([target.lat, target.lng], target.zoom, { duration: 0.8 });
    } else {
      setNativeView(target);
    }
  }, [mapScope]);

  const handleCenterOnStation = useCallback(() => {
    const targetStation = selectedStation ?? stations[0];
    if (!targetStation) return;
    onSelectStation(targetStation);

    if (Platform.OS === 'web' && leafletMapRef.current) {
      leafletMapRef.current.flyTo(
        [targetStation.coordinates.latitude, targetStation.coordinates.longitude],
        15,
        { duration: 0.7 }
      );
    } else {
      setNativeView({
        lat: targetStation.coordinates.latitude,
        lng: targetStation.coordinates.longitude,
        zoom: 15,
      });
    }
  }, [selectedStation, stations, onSelectStation]);

  // PanResponder para arrastar o mapa no Android/iOS
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        setNativeView((curr) => {
          dragStartRef.current = curr;
          return curr;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const start = dragStartRef.current;
        const startTileX = lng2tileX(start.lng, start.zoom);
        const startTileY = lat2tileY(start.lat, start.zoom);
        const newTileX = startTileX - gesture.dx / TILE_SIZE;
        const newTileY = startTileY - gesture.dy / TILE_SIZE;
        setNativeView({
          lat: Math.max(-20.2, Math.min(-19.4, tileY2lat(newTileY, start.zoom))),
          lng: Math.max(-44.3, Math.min(-43.6, tileX2lng(newTileX, start.zoom))),
          zoom: start.zoom,
        });
      },
    })
  ).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayout({ width, height });
      if (Platform.OS === 'web' && leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      }
    }
  };

  // Renderização de tiles e pins para dispositivos nativos
  const renderNativeSlippyMap = () => {
    const z = Math.round(nativeView.zoom);
    const centerTileX = lng2tileX(nativeView.lng, z);
    const centerTileY = lat2tileY(nativeView.lat, z);

    const halfCols = Math.ceil(layout.width / TILE_SIZE / 2) + 1;
    const halfRows = Math.ceil(layout.height / TILE_SIZE / 2) + 1;
    const baseTileX = Math.floor(centerTileX);
    const baseTileY = Math.floor(centerTileY);

    const tiles: React.ReactNode[] = [];
    for (let dx = -halfCols; dx <= halfCols; dx++) {
      for (let dy = -halfRows; dy <= halfRows; dy++) {
        const tx = baseTileX + dx;
        const ty = baseTileY + dy;
        const left = layout.width / 2 + (tx - centerTileX) * TILE_SIZE;
        const top = layout.height / 2 + (ty - centerTileY) * TILE_SIZE;
        const url = `https://a.basemaps.cartocdn.com/dark_all/${z}/${tx}/${ty}.png?key=${CARTO_API_KEY}`;
        tiles.push(
          <Image
            key={`${z}-${tx}-${ty}`}
            source={{ uri: url }}
            style={{
              position: 'absolute',
              left,
              top,
              width: TILE_SIZE,
              height: TILE_SIZE,
            }}
          />
        );
      }
    }

    return (
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        {tiles}
        {stations.map((st) => {
          const isSelected = selectedStation?.id === st.id;
          const available = st.availableChargersCount;
          const hasFree = available > 0;
          const stTileX = lng2tileX(st.coordinates.longitude, z);
          const stTileY = lat2tileY(st.coordinates.latitude, z);
          const left = layout.width / 2 + (stTileX - centerTileX) * TILE_SIZE;
          const top = layout.height / 2 + (stTileY - centerTileY) * TILE_SIZE;

          return (
            <Pressable
              key={st.id}
              style={[styles.markerAnchor, { left, top, zIndex: isSelected ? 30 : 10 }]}
              onPress={() => onSelectStation(st)}
            >
              <View
                style={[
                  styles.pinWrapper,
                  isSelected && styles.pinWrapperSelected,
                  { borderColor: hasFree ? colors.primary : colors.statusFaulted },
                ]}
              >
                <Ionicons
                  name="flash"
                  size={14}
                  color={hasFree ? colors.primary : colors.statusFaulted}
                  style={{ marginRight: 2 }}
                />
                <Text style={styles.pinText}>{available}</Text>
              </View>

              {isSelected && (
                <View style={styles.selectedLabelCallout}>
                  <Text style={styles.selectedLabelText} numberOfLines={1}>
                    {st.name}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.mapContainer} onLayout={handleLayout}>
      {Platform.OS === 'web'
        ? React.createElement('div', {
            ref: webContainerRef,
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              zIndex: 1,
            },
          })
        : renderNativeSlippyMap()}

      {/* Controles de Mapa no Canto Superior Direito */}
      <View style={styles.mapControls}>
        <Pressable
          style={styles.controlButton}
          onPress={handleZoomIn}
          accessibilityLabel="Aumentar zoom"
        >
          <Ionicons name="add" size={22} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          style={styles.controlButton}
          onPress={handleZoomOut}
          accessibilityLabel="Diminuir zoom"
        >
          <Ionicons name="remove" size={22} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          style={styles.controlButton}
          onPress={handleToggleScope}
          accessibilityLabel="Alternar visão Centro / Região Metropolitana"
        >
          <Ionicons name="navigate" size={20} color={colors.primary} />
        </Pressable>
        <Pressable
          style={styles.controlButton}
          onPress={handleCenterOnStation}
          accessibilityLabel="Centralizar na estação selecionada"
        >
          <Ionicons name="locate" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Legenda do Mapa */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Vagas Livres</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.statusFaulted }]} />
          <Text style={styles.legendText}>Ocupado</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    backgroundColor: '#070A11',
    position: 'relative',
    overflow: 'hidden',
    zIndex: 0,
  },
  markerAnchor: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    zIndex: 10,
  },
  pinWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  pinWrapperSelected: {
    backgroundColor: colors.surfaceBorder,
    transform: [{ scale: 1.18 }],
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  pinText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  selectedLabelCallout: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectedLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  mapControls: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
    zIndex: 1000,
  },
  controlButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendContainer: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 1000,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
