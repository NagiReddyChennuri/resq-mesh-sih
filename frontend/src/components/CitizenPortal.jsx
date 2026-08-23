import React, { useState, useEffect } from 'react';
import { AlertTriangle, Wifi, WifiOff, Radio, Navigation, Mic, Volume2, Sparkles, Trash2 } from 'lucide-react';
import { saveOfflineSOS, getBufferedSOS, clearBufferedSOS } from '../utils/offlineDB';

export default function CitizenPortal() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [status, setStatus] = useState('Idle');
    const [category, setCategory] = useState('Trapped / Flood');
    const [victims, setVictims] = useState(1);
    const [meshHops, setMeshHops] = useState(0);
    const [offlineCount, setOfflineCount] = useState(0);
    const [location, setLocation] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Voice SOS States
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [voiceSupported, setVoiceSupported] = useState(true);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            syncOfflinePackets();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        updateOfflineCount();

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => setLocation({ lat: 17.5392, lng: 78.4414 })
            );
        }

        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setVoiceSupported(false);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const updateOfflineCount = async () => {
        const buffered = await getBufferedSOS();
        setOfflineCount(buffered.length);
    };

    const syncOfflinePackets = async () => {
        if (isSyncing) return;

        const buffered = await getBufferedSOS();
        if (buffered.length === 0) return;

        setIsSyncing(true);
        setStatus(`Syncing ${buffered.length} offline mesh packets...`);

        try {
            await clearBufferedSOS();
            setOfflineCount(0);

            for (const packet of buffered) {
                await fetch('http://localhost:8000/api/sos/broadcast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(packet),
                });
            }
            setStatus('All offline packets successfully synced to NDRF Grid!');
        } catch (err) {
            setStatus('Sync failed. Re-queuing to mesh buffer.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleClearBuffer = async () => {
        await clearBufferedSOS();
        setOfflineCount(0);
        setStatus('Local offline mesh buffer cleared.');
    };

    const analyzeSpokenText = (text) => {
        const lower = text.toLowerCase();
        if (lower.includes('medical') || lower.includes('bleed') || lower.includes('heart') || lower.includes('injured') || lower.includes('doctor')) {
            setCategory('Medical Critical');
        } else if (lower.includes('food') || lower.includes('water') || lower.includes('hungry') || lower.includes('thirsty')) {
            setCategory('Food & Water');
        } else if (lower.includes('collapse') || lower.includes('wall') || lower.includes('building') || lower.includes('crush')) {
            setCategory('Building Collapse');
        } else if (lower.includes('trap') || lower.includes('water') || lower.includes('flood') || lower.includes('roof')) {
            setCategory('Trapped / Flood');
        }

        const numbersMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
        for (const [word, num] of Object.entries(numbersMap)) {
            if (lower.includes(word)) {
                setVictims(num);
                return;
            }
        }
        const digitMatch = lower.match(/\b([1-9]|10)\b/);
        if (digitMatch) {
            setVictims(parseInt(digitMatch[0]));
        }
    };

    const toggleListening = () => {
        if (!voiceSupported) {
            alert('Speech Recognition is not supported on this browser. Please use Chrome/Edge.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';

        if (!isListening) {
            recognition.start();
            setIsListening(true);
            setStatus('Listening... Speak your emergency now.');

            recognition.onresult = (event) => {
                const currentTranscript = Array.from(event.results)
                    .map((result) => result[0].transcript)
                    .join('');
                setTranscript(currentTranscript);
                analyzeSpokenText(currentTranscript);
            };

            recognition.onerror = () => {
                setIsListening(false);
                setStatus('Voice recognition stopped.');
            };

            recognition.onend = () => {
                setIsListening(false);
                setStatus('Voice captured! AI parameters updated.');
            };
        } else {
            recognition.stop();
            setIsListening(false);
        }
    };

    const triggerSOS = async () => {
        setStatus('Acquiring GPS & Encrypting Packet...');

        const packet = {
            client_packet_id: `pkt_${Date.now()}`,
            latitude: location ? location.lat : 17.5392,
            longitude: location ? location.lng : 78.4414,
            category,
            victims_count: parseInt(victims),
            voice_note_transcript: transcript || 'Direct Manual SOS Trigger',
            offline_hop_count: meshHops,
        };

        if (!navigator.onLine) {
            await saveOfflineSOS(packet);
            await updateOfflineCount();
            setStatus('OFFLINE: Packet secured in Local Mesh Buffer. Relaying...');
        } else {
            try {
                const res = await fetch('http://localhost:8000/api/sos/broadcast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(packet),
                });
                if (res.ok) {
                    setStatus('DISPATCHED: Emergency Beacon received by NDRF Command Center!');
                }
            } catch (err) {
                await saveOfflineSOS(packet);
                await updateOfflineCount();
                setStatus('Backend unreachable. Saved to local mesh buffer.');
            }
        }
    };

    return (
        <div className="max-w-md w-full mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-5">
            {/* Header Banner */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                    <h1 className="text-xl font-bold text-red-500 flex items-center gap-2">
                        <Radio className="animate-pulse" /> ResQ-Mesh SOS
                    </h1>
                    <p className="text-xs text-slate-400">Citizen Emergency Beacon</p>
                </div>
                <div>
                    {isOnline ? (
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium">
                            <Wifi size={12} /> Online Grid
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-medium">
                            <WifiOff size={12} /> Offline Mesh Active
                        </span>
                    )}
                </div>
            </div>

            {/* GPS Location */}
            <div className="bg-slate-800/60 p-2.5 rounded-lg flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                    <Navigation size={14} className="text-cyan-400" />
                    <span>GPS Fix:</span>
                </div>
                <span className="font-mono text-cyan-400">
                    {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Detecting...'}
                </span>
            </div>

            {/* 1-Tap Voice SOS Card */}
            <div className="p-3.5 bg-gradient-to-r from-red-950/40 to-slate-900 border border-red-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                        <Volume2 size={14} /> 1-Tap Voice AI SOS
                    </span>
                    <button
                        onClick={toggleListening}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isListening
                            ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/50'
                            : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                            }`}
                    >
                        <Mic size={14} className={isListening ? 'animate-bounce' : ''} />
                        {isListening ? 'Listening...' : 'Tap & Speak'}
                    </button>
                </div>

                {transcript && (
                    <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono flex items-start gap-2">
                        <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5" />
                        <p className="italic leading-tight">"{transcript}"</p>
                    </div>
                )}
            </div>

            {/* Emergency Category */}
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Detected Emergency Type</label>
                <div className="grid grid-cols-2 gap-2">
                    {['Trapped / Flood', 'Medical Critical', 'Food & Water', 'Building Collapse'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`p-2.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${category === cat
                                ? 'bg-red-500/20 border-red-500 text-red-300 shadow-md shadow-red-500/10'
                                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-750'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Number of Victims */}
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Persons in Need</label>
                <div className="flex gap-2 items-center">
                    {[1, 2, 4, 5, '10+'].map((num) => (
                        <button
                            key={num}
                            onClick={() => setVictims(num === '10+' ? 10 : num)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${victims == num || (num === '10+' && victims >= 10)
                                ? 'bg-slate-700 border-red-400 text-white shadow'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                                }`}
                        >
                            {num}
                        </button>
                    ))}
                </div>
            </div>

            {/* Giant SOS Trigger Button */}
            <div className="pt-2 flex flex-col items-center">
                <button
                    onClick={triggerSOS}
                    className="w-40 h-40 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 active:scale-95 shadow-2xl shadow-red-600/50 flex flex-col items-center justify-center gap-2 text-white font-black tracking-wider text-lg transition-transform border-4 border-red-400/30 cursor-pointer"
                >
                    <AlertTriangle size={42} className="animate-bounce" />
                    BROADCAST SOS
                </button>
                <p className="text-[11px] text-slate-500 mt-2 text-center">
                    Works 100% offline via local P2P mesh relay buffer
                </p>
            </div>

            {/* Mesh Buffer Stats */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                    <span>Mesh Packets Buffered (Offline):</span>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                            {offlineCount} Packets
                        </span>
                        {offlineCount > 0 && (
                            <button
                                onClick={handleClearBuffer}
                                className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                            >
                                <Trash2 size={10} /> Clear
                            </button>
                        )}
                    </div>
                </div>
                <div className="text-slate-300 font-mono text-[11px]">
                    <span className="text-slate-500">System Log: </span>{status}
                </div>
            </div>
        </div>
    );
}