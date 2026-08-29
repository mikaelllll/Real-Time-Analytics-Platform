# Frontend dashboard

The frontend uses React 19 and strict TypeScript, built by Vite and served by Nginx. Nginx serves the SPA and proxies API, OpenAPI, and WebSocket traffic to FastAPI, keeping the browser on one origin in Codespaces.

The interface provides immediate operational feedback: connection state, provider health, collection freshness, tracked and airborne counts, country distribution, average speed, ingestion rate, provider latency, and real positions on an OpenStreetMap-backed Leaflet map. Responsive layouts support desktop and narrow screens.

The UI explicitly distinguishes starting, healthy, degraded, and reconnecting conditions. This prevents stale information from appearing current when either OpenSky or the local pipeline is unavailable.

All coordinate-bearing aircraft returned by OpenSky are rendered; there is no artificial display cap. Leaflet's canvas renderer handles the markers without creating an SVG element for every aircraft. The dashboard separately reports the total provider records and the number with valid coordinates, making coverage visible rather than implying that every received state can be mapped.
