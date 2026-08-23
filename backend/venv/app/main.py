from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json
from datetime import datetime
from pydantic import BaseModel

app = FastAPI(title="ResQ-Mesh NDRF Backend", version="1.0")

# Enable Cross-Origin Requests from React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active incidents & connected clients
incident_store = []
connected_dashboards: List[WebSocket] = []

class StatusUpdate(BaseModel):
    status: str

@app.get("/")
def root():
    return {
        "status": "online",
        "system": "ResQ-Mesh NDRF Integrated Grid",
        "active_incidents": len(incident_store)
    }

# 1. Broadcast / Ingest SOS Beacon
@app.post("/api/sos/broadcast")
async def create_sos(sos: dict):
    sos["id"] = len(incident_store) + 1
    sos["received_at"] = datetime.now().isoformat()
    sos["confidence_score"] = 94.8  # AI Confidence triage score
    sos["status"] = "Pending Dispatch"
    
    incident_store.append(sos)
    print(f"🚨 [NEW EMERGENCY BEACON] ID: #{sos['id']} | Category: {sos.get('category')} | Transcript: {sos.get('voice_note_transcript')}")

    # Broadcast new SOS immediately to all open Command Dashboards
    dead_connections = []
    for ws in connected_dashboards:
        try:
            await ws.send_text(json.dumps({"type": "NEW_SOS", "data": sos}))
        except Exception:
            dead_connections.append(ws)

    # Clean up disconnected websockets
    for dead in dead_connections:
        if dead in connected_dashboards:
            connected_dashboards.remove(dead)

    return {"status": "SUCCESS", "message": "Beacon dispatched to NDRF Grid", "data": sos}

# 2. Update Incident Status (Dispatch / Resolve)
# 2. Update Incident Status (Dispatch / Resolve)
@app.patch("/api/sos/{incident_id}/status")
@app.post("/api/sos/{incident_id}/status")  # Supports both POST and PATCH
async def update_status(incident_id: str, update: StatusUpdate):
    for inc in incident_store:
        # Match by ID or client_packet_id as string
        if str(inc.get("id")) == str(incident_id) or str(inc.get("client_packet_id")) == str(incident_id):
            inc["status"] = update.status
            print(f"✅ [STATUS PERSISTED] Incident #{incident_id} -> {update.status}")
            
            # Broadcast update via WebSocket
            dead_connections = []
            for ws in connected_dashboards:
                try:
                    await ws.send_text(json.dumps({"type": "STATUS_UPDATE", "data": inc}))
                except Exception:
                    dead_connections.append(ws)

            for dead in dead_connections:
                if dead in connected_dashboards:
                    connected_dashboards.remove(dead)
                    
            return {"status": "SUCCESS", "incident": inc}
            
    print(f"❌ [STATUS FAILED] Incident #{incident_id} not found in store.")
    return {"status": "ERROR", "message": "Incident not found"}

# 3. Clear Grid / Reset (For fresh demos)
@app.delete("/api/sos/clear")
async def clear_all_sos():
    global incident_store
    incident_store.clear()
    print("🧹 [GRID RESET] All emergency beacons have been cleared.")
    
    dead_connections = []
    for ws in connected_dashboards:
        try:
            await ws.send_text(json.dumps({"type": "GRID_CLEARED", "data": []}))
        except Exception:
            dead_connections.append(ws)

    for dead in dead_connections:
        if dead in connected_dashboards:
            connected_dashboards.remove(dead)
            
    return {"status": "SUCCESS", "message": "Grid reset successfully"}

# 4. Fetch All Active Incidents
@app.get("/api/sos/all")
def get_all_incidents():
    return incident_store

# 5. Live WebSocket Channel
@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_dashboards.append(websocket)
    print("📡 [COMMAND CENTER CONNECTED] Live Tactical Dashboard linked.")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in connected_dashboards:
            connected_dashboards.remove(websocket)
        print("📡 [COMMAND CENTER DISCONNECTED]")