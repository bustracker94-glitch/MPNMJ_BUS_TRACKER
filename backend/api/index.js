const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root Route for Vercel Verification
app.get('/', (req, res) => {
    res.send("Bus Tracker Backend Ready");
});

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- ROUTES ---

// --- 1. BUS CRUD ---

// Get All Buses
app.get('/api/v1/buses', async (req, res) => {
    const { routeId } = req.query;
    let query = supabase.from('buses').select('*, routes(name)');
    if (routeId) {
        query = query.eq('route_id', routeId);
    }
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Get Single Bus Details
app.get('/api/v1/buses/:id', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('buses').select('*, routes(*)').eq('id', id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Create Bus
app.post('/api/v1/buses', async (req, res) => {
    const { id, active, route_id } = req.body;
    if (!id) return res.status(400).json({ error: "Bus ID is required" });

    const { data, error } = await supabase.from('buses').insert([{ id, active: active || true, route_id }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Update Bus (Assign Route / active status)
app.put('/api/v1/buses/:id', async (req, res) => {
    const { id } = req.params;
    const { active, route_id } = req.body;

    // Build update object dynamically
    const updates = {};
    if (active !== undefined) updates.active = active;
    if (route_id !== undefined) updates.route_id = route_id;

    const { data, error } = await supabase.from('buses').update(updates).eq('id', id).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Delete Bus
app.delete('/api/v1/buses/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('buses').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ status: 'deleted' });
});


// --- 2. STOP CRUD ---

// Get All Stops
app.get('/api/v1/stops', async (req, res) => {
    const { data, error } = await supabase.from('stops').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Create Stop
app.post('/api/v1/stops', async (req, res) => {
    const { name, latitude, longitude } = req.body;
    if (!name || !latitude || !longitude) return res.status(400).json({ error: "Missing fields" });

    const { data, error } = await supabase.from('stops').insert([{ name, latitude, longitude }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Update Stop
app.put('/api/v1/stops/:id', async (req, res) => {
    const { id } = req.params;
    const { name, latitude, longitude } = req.body;
    const { data, error } = await supabase.from('stops').update({ name, latitude, longitude }).eq('id', id).select();
    if (error) {
        console.error("Update Stop Error:", error);
        return res.status(500).json({ error: error.message });
    }
    console.log("Stop Updated:", id);
    res.json(data[0]);
});

// Delete Stop
app.delete('/api/v1/stops/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('stops').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ status: 'deleted' });
});


// --- 3. ROUTE CRUD ---

// Get All Routes
app.get('/api/v1/routes', async (req, res) => {
    const { data, error } = await supabase.from('routes').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Create Route
app.post('/api/v1/routes', async (req, res) => {
    const { name } = req.body;
    const { data, error } = await supabase.from('routes').insert([{ name }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// Get Stops for a Specific Route (Ordered)
app.get('/api/v1/routes/:id/stops', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
        .from('route_stops')
        .select('stop_order, stops(*)')
        .eq('route_id', id)
        .order('stop_order', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Assign Stop to Route (Route Stop)
app.post('/api/v1/route_stops', async (req, res) => {
    const { route_id, stop_id, stop_order } = req.body;
    const { error } = await supabase.from('route_stops').insert([{ route_id, stop_id, stop_order }]);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ status: 'linked' });
});

// Remove Stop from Route
app.delete('/api/v1/route_stops', async (req, res) => {
    let { route_id, stop_id } = req.body;

    // Fallback to query params if body is empty
    if (!route_id || !stop_id) {
        route_id = req.query.route_id;
        stop_id = req.query.stop_id;
    }

    if (!route_id || !stop_id) {
        return res.status(400).json({ error: "Missing route_id or stop_id" });
    }

    const { error } = await supabase.from('route_stops').delete().match({ route_id, stop_id });
    if (error) {
        console.error("Delete RouteStop Error:", error);
        return res.status(500).json({ error: error.message });
    }
    console.log("RouteStop deleted:", { route_id, stop_id });
    res.json({ status: 'unlinked' });
});


// --- 4. HARDWARE LOCATION UPDATE ---
app.post('/api/v1/bus/location', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.BUS_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { bus_id, latitude, longitude, speed } = req.body;
    if (!bus_id || !latitude || !longitude) {
        return res.status(400).json({ error: 'Missing Required Fields' });
    }

    const { error } = await supabase
        .from('bus_locations')
        .upsert({
            bus_id,
            latitude,
            longitude,
            speed,
            timestamp: new Date().toISOString()
        });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ status: 'ok' });
});

app.get('/api/v1/bus/live', async (req, res) => {
    const { busId } = req.query;
    let query = supabase.from('bus_locations').select('*');
    if (busId) {
        query = query.eq('bus_id', busId);
        const { data, error } = await query.maybeSingle();
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data || {});
    } else {
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    }
});


// Export for Vercel Serverless
module.exports = app;

// Start server locally if not running in Vercel/lambda environment
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running locally on port ${PORT}`);
    });
}
