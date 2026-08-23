import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Shield, Radio, Users, AlertCircle, CheckCircle2, Truck, RefreshCw, Trash2 } from 'lucide-react';
import L from 'leaflet';

const createEmergencyIcon = () => {
    return L.divIcon({
        className: 'custom-pin',
        html: `
      <div style="
        background: radial-gradient(circle, #ef4444 0%, #b91c1c 100%);
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 15px #ef4444;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        font-weight: bold;
      ">
        !
      </div>
    `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
    });
};

export default function CommandDashboard() {
    const [incidents, setIncidents] = useState([]);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [isLive, setIsLive] = useState(false);

    const fetchIncidents = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/sos/all');
            if (res.ok) {
                const data = await res.json();
                setIncidents(data);
            }
        } catch (err) {
            console.warn('Backend unreachable');
        }
    };

    useEffect(() => {
        // 1. Initial Load Only (No repeating poll interval!)
        fetchIncidents();

        // 2. Real-time WebSocket Stream
        let ws;
        try {
            ws = new WebSocket('ws://localhost:8000/ws/alerts');
            ws.onopen = () => setIsLive(true);

            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === 'NEW_SOS') {
                    setIncidents((prev) => {
                        const exists = prev.some((i) => (i.id && i.id === message.data.id) || (i.client_packet_id && i.client_packet_id === message.data.client_packet_id));
                        if (exists) return prev;
                        return [message.data, ...prev];
                    });
                } else if (message.type === 'STATUS_UPDATE') {
                    setIncidents((prev) =>
                        prev.map((inc) =>
                            (inc.id === message.data.id || inc.client_packet_id === message.data.client_packet_id)
                                ? message.data
                                : inc
                        )
                    );
                } else if (message.type === 'GRID_CLEARED') {
                    setIncidents([]);
                }
            };

            ws.onclose = () => setIsLive(false);
            ws.onerror = () => setIsLive(false);
        } catch (e) {
            console.error('WebSocket failed to initialize');
        }

        return () => {
            if (ws) ws.close();
        };
    }, []);

    const dispatchTeam = async (incident) => {
        const targetId = incident.id ?? incident.client_packet_id;
        if (!targetId) return;

        // Optimistic UI update
        setIncidents((prev) =>
            prev.map((inc) =>
                (inc.id === targetId || inc.client_packet_id === targetId)
                    ? { ...inc, status: 'Dispatched (NDRF Unit #4)' }
                    : inc
            )
        );

        try {
            await fetch(`http://localhost:8000/api/sos/${targetId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Dispatched (NDRF Unit #4)' }),
            });
        } catch (err) {
            console.error('Failed to update status on server:', err);
        }
    };

    const resolveIncident = async (incident) => {
        const targetId = incident.id ?? incident.client_packet_id;
        if (!targetId) return;

        // Optimistic UI update
        setIncidents((prev) =>
            prev.map((inc) =>
                (inc.id === targetId || inc.client_packet_id === targetId)
                    ? { ...inc, status: 'Resolved' }
                    : inc
            )
        );

        try {
            await fetch(`http://localhost:8000/api/sos/${targetId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Resolved' }),
            });
        } catch (err) {
            console.error('Failed to update status on server:', err);
        }
    };

    const clearAllGrid = async () => {
        if (window.confirm('Reset and clear all active emergency beacons?')) {
            try {
                await fetch('http://localhost:8000/api/sos/clear', { method: 'DELETE' });
                setIncidents([]);
            } catch (err) {
                console.error('Failed to clear incidents');
            }
        }
    };

    const centerPosition =
        incidents.length > 0 && incidents[0].latitude
            ? [incidents[0].latitude, incidents[0].longitude]
            : [17.5392, 78.4414];

    return (
        <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
            {/* Top Command Bar */}
            <div className="flex flex-wrap items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-600/20 text-red-500 rounded-xl border border-red-500/30">
                        <Shield size={26} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            NDRF Integrated Command & Control Center
                        </h1>
                        <p className="text-xs text-slate-400">National Disaster Management Grid • Live Tactical Feed</p>
                    </div>
                </div>

                {/* Real-time KPI Stats */}
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <p className="text-xs text-slate-400">Active Beacons</p>
                        <p className="text-2xl font-black text-red-500">{incidents.length}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-slate-400">Grid Sync</p>
                        <span
                            className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${isLive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400'
                                }`}
                        >
                            {isLive ? 'LIVE WEBSOCKET' : 'CONNECTING...'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchIncidents}
                            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition cursor-pointer"
                            title="Refresh feed"
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button
                            onClick={clearAllGrid}
                            className="px-3 py-2 bg-red-950/60 hover:bg-red-900 border border-red-800/50 rounded-lg text-xs font-semibold text-red-300 transition flex items-center gap-1.5 cursor-pointer"
                            title="Clear all active beacons"
                        >
                            <Trash2 size={14} /> Reset Grid
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Interactive Tactical Map */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-[580px] relative">
                    <MapContainer center={centerPosition} zoom={14} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />

                        {incidents.map((inc) => (
                            <React.Fragment key={inc.id || inc.client_packet_id}>
                                <Marker
                                    position={[inc.latitude, inc.longitude]}
                                    icon={createEmergencyIcon()}
                                    eventHandlers={{
                                        click: () => setSelectedIncident(inc),
                                    }}
                                >
                                    <Popup className="text-slate-900">
                                        <div className="p-1 font-sans">
                                            <strong className="text-red-600 block font-bold text-sm">{inc.category}</strong>
                                            <span className="text-xs text-slate-700 block">Victims: {inc.victims_count} people</span>
                                            <span className="text-xs text-slate-500 block">Status: {inc.status}</span>
                                            <span className="text-xs text-emerald-600 font-semibold block">
                                                AI Score: {inc.confidence_score || 95}%
                                            </span>
                                        </div>
                                    </Popup>
                                </Marker>

                                <Circle
                                    center={[inc.latitude, inc.longitude]}
                                    radius={120}
                                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.15 }}
                                />
                            </React.Fragment>
                        ))}
                    </MapContainer>

                    <div className="absolute top-4 right-4 z-[1000] bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs flex items-center gap-2 text-slate-300">
                        <Radio size={14} className="text-red-500 animate-pulse" /> Live Telemetry Mesh Grid
                    </div>
                </div>

                {/* Real-time Triage Incident Feed */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[580px] shadow-xl">
                    <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span>Incoming Triage Queue</span>
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                            {incidents.length} Active
                        </span>
                    </h2>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {incidents.length === 0 ? (
                            <div className="text-center py-20 text-slate-500 text-xs">
                                No active emergency beacons detected. Click "Citizen SOS Beacon" to send one!
                            </div>
                        ) : (
                            incidents.map((inc) => (
                                <div
                                    key={inc.id || inc.client_packet_id}
                                    onClick={() => setSelectedIncident(inc)}
                                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${selectedIncident?.id === inc.id
                                        ? 'bg-slate-800 border-red-500 shadow-lg shadow-red-500/10'
                                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                                            <AlertCircle size={14} /> {inc.category}
                                        </span>
                                        <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                                            {inc.confidence_score || 95}% AI
                                        </span>
                                    </div>

                                    {/* Voice Note Transcript Display */}
                                    {inc.voice_note_transcript && inc.voice_note_transcript !== 'Direct Manual SOS Trigger' && (
                                        <div className="my-1.5 p-2 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-amber-300 italic">
                                            🎙️ "{inc.voice_note_transcript}"
                                        </div>
                                    )}

                                    <div className="text-xs text-slate-300 flex justify-between my-2">
                                        <span className="flex items-center gap-1">
                                            <Users size={12} className="text-slate-400" /> {inc.victims_count} Affected
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                            Hops: <strong className="text-amber-400">{inc.offline_hop_count || 0}</strong>
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                                        <span
                                            className={`font-semibold ${inc.status?.includes('Dispatched')
                                                ? 'text-cyan-400'
                                                : inc.status === 'Resolved'
                                                    ? 'text-emerald-400'
                                                    : 'text-amber-400'
                                                }`}
                                        >
                                            {inc.status || 'Pending Dispatch'}
                                        </span>

                                        <div className="flex gap-1.5">
                                            {!inc.status?.includes('Dispatched') && inc.status !== 'Resolved' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        dispatchTeam(inc);
                                                    }}
                                                    className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-medium flex items-center gap-1 text-[10px] cursor-pointer"
                                                >
                                                    <Truck size={10} /> Dispatch
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    resolveIncident(inc);
                                                }}
                                                className={`px-2 py-1 rounded text-[10px] cursor-pointer transition ${inc.status === 'Resolved'
                                                    ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                                    }`}
                                                title="Mark as Resolved"
                                            >
                                                <CheckCircle2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

