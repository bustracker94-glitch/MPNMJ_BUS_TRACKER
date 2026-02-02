import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Trash2, Edit, Plus, MapPin, ArrowUp, ArrowDown } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Fix Icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom Bus Icon
const BusIcon = new L.Icon({
    iconUrl: '/busicon.png', // Blue Bus
    iconSize: [45, 45],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
});

// Map component for clicking to add/edit stop
function MapClickHelper({ onMapClick }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng);
        },
    });
    return null;
}

function AdminPanel() {
    // Auth
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Data State
    const [buses, setBuses] = useState([]);
    const [routes, setRoutes] = useState([]); // Used for dropdowns
    const [selectedBus, setSelectedBus] = useState(null);
    const [routeStops, setRouteStops] = useState([]);

    // Form State
    const [newBusId, setNewBusId] = useState('');
    const [message, setMessage] = useState('');

    // Stop Edit State
    const [editingStop, setEditingStop] = useState(null); // { name, lat, lng, order, id, isNew }
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        console.log("AdminPanel checking API at:", API_BASE);
        fetch(`${API_BASE}/buses`).then(r => {
            if (r.ok) console.log("API Reachable!");
            else console.error("API error status:", r.status);
        }).catch(err => console.error("API Connection Failed:", err));

        if (isLoggedIn) {
            fetchBuses();
            fetchRoutes();
        }
    }, [isLoggedIn]);

    useEffect(() => {
        if (selectedBus && selectedBus.route_id) {
            fetchRouteStops(selectedBus.route_id);
        } else {
            setRouteStops([]);
        }
    }, [selectedBus]);

    // --- API CALLS ---
    const fetchBuses = () => fetch(`${API_BASE}/buses`).then(r => r.json()).then(setBuses);
    const fetchRoutes = () => fetch(`${API_BASE}/routes`).then(r => r.json()).then(setRoutes);
    const fetchRouteStops = (routeId) => fetch(`${API_BASE}/routes/${routeId}/stops`).then(r => r.json()).then(setRouteStops);

    // --- AUTH HANDLER ---
    const handleLogin = (e) => {
        e.preventDefault();
        const targetUser = 'mpnmj.transport';
        const targetPass = 'Mpnmj@Bus#2026';
        if (username.trim() === targetUser && password.trim() === targetPass) {
            setIsLoggedIn(true);
        } else {
            setMessage('Invalid credentials');
        }
    };

    // --- BUS ACTIONS ---
    const handleCreateBus = async () => {
        if (!newBusId) return;
        const res = await fetch(`${API_BASE}/buses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: newBusId, active: true })
        });
        if (res.ok) {
            setNewBusId('');
            fetchBuses();
            setMessage('Bus Created');
        }
    };

    const handleDeleteBus = async (id) => {
        if (!window.confirm('Delete this bus?')) return;
        await fetch(`${API_BASE}/buses/${id}`, { method: 'DELETE' });
        fetchBuses();
        if (selectedBus?.id === id) setSelectedBus(null);
    };

    const handleAssignRoute = async (busId, routeId) => {
        // If routeId is "new", create one
        let finalRouteId = routeId;
        if (routeId === 'new') {
            const name = prompt("Enter Name for new Route:");
            if (!name) return;
            const res = await fetch(`${API_BASE}/routes`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
            });
            const data = await res.json();
            finalRouteId = data.id;
            fetchRoutes();
        }

        await fetch(`${API_BASE}/buses/${busId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ route_id: finalRouteId })
        });
        fetchBuses();
        // Update local state if this is the selected bus
        if (selectedBus?.id === busId) {
            setSelectedBus({ ...selectedBus, route_id: finalRouteId });
        }
    };

    // --- STOP ACTIONS ---
    const handleMapClick = (latlng) => {
        if (editingStop) {
            setEditingStop({ ...editingStop, latitude: latlng.lat, longitude: latlng.lng });
        }
    };

    const startAddStop = () => {
        if (!selectedBus || !selectedBus.route_id) {
            alert("Please assign a route to this bus first!");
            return;
        }
        setEditingStop({
            isNew: true,
            name: '',
            latitude: 11.342156,
            longitude: 77.728901,
            order: routeStops.length + 1
        });
    };

    const saveStop = async () => {
        if (!editingStop.name) return alert("Name required");
        setIsSaving(true);

        try {
            let stopId = editingStop.id;

            // 1. Create/Update Stop Record
            const stopData = {
                name: editingStop.name,
                latitude: parseFloat(editingStop.latitude),
                longitude: parseFloat(editingStop.longitude)
            };

            if (editingStop.isNew) {
                const res = await fetch(`${API_BASE}/stops`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(stopData)
                });
                if (!res.ok) {
                    const errInfo = await res.json();
                    throw new Error(errInfo.error || "Failed to create stop");
                }
                const data = await res.json();
                stopId = data.id;
            } else {
                const res = await fetch(`${API_BASE}/stops/${stopId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(stopData)
                });
                if (!res.ok) {
                    const errInfo = await res.json();
                    throw new Error(errInfo.error || "Failed to update stop");
                }
            }

            // 2. Link to Route (if new)
            if (editingStop.isNew) {
                const res = await fetch(`${API_BASE}/route_stops`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ route_id: selectedBus.route_id, stop_id: stopId, stop_order: editingStop.order })
                });
                if (!res.ok) throw new Error("Failed to link stop to route");
            }

            setEditingStop(null);
            fetchRouteStops(selectedBus.route_id);
            alert("Success!");
        } catch (err) {
            alert("Action Failed: " + err.message);
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteRouteStop = async (stopId, routeId) => {
        if (!window.confirm("Remove stop from this route? (Stop data remains in database)")) return;

        try {
            const res = await fetch(`${API_BASE}/route_stops?route_id=${routeId}&stop_id=${stopId}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error("Failed to remove stop from route");

            fetchRouteStops(routeId);
        } catch (err) {
            alert(err.message);
            console.error(err);
        }
    };

    const deleteStopPermanently = async (stopId) => {
        if (!window.confirm("CRITICAL: Delete stop permanently from DATABASE? This will remove it from ALL routes.")) return;

        try {
            const res = await fetch(`${API_BASE}/stops/${stopId}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error("Failed to delete stop from database");

            if (selectedBus?.route_id) fetchRouteStops(selectedBus.route_id);
            if (editingStop?.id === stopId) setEditingStop(null);
            alert("Stop deleted permanently");
        } catch (err) {
            alert(err.message);
            console.error(err);
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="container" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                    <h2>Admin Login</h2>
                    <form onSubmit={handleLogin}>
                        <input className="input-field" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
                        <input className="input-field" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                        <button className="btn-primary">Login</button>
                        {message && <p style={{ color: 'red' }}>{message}</p>}
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2>Admin Panel 🛠️</h2>
                <button onClick={() => setIsLoggedIn(false)} style={{ border: 'none', background: 'none', color: 'red', fontWeight: 'bold', cursor: 'pointer' }}>Logout</button>
            </div>

            {/* SECTION 1: CREATE BUS */}
            <div className="card">
                <h3>1. Create / Manage Bus</h3>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input
                        className="input-field"
                        placeholder="New Bus ID (e.g. BUS_99)"
                        value={newBusId}
                        onChange={e => setNewBusId(e.target.value)}
                        style={{ marginBottom: 0 }}
                    />
                    <button className="btn-primary" onClick={handleCreateBus} style={{ width: 'auto' }}>Create</button>
                </div>

                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                    {buses.map(bus => (
                        <div
                            key={bus.id}
                            onClick={() => setSelectedBus(bus)}
                            style={{
                                padding: '10px 20px',
                                background: selectedBus?.id === bus.id ? '#FFD200' : '#f3f4f6',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                border: selectedBus?.id === bus.id ? '2px solid #000' : '1px solid #ddd',
                                minWidth: '120px'
                            }}
                        >
                            <strong>{bus.id}</strong>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                {bus.routes ? bus.routes.name : 'No Route'}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteBus(bus.id); }}
                                style={{
                                    marginTop: '5px',
                                    fontSize: '0.7rem',
                                    color: 'red',
                                    background: 'none',
                                    border: '1px solid red',
                                    borderRadius: '4px',
                                    padding: '2px 5px',
                                    cursor: 'pointer'
                                }}
                            >
                                Delete Bus
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {selectedBus && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>

                    {/* LEFT: STOP LIST */}
                    <div className="card">
                        <h3>2. Manage Stops for {selectedBus.id}</h3>

                        <div style={{ marginBottom: '10px' }}>
                            <label>Assigned Route: </label>
                            <select
                                value={selectedBus.route_id || ''}
                                onChange={(e) => handleAssignRoute(selectedBus.id, e.target.value)}
                                style={{ padding: '5px', marginLeft: '10px' }}
                            >
                                <option value="">-- Select Route --</option>
                                <option value="new">+ Create New Route</option>
                                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {routeStops.map((rs, idx) => (
                                <div key={rs.stops.id} style={{
                                    padding: '10px',
                                    borderBottom: '1px solid #eee',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    background: editingStop?.id === rs.stops.id ? '#fff3bf' : 'transparent'
                                }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold', marginRight: '10px' }}>{idx + 1}.</span>
                                        {rs.stops.name}
                                    </div>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button title="Edit" onClick={() => setEditingStop({ ...rs.stops, order: rs.stop_order })} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><Edit size={16} /></button>
                                        <button title="Remove from Route" onClick={() => deleteRouteStop(rs.stops.id, selectedBus.route_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#f59e0b' }}><Trash2 size={16} /></button>
                                        <button title="Delete Permanently" onClick={() => deleteStopPermanently(rs.stops.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'red' }}><MapPin size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="btn-primary" onClick={startAddStop} style={{ marginTop: '10px' }}>
                            <Plus size={16} style={{ verticalAlign: 'middle' }} /> Add New Stop
                        </button>

                        {/* STOP EDIT FORM */}
                        {editingStop && (
                            <div style={{ marginTop: '20px', padding: '10px', background: '#fdfdfd', border: '1px solid #ddd', borderRadius: '8px' }}>
                                <h4>{editingStop.isNew ? 'New Stop' : 'Edit Stop'}</h4>
                                <input
                                    className="input-field"
                                    placeholder="Stop Name"
                                    value={editingStop.name}
                                    onChange={e => setEditingStop({ ...editingStop, name: e.target.value })}
                                />
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.7rem', color: '#666' }}>Latitude</label>
                                        <input
                                            className="input-field"
                                            placeholder="Lat"
                                            value={editingStop.latitude}
                                            type="number"
                                            step="any"
                                            onChange={e => setEditingStop({ ...editingStop, latitude: parseFloat(e.target.value) || 0 })}
                                            style={{ marginBottom: '5px' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '0.7rem', color: '#666' }}>Longitude</label>
                                        <input
                                            className="input-field"
                                            placeholder="Lng"
                                            value={editingStop.longitude}
                                            type="number"
                                            step="any"
                                            onChange={e => setEditingStop({ ...editingStop, longitude: parseFloat(e.target.value) || 0 })}
                                            style={{ marginBottom: '5px' }}
                                        />
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#666' }}>ℹ️ Tip: Drag green marker on map or edit above</p>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button className="btn-primary" onClick={saveStop} disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save Stop'}
                                    </button>
                                    <button onClick={() => setEditingStop(null)} style={{ padding: '10px', background: '#ddd', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: MAP */}
                    <div className="card" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                        <h3>3. Map View</h3>
                        <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden' }}>
                            <MapContainer center={[11.342156, 77.728901]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <MapClickHelper onMapClick={handleMapClick} />

                                {/* Existing Stops Markers */}
                                {routeStops.map((rs) => (
                                    <Marker key={rs.stops.id} position={[rs.stops.latitude, rs.stops.longitude]}>
                                    </Marker>
                                ))}

                                {/* Editing Marker (Green) */}
                                {editingStop && (
                                    <Marker
                                        position={[editingStop.latitude, editingStop.longitude]}
                                        draggable={true}
                                        eventHandlers={{
                                            dragend: (e) => handleMapClick(e.target.getLatLng())
                                        }}
                                    />
                                )}
                            </MapContainer>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}

export default AdminPanel;
