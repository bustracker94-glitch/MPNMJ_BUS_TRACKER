// Final verification of Stop Edit (PUT) and Stop-Route Unlink (DELETE with query params)
const API_BASE = 'http://localhost:3000/api/v1';

async function verify() {
    try {
        console.log("--- Creating test components ---");
        // Create Stop
        const sRes = await fetch(`${API_BASE}/stops`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'VerifyStop', latitude: 10, longitude: 10 })
        });
        const stop = await sRes.json();
        console.log("Created Stop ID:", stop.id);

        // Update Stop (Edit)
        console.log("--- Testing PUT (Edit) ---");
        const uRes = await fetch(`${API_BASE}/stops/${stop.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'VerifyStopUpdated', latitude: 10, longitude: 10 })
        });
        const updated = await uRes.json();
        console.log("Updated Name:", updated.name);

        // Create Route
        const rRes = await fetch(`${API_BASE}/routes`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'VerifyRoute' })
        });
        const route = await rRes.json();
        console.log("Created Route ID:", route.id);

        // Link
        await fetch(`${API_BASE}/route_stops`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ route_id: route.id, stop_id: stop.id, stop_order: 1 })
        });
        console.log("Linked stop to route");

        // Unlink (Delete Action in Admin Panel)
        console.log("--- Testing DELETE (Unlink) via query params ---");
        const dRes = await fetch(`${API_BASE}/route_stops?route_id=${route.id}&stop_id=${stop.id}`, {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' }
        });
        const dData = await dRes.json();
        console.log("Unlink result:", dData);

        // Verify it's gone from route stops
        const listRes = await fetch(`${API_BASE}/routes/${route.id}/stops`);
        const stops = await listRes.json();
        console.log("Stops in route after deletion:", stops.length);

        if (stops.length === 0 && updated.name === 'VerifyStopUpdated') {
            console.log(">>> ALL ACTIONS VERIFIED SUCCESSFULLY <<<");
        } else {
            console.log(">>> VERIFICATION FAILED <<<");
        }

    } catch (e) {
        console.error("Verification Error:", e);
    }
}

verify();
