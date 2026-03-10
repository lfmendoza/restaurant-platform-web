import { useState, useEffect, useMemo, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";

export const GUATEMALA_CENTER = [14.6349, -90.5069];

const ZONE_COLORS = [
  "#F97316", "#3B82F6", "#22C55E", "#EAB308", "#A855F7",
  "#EF4444", "#6366F1", "#14B8A6", "#EC4899", "#84CC16", "#0EA5E9",
];

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const highlightedIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  shadowSize: [49, 49],
  className: "highlighted-marker",
});

const searchIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "hue-rotate-180",
});

L.Marker.prototype.options.icon = defaultIcon;

function ClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick?.(e.latlng);
    },
  });
  return null;
}

function FitBounds({ restaurants, searchLat, searchLng }) {
  const map = useMap();

  const boundsKey = useMemo(() => {
    const ids = restaurants.map((r) => r._id).join(",");
    return `${searchLat}|${searchLng}|${ids}`;
  }, [restaurants, searchLat, searchLng]);

  useEffect(() => {
    const points = [];

    if (searchLat && searchLng) {
      points.push([parseFloat(searchLat), parseFloat(searchLng)]);
    }

    restaurants.forEach((r) => {
      const coords = r.location?.coordinates;
      if (coords && coords.length >= 2) {
        points.push([coords[1], coords[0]]);
      }
    });

    if (points.length === 0) return;

    if (points.length === 1) {
      map.flyTo(points[0], 14, { duration: 0.8 });
    } else {
      const bounds = L.latLngBounds(points);
      map.flyToBounds(bounds, { padding: [40, 40], duration: 0.8, maxZoom: 15 });
    }
  }, [boundsKey, map]);

  return null;
}

export default function Map({
  restaurants = [],
  deliveryZones = [],
  searchLat,
  searchLng,
  deliveryPoint,
  onMapClick,
  onRestaurantClick,
  highlightedRestaurantId,
  onRestaurantHover,
  height = "400px",
  className = "",
}) {
  const [internalHover, setInternalHover] = useState(null);

  const activeHighlight = highlightedRestaurantId || internalHover;
  const hasAnyHighlight = activeHighlight != null;

  const handleMarkerHover = useCallback(
    (id) => {
      setInternalHover(id);
      onRestaurantHover?.(id);
    },
    [onRestaurantHover]
  );

  const zoneColorMap = useMemo(() => {
    const map = {};
    deliveryZones.forEach((z, i) => {
      const rid = z.restaurantId?.toString?.() || z.restaurantId;
      if (!map[rid]) map[rid] = z.color || ZONE_COLORS[i % ZONE_COLORS.length];
    });
    return map;
  }, [deliveryZones]);

  const center = searchLat && searchLng
    ? [parseFloat(searchLat), parseFloat(searchLng)]
    : GUATEMALA_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={13}
      className={`rounded-lg border border-gray-200 z-0 ${className}`}
      style={{ height, width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickHandler onClick={onMapClick} />

      <FitBounds
        restaurants={restaurants}
        searchLat={searchLat}
        searchLng={searchLng}
      />

      {/* Delivery zone polygons */}
      {deliveryZones.map((zone, i) => {
        const rid = zone.restaurantId?.toString?.() || zone.restaurantId;
        const isHighlighted = hasAnyHighlight && rid === activeHighlight?.toString?.();
        const isDimmed = hasAnyHighlight && !isHighlighted;
        const baseColor = zone.color || zoneColorMap[rid] || ZONE_COLORS[i % ZONE_COLORS.length];

        return (
          <Polygon
            key={zone._id || zone.name || i}
            positions={zone.polygon}
            pathOptions={{
              color: baseColor,
              fillColor: baseColor,
              fillOpacity: isHighlighted ? 0.35 : isDimmed ? 0.04 : 0.12,
              weight: isHighlighted ? 3 : isDimmed ? 1 : 2,
              opacity: isDimmed ? 0.3 : 1,
            }}
          >
            <Popup>
              <strong>{zone.name}</strong>
              {zone.deliveryFee != null && (
                <>
                  <br />
                  <span className="text-xs text-gray-500">
                    Q{zone.deliveryFee} &middot; ~{zone.estimatedMinutes}min
                  </span>
                </>
              )}
            </Popup>
          </Polygon>
        );
      })}

      {/* Search / user location marker */}
      {searchLat && searchLng && (
        <Marker
          position={[parseFloat(searchLat), parseFloat(searchLng)]}
          icon={searchIcon}
        >
          <Popup>
            <strong>Tu ubicación</strong>
            <br />
            {parseFloat(searchLat).toFixed(4)},{" "}
            {parseFloat(searchLng).toFixed(4)}
          </Popup>
        </Marker>
      )}

      {/* Delivery point marker (cart/checkout) */}
      {deliveryPoint && (
        <Marker
          position={[deliveryPoint[1], deliveryPoint[0]]}
          icon={searchIcon}
        >
          <Popup>
            <strong>Punto de entrega</strong>
            <br />
            {deliveryPoint[1].toFixed(4)}, {deliveryPoint[0].toFixed(4)}
          </Popup>
        </Marker>
      )}

      {/* Restaurant markers */}
      {restaurants.map((r) => {
        const coords = r.location?.coordinates;
        if (!coords || coords.length < 2) return null;
        const rid = r._id?.toString?.() || r._id;
        const isHighlighted = hasAnyHighlight && rid === activeHighlight?.toString?.();
        const isDimmed = hasAnyHighlight && !isHighlighted;

        return (
          <Marker
            key={r._id}
            position={[coords[1], coords[0]]}
            icon={isHighlighted ? highlightedIcon : defaultIcon}
            opacity={isDimmed ? 0.4 : 1}
            zIndexOffset={isHighlighted ? 1000 : 0}
            eventHandlers={{
              click: () => onRestaurantClick?.(r),
              mouseover: () => handleMarkerHover(rid),
              mouseout: () => handleMarkerHover(null),
            }}
          >
            <Popup>
              <div style={{ minWidth: 150 }}>
                <strong>{r.name}</strong>
                <br />
                <span style={{ fontSize: 12, color: "#666" }}>
                  {(r.cuisineTypes || []).join(", ")}
                </span>
                {r.avgRating > 0 && (
                  <>
                    <br />
                    <span style={{ fontSize: 12, color: "#ca8a04" }}>
                      ★ {r.avgRating?.toFixed(1)} ({r.totalReviews || 0})
                    </span>
                  </>
                )}
                {r.deliveryFee != null && (
                  <>
                    <br />
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>
                      Q{r.deliveryFee} · ~{r.estimatedMinutes}min
                    </span>
                  </>
                )}
                <br />
                <span
                  style={{
                    fontSize: 11,
                    color: r.isAcceptingOrders ? "#16a34a" : "#dc2626",
                  }}
                >
                  {r.isAcceptingOrders ? "Abierto" : "Cerrado"}
                </span>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
