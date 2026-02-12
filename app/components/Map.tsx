import React, { useEffect, useState, useRef, useMemo } from "react";
import "@/styles/components/Map.scss";
import { Icon } from "./Icon";

type MapProps = {
  label?: string;
  coordinates: { lat: number; lng: number } | string;
  extraCoordinates?: {
    lat: number;
    lng: number;
    showMarker?: boolean;
    label?: string;
  }[];
  mapUrl?: string;
  width?: string;
  height?: string;
  showRoute?: boolean;
  interactive?: boolean;
  zoom?: number;
  style?: React.CSSProperties;
};

const Map: React.FC<MapProps> = ({
  label,
  coordinates,
  extraCoordinates,
  mapUrl,
  width = "100%",
  height = "300px",
  showRoute = false,
  interactive = false,
  zoom,
  style,
}) => {
  const [Leaflet, setLeaflet] = useState<any>(null);
  const [L, setL] = useState<any>(null);
  const [routingReady, setRoutingReady] = useState(false);
  const mapRef = useRef<any>(null);
  const routingControlRef = useRef<any>(null);

  // 1. Process coordinates safely
  const parsedCoordinates = useMemo(() => {
    if (!coordinates) return null;
    try {
      return typeof coordinates === "string"
        ? JSON.parse(coordinates)
        : coordinates;
    } catch (e) {
      console.error("Map Error: Invalid coordinates format", e);
      return null;
    }
  }, [coordinates]);

  // 2. Load Leaflet and CSS dynamically
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const [reactLeaflet, leaflet] = await Promise.all([
        import("react-leaflet"),
        import("leaflet"),
        import("leaflet/dist/leaflet.css"),
      ]);
      if (isMounted) {
        setLeaflet(reactLeaflet);
        setL(leaflet.default);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Setup Routing Machine
  useEffect(() => {
    if (!L || !showRoute) return;
    import("leaflet-routing-machine").then(() => {
      setRoutingReady(true);
    });
  }, [L, showRoute]);

  // 4. Handle Routing Logic
  useEffect(() => {
    if (
      !routingReady ||
      !L ||
      !mapRef.current ||
      !parsedCoordinates ||
      !extraCoordinates?.length
    )
      return;

    if (routingControlRef.current) routingControlRef.current.remove();

    const waypoints = [
      L.latLng(parsedCoordinates.lat, parsedCoordinates.lng),
      L.latLng(extraCoordinates[0].lat, extraCoordinates[0].lng),
    ];

    routingControlRef.current = (L as any).Routing.control({
      waypoints,
      addWaypoints: false,
      draggableWaypoints: false,
      show: false,
      createMarker: () => null,
      lineOptions: { styles: [{ color: "var(--color-primary)", weight: 4 }] },
    }).addTo(mapRef.current);

    return () => {
      if (routingControlRef.current) routingControlRef.current.remove();
    };
  }, [routingReady, L, parsedCoordinates, extraCoordinates]);

  // 5. Memoize Map Properties
  const isLoading = !Leaflet || !L || !parsedCoordinates;

  const allCoords = useMemo(() => {
    if (!parsedCoordinates) return [];
    return extraCoordinates
      ? [
          { lat: parsedCoordinates.lat, lng: parsedCoordinates.lng },
          ...extraCoordinates,
        ]
      : [{ lat: parsedCoordinates.lat, lng: parsedCoordinates.lng }];
  }, [parsedCoordinates, extraCoordinates]);

  const mapProps = useMemo(() => {
    if (!parsedCoordinates) return {};
    return zoom !== undefined
      ? {
          center: [parsedCoordinates.lat, parsedCoordinates.lng] as [
            number,
            number,
          ],
          zoom,
        }
      : {
          bounds: allCoords.map((c: any) => [c.lat, c.lng]),
          boundsOptions: { padding: [40, 40] },
        };
  }, [parsedCoordinates, zoom, allCoords]);

  return (
    <div
      className="map-container-wrapper"
      style={{
        ...style,
        width,
        height,
        position: "relative",
        overflow: "hidden",
        borderRadius: "8px",
      }}
    >
      {isLoading ? (
        <div
          className="map-loading-placeholder"
          style={{
            width: "100%",
            height: "100%",
            background: "#f8f8f8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#888",
            fontSize: "0.9rem",
          }}
        >
          <span>Loading Map...</span>
        </div>
      ) : (
        <Leaflet.MapContainer
          ref={mapRef}
          {...mapProps}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom={false}
          dragging={interactive}
          zoomControl={interactive}
          // Removes the default "Leaflet" prefix and attribution container
          attributionControl={false}
          whenReady={() => {
            // Necessary for Framer Motion accordions to fix grey tiles
            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.invalidateSize();
              }
            }, 400);
          }}
        >
          <Leaflet.TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution="" // Ensures tile provider text is hidden
          />

          <Leaflet.Marker
            position={[parsedCoordinates.lat, parsedCoordinates.lng]}
          >
            <Leaflet.Popup closeButton={false}>
              {mapUrl ? (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    fontWeight: "bold",
                  }}
                >
                  {label || "View Location"} <Icon.ExternalLink size={16} />
                </a>
              ) : (
                label
              )}
            </Leaflet.Popup>
          </Leaflet.Marker>

          {extraCoordinates?.map(
            (c, i) =>
              c.showMarker !== false && (
                <Leaflet.Marker key={i} position={[c.lat, c.lng]}>
                  <Leaflet.Popup>
                    {c.label || "Additional location"}
                  </Leaflet.Popup>
                </Leaflet.Marker>
              ),
          )}
        </Leaflet.MapContainer>
      )}
    </div>
  );
};

export default Map;
