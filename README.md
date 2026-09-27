# Fluxera

<p align="center">
  <strong>Every connection. One faster download.</strong><br/>
  <em>Turn multiple physical internet connections into one intelligent, accelerated download experience.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-34.x-27C7A5?style=flat-square&logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/React-19.x-27C7A5?style=flat-square&logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.x-27C7A5?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/TailwindCSS-v4-27C7A5?style=flat-square&logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="MIT License">
</p>

---

## 1. Overview

Normally, your operating system routes all network traffic through a single default route (e.g., your primary Wi-Fi or Ethernet adapter), even when multiple physical network connections are plugged in and active simultaneously.

**Fluxera** solves this problem at the application layer without requiring VPNs, packet-bonding proxies, or root-level network drivers. By combining:
1. **HTTP Byte-Range Requests** (`Range: bytes=X-Y`),
2. **Local Socket Source Binding** (`localAddress` socket binding per interface),
3. **Dynamic Work-Stealing Queues**, and
4. **Tail-Racing Optimization**,

Fluxera concurrently downloads independent parts of the same file across Wi-Fi, Ethernet, USB tethering, and cellular dongles, writing data directly to final byte positions in a unified destination staging file.

```text
                    ┌── Wi-Fi (e.g. 30 MB/s)
                    │
                    ├── Ethernet (e.g. 50 MB/s)
FILE ──→ SPLIT ─────┼── USB Tethered Phone (e.g. 25 MB/s)
                    │
                    └── Cellular Dongle (e.g. 15 MB/s)
                          │
                          ▼
                  PARALLEL DOWNLOAD
                          │
                          ▼
                     FINAL FILE
```

> **Note**: Fluxera aggregates bandwidth when the remote server and physical networks allow it. Actual aggregate throughput depends on remote server bandwidth caps, ISP routing, connection limits, and network quality.

---

## 2. Key Architecture & Features

### System Architecture
```text
Electron Main Process
        │
        ├── Download Engine
        │     ├── URL Prober (HTTP 206 vs 200 detection, redirect follower)
        │     ├── Chunk Partition Engine (1 MB – 8 MB atomic units)
        │     ├── Dynamic Work-Stealing Queue
        │     ├── Multi-Interface Socket Binder (`localAddress`)
        │     ├── Tail Racing Engine (Duplicate backup streams for slow final chunks)
        │     └── Safe Resume & Validator Engine (ETag & Last-Modified integrity)
        │
        ├── Network Interface Manager
        │     ├── Platform-specific hardware discovery (Windows, macOS, Linux)
        │     ├── Local socket reachability & latency probing
        │     └── Live per-interface telemetry aggregation
        │
        ├── File Storage Manager
        │     ├── Direct byte offset writing (`fs.promises.open`, `write(buf, offset)`)
        │     ├── Destination staging file (`filename.plexo`)
        │     └── Conflict-free final rename (`file (1).iso`)
        │
        └── Notification & Power Management
              ├── Electron PowerSaveBlocker (sleep inhibition during active downloads)
              └── Native OS Desktop Notifications
                 │
                 ▼
          Preload Script (Safe Context Bridge via window.fluxera)
                 │
                 ▼
          Renderer UI (React 19, Tailwind CSS v4, Zustand Store, Lucide Icons)
              ├── Live Command Monitor
              ├── Interactive 1:1 Progress Grid
              ├── Active Stream Monitor & BACKUP stream table
              ├── Multi-Series Throughput Chart
              ├── Network Center (Customization, color assignment)
              └── Diagnostic Logs & Environment Inspector
```

---

## 3. Core Engine Mechanics

### One-Byte Range Probing
Before starting a multi-interface download, Fluxera performs a 1-byte probe (`Range: bytes=0-0`), following up to 5 HTTP 3xx redirect hops. If the server honors range requests with `206 Partial Content`, Fluxera extracts:
* Total content length
* `ETag` and `Last-Modified` validators
* Suggested filename from `Content-Disposition` or URL path

If the server ignores range requests and responds with `200 OK`, Fluxera gracefully falls back to a standard single-connection streamed download instead of failing.

