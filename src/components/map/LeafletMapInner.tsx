'use client';

import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { JAPAN_COAST_POLYGONS } from '@/data/japanCoastGeo';
import { FishingSpot, ThemeMode } from '@/types';

export type MapTileMode = 'gsi-pale' | 'osm' | 'gsi-photo';

interface LeafletMapInnerProps {
  center: [number, number];
  zoom: number;
  flyTrigger: number;
  selectedPos: [number, number];
  mySpots: FishingSpot[];
  tileMode: MapTileMode;
  theme: ThemeMode;
  onMapTap: (lat: number, lon: number) => void;
  onSelectSavedSpot: (spot: FishingSpot) => void;
}

function MapClickAndFlyController({
  center,
  zoom,
  flyTrigger,
  onMapTap,
}: {
  center: [number, number];
  zoom: number;
  flyTrigger: number;
  onMapTap: (lat: number, lon: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (flyTrigger > 0) {
      map.flyTo(center, zoom, { duration: 0.85 });
    }
  }, [center, zoom, flyTrigger, map]);

  useMapEvents({
    click(e) {
      onMapTap(
        Math.round(e.latlng.lat * 10000) / 10000,
        Math.round(e.latlng.lng * 10000) / 10000
      );
    },
  });

  return null;
}

export default function LeafletMapInner({
  center,
  zoom,
  flyTrigger,
  selectedPos,
  mySpots,
  tileMode,
  theme,
  onMapTap,
  onSelectSavedSpot,
}: LeafletMapInnerProps) {
  // 選択地点用のソナー波紋発光ピン
  const selectedSonarIcon = useMemo(
    () =>
      L.divIcon({
        className: 'tsuri-sonar-pin',
        iconSize: [80, 80],
        iconAnchor: [40, 40],
        html: `
          <div style="position:relative;width:80px;height:80px;display:flex;align-items:center;justify-content:center;pointer-events:none;">
            <span class="animate-sonar-ripple" style="position:absolute;width:54px;height:54px;border-radius:9999px;border:2px solid #22d3ee;background:rgba(34,211,238,0.18);"></span>
            <span class="animate-sonar-ripple" style="position:absolute;width:54px;height:54px;border-radius:9999px;border:1.5px solid #22d3ee;animation-delay:0.9s;"></span>
            <div style="position:relative;width:32px;height:32px;border-radius:9999px;background:linear-gradient(135deg,#22d3ee,#0284c7);border:3px solid #ffffff;box-shadow:0 0 18px rgba(34,211,238,0.95);display:flex;align-items:center;justify-content:center;">
              <div style="width:9px;height:9px;border-radius:9999px;background:#ffffff;"></div>
            </div>
          </div>
        `,
      }),
    []
  );

  // マイスポット用の★発光ミニピン
  const savedSpotIcon = useMemo(
    () =>
      L.divIcon({
        className: 'tsuri-saved-pin',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        html: `
          <div style="width:28px;height:28px;border-radius:9999px;background:rgba(8,28,52,0.88);border:2px solid #fbbf24;box-shadow:0 0 12px rgba(251,191,36,0.7);display:flex;align-items:center;justify-content:center;color:#fbbf24;font-size:13px;font-weight:900;">
            ★
          </div>
        `,
      }),
    []
  );

  const tileConfig = useMemo(() => {
    if (tileMode === 'gsi-photo') {
      return {
        url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
        attribution: '&copy; 国土地理院（全国最新写真）',
        themedClass: '',
      };
    }
    if (tileMode === 'osm') {
      return {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors',
        themedClass: 'map-tiles-themed',
      };
    }
    // デフォルト: 国土地理院 淡色地図（海岸線や港の形状が見やすい）
    return {
      url: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',
      attribution: '&copy; 国土地理院',
      themedClass: 'map-tiles-themed',
    };
  }, [tileMode]);

  const coastFill =
    theme === 'night' ? 'rgba(14, 52, 88, 0.35)' : 'rgba(255, 255, 255, 0.38)';
  const coastStroke =
    theme === 'night' ? 'rgba(34, 211, 238, 0.45)' : 'rgba(2, 132, 199, 0.45)';

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={false}
      className="w-full h-full z-0"
    >
      {/* オフライン・タイル読込中も海岸線が美しく見えるベクター補助レイヤー */}
      {JAPAN_COAST_POLYGONS.map((poly) => (
        <Polygon
          key={poly.name}
          positions={poly.coords}
          pathOptions={{
            color: coastStroke,
            weight: 1.5,
            fillColor: coastFill,
            fillOpacity: 0.5,
          }}
        />
      ))}

      <TileLayer
        key={tileMode}
        url={tileConfig.url}
        attribution={tileConfig.attribution}
        className={tileConfig.themedClass}
      />

      <MapClickAndFlyController
        center={center}
        zoom={zoom}
        flyTrigger={flyTrigger}
        onMapTap={onMapTap}
      />

      {/* 保存済みマイスポットの★ピン */}
      {mySpots.map((spot) => (
        <Marker
          key={spot.id}
          position={[spot.lat, spot.lon]}
          icon={savedSpotIcon}
          eventHandlers={{
            click: () => onSelectSavedSpot(spot),
          }}
        />
      ))}

      {/* 現在調査中のソナー発光ピン */}
      <Marker position={selectedPos} icon={selectedSonarIcon} />
    </MapContainer>
  );
}
