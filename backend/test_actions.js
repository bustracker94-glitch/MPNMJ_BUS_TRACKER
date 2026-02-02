// const fetch = require('node-fetch');
// Actually, I'll just use built-in fetch logic to be safe or try/catch.
// But to avoid the module error I encountered before, I'll rely on global fetch if available, else require.

const API_BASE = 'http://localhost:3000/api/v1';

async function runTests() {
    try {
        console.log("=== API TEST START ===");

        // 1. Create a dummy stop
        console.log("1. Creating dummy stop...");
        const createStopRes = await fetch(`${API_BASE}/stops`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'TEST_ACTION_STOP', latitude: 12.0, longitude: 77.0 })
        });
        const stop = await createStopRes.json();
        console.log("   Stop created:", stop.id);

        // 2. Edit the stop (PUT)
        console.log("2. Editing the stop (PUT)...");
        const updateStopRes = await fetch(`${API_BASE}/stops/${stop.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'TEST_ACTION_STOP_EDITED', latitude: 12.1, longitude: 77.1 })
        });
        const updatedStop = await updateStopRes.json();
        console.log("   Stop Updated:", updatedStop.name === 'TEST_ACTION_STOP_EDITED' ? 'SUCCESS' : 'FAIL');

        // 3. Create dummy route
        console.log("3. Creating dummy route...");
        const createRouteRes = await fetch(`${API_BASE}/routes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'TEST_ACTION_ROUTE' })
        });
        const route = await createRouteRes.json();
        console.log("   Route created:", route.id);

        // 4. Link stop
        console.log("4. Linking stop...");
        await fetch(`${API_BASE}/route_stops`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ route_id: route.id, stop_id: stop.id, stop_order: 1 })
        });
        console.log("   Linked.");

        // 5. Delete Link (Using Query Params) - This mirrors the Frontend change
        console.log("5. DELETE Link using Query Params...");
        const deleteRes = await fetch(`${API_BASE}/route_stops?route_id=${route.id}&stop_id=${stop.id}`, {
            method: 'DELETE',
            // Even if we send empty body or no body, it should work
            headers: { 'Content-Type': 'application/json' }
        });
        const deleteData = await deleteRes.json();
        console.log("   Delete Result:", deleteData);

        if (deleteData.status === 'unlinked') {
            console.log("   >>> DELETE SUCCESS <<<");
        } else {
            console.log("   >>> DELETE FAILED <<<");
        }

    } catch (e) {
        console.error("ERROR:", e);
    }
}

runTests();
