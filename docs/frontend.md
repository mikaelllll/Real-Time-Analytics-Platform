# Frontend dashboard

SkyStream uses React 19, strict TypeScript, Vite, Leaflet, and Nginx. Nginx serves the application and proxies API, OpenAPI, and WebSocket traffic on the same origin.

## Live Map

The default view puts the map alongside a searchable, paginated aircraft list. Search accepts callsigns and ICAO24 identifiers. Filters combine registration country, airborne/ground status, altitude, and speed; removable chips and Clear filters reset them. Numeric filters exclude unknown values. Thresholds represent the same physical quantities in metric and aviation units.

Global aircraft and airborne totals always describe the full snapshot. Matching positions describes the filtered map and list, not the full provider feed. All matching coordinate-bearing aircraft are rendered; list pagination does not cap the map.

Select a marker or list row to inspect its identifier, registration country, altitude, ground speed, and heading. Zero is a valid reading; unavailable data is labelled explicitly. Center on aircraft recentres the map, and Follow aircraft pans with new positions. Dragging stops following. Follow is paused while telemetry is stale. Selection details disappear if that aircraft no longer matches the filters or disappears from the snapshot.

Canvas circles render at world scale. At zoom level 5 and above, aircraft with heading data use directional canvas polygons. Unknown headings retain circles. A legend distinguishes airborne, grounded, and selected aircraft. A ResizeObserver keeps the map sized correctly when the details panel or viewport changes.

On narrow screens the map comes first, filters remain collapsible, and selected-aircraft details appear in a bottom sheet. The list provides a keyboard-accessible alternative to clicking map markers; controls have visible focus indicators and text labels.

## Freshness

Connection active means the WebSocket is connected; it does not guarantee fresh provider data. The interface separately reports collection age. Data is marked stale after 90 seconds, when disconnected, or when the provider reports a non-healthy state. Retained positions are labelled as last known positions. Until the first timestamped collection, summary metrics show dashes instead of misleading zeroes. No synthetic telemetry is generated.

## Analytics

Analytics loads the latest 120 recorded collections from `GET /api/v1/history?limit=120`, refreshes every 30 seconds, and provides manual refresh. Aircraft counts and provider response times use actual collection timestamps, a zero baseline, and accessible data tables. Fewer than two records displays an explanatory empty state. Failed requests preserve previously loaded charts with a visible warning.

The country chart represents the latest global snapshot; map filters do not affect this view. Registration country does not mean flight departure. History is collection-level data, not individual aircraft tracks.

## About

The About view explains collection, Kafka-compatible transport, Redis/PostgreSQL storage, WebSocket delivery, data limitations, and links to source and API documentation.

## Verification checklist

1. Open the dashboard before telemetry arrives: metrics show dashes and the map explains the waiting state.
2. Search an existing callsign or ICAO24 ID: map and list agree; clear the search to restore results.
3. Combine country, status, altitude, and speed filters: remove individual chips, then clear all filters.
4. Select an aircraft: details agree with the row; zero altitude or speed remains zero.
5. Change units: altitude and speed convert; the physical filter boundaries remain unchanged.
6. Center and follow an aircraft; drag the map to stop following. Zoom in to see headings.
7. Disconnect telemetry or use an old snapshot: retained data is labelled stale and Follow is disabled.
8. Open Analytics: counts and latency come from recorded collections, and the data tables match the plots. Retry a failed history request.
9. At phone width, verify there is no horizontal overflow and close the aircraft bottom sheet.
10. Navigate controls with the keyboard and inspect aircraft using the list.
