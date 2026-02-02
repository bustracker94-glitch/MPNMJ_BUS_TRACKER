import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

function SearchStops() {
    const [stops, setStops] = useState([]);
    const [fromStop, setFromStop] = useState('');
    const [toStop, setToStop] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`${API_BASE}/stops`)
            .then(res => res.json())
            .then(data => setStops(data || []))
            .catch(err => console.error('Failed to fetch stops', err));
    }, []);

    const handleSearch = () => {
        if (!fromStop) return alert('Please select a pickup stop');
        // In a real app, we'd filter by route connecting these two. 
        // For this prototype, we just go to bus list.
        navigate(`/buses?from=${fromStop}`);
    };

    return (
        <div className="card">
            <h2 style={{ marginBottom: '16px' }}>Find Your Bus 🚌</h2>

            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Pickup Point</label>
                <select
                    className="input-field"
                    value={fromStop}
                    onChange={(e) => setFromStop(e.target.value)}
                >
                    <option value="">Select Stop</option>
                    {stops.map(stop => (
                        <option key={stop.id} value={stop.id}>{stop.name}</option>
                    ))}
                </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Drop Point</label>
                <select
                    className="input-field"
                    value={toStop}
                    onChange={(e) => setToStop(e.target.value)}
                >
                    <option value="">Select Stop</option>
                    {stops.map(stop => (
                        <option key={stop.id} value={stop.id}>{stop.name}</option>
                    ))}
                </select>
            </div>

            <button onClick={handleSearch} className="btn-primary">
                Find Buses
            </button>
        </div>
    );
}

export default SearchStops;
