import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import L from 'leaflet';
import 'leaflet-routing-machine';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// --- Icons ---

// Red Icon for Stops
const RedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Bus Icon (Local)
const BusIcon = new L.Icon({
    iconUrl: '/busicon.png',
    iconSize: [45, 45],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
});

// Helper for Distance
function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Routing between two points
function Routing({ from, to }) {
    const map = useMap();
    const controlRef = useRef(null);

    useEffect(() => {
        if (!from || !to) return;

        // Clean up previous
        if (controlRef.current) {
            map.removeControl(controlRef.current);
            controlRef.current = null;
        }

        controlRef.current = L.Routing.control({
            waypoints: [L.latLng(from[0], from[1]), L.latLng(to[0], to[1])],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1'
            }),
            routeWhileDragging: false,
            show: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            createMarker: () => null,
            lineOptions: {
                styles: [{ color: '#3388ff', opacity: 0.7, weight: 6, dashArray: '1, 12', lineCap: 'round' }]
            }
        }).addTo(map);

        return () => {
            if (controlRef.current) map.removeControl(controlRef.current);
        };
    }, [from, to, map]);
    return null;
}

// Multi-point Routing for the entire Bus Route
function MultiRouting({ waypoints, color = '#ef4444' }) {
    const map = useMap();
    const controlRef = useRef(null);

    useEffect(() => {
        if (!waypoints || waypoints.length < 2) return;

        console.log(`Routing for ${waypoints.length} stops...`);

        // Clean up previous control
        if (controlRef.current) {
            map.removeControl(controlRef.current);
            controlRef.current = null;
        }

        controlRef.current = L.Routing.control({
            waypoints: waypoints.map(wp => L.latLng(wp[0], wp[1])),
            router: L.Routing.osrmv1({
                serviceUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1'
            }),
            routeWhileDragging: false,
            show: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            createMarker: () => null,
            lineOptions: {
                styles: [{ color: color, opacity: 0.8, weight: 5, dashArray: '1, 10', lineCap: 'round' }]
            }
        }).addTo(map);

        // Handle routing errors
        controlRef.current.on('routingerror', function (e) {
            console.error('Routing error:', e);
        });

        return () => {
            if (controlRef.current) map.removeControl(controlRef.current);
        };
    }, [waypoints, map, color]);
    return null;
}

// Component to recenter map intelligently
function RecenterManager({ userLoc, busLoc }) {
    const map = useMap();

    useEffect(() => {
        if (busLoc) {
            // If User is valid AND close (< 500km), we might want to see both.
            // But "Live Tracking" usually prioritizes Bus.
            // If User is > 500km (IP Error), DEFINITELY Center on Bus.

            let shouldCenterOnBus = true;
            if (userLoc) {
                const dist = getDistanceKm(userLoc[0], userLoc[1], busLoc.lat, busLoc.lng);
                if (dist > 500) {
                    // User is very far (probably IP error), ignore user location for centering
                    shouldCenterOnBus = true;
                } else {
                    // User is close. We could fit bounds.
                    // For now, let's keep sticking to Bus as it moves.
                    shouldCenterOnBus = true;
                }
            }

            if (shouldCenterOnBus) {
                map.setView([busLoc.lat, busLoc.lng]);
            }
        } else if (userLoc) {
            // No bus data, but user data exists. Center on User.
            map.setView(userLoc);
        }
    }, [busLoc, userLoc, map]);

    return null;
}

function LeafletMap({ userLocation, busLocation, stops, nearestStopLocation }) {
    // Initial Center Logic
    // If User is far (>500km) from default start or bus, prioritize Bus/Default.

    let center = [11.342156, 77.728901]; // Default India
    if (busLocation) {
        center = [busLocation.lat, busLocation.lng];
    } else if (userLocation) {
        center = userLocation;
    }

    return (
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
            />

            {/* Road Path Direction to Nearest Stop */}
            {userLocation && nearestStopLocation && (
                <Routing from={userLocation} to={nearestStopLocation} />
            )}

            {/* Vehicle Path (Bus Route) - Road-following path between all stops */}
            {stops && stops.length > 1 && (
                <MultiRouting waypoints={stops.map(s => [s.latitude, s.longitude])} color="#ef4444" />
            )}

            {/* User Location - Blue Blur Circle */}
            {userLocation && (
                <>
                    {/* Outer "Blur" Circle */}
                    <CircleMarker
                        center={userLocation}
                        radius={20}
                        pathOptions={{ color: '#3388ff', fillColor: '#3388ff', fillOpacity: 0.2, weight: 0 }}
                    />
                    {/* Inner "Dot" */}
                    <CircleMarker
                        center={userLocation}
                        radius={6}
                        pathOptions={{ color: 'white', fillColor: '#3388ff', fillOpacity: 1, weight: 2 }}
                    >
                        <Popup>You are here</Popup>
                    </CircleMarker>
                </>
            )}

            {/* Bus Location */}
            {busLocation && (
                <Marker position={[busLocation.lat, busLocation.lng]} icon={BusIcon}>
                    <Popup>Bus {busLocation.speed} km/h</Popup>
                </Marker>
            )}

            {/* Smart Recenter Logic */}
            <RecenterManager userLoc={userLocation} busLoc={busLocation} />

            {/* Stops - Red Pins */}
            {stops && stops.map(stop => (
                <Marker key={stop.id} position={[stop.latitude, stop.longitude]} icon={RedIcon}>
                    <Popup>{stop.name}</Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}

export default LeafletMap;
