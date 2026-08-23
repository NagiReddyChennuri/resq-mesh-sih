# 🚨 ResQ-Mesh: AI & Offline-First Disaster Emergency Grid

> **Smart India Hackathon (SIH 2026) Prototype**  
> *An offline-resilient, voice-triaged emergency communication and tactical disaster response grid.*

---

## 🌟 Key Highlights & Innovations

- 🎙️ **1-Tap Voice AI SOS:** Transcribes spoken emergency descriptions in real-time, auto-extracts victim counts and hazard categories via browser Speech-to-Text & NLP entity parsing.
- 📶 **Zero-Internet Mesh Buffer:** Built on client-side IndexedDB. When mobile towers collapse, SOS signals are safely buffered locally and automatically sync to the grid when connectivity is restored.
- 🛰️ **NDRF Integrated Tactical GIS Map:** Live dark-mode map powered by Leaflet & CARTO tiles with real-time hazard radiuses, telemetry status, and instant fleet dispatch lifecycle.
- ⚡ **Real-Time Telemetry:** High-throughput asynchronous FastAPI backend streaming instant alerts to command centers via WebSockets.

---

## 🏗️ System Architecture
[ Citizen Smartphone ] │ (Voice / Manual SOS Trigger) ▼ [ IndexedDB Mesh Buffer ] (Offline Resilience) │ (Syncs when connected) ▼ [ FastAPI Async Engine ] ────► [ WebSocket Broadcast ] │ │ ▼ ▼ [ AI Triage & Confidence ] [ NDRF Live GIS Map ]

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React, Vite, Tailwind CSS v4, Lucide Icons, Leaflet / React-Leaflet |
| **Storage & Mesh** | IndexedDB (`idb`), Service Workers, Web Speech Recognition API |
| **Backend API** | Python 3.10+, FastAPI, Uvicorn, Pydantic, WebSockets |
| **Mapping & GIS** | CARTO Dark Raster Tiles, Leaflet DivIcons, Geo-Radiuses |

---

## 🚀 Quick Start Guide

### 1. Start the Backend API:
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# Mac/Linux: source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
