import { Image, type ImageSource } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';

export type BookMap = {
  image: ImageSource;
  // Width divided by height of the map image.
  aspectRatio: number;
};

// A spot on the map, as fractions of the map image's width and height (0 to 1).
export type MapMarker = {
  label: string;
  x: number;
  y: number;
};

// Extra clickable room around each pin, in pixels.
const MARKER_SLACK = 4;

export type PlacedMarker = {
  marker: MapMarker;
  // Which content page the marker leads to.
  pageIndex: number;
};

type MapHalfProps = {
  map: BookMap;
  side: 'left' | 'right';
  markers: PlacedMarker[];
  pageWidth: number;
  pageHeight: number;
  interactive: boolean;
  onSelect: (pageIndex: number) => void;
};

// One page's half of a map that spans the whole open spread.
export function MapHalf({
  map,
  side,
  markers,
  pageWidth,
  pageHeight,
  interactive,
  onSelect,
}: MapHalfProps) {
  // Scale the map to cover the full spread, cropping whichever edges overflow.
  const spreadWidth = pageWidth * 2;
  const scale = Math.max(spreadWidth / map.aspectRatio, pageHeight);
  const mapHeight = scale;
  const mapWidth = scale * map.aspectRatio;
  const offsetX = (spreadWidth - mapWidth) / 2;
  const offsetY = (pageHeight - mapHeight) / 2;
  const halfStart = side === 'left' ? 0 : pageWidth;

  const pinSize = Math.max(18, pageWidth * 0.06);

  return (
    <View style={[styles.half, { width: pageWidth, height: pageHeight }]}>
      <Image
        source={map.image}
        contentFit="fill"
        accessibilityLabel={side === 'left' ? 'Map of Middle-earth over Walla Walla' : undefined}
        style={{
          position: 'absolute',
          left: offsetX - halfStart,
          top: offsetY,
          width: mapWidth,
          height: mapHeight,
        }}
      />
      {markers.map(({ marker, pageIndex }) => {
        const x = offsetX + marker.x * mapWidth - halfStart;
        const y = offsetY + marker.y * mapHeight;
        if (x < 0 || x >= pageWidth) return null;
        // Labels sit under the pin, unless that would run past the page edge or into the spine.
        const labelWidth = pinSize * 6;
        const labelSide =
          x + labelWidth / 2 > pageWidth ? 'left' : x - labelWidth / 2 < 0 ? 'right' : 'below';
        return (
          <MarkerPin
            key={pageIndex}
            label={marker.label}
            labelSide={labelSide}
            x={x}
            y={y}
            size={pinSize}
            disabled={!interactive}
            onPress={() => onSelect(pageIndex)}
          />
        );
      })}
    </View>
  );
}

type MarkerPinProps = {
  label: string;
  labelSide: 'below' | 'left' | 'right';
  x: number;
  y: number;
  size: number;
  disabled: boolean;
  onPress: () => void;
};

function MarkerPin({ label, labelSide, x, y, size, disabled, onPress }: MarkerPinProps) {
  const [hovered, setHovered] = useState(false);
  const labelWidth = size * 6;
  // The clickable area is just the pin plus a little slack, so neighbouring markers' areas
  // don't overlap. The label floats beside it and isn't clickable.
  const hit = size + MARKER_SLACK * 2;
  const labelPlacement =
    labelSide === 'below'
      ? { left: x - labelWidth / 2, top: y + size / 2 + 3, alignItems: 'center' as const }
      : labelSide === 'left'
        ? { left: x - size / 2 - 4 - labelWidth, top: y - size * 0.45, alignItems: 'flex-end' as const }
        : { left: x + size / 2 + 4, top: y - size * 0.45, alignItems: 'flex-start' as const };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Go to ${label}`}
        disabled={disabled}
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[
          styles.marker,
          { left: x - hit / 2, top: y - hit / 2, width: hit, height: hit },
          hovered && styles.markerHovered,
        ]}>
        <Pin size={size} />
      </Pressable>
      {/* The map already names every place, so the label only appears while hovering. */}
      {hovered && (
        <View pointerEvents="none" style={[styles.labelSpot, labelPlacement, { width: labelWidth }]}>
          <Text style={[styles.label, { fontSize: size * 0.55 }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  half: {
    overflow: 'hidden',
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelSpot: {
    position: 'absolute',
    zIndex: 1,
  },
  markerHovered: {
    transform: [{ scale: 1.15 }],
  },
  inset: {
    overflow: 'hidden',
    // The map is drawn on a transparent background, so give it paper to sit on.
    backgroundColor: '#efe2c0',
  },
  insetFramed: {
    borderWidth: 4,
    borderColor: '#fbf6ea',
    boxShadow: '0 2px 6px rgba(59, 42, 26, 0.35)',
  },
  pin: {
    backgroundColor: '#7a1a17',
    borderColor: '#e8c877',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.5)',
  },
  pinCenter: {
    backgroundColor: '#f0d78c',
  },
  label: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(244, 233, 208, 0.92)',
    color: '#3b2a1a',
    fontFamily: Fonts.serif,
    fontWeight: 700,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
  },
});

function Pin({ size }: { size: number }) {
  return (
    <View
      style={[
        styles.pin,
        { width: size, height: size, borderRadius: size / 2, borderWidth: size * 0.16 },
      ]}>
      <View style={[styles.pinCenter, { width: size * 0.36, height: size * 0.36, borderRadius: size }]} />
    </View>
  );
}

type MapInsetProps = {
  map: BookMap;
  marker: MapMarker;
  width: number;
  height: number;
  // How many times closer than the full map fitted to this box's width.
  zoom: number;
  // Leave off the inset's own white border, for when it sits inside another frame.
  bare?: boolean;
};

// A zoomed-in piece of the map, centered on one marker.
export function MapInset({ map, marker, width, height, zoom, bare = false }: MapInsetProps) {
  const mapWidth = width * zoom;
  const mapHeight = mapWidth / map.aspectRatio;
  // Center on the marker, but don't slide past the map's edges.
  const left = Math.min(0, Math.max(width - mapWidth, width / 2 - marker.x * mapWidth));
  const top = Math.min(0, Math.max(height - mapHeight, height / 2 - marker.y * mapHeight));
  const pinSize = Math.max(16, width * 0.07);

  return (
    <View style={[styles.inset, !bare && styles.insetFramed, { width, height }]}>
      <Image
        source={map.image}
        contentFit="fill"
        style={{ position: 'absolute', left, top, width: mapWidth, height: mapHeight }}
      />
      <View
        style={{
          position: 'absolute',
          left: left + marker.x * mapWidth - pinSize / 2,
          top: top + marker.y * mapHeight - pinSize / 2,
        }}>
        <Pin size={pinSize} />
      </View>
    </View>
  );
}