### Dynamic Work-Stealing
Fluxera does not statically divide files into rigid percentages (e.g. 25% per network). Instead, it maintains a single shared pending queue of 1MB–8MB atomic chunk tasks. Workers on all active interfaces continuously pull the next available chunk:
* Faster connections naturally pull and complete more chunks.
* Slower connections never bottleneck overall throughput.

### Tail Racing ("Racing the Tail")
When no pending chunks remain in the queue, a single slow connection could hold the final stage of a download hostage. Fluxera detects stalled or sluggish tail chunks and launches duplicate **BACKUP** streams on idle alternative interfaces. Whichever stream finishes first writes the data; the slower duplicate is cleanly aborted.

### Safe Resume & Relaunch Recovery
* If the app closes or crashes, download manifests stored in the application data directory restore interrupted transfers into a `RECOVERED` state.
* Before resuming, Fluxera reprobes the remote file to verify that the `ETag` and `Last-Modified` headers match. If the file has changed remotely, resumption is safely blocked to prevent file corruption.

### Direct Staging Storage (`filename.plexo`)
Fluxera creates a staging file beside the target destination. Workers write directly into their target byte offsets without buffering whole files in RAM or copying temporary fragments. Upon completion, Fluxera flushes pending writes and renames the file, automatically resolving filename conflicts with numbered naming (e.g. `file (1).zip`).

---

## 4. UI & Visual Identity

Fluxera features an original, dark-first visual identity built for developers and networking enthusiasts:
* **Dark Graphite Palette**: `#0B0D0E` background, `#111416` surface, `#252A2D` thin borders.
* **Refined Brand Teal**: `#27C7A5` active accents and metrics.
* **User-Customizable Network Colors**: Assign distinct colors to Wi-Fi, Ethernet, and USB tethering (persisted).
* **Interactive 1:1 Progress Grid**: Every chunk is mapped to a square colored by its assigned network interface. Hover to reveal chunk range, assigned device, download duration, and retries.
* **Live Command Monitor**: Real-time throughput graph, active stream table with `BACKUP` indicators, and multi-segment bandwidth contribution summaries.

---

## 5. Supported Platforms

| Platform | Interface Discovery Mechanism | Notes |
| :--- | :--- | :--- |
| **Windows 10 / 11** | PowerShell `Get-NetAdapter` | Hardware descriptions and device names mapped. |
| **macOS 12+** | `networksetup -listallhardwareports` | Hardware ports (Wi-Fi, Ethernet, USB) detected. |
| **Linux** | `ip -o link show` + sysfs `/sys/class/net` | Interface types (wl*, eth*, usb*, rndis*) inferred. |

### macOS Android USB Tethering Setup
macOS does not natively expose Android USB tethering via RNDIS without a driver. To use Android USB tethering alongside Wi-Fi or Ethernet on macOS:
```bash
brew install XiaoMiku01/tap/tetherkit
```
1. Connect your Android phone via USB and enable USB Tethering in Settings.
2. Ensure TetherKit is running to bridge the RNDIS device.
3. Open Fluxera and click **Refresh Interfaces** in the Network Center.

### Windows Multi-Homing Notes
Certain Windows group policies or laptop power configurations disable Wi-Fi when Ethernet connects. If needed, configure Windows Connection Manager policy via `gpedit.msc` to allow simultaneous connections to non-domain networks.

---

## 6. Installation & Development

### Prerequisites
* Node.js `22.12.0+` (`Node 26+` tested)
* npm `10.0+`

### Setup
```bash
git clone https://github.com/your-username/fluxera.git
cd fluxera
npm install
```

### Running Locally
```bash
npm run dev
```

---

## 7. Testing

Fluxera uses Playwright for comprehensive Electron end-to-end testing with built-in HTTP range response test fixtures.

```bash
# Run smoke tests
npm run test:e2e:smoke

# Run full E2E test suite
npm run test:e2e
```

---

## 8. Building & Packaging

Create production binaries using electron-builder:

```bash
# Unpacked local directory build
npm run build:unpack

# Linux AppImage & tar.gz
npm run build:linux

# macOS DMG & ZIP
npm run build:mac

# Windows NSIS installer
npm run build:win
```

---

## 9. License

Fluxera is licensed under the [MIT License](LICENSE).
