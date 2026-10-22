# 🌸 Awaaz Map — Pink Shield & DevDiva Edition
> **"One alert, two impacts. One person's help and a city's safety."**  
> *Built with ❤️ for DevDiva Jam 2026 by Team Pixie Bytes*

---

## 🌟 Overview
**Awaaz Map** is a privacy-first, on-device audio AI women safety progressive web application and live city safety heatmap. 

It eliminates the traditional "panic button" barrier:
1. **Listens for distress cries** (screams, shouts, yells) on-device using Web Audio formant analysis (700–3800 Hz) with zero audio uploaded.
2. **5-Second Red Alert Countdown** with vibration & siren to prevent false alarms.
3. **Multi-Channel Dispatch** via pre-filled WhatsApp live location, native SMS, and cloud webhooks.
4. **Anonymous 100m City Heatmap** to help police patrolling and municipal authorities identify dark spots.

---

## 🎀 Pink Shield Edition — Feature Highlights

### 🌸 Girlish Glow UI
- Modern, empowering aesthetic with soft blush pinks, vibrant roses, frosted glassmorphism, and cute micro-interactions.
- Instant toggle button (`🌸 Glow` / `🌙 Navy`) to switch themes on the fly.

### 🔢 Stealth / Camouflage Calculator
- Conceals the safety app behind a 100% working calculator.
- Entering secret emergency PIN (`911=` or `000=`) triggers silent emergency dispatch.

### 🕶️ AMOLED Blackout Screen
- Complete black screen with a tiny pulsing heartbeat dot.
- Screen appears locked or powered off while background microphone listening and GPS tracking continue uninterrupted.

### 📞 Fake Incoming Call ("Bahaana Call")
- Simulates an authentic full-screen incoming phone call from "Papa ❤️", "Mom 🌸", or "Bhaiya 🚗" with custom ringtone and vibration.
- Answering plays real Hindi speech dialog to help women safely exit uncomfortable or threatening interactions without confrontation.

### 📳 Shake-to-SOS (DeviceMotion API)
- 3 rapid phone shakes in a pocket or hand automatically trigger the emergency countdown without needing to look at or touch the screen.

### 🎙️ Voice Code-Word Trigger (Web Speech API) & Live Testing Studio
- Continuous hands-free listening for distress phrases (*"Bachao"*, *"Help"*, *"Police"*, *"Save Me"*, *"Chhod Mujhe"*).
- **Built-in Testing Studio:** Real-time VU meter, formant matching, live speech transcript, and pre-recorded distress audio clips (Shrill Scream, "Bachao" shout, dissonance harmonics) to test speaker and voice triggers without simulation.

### 📶 100% Offline Resilience (Zero-Data Mode)
- Full PWA Service Worker caching (`sw.js`) allowing the app to launch and run in Airplane Mode.
- Runs Web Audio DSP entirely in local device RAM and receives direct orbit signals via hardware GNSS GPS.
- **GSM Cellular Fallback:** If internet is disconnected, alerts automatically route to Cellular SIM SMS and 112 Speed Dial with zero data required.

### ⚡ Why Awaaz vs. Traditional Phone SOS
- Eliminates the fatal physical barrier of traditional SOS (pressing power button 5 times) with **hands-free passive audio AI**.
- Proactive escapes ("Bahaana" Fake Call, Stealth Calculator PIN `911=`, AMOLED Blackout) prevent assault before escalation.
- Traverses beyond private text threads by feeding an anonymous 100m City Heatmap.

### 🚀 Zero-Touch Dispatch Hub
- Solves browser-sandbox WhatsApp restrictions via automated Cloud Bot (0-clicks) and Native Carrier SMS.

### 🚶‍♀️ "Walk With Me" Journey Escort & Battery Guardian
- Set a walking timer (e.g., 20 mins from metro to home). If user doesn't check in safely, SOS auto-dispatches.
- **Battery Dead-Drop:** Automatically alerts the Safety Circle if battery falls below 15% outside the Safe Home Radius.

### 🛡️ Safe Havens & Refuge Locator
- Live map layer showing nearby 24/7 Pharmacies, Pink Police Booths, CISF Metro Stations, and Verified Staffed Fuel Stations with 1-tap walking directions.

### 🏛️ Municipal Grievance Letter Generator ("Pink Streets Audit")
- Auto-drafts formal civic complaint letters addressed to Municipal Commissioners (MCD/PWD) citing exact GPS dark spot coordinates and NCRB 2023 safety data.

---

## 🚀 Live Demo & Installation

### Option 1: Open in Browser
Simply open `index.html` in Google Chrome, Microsoft Edge, or Safari on your phone or PC.

### Option 2: Install as PWA (Mobile App)
Tap the **"📲 Install App"** button at the top to add Awaaz Map to your Android or iOS home screen like a native app.

---

## 🛠️ Tech Stack
- **Frontend:** Pure HTML5, CSS3, Modern ES6+ JavaScript (Zero external build tool dependencies).
- **Audio AI & Signal Processing:** Web Audio API (`AnalyserNode`, FFT band energy formant analysis).
- **Sensors:** Geolocation API, DeviceMotionEvent, Battery Status API, Web Speech API, WakeLock API.
- **Mapping & Visualizations:** Leaflet.js, Leaflet-heat, Chart.js.
- **Database & Sync:** LocalStorage, IndexedDB, Firebase Realtime Database (optional live sync).

---

## 📄 License & Attribution
Designed & developed for **DevDiva Jam 2026** by **Team Pixie Bytes**.  
Citations include NCRB Crime in India (2023), INTACH-Jagori Women Safety Audits, and NFHS-5 research.
