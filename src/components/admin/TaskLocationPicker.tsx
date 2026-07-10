import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { EGYPT_CENTER } from "@/lib/egypt-cities";

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Props = {
  lat?: number;
  lng?: number;
  radius_m?: number;
  onChange: (lat?: number, lng?: number, radius_m?: number) => void;
};

function MapEvents({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function TaskLocationPicker({ lat, lng, radius_m = 500, onChange }: Props) {
  const [position, setPosition] = useState<L.LatLng | null>(
    lat != null && lng != null ? new L.LatLng(lat, lng) : null
  );

  useEffect(() => {
    if (lat != null && lng != null) setPosition(new L.LatLng(lat, lng));
  }, [lat, lng]);

  const handleMapClick = (newLat: number, newLng: number) => {
    setPosition(new L.LatLng(newLat, newLng));
    onChange(newLat, newLng, radius_m);
  };

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={position || EGYPT_CENTER}
        zoom={position ? 15 : 6}
        style={{ height: "100%", width: "100%", zIndex: 10 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onChange={handleMapClick} />
        {position && (
          <>
            <Marker position={position} />
            <Circle
              center={position}
              radius={radius_m}
              pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.2 }}
            />
          </>
        )}
      </MapContainer>
      {position && (
        <div className="absolute bottom-2 left-2 z-20 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPosition(null);
              onChange(undefined, undefined, undefined);
            }}
            className="rounded bg-background/80 px-2 py-1 text-xs font-semibold text-destructive shadow-sm backdrop-blur"
          >
            Clear map location
          </button>
        </div>
      )}
    </div>
  );
}
