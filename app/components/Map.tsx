import React, { useEffect, useState, useRef } from "react";
import "@/styles/components/Map.scss";

type MapProps = {
  label?: string;
  coordinates: { lat: number; lng: number };
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

  // Load Leaflet modules
  useEffect(() => {
    (async () => {
      const [reactLeaflet, leaflet] = await Promise.all([
        import("react-leaflet"),
        import("leaflet"),
        import("leaflet/dist/leaflet.css"),
      ]);
      setLeaflet(reactLeaflet);
      setL(leaflet.default);
    })();
  }, []);

  // Load routing machine separately after Leaflet is ready
  useEffect(() => {
    if (!L || !showRoute) return;

    (async () => {
      await Promise.all([
        import("leaflet-routing-machine"),
        import("leaflet-routing-machine/dist/leaflet-routing-machine.css"),
      ]);

      // Wait for L.Routing to be available
      let attempts = 0;
      const checkRouting = setInterval(() => {
        if ((L as any).Routing || (window as any).L?.Routing) {
          if (!(L as any).Routing) {
            (L as any).Routing = (window as any).L.Routing;
          }
          setRoutingReady(true);
          clearInterval(checkRouting);
        }
        attempts++;
        if (attempts > 20) clearInterval(checkRouting); // timeout after 2s
      }, 100);
    })();
  }, [L, showRoute]);

  // Remove attribution
  useEffect(() => {
    const interval = setInterval(() => {
      const el = document.querySelector(
        ".leaflet-control-attribution.leaflet-control",
      );
      if (el) {
        el.remove();
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Add routing control
  useEffect(() => {
    if (
      !routingReady ||
      !L ||
      !mapRef.current ||
      !showRoute ||
      !extraCoordinates?.length
    )
      return;

    // Clean up previous routing control
    if (routingControlRef.current) {
      routingControlRef.current.remove();
      routingControlRef.current = null;
    }

    try {
      const map = mapRef.current;
      const waypoints = [
        (L as any).latLng(coordinates.lat, coordinates.lng),
        (L as any).latLng(extraCoordinates[0].lat, extraCoordinates[0].lng),
      ];

      routingControlRef.current = (L as any).Routing.control({
        waypoints,
        routeWhileDragging: false,
        show: false,
        addWaypoints: false,
        draggableWaypoints: false,
        createMarker: () => null, // Hide routing's auto-generated waypoint markers
        lineOptions: {
          styles: [
            {
              color: "var(--color-primary)",
              weight: 4,
            },
          ],
          extendToWaypoints: true,
          missingRouteTolerance: 0,
        },
      }).addTo(map);

      // Hide the routing instructions panel
      setTimeout(() => {
        const routingContainer = document.querySelector(
          ".leaflet-routing-container",
        );
        if (routingContainer) {
          (routingContainer as HTMLElement).style.display = "none";
        }
      }, 100);
    } catch (error) {
      console.error("Failed to add routing:", error);
    }

    return () => {
      if (routingControlRef.current) {
        routingControlRef.current.remove();
        routingControlRef.current = null;
      }
    };
  }, [routingReady, L, showRoute, coordinates, extraCoordinates]);

  if (!Leaflet || !L) return null;

  const allCoords = extraCoordinates
    ? [coordinates, ...extraCoordinates]
    : [coordinates];

  // Determine map center and zoom
  const mapProps =
    zoom !== undefined
      ? {
          center: [coordinates.lat, coordinates.lng] as [number, number],
          zoom: zoom,
        }
      : {
          bounds: allCoords.map((c: any) => [c.lat, c.lng]),
          boundsOptions: { padding: [50, 50] },
        };

  return (
    <Leaflet.MapContainer
      ref={mapRef}
      {...mapProps}
      style={{ ...style, width, height, borderRadius: "8px" }}
      scrollWheelZoom={false}
      dragging={interactive}
      touchZoom={interactive}
      doubleClickZoom={interactive}
      boxZoom={interactive}
      keyboard={interactive}
      zoomControl={interactive}

      whenReady={() => {
        // Ensure map is fully initialized
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }}
    >
      <Leaflet.TileLayer
        url="https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
        attribution=""
      />
      <Leaflet.Marker position={[coordinates.lat, coordinates.lng]}>
        <Leaflet.Popup>
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer">
              {label && <div className="map-label">{label}</div>}
            </a>
          )}
        </Leaflet.Popup>
      </Leaflet.Marker>
      {extraCoordinates?.map((c, i) =>
        c.showMarker !== false ? (
          <Leaflet.Marker key={i} position={[c.lat, c.lng]}>
            <Leaflet.Popup>{c.label || "Additional location"}</Leaflet.Popup>
          </Leaflet.Marker>
        ) : null,
      )}
    </Leaflet.MapContainer>
  );
};

export default Map;
