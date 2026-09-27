# Contributing to Fluxera

Thank you for your interest in contributing to **Fluxera** (*Every connection. One faster download.*).

Fluxera is an open-source, multi-interface concurrent download manager built on Electron, React 19, TypeScript, and Tailwind CSS v4.

---

## 1. Development Prerequisites

* **Node.js**: `v22.12.0` or higher (`v26+` supported)
* **npm**: `v10.0+`
* **Operating Systems Supported**: Linux, macOS 12+, Windows 10/11
* **Platform Dependencies**:
  * Windows: PowerShell (for `Get-NetAdapter`)
  * macOS: `networksetup` (pre-installed)
  * Linux: `iproute2` (`ip -o link show`) and standard Linux networking utilities

---

## 2. Getting Started

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/fluxera.git
cd fluxera
npm install
```

Start the application in development mode with hot-reloading:

```bash
npm run dev
```

---

## 3. Project Architecture

The codebase enforces strict separation of concerns:

```text
Electron Main Process
        │
        ├── Download Engine (Chunking, Dynamic Work-Stealing, Tail Racing)
        ├── Network Interface Manager (Hardware Discovery, Latency Probing)
        ├── File System Manager (Direct Offset Writing, Space Check)
        ├── Notification Manager (Native Desktop Alerts)
        └── Platform Integration (PowerSaveBlocker, Shell)
                 │
                 ▼
          Preload Script (Safe Context Bridge via window.fluxera)
                 │
                 ▼
          Renderer Process (React 19, Tailwind CSS v4, Zustand Store)
```

### Key Engineering Rules:
1. **No Simulated/Fake Networking**: All telemetry, chunk status, throughput rates, and interface lists must come from real socket measurements and real operating system network adapter calls.
2. **Context Isolation**: Never enable `nodeIntegration: true` or expose raw Node APIs to the renderer. All communication goes through type-safe IPC channels defined in `src/shared/types.ts`.
3. **Atomic Chunk Storage**: Data is written directly to its final byte offset in a destination staging file (`filename.plexo`). Avoid downloading chunks to temporary files and concatenating them.

---

## 4. Coding Style and Standards

* Use modern TypeScript with `strict: true`.
* Avoid `any` types; define and extend models in `src/shared/types.ts`.
* Follow React 19 functional component patterns with custom hooks and Zustand state management.
* Prefer Tailwind CSS v4 design tokens and CSS variables. Keep color schemes harmonious for both Dark mode (`#0B0D0E`) and Light mode (`#F7F8F7`).

---

## 5. Testing

We use Playwright for end-to-end Electron testing.

### Running Smoke Tests:
```bash
npm run test:e2e:smoke
```

### Running Full E2E Test Suite:
```bash
npm run test:e2e
```

The test suite includes a deterministic local HTTP server (`tests/test-server.ts`) capable of handling HTTP 206 partial content range requests, redirect loops, and server refusals.

---

## 6. Building and Packaging

### Unpacked Local Build:
```bash
npm run build:unpack
```

### Platform-Specific Installers:
* **macOS DMG & ZIP**:
  ```bash
  npm run build:mac
  ```
* **Windows NSIS Installer & Portable**:
  ```bash
  npm run build:win
  ```
* **Linux AppImage & tar.gz**:
  ```bash
  npm run build:linux
  ```

---

## 7. Platform-Specific Testing Notes

### macOS USB Tethering (RNDIS)
macOS does not natively support Android USB tethering via RNDIS without a kernel or user-space driver. To test USB tethering on macOS, install TetherKit:
```bash
brew install XiaoMiku01/tap/tetherkit
```

### Windows Multi-Homing
On some Windows installations, Windows Connection Manager might automatically disable Wi-Fi when Ethernet connects. Review `gpedit.msc` policy settings if both adapters do not remain active simultaneously.

---

## 8. Pull Request Workflow

1. Fork the repository and create a feature branch (`git checkout -b feature/my-enhancement`).
2. Verify that `npm run build` compiles without TypeScript or Rollup errors.
3. Verify that `npm run test:e2e` passes.
4. Commit your changes with clear, descriptive commit messages.
5. Push to your branch and open a Pull Request.
