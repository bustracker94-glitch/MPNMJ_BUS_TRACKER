import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Bus, MapPin, Settings } from 'lucide-react';
import SearchStops from './pages/SearchStops';
import BusList from './pages/BusList';
import LiveTracking from './pages/LiveTracking';
import AdminPanel from './pages/AdminPanel';

function App() {
    return (
        <Router>
            <div className="container">
                <header>
                    <Link to="/" style={{ textDecoration: 'none' }}>
                        <h1>🎓 College Bus Tracker</h1>
                    </Link>
                    <p>M.P.N.M.J. Engineering College</p>
                </header>

                <main style={{ flex: 1 }}>
                    <Routes>
                        <Route path="/" element={<SearchStops />} />
                        <Route path="/buses" element={<BusList />} />
                        <Route path="/track/:busId" element={<LiveTracking />} />
                        <Route path="/admin" element={<AdminPanel />} />
                    </Routes>
                </main>


            </div>
        </Router>
    );
}

export default App;
