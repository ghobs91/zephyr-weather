import React, {useState, useCallback, useEffect, useMemo, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Image,
  ActivityIndicator,
  LayoutChangeEvent,
  TouchableOpacity,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useWeatherStore} from '../store/weatherStore';
import {colors} from '../theme/colors';
import {useResponsiveLayout} from '../utils/platformDetect';
import {
  findNearestStation,
  getAvailableScans,
  pickAnimationFrames,
  buildRadarImageUrl,
  NexradScan,
} from '../services/nexradService';

const TIMELINE_HOURS = 4;
const PLAYBACK_INTERVAL_MS = 750; // ms per frame
const MAX_ANIMATION_FRAMES = 20;

// ---------------------------------------------------------------------------
// Map helpers
// ---------------------------------------------------------------------------

interface TileInfo {
  url: string;
  x: number;
  y: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

function getBaseTiles(
  west: number,
  south: number,
  east: number,
  north: number,
  containerWidth: number,
  containerHeight: number,
  zoom: number,
  isDark: boolean,
): TileInfo[] {
  const style = isDark ? 'dark_all' : 'light_all';
  const n = Math.pow(2, zoom);

  const xTileMin = Math.floor(((west + 180) / 360) * n);
  const xTileMax = Math.floor(((east + 180) / 360) * n);
  const latRadN = (north * Math.PI) / 180;
  const latRadS = (south * Math.PI) / 180;
  const yTileMin = Math.floor(
    ((1 - Math.log(Math.tan(latRadN) + 1 / Math.cos(latRadN)) / Math.PI) / 2) * n,
  );
  const yTileMax = Math.floor(
    ((1 - Math.log(Math.tan(latRadS) + 1 / Math.cos(latRadS)) / Math.PI) / 2) * n,
  );

  const worldLeft = ((west + 180) / 360) * n * 256;
  const worldRight = ((east + 180) / 360) * n * 256;
  const worldTop =
    ((1 - Math.log(Math.tan(latRadN) + 1 / Math.cos(latRadN)) / Math.PI) / 2) *
    n *
    256;
  const worldBottom =
    ((1 - Math.log(Math.tan(latRadS) + 1 / Math.cos(latRadS)) / Math.PI) / 2) *
    n *
    256;

  const worldW = worldRight - worldLeft;
  const worldH = worldBottom - worldTop;
  const scaleX = containerWidth / worldW;
  const scaleY = containerHeight / worldH;

  const tiles: TileInfo[] = [];
  for (let ty = yTileMin; ty <= yTileMax; ty++) {
    for (let tx = xTileMin; tx <= xTileMax; tx++) {
      const tileWorldLeft = tx * 256;
      const tileWorldTop = ty * 256;
      tiles.push({
        url: `https://cartodb-basemaps-a.global.ssl.fastly.net/${style}/${zoom}/${tx}/${ty}@2x.png`,
        x: tx,
        y: ty,
        left: (tileWorldLeft - worldLeft) * scaleX,
        top: (tileWorldTop - worldTop) * scaleY,
        width: 256 * scaleX,
        height: 256 * scaleY,
      });
    }
  }
  return tiles;
}

function bboxFromCenter(
  lat: number,
  lon: number,
  zoom: number,
  containerWidth: number,
  containerHeight: number,
): {west: number; south: number; east: number; north: number} {
  const n = Math.pow(2, zoom);
  const centerXWorld = ((lon + 180) / 360) * n * 256;
  const latRad = (lat * Math.PI) / 180;
  const centerYWorld =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    n *
    256;

  const halfW = containerWidth / 2;
  const halfH = containerHeight / 2;

  const westWorld = centerXWorld - halfW;
  const eastWorld = centerXWorld + halfW;
  const northWorld = centerYWorld - halfH;
  const southWorld = centerYWorld + halfH;

  const west = (westWorld / (n * 256)) * 360 - 180;
  const east = (eastWorld / (n * 256)) * 360 - 180;

  const northMerc = Math.PI - (2 * Math.PI * northWorld) / (n * 256);
  const north = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(northMerc) - Math.exp(-northMerc)));

  const southMerc = Math.PI - (2 * Math.PI * southWorld) / (n * 256);
  const south = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(southMerc) - Math.exp(-southMerc)));

  return {west, south, east, north};
}

