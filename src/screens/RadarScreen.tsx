import React, {useState, useCallback, useEffect, useMemo, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import {useThemeColors} from '../hooks/useThemeColors';
import {useResponsiveLayout} from '../utils/platformDetect';
import {
  findNearestStation,
  getAvailableScans,
  pickAnimationFrames,
  buildRadarImageUrl,
  NexradScan,
} from '../services/nexradService';
import {
  selectRadarProvider,
  wmsTimeSteps,
  buildEcccRadarUrl,
  buildDwdRadarUrl,
  selectSatelliteLayer,
  buildGibsSatUrl,
} from '../services/radarProviders';
import {WeatherCode} from '../types/weather';
import {t} from '../i18n';

const TIMELINE_HOURS = 2;
const PLAYBACK_INTERVAL_MS = 750; // ms per frame
const MAX_ANIMATION_FRAMES = 20;
// Extra pixels of tiles pre-loaded beyond the visible edges so panning
// reveals already-loaded tiles instead of blank space.
const TILE_BUFFER_PX = 250;

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
  const layout = useResponsiveLayout();

  const {settings, getCurrentLocation} = useWeatherStore();
  const {useDark, themeColors} = useThemeColors();

  const location = getCurrentLocation();
  const lat = location?.latitude ?? 39.8283;
  const lon = location?.longitude ?? -98.5795;

  const [mapSize, setMapSize] = useState({width: 0, height: 0});
  const [sliderWidth, setSliderWidth] = useState(0);
  const [selectedTimeLabel, setSelectedTimeLabel] = useState('Now');
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [framesLoadedCount, setFramesLoadedCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [overlayMode, setOverlayMode] = useState<'radar' | 'satellite'>('radar');
  const playbackStepRef = useRef(0);

  // NEXRAD scan data from AWS S3
  const [frames, setFrames] = useState<NexradScan[]>([]);
  const [scanStatus, setScanStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const now = useMemo(() => Date.now(), []);
  const timeStart = now - TIMELINE_HOURS * 60 * 60 * 1000;

  // Government radar provider for this location (NEXRAD / ECCC / DWD).
  // Null where no gov tile source is wired yet — the UI shows an honest
  // empty state rather than a third-party fallback (see radarProviders.ts).
  const provider = useMemo(
    () => selectRadarProvider(lat, lon, location?.countryCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lat, lon, location?.countryCode],
  );

  // ECCC serves separate rain/snow composites — pick by current conditions.
  const currentCode = location?.weather?.current?.weatherCode;
  const precipType: 'rain' | 'snow' =
    currentCode === WeatherCode.SNOW ||
    currentCode === WeatherCode.SNOW_LIGHT ||
    currentCode === WeatherCode.SNOW_HEAVY ||
    currentCode === WeatherCode.SLEET
      ? 'snow'
      : 'rain';

  // NASA GIBS satellite layer for this longitude (gov source).
  // Available everywhere — it is the fallback overlay where no
  // gov radar is wired yet.
  const satLayer = useMemo(() => selectSatelliteLayer(lon), [lon]);

  // Nearest NEXRAD station (NEXRAD provider only)
  const nearestStation = useMemo(() => findNearestStation(lat, lon), [lat, lon]);

  // Fetch animation frames: S3 scan listing for NEXRAD, TIME-stepped
  // WMS frames for ECCC/DWD (no listing API — the server snaps TIME
  // to the nearest available run).
  useEffect(() => {
    let cancelled = false;
    setScanStatus('loading');
    setIsPlaying(false);

    if (!provider) {
      // No gov radar for this region — still build a time-stepped frame
      // list so the global satellite overlay works, and default to it.
      const steps = wmsTimeSteps(TIMELINE_HOURS, 10);
      if (!cancelled) {
        const picked: NexradScan[] = steps.map(epochMs => ({
          key: `sat-${epochMs}`,
          epochMs,
        }));
        setFrames(picked);
        setScanStatus(picked.length > 0 ? 'ready' : 'error');
        setFramesLoadedCount(0);
        if (picked.length > 0) {
          playbackStepRef.current = picked.length - 1;
          setCurrentFrameIndex(picked.length - 1);
        }
        setOverlayMode('satellite');
      }
      return () => {
        cancelled = true;
      };
    }

    if (provider.kind === 'wms') {
      const steps = wmsTimeSteps(TIMELINE_HOURS, 10);
      if (!cancelled) {
        const picked: NexradScan[] = steps.map(epochMs => ({
          key: `${provider.id}-${epochMs}`,
          epochMs,
        }));
        setFrames(picked);
        setScanStatus(picked.length > 0 ? 'ready' : 'error');
        setFramesLoadedCount(0);
        if (picked.length > 0) {
          // Start at most recent frame
          playbackStepRef.current = picked.length - 1;
          setCurrentFrameIndex(picked.length - 1);
        }
      }
      return () => {
        cancelled = true;
      };
    }

    getAvailableScans(nearestStation.code, TIMELINE_HOURS)
      .then(scans => {
        if (cancelled) return;
        const picked = pickAnimationFrames(scans, MAX_ANIMATION_FRAMES);
        setFrames(picked);
        setScanStatus(picked.length > 0 ? 'ready' : 'error');
        setFramesLoadedCount(0);
        if (picked.length > 0) {
          // Start at most recent frame
          playbackStepRef.current = picked.length - 1;
          setCurrentFrameIndex(picked.length - 1);
        }
      })
      .catch(() => {
        if (!cancelled) setScanStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [provider?.id, nearestStation.code]);

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

  // Live transform driven by gestures — moves the tile layer on the UI thread
  // without waiting for a JS/React re-render.
  const panTranslateX = useSharedValue(0);
  const panTranslateY = useSharedValue(0);
  const gestureScale = useSharedValue(1);

  const mapGesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onStart(() => {
        pinchStartZoom.value = mapZoom.value;
      })
      .onUpdate(e => {
        const rawZoom = pinchStartZoom.value + Math.log2(e.scale);
        const newZoom = Math.max(3, Math.min(12, rawZoom));
        mapZoom.value = newZoom;
        // Drive a scale transform so tiles visually zoom during the gesture.
        gestureScale.value = Math.pow(2, newZoom - pinchStartZoom.value);
      })
      .onEnd(() => {
        runOnJS(updateCommittedMap)(mapCenterLat.value, mapCenterLon.value, mapZoom.value);
        // gestureScale resets in the useEffect after tiles re-render.
      });

    const pan = Gesture.Pan()
      .minDistance(2)
      .onStart(() => {
        panStartLat.value = mapCenterLat.value;
        panStartLon.value = mapCenterLon.value;
      })
      .onUpdate(e => {
        // Translate the tile layer directly — no JS bridge needed.
        panTranslateX.value = e.translationX;
        panTranslateY.value = e.translationY;
      })
      .onEnd(() => {
        const n = Math.pow(2, mapZoom.value);
        const worldPixels = n * 256;
        const lonPerPx = 360 / worldPixels;
        const latRad = (panStartLat.value * Math.PI) / 180;
        const latPerPx = (360 / worldPixels) / Math.cos(latRad);
        mapCenterLon.value = panStartLon.value - panTranslateX.value * lonPerPx;
        mapCenterLat.value = panStartLat.value + panTranslateY.value * latPerPx;
        runOnJS(updateCommittedMap)(mapCenterLat.value, mapCenterLon.value, mapZoom.value);
        // panTranslate resets in the useEffect after tiles re-render.
      });

    return Gesture.Simultaneous(pan, pinch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Exact viewport bbox (used for nothing that needs tile coverage).
  const bbox = useMemo(() => {
    if (mapSize.width === 0 || mapSize.height === 0) {
      return {west: committedMap.lon - 5, south: committedMap.lat - 3, east: committedMap.lon + 5, north: committedMap.lat + 3};
    }
    return bboxFromCenter(committedMap.lat, committedMap.lon, committedMap.zoom, mapSize.width, mapSize.height);
  }, [committedMap, mapSize.width, mapSize.height]);

  // Expanded bbox that covers the viewport + TILE_BUFFER_PX on every side.
  // Tiles and the radar overlay are rendered into this larger area so that
  // panning up to TILE_BUFFER_PX in any direction reveals pre-loaded content.
  const expandedW = mapSize.width + 2 * TILE_BUFFER_PX;
  const expandedH = mapSize.height + 2 * TILE_BUFFER_PX;
  const expandedBbox = useMemo(() => {
    if (mapSize.width === 0 || mapSize.height === 0) {
      return {west: committedMap.lon - 7, south: committedMap.lat - 5, east: committedMap.lon + 7, north: committedMap.lat + 5};
    }
    return bboxFromCenter(committedMap.lat, committedMap.lon, committedMap.zoom, expandedW, expandedH);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedMap, mapSize.width, mapSize.height]);

  const baseTiles = useMemo(() => {
    if (mapSize.width === 0 || mapSize.height === 0) return [];
    return getBaseTiles(
      expandedBbox.west,
      expandedBbox.south,
      expandedBbox.east,
      expandedBbox.north,
      expandedW,
      expandedH,
      Math.round(committedMap.zoom),
      useDark,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedBbox, mapSize.width, mapSize.height, committedMap.zoom, useDark]);

  // Pre-compute overlay URLs for every frame — rendered all at once.
  // Radar comes from the gov radar provider; satellite always comes
  // from NASA GIBS (global, so it also covers regions without radar).
  const overlayUrls = useMemo(() => {
    if (frames.length === 0 || mapSize.width === 0 || mapSize.height === 0) return [];
    if (overlayMode === 'satellite') {
      return frames.map(f =>
        buildGibsSatUrl(
          satLayer,
          expandedBbox.west,
          expandedBbox.south,
          expandedBbox.east,
          expandedBbox.north,
          expandedW * 2,
          expandedH * 2,
          f.epochMs,
        ),
      );
    }
    if (!provider) return [];
    if (provider.id === 'eccc') {
      return frames.map(f =>
        buildEcccRadarUrl(
          expandedBbox.west,
          expandedBbox.south,
          expandedBbox.east,
          expandedBbox.north,
          expandedW * 2,
          expandedH * 2,
          f.epochMs,
          precipType,
        ),
      );
    }
    if (provider.id === 'dwd') {
      return frames.map(f =>
        buildDwdRadarUrl(
          expandedBbox.west,
          expandedBbox.south,
          expandedBbox.east,
          expandedBbox.north,
          expandedW * 2,
          expandedH * 2,
          f.epochMs,
        ),
      );
    }
    return frames.map(f =>
      buildRadarImageUrl(
        expandedBbox.west,
        expandedBbox.south,
        expandedBbox.east,
        expandedBbox.north,
        expandedW * 2,
        expandedH * 2,
        f.epochMs,
      ),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayMode, satLayer.id, provider?.id, precipType, frames, expandedBbox, mapSize.width, mapSize.height]);

  // Reset loaded count whenever the frame URL set changes (new station / bbox / layer).
  useEffect(() => {
    setFramesLoadedCount(0);
    setIsPlaying(false);
  }, [overlayUrls]);

  const framesPreloaded = framesLoadedCount >= overlayUrls.length && overlayUrls.length > 0;

  // -- Frame-based timeline helpers --

  const setFrameByIndex = useCallback(
    (idx: number) => {
      if (frames.length === 0) return;
      const clamped = Math.max(0, Math.min(idx, frames.length - 1));
      playbackStepRef.current = clamped;
      setCurrentFrameIndex(clamped);

      const scan = frames[clamped];
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
  }, [currentFrameIndex, sliderWidth, frames.length, thumbX]);

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
      setCurrentFrameIndex(next);
      const scan = frames[next];
      const isLast = next === frames.length - 1;
      setSelectedTimeLabel(isLast ? 'Now' : formatTimeLabel(new Date(scan.epochMs)));
      // Update slider position
      const fraction = next / Math.max(1, frames.length - 1);
      thumbX.value = fraction * sliderWidth;
    }, PLAYBACK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPlaying, frames, sliderWidth, thumbX]);

  const handleTogglePlayback = useCallback(() => {
    if (frames.length === 0 || !framesPreloaded) return;
    setIsPlaying(prev => {
      if (!prev && playbackStepRef.current >= frames.length - 1) {
        playbackStepRef.current = 0;
      }
      return !prev;
    });
  }, [frames.length, framesPreloaded]);
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{translateX: thumbX.value - 12}],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  // Smooth live transform applied to the tile/radar layer during gestures.
  const mapAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: panTranslateX.value},
      {translateY: panTranslateY.value},
      {scale: gestureScale.value},
    ],
  }));

  // After tiles re-render at the new committed position/zoom, reset the
  // gesture transforms so the visual result is seamless.
  useEffect(() => {
    panTranslateX.value = 0;
    panTranslateY.value = 0;
    gestureScale.value = 1;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedMap]);

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
          {provider?.id === 'nexrad'
            ? ` · ${nearestStation.code}`
            : provider
              ? ` · ${provider.label} gov radar`
              : ` · ${satLayer.label} satellite`}
        </Text>

        {/* Overlay toggle: gov radar vs NASA satellite */}
        <View style={styles.layerToggle}>
          {(['radar', 'satellite'] as const).map(mode => {
            const active = overlayMode === mode;
            const label = mode === 'radar' ? t('radar.layerRadar') : t('radar.layerSatellite');
            return (
              <TouchableOpacity
                key={mode}
                onPress={() => setOverlayMode(mode)}
                disabled={mode === 'radar' && !provider}
                accessibilityRole="button"
                accessibilityLabel={`${label} layer`}
                accessibilityState={{selected: active, disabled: mode === 'radar' && !provider}}
                style={[
                  styles.layerButton,
                  {
                    backgroundColor: active
                      ? themeColors.primary
                      : themeColors.surface,
                    opacity: mode === 'radar' && !provider ? 0.4 : 1,
                  },
                ]}
                activeOpacity={0.75}>
                <Icon
                  name={mode === 'radar' ? 'radar' : 'satellite-variant'}
                  size={16}
                  color={active ? '#fff' : themeColors.textSecondary}
                />
                <Text
                  style={[
                    styles.layerButtonText,
                    {color: active ? '#fff' : themeColors.textSecondary},
                  ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Map */}
      <GestureDetector gesture={mapGesture}>
        <View style={styles.mapContainer} onLayout={handleMapLayout}>
          {/* Tile + radar layer — transformed on the UI thread during gestures.
              Positioned with a negative offset equal to TILE_BUFFER_PX so extra
              tiles extend beyond every edge, eliminating blank-space during pan. */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: -TILE_BUFFER_PX,
                top: -TILE_BUFFER_PX,
                width: mapSize.width + 2 * TILE_BUFFER_PX,
                height: mapSize.height + 2 * TILE_BUFFER_PX,
              },
              mapAnimatedStyle,
            ]}>
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

            {/* Overlay — all frames mounted, only current one visible.
                This avoids any re-decode / network fetch during playback. */}
            {overlayUrls.map((url, i) => (
              <Image
                key={frames[i]?.key ?? `${url}-${i}`}
                source={{uri: url}}
                style={[
                  styles.radarOverlay,
                  {opacity: i === currentFrameIndex ? (overlayMode === 'satellite' ? 1 : 0.7) : 0},
                ]}
                resizeMode="stretch"
                onLoad={() => setFramesLoadedCount(c => c + 1)}
                onError={() => setFramesLoadedCount(c => c + 1)}
              />
            ))}
          </Animated.View>

          {/* Loading indicator */}
          {overlayUrls.length > 0 && (!framesPreloaded || scanStatus === 'loading') && (
            <View style={styles.mapLoadingIndicator}>
              <ActivityIndicator size="small" color={themeColors.primary} />
            </View>
          )}

          {/* Scan loading banner */}
          {scanStatus === 'loading' && (
            <View style={[styles.scanBanner, {backgroundColor: useDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)'}]}>
              <ActivityIndicator size="small" color={themeColors.primary} />
              <Text style={[styles.scanBannerText, {color: themeColors.text}]}>
                {overlayMode === 'satellite'
                  ? `Loading ${satLayer.label} satellite…`
                  : provider?.id === 'nexrad'
                    ? `Loading NEXRAD scans from ${nearestStation.code}…`
                    : provider
                      ? `Loading ${provider.label} government radar…`
                      : 'Loading radar…'}
              </Text>
            </View>
          )}

          {(overlayMode === 'radar' ? !provider || scanStatus === 'error' : scanStatus === 'error') && (
            <View style={[styles.scanBanner, {backgroundColor: useDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)'}]}>
              <Icon name="alert-circle-outline" size={18} color={themeColors.textSecondary} />
              <Text style={[styles.scanBannerText, {color: themeColors.textSecondary}]}>
                {!provider && overlayMode === 'radar'
                  ? 'Government radar isn\u2019t available for this region yet'
                  : overlayMode === 'satellite'
                    ? `No satellite data available from ${satLayer.label}`
                    : `No radar data available from ${provider?.label ?? 'government source'}`}
              </Text>
            </View>
          )}

          {/* Provider badge */}
          {scanStatus === 'ready' && (overlayMode === 'satellite' || provider) && (
            <View style={[styles.stationBadge, {backgroundColor: useDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.7)'}]}>
              <Icon name="radar" size={12} color={themeColors.primary} />
              <Text style={[styles.stationBadgeText, {color: themeColors.textSecondary}]}>
                {overlayMode === 'satellite'
                  ? `${satLayer.label} · ${frames.length} frames`
                  : provider?.id === 'nexrad'
                    ? `${nearestStation.code} · ${nearestStation.distanceKm} km · ${frames.length} scans`
                    : `${provider?.label} · ${frames.length} frames`}
              </Text>
            </View>
          )}

          {/* Attribution */}
          <View style={[styles.attribution, {backgroundColor: useDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.7)'}]}>
            <Text style={[styles.attributionText, {color: themeColors.textTertiary}]}>
              {overlayMode === 'satellite'
                ? satLayer.attribution
                : provider
                  ? provider.attribution
                  : '© OpenStreetMap · CARTO'}
            </Text>
          </View>
        </View>{/* mapContainer */}
      </GestureDetector>

      {/* Timeline */}
      <View
        style={[
          styles.timelineContainer,
          {
            backgroundColor: themeColors.surface,
            borderTopColor: themeColors.border,
            paddingBottom: insets.bottom + 88,
          },
        ]}>
        <View style={styles.timeDisplay}>
          <TouchableOpacity
            onPress={handleTogglePlayback}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? t('radar.pause') : t('radar.play')}
            style={[
              styles.playButton,
              {backgroundColor: frames.length > 0 && framesPreloaded ? themeColors.primary : themeColors.border},
            ]}
            activeOpacity={0.75}
            disabled={frames.length === 0 || !framesPreloaded}>
            {frames.length > 0 && !framesPreloaded ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon
                name={isPlaying ? 'pause' : 'play'}
                size={18}
                color="#fff"
              />
            )}
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
  layerToggle: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  layerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  layerButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  mapTile: {
    position: 'absolute',
  },
  radarOverlay: {
    ...StyleSheet.absoluteFill,
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
