import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

function BusList() {
    const [buses, setBuses] = useState([]);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        // In real app, pass ?stopId=... to filter
        fetch(`${API_BASE}/buses`)
            .then(res => res.json())
            .then(data => setBuses(data || []))
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <h2 style={{ marginBottom: '16px' }}>Available Buses</h2>
            {buses.length === 0 ? (
                <p>No buses found.</p>
            ) : (
                buses.map(bus => (
                    <div key={bus.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ fontSize: '1.2rem' }}>{bus.id}</h3>
                            <p style={{ color: '#666' }}>Route: {bus.routes?.name || 'Unknown'}</p>
                            <span style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: bus.active ? '#dcfce7' : '#fee2e2',
                                color: bus.active ? '#166534' : '#991b1b',
                                fontSize: '0.8rem',
                                marginTop: '4px'
                            }}>
                                {bus.active ? 'Running' : 'Stopped'}
                            </span>
                        </div>
                        <Link to={`/track/${bus.id}`} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.9rem' }}>
                            Track
                        </Link>
                    </div>
                ))
            )}
        </div>
    );
}

export default BusList;