function formatTimeLabel(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RadarScreen() {
  const insets = useSafeAreaInsets();
  const isDarkMode = useColorScheme() === 'dark';
  const layout = useResponsiveLayout();

  const {settings, getCurrentLocation} = useWeatherStore();
  const theme = settings.theme;
  const useDark = theme === 'dark' || (theme === 'system' && isDarkMode);
  const themeColors = useDark ? colors.dark : colors.light;

  const location = getCurrentLocation();
  const lat = location?.latitude ?? 39.8283;
  const lon = location?.longitude ?? -98.5795;

  const [mapSize, setMapSize] = useState({width: 0, height: 0});
  const [radarLoading, setRadarLoading] = useState(true);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [selectedTimeLabel, setSelectedTimeLabel] = useState('Now');
  const [currentEpoch, setCurrentEpoch] = useState(Date.now());
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackStepRef = useRef(0);

  // NEXRAD scan data from AWS S3
  const [frames, setFrames] = useState<NexradScan[]>([]);
  const [scanStatus, setScanStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const now = useMemo(() => Date.now(), []);
  const timeStart = now - TIMELINE_HOURS * 60 * 60 * 1000;

  // Nearest NEXRAD station
  const nearestStation = useMemo(() => findNearestStation(lat, lon), [lat, lon]);

  // Fetch real scan timestamps from the NEXRAD S3 bucket
  useEffect(() => {
    let cancelled = false;
    setScanStatus('loading');
    setIsPlaying(false);

    getAvailableScans(nearestStation.code, TIMELINE_HOURS)
      .then(scans => {
        if (cancelled) return;
        const picked = pickAnimationFrames(scans, MAX_ANIMATION_FRAMES);
        setFrames(picked);
        setScanStatus(picked.length > 0 ? 'ready' : 'error');
        if (picked.length > 0) {
          // Start at most recent frame
          const last = picked[picked.length - 1];
          setCurrentEpoch(last.epochMs);
          playbackStepRef.current = picked.length - 1;
        }
      })
      .catch(() => {
        if (!cancelled) setScanStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [nearestStation.code]);

  // Map pan/zoom state (shared values for gesture handling)
  const mapCenterLat = useSharedValue(lat);
  const mapCenterLon = useSharedValue(lon);
  const mapZoom = useSharedValue(7);

  const [committedMap, setCommittedMap] = useState({lat, lon, zoom: 7});

  const updateCommittedMap = useCallback(
    (newLat: number, newLon: number, newZoom: number) => {
      setCommittedMap({lat: newLat, lon: newLon, zoom: newZoom});
    },
    [],
  );

  // Reset map center when the selected location changes
  useEffect(() => {
    mapCenterLat.value = lat;
    mapCenterLon.value = lon;
    mapZoom.value = 7;
    setCommittedMap({lat, lon, zoom: 7});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);

  // Pinch gesture saved state
  const pinchStartZoom = useSharedValue(7);
  const panStartLat = useSharedValue(lat);
  const panStartLon = useSharedValue(lon);

  const mapGesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onStart(() => {
        pinchStartZoom.value = mapZoom.value;
      })
      .onUpdate(e => {
        const newZoom = Math.max(3, Math.min(12, pinchStartZoom.value + Math.log2(e.scale)));
        mapZoom.value = newZoom;
      })
      .onEnd(() => {
        runOnJS(updateCommittedMap)(mapCenterLat.value, mapCenterLon.value, mapZoom.value);
      });

    const pan = Gesture.Pan()
      .minDistance(2)
      .onStart(() => {
        panStartLat.value = mapCenterLat.value;
        panStartLon.value = mapCenterLon.value;
      })
      .onUpdate(e => {
        const n = Math.pow(2, mapZoom.value);
        const worldPixels = n * 256;
        const lonPerPx = 360 / worldPixels;
        const latRad = (panStartLat.value * Math.PI) / 180;
        const latPerPx = (360 / worldPixels) / Math.cos(latRad);

        mapCenterLon.value = panStartLon.value - e.translationX * lonPerPx;
        mapCenterLat.value = panStartLat.value + e.translationY * latPerPx;
      })
      .onEnd(() => {
        runOnJS(updateCommittedMap)(mapCenterLat.value, mapCenterLon.value, mapZoom.value);
      });

    return Gesture.Simultaneous(pan, pinch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bbox = useMemo(() => {
    if (mapSize.width === 0 || mapSize.height === 0) {
      return {west: committedMap.lon - 5, south: committedMap.lat - 3, east: committedMap.lon + 5, north: committedMap.lat + 3};
    }
    return bboxFromCenter(committedMap.lat, committedMap.lon, committedMap.zoom, mapSize.width, mapSize.height);
  }, [committedMap, mapSize.width, mapSize.height]);

  const baseTiles = useMemo(() => {
    if (mapSize.width === 0 || mapSize.height === 0) return [];
    return getBaseTiles(
      bbox.west,
      bbox.south,
      bbox.east,
      bbox.north,
      mapSize.width,
      mapSize.height,
      Math.round(committedMap.zoom),
      useDark,
    );
  }, [bbox, mapSize.width, mapSize.height, committedMap.zoom, useDark]);

  const radarUrl = useMemo(() => {
    if (mapSize.width === 0 || mapSize.height === 0) return '';
    return buildRadarImageUrl(
      bbox.west,
      bbox.south,
      bbox.east,
      bbox.north,
      mapSize.width * 2, // retina
      mapSize.height * 2,
      currentEpoch,
    );
  }, [bbox, mapSize.width, mapSize.height, currentEpoch]);

  // -- Frame-based timeline helpers --

  const setFrameByIndex = useCallback(
    (idx: number) => {
      if (frames.length === 0) return;
      const clamped = Math.max(0, Math.min(idx, frames.length - 1));
      playbackStepRef.current = clamped;
      const scan = frames[clamped];
      setCurrentEpoch(scan.epochMs);

      const isLast = clamped === frames.length - 1;
      setSelectedTimeLabel(isLast ? 'Now' : formatTimeLabel(new Date(scan.epochMs)));
    },
    [frames],
  );

  const setFrameFromSliderPosition = useCallback(
    (x: number) => {
      if (sliderWidth <= 0 || frames.length === 0) return;
      const fraction = Math.max(0, Math.min(x, sliderWidth)) / sliderWidth;
      const idx = Math.round(fraction * (frames.length - 1));
      setFrameByIndex(idx);
    },
    [sliderWidth, frames, setFrameByIndex],
  );

  // Slider thumb
  const thumbX = useSharedValue(0);

  // Sync slider position when frame index changes
  useEffect(() => {
    if (sliderWidth <= 0 || frames.length === 0) return;
    const fraction = playbackStepRef.current / Math.max(1, frames.length - 1);
    thumbX.value = fraction * sliderWidth;
  }, [currentEpoch, sliderWidth, frames.length, thumbX]);

  const pausePlayback = useCallback(() => setIsPlaying(false), []);

  const sliderPanGesture = Gesture.Pan()
    .onStart(e => {
      runOnJS(pausePlayback)();
      thumbX.value = Math.max(0, Math.min(e.x, sliderWidth));
    })
    .onUpdate(e => {
      const clamped = Math.max(0, Math.min(e.x, sliderWidth));
      thumbX.value = clamped;
      runOnJS(setFrameFromSliderPosition)(clamped);
    })
    .onEnd(() => {});

  const sliderTapGesture = Gesture.Tap().onEnd(e => {
    runOnJS(pausePlayback)();
    const clamped = Math.max(0, Math.min(e.x, sliderWidth));
    thumbX.value = withTiming(clamped, {duration: 100});
    runOnJS(setFrameFromSliderPosition)(clamped);
  });

  const composed = Gesture.Race(sliderPanGesture, sliderTapGesture);

  // Initialize slider to end
  useEffect(() => {
    if (sliderWidth > 0 && frames.length > 0) {
      thumbX.value = sliderWidth;
      setSelectedTimeLabel('Now');
    }
  }, [sliderWidth, frames.length, thumbX]);

  // Playback loop — steps through real NEXRAD scan frames
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;
    const interval = setInterval(() => {
      const next = (playbackStepRef.current + 1) % frames.length;
      playbackStepRef.current = next;
      const scan = frames[next];
      setCurrentEpoch(scan.epochMs);
      const isLast = next === frames.length - 1;
      setSelectedTimeLabel(isLast ? 'Now' : formatTimeLabel(new Date(scan.epochMs)));
      // Update slider position
      const fraction = next / Math.max(1, frames.length - 1);
      thumbX.value = fraction * sliderWidth;
    }, PLAYBACK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPlaying, frames, sliderWidth, thumbX]);

  const handleTogglePlayback = useCallback(() => {
    if (frames.length === 0) return;
    setIsPlaying(prev => {
      if (!prev && playbackStepRef.current >= frames.length - 1) {
        playbackStepRef.current = 0;
      }
      return !prev;
    });
  }, [frames.length]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{translateX: thumbX.value - 12}],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  const timeLabels = useMemo(() => {
    const labels: {text: string; fraction: number}[] = [];
    for (let h = TIMELINE_HOURS; h >= 0; h--) {
      const d = new Date(now - h * 60 * 60 * 1000);
      labels.push({
        text: h === 0 ? 'Now' : formatTimeLabel(d),
        fraction: 1 - h / TIMELINE_HOURS,
      });
    }
    return labels;
  }, [now]);

  const handleMapLayout = useCallback((e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    setMapSize({width, height});
  }, []);

  return (
    <View style={[styles.container, {backgroundColor: themeColors.background}]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            backgroundColor: themeColors.background,
          },
        ]}>
        <Text style={[styles.title, {color: themeColors.text}]}>Radar</Text>
        <Text style={[styles.subtitle, {color: themeColors.textSecondary}]}>
          {location?.city || 'Weather Radar'}
          {nearestStation ? ` · ${nearestStation.code}` : ''}
        </Text>
      </View>

      {/* Map */}
      <GestureDetector gesture={mapGesture}>
        <View style={styles.mapContainer} onLayout={handleMapLayout}>
          {/* Base map tiles */}
          {baseTiles.map(tile => (
            <Image
              key={`${tile.x}-${tile.y}`}
              source={{uri: tile.url}}
              style={[
                styles.mapTile,
                {
                  left: tile.left,
                  top: tile.top,
                  width: tile.width,
                  height: tile.height,
                },
              ]}
            />
          ))}

          {/* Radar overlay */}
          {radarUrl !== '' && (
            <Image
              source={{uri: radarUrl}}
              style={styles.radarOverlay}
              resizeMode="stretch"
              onLoadStart={() => setRadarLoading(true)}
              onLoadEnd={() => setRadarLoading(false)}
              onError={() => setRadarLoading(false)}
            />
          )}

          {/* Loading indicator */}
          {(radarLoading || scanStatus === 'loading') && (
            <View style={styles.mapLoadingIndicator}>
              <ActivityIndicator size="small" color={themeColors.primary} />
            </View>
          )}

          {/* Scan loading banner */}
          {scanStatus === 'loading' && (
            <View style={[styles.scanBanner, {backgroundColor: useDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)'}]}>
              <ActivityIndicator size="small" color={themeColors.primary} />
              <Text style={[styles.scanBannerText, {color: themeColors.text}]}>
                Loading NEXRAD scans from {nearestStation.code}…
              </Text>
            </View>
          )}

          {scanStatus === 'error' && (
            <View style={[styles.scanBanner, {backgroundColor: useDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)'}]}>
              <Icon name="alert-circle-outline" size={18} color={themeColors.textSecondary} />
              <Text style={[styles.scanBannerText, {color: themeColors.textSecondary}]}>
                No radar data available for {nearestStation.code}
              </Text>
            </View>
          )}

          {/* Station marker */}
          {scanStatus === 'ready' && (
            <View style={[styles.stationBadge, {backgroundColor: useDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.7)'}]}>
              <Icon name="radar" size={12} color={themeColors.primary} />
              <Text style={[styles.stationBadgeText, {color: themeColors.textSecondary}]}>
                {nearestStation.code} · {nearestStation.distanceKm} km · {frames.length} scans
              </Text>
            </View>
          )}

          {/* Attribution */}
          <View style={[styles.attribution, {backgroundColor: useDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.7)'}]}>
            <Text style={[styles.attributionText, {color: themeColors.textTertiary}]}>
              NOAA NEXRAD via AWS · © OpenStreetMap · CARTO
            </Text>
          </View>
        </View>
      </GestureDetector>

      {/* Timeline */}
      <View
        style={[
          styles.timelineContainer,
          {
            backgroundColor: themeColors.surface,
            borderTopColor: themeColors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>
        <View style={styles.timeDisplay}>
          <TouchableOpacity
            onPress={handleTogglePlayback}
            style={[
              styles.playButton,
              {backgroundColor: frames.length > 0 ? themeColors.primary : themeColors.border},
            ]}
            activeOpacity={0.75}
            disabled={frames.length === 0}>
            <Icon
              name={isPlaying ? 'pause' : 'play'}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>
          <Icon name="clock-outline" size={16} color={themeColors.primary} />
          <Text style={[styles.timeDisplayText, {color: themeColors.text}]}>
            {selectedTimeLabel}
          </Text>
        </View>

        <View
          style={[
            styles.sliderContainer,
            {
              maxWidth: layout.maxContentWidth
                ? layout.maxContentWidth - layout.contentPadding * 2
                : undefined,
              alignSelf: 'center',
              width: '100%',
              paddingHorizontal: layout.contentPadding,
            },
          ]}>
          <GestureDetector gesture={composed}>
            <Animated.View
              style={styles.sliderTrackWrapper}
              onLayout={e => setSliderWidth(e.nativeEvent.layout.width)}>
              <View
                style={[
                  styles.sliderTrack,
                  {backgroundColor: themeColors.border},
                ]}
              />
              {/* Scan tick marks on the slider track */}
              {frames.length > 0 && sliderWidth > 0 &&
                frames.map((scan, i) => {
                  const fraction = i / Math.max(1, frames.length - 1);
                  return (
                    <View
                      key={scan.key}
                      style={[
                        styles.scanTick,
                        {
                          left: fraction * sliderWidth,
                          backgroundColor: themeColors.textTertiary,
                        },
                      ]}
                    />
                  );
                })}
              <Animated.View
                style={[
                  styles.sliderFill,
                  {backgroundColor: themeColors.primary},
                  fillStyle,
                ]}
              />
              <Animated.View
                style={[
                  styles.sliderThumb,
                  {
                    backgroundColor: themeColors.primary,
                    borderColor: themeColors.surface,
                  },
                  thumbStyle,
                ]}
              />
            </Animated.View>
          </GestureDetector>

          <View style={styles.timeLabels}>
            {timeLabels.map((label, i) => (
              <Text
                key={i}
                style={[
                  styles.timeLabelText,
                  {
                    color: themeColors.textTertiary,
                    left: `${label.fraction * 100}%`,
                    transform: [
                      {
                        translateX:
                          i === timeLabels.length - 1
                            ? -20
                            : i === 0
                              ? 0
                              : -15,
                      },
                    ],
                  },
                ]}>
                {label.text}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  mapTile: {
    position: 'absolute',
  },
  radarOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },
  mapLoadingIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  scanBanner: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  scanBannerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  stationBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stationBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  attribution: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attributionText: {
    fontSize: 9,
  },
  timelineContainer: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  timeDisplayText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sliderContainer: {
    height: 50,
  },
  sliderTrackWrapper: {
    height: 24,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
  },
  scanTick: {
    position: 'absolute',
    width: 2,
    height: 8,
    borderRadius: 1,
    top: 8,
    marginLeft: -1,
    opacity: 0.4,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  timeLabels: {
    flexDirection: 'row',
    position: 'relative',
    height: 20,
    marginTop: 4,
  },
  timeLabelText: {
    position: 'absolute',
    fontSize: 10,
  },
});
