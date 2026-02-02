import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import LeafletMap from '../components/LeafletMap';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Haversine formula for distance (km)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

function LiveTracking() {
    const { busId } = useParams();
    const [busLoc, setBusLoc] = useState(null);
    const [userLoc, setUserLoc] = useState(null);
    const [eta, setEta] = useState(null);
    const [nearestStop, setNearestStop] = useState(null);
    const [stops, setStops] = useState([]);

    // Fetch Route-Specific Stops
    useEffect(() => {
        const loadRouteStops = async () => {
            try {
                // 1. Get Bus Info to find its Route ID
                const busRes = await fetch(`${API_BASE}/buses/${busId}`);
                const busData = await busRes.json();

                if (busData && busData.route_id) {
                    // 2. Get ordered stops for this specific route
                    const stopsRes = await fetch(`${API_BASE}/routes/${busData.route_id}/stops`);
                    const routeStopsData = await stopsRes.json();

                    // Flatten the response (extract stops from route_stops structure)
                    const formattedStops = routeStopsData.map(rs => rs.stops);
                    setStops(formattedStops);
                }
            } catch (err) {
                console.error("Failed to load route stops:", err);
            }
        };
        loadRouteStops();
    }, [busId]);

    // Get User Location
    useEffect(() => {
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const newLat = pos.coords.latitude;
                    const newLng = pos.coords.longitude;

                    setUserLoc(prev => {
                        if (!prev) return [newLat, newLng];

                        // Calculate distance from previous to see if it's just jitter
                        const dist = getDistanceFromLatLonInKm(prev[0], prev[1], newLat, newLng) * 1000; // to meters
                        if (dist < 20) {
                            return prev; // Ignore minor jitter < 20m
                        }
                        return [newLat, newLng];
                    });
                },
                (err) => console.error(err),
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    // Poll Bus Location
    useEffect(() => {
        const fetchLoc = () => {
            fetch(`${API_BASE}/bus/live?busId=${busId}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.latitude) {
                        setBusLoc({ lat: data.latitude, lng: data.longitude, speed: data.speed });

                        if (userLoc && stops.length > 0) {
                            // Find nearest stop to USER
                            let minD = Infinity;
                            let nearest = null;
                            stops.forEach(stop => {
                                const d = getDistanceFromLatLonInKm(userLoc[0], userLoc[1], stop.latitude, stop.longitude);
                                if (d < minD) {
                                    minD = d;
                                    nearest = stop;
                                }
                            });

                            // ONLY show route if user is within 100km (avoids "Europe to India" lines on bad IPs)
                            if (minD < 100) {
                                setNearestStop(nearest);
                                // ETA Logic
                                const distBusToStop = getDistanceFromLatLonInKm(data.latitude, data.longitude, nearest.latitude, nearest.longitude);
                                const speed = data.speed > 0 ? data.speed : 30;
                                const time = (distBusToStop / speed) * 60;
                                setEta(`${Math.round(time)} mins to ${nearest.name}`);
                            } else {
                                setNearestStop(null); // Too far to route
                                setEta(`Bus running (You are ${(minD).toFixed(0)}km away)`);
                            }
                        }
                    }
                })
                .catch(err => console.error(err));
        };

        fetchLoc();
        const interval = setInterval(fetchLoc, 5000);
        return () => clearInterval(interval);
    }, [busId, userLoc, stops]);

    return (
        <div>
            <div className="card" style={{ marginBottom: '16px', padding: '12px' }}>
                <h3>Live Tracking: {busId}</h3>
                {eta ? (
                    <p className="text-gradient" style={{ fontSize: '1.5rem' }}>ETA: {eta}</p>
                ) : (
                    <p>Calculating...</p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
                    <span>Speed: {busLoc ? busLoc.speed : 0} km/h</span>
                    <span>
                        {userLoc ? `GPS Active` : 'Locating you...'}
                    </span>
                </div>
            </div>

            <div className="map-container" style={{ height: '50vh', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                <LeafletMap
                    userLocation={userLoc}
                    busLocation={busLoc}
                    stops={stops}
                    nearestStopLocation={nearestStop ? [nearestStop.latitude, nearestStop.longitude] : null}
                />
            </div>

            <div className="card">
                <h4>Route Stops</h4>
                <ul style={{ listStyle: 'none', marginTop: '10px' }}>
                    {stops.map(stop => (
                        <li key={stop.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                            📍 {stop.name}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default LiveTracking;
