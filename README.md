# Edge Gateway Control Plane

**Role:** The Central Nervous System of the Edge Gateway.
**Objective:** Orchestrate proxy node selection, health monitoring, and multi-tenant vendor routing.

## 🕸️ Architecture: Infrastructure as Data

This control plane rejects static configuration. All routing logic, security profiles, and node lists are stored in **Couchbase**. 
- **Visibility is failure.**
- **Latency is the enemy.**
- **Configuration is data.**

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v20+)
- Couchbase Server (with `edge_gateway` bucket)
- TypeScript/ts-node

### 2. Environment Configuration
The application relies on environment variables for database connectivity. 
1. Copy the example file: `cp .env.example .env`
2. Edit `.env` with your actual Couchbase credentials.

**Required Variables:**
- `CB_CONNECTION_STRING`: Your Couchbase cluster URI (e.g., `couchbase://127.0.0.1`).
- `CB_USERNAME`: Database user.
- `CB_PASSWORD`: Database password.
- `CB_BUCKET_NAME`: `edge_gateway`.
- `CB_SCOPE_NAME`: `proxy_manager`.
- `PORT`: API port (Default: `3000`).
- `MOCK_MODE`: Set to `true` to run without a real Couchbase instance (uses In-Memory mock).

### 3. Installation
```bash
npm install
```

### 4. Running the Project
The project consists of two main execution threads:

**The API Server (Launcher):**
Provides the endpoint for game launchers to request the "Best Node."
```bash
npm run dev
```

**The Watchdog Service:**
A background worker that monitors node health and updates the DB state.
```bash
npm run watchdog
```

---

## 🛡️ API Documentation

### POST `/launcher/select-node`
Selects the lowest-latency active node for a specific vendor.

**Request Body:**
```json
{
  "vendor_id": "your_vendor_id",
  "api_key": "your_api_key"
}
```

**Success Response (200 OK):**
```json
{
  "node_ip": "1.2.3.4",
  "node_port": 8080,
  "protocol": "http",
  "session_token": "..."
}
```

---

## 🛠️ Testing
Run the robust integration test suite to verify the full stack (API + Watchdog + DB Logic):
```bash
npx ts-node test/test-runner.ts
```

## 📂 Project Structure
- `/src/api`: Fastify server and route definitions.
- `/src/workers/watchdog`: Health check logic and scheduler.
- `/src/domain/nodes`: Proxy node management logic.
- `/src/domain/vendors`: Multi-tenant vendor configuration.
- `/src/core/database`: The Couchbase Singleton (and Mock implementation).
