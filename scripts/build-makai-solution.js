const fs = require('fs');
const path = require('path');

const img1Path = path.join(__dirname, '..', 'architectural-approach-diagram.jpg');
const img2Path = path.join(__dirname, '..', 'nextjs-app-shell.png');

const img1Base64 = fs.readFileSync(img1Path).toString('base64');
const img2Base64 = fs.readFileSync(img2Path).toString('base64');

const content = `<style>
@page {
  margin: 14mm 15mm 16mm 15mm;
  @bottom-left {
    content: "Renée Paternesi";
    font-size: 8.5pt;
    color: #475569;
    font-weight: 600;
    font-family: system-ui, -apple-system, sans-serif;
    border-top: 1px solid #e2e8f0;
    padding-top: 4px;
    vertical-align: top;
  }
  @bottom-right {
    content: counter(page) " / " counter(pages);
    font-size: 8.5pt;
    color: #64748b;
    font-family: system-ui, -apple-system, sans-serif;
    text-align: right;
    border-top: 1px solid #e2e8f0;
    padding-top: 4px;
    vertical-align: top;
  }
}
@media print {
  .footer-signature {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    border-top: 1px solid #e2e8f0;
    padding-top: 4px;
    display: flex;
    justify-content: space-between;
    font-size: 8.5pt;
    color: #64748b;
    font-family: system-ui, -apple-system, sans-serif;
  }
}
h1 {
  font-size: 18pt !important;
  font-weight: 800 !important;
  margin-top: 0 !important;
  margin-bottom: 8px !important;
  line-height: 1.25 !important;
  color: #0f172a !important;
}
h2 {
  font-size: 13pt !important;
  font-weight: 700 !important;
  margin-top: 14px !important;
  margin-bottom: 4px !important;
  color: #1e293b !important;
}
h3 {
  font-size: 11pt !important;
  font-weight: 700 !important;
  margin-top: 10px !important;
  margin-bottom: 3px !important;
  color: #334155 !important;
}
p, li {
  font-size: 10pt;
  line-height: 1.5;
  color: #334155;
}
ul, ol {
  margin-top: 3px;
  margin-bottom: 6px;
  padding-left: 18px;
}
li {
  margin-bottom: 3px;
}
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9pt;
  background-color: #f1f5f9;
  padding: 1px 4px;
  border-radius: 3px;
  color: #0f172a;
}
img {
  display: block;
  margin: 6px auto;
  max-width: 100%;
  height: auto;
}
</style>

# Async Technical Exercise: Frontend Architecture

This document outlines the frontend architecture for an operations application where analysts review, correct, and approve AI-extracted document data throughout 8-hour shifts. When people spend full days reviewing dense forms, small UI delays compound into serious fatigue. The architectural focus is on responsive interactions, fluid document navigation, and local-first persistence that protects work against network interruptions, unexpected tab closures, and version conflicts.

## 1. High-Level Frontend Architecture

The architecture is built on four core decisions:

1. **Authenticated Shell & SPA Workspace (Next.js):** Next.js delivers the secure application shell, fast initial page loads, and authenticated routing between the review queue (\`/queue\`) and workspace (\`/review/:id\`). Once loaded, the review screen runs as an interactive SPA where advancing to the next document transitions immediately in client memory without full-page reloads, preserving zoom and UI focus.
2. **Three-Layer State Model:**
   - **Client-Side Data Cache (In-Memory):** Caches queue results, search filters, and metadata locally so returning to previous views requires no unnecessary network roundtrips.
   - **Active Session State (Client-Side):** Manages high-frequency UI interactions (active field, zoom/pan position, visual highlight coordinates) using an external store with selector subscriptions to isolate re-renders.
   - **Local Browser Storage (IndexedDB):** Edits are saved locally before network dispatch to protect work against network drops and accidental tab closures.
3. **Separating Document Canvas from Highlights:** The PDF/image is rendered as a static background layer on an HTML5 Canvas, with a transparent SVG layer directly on top for highlight boxes. Highlighting or hovering over a field updates a simple SVG rectangle with CSS, without repainting the heavy PDF.
4. **Hybrid REST & Real-Time Sync:** Standard REST endpoints for document fetching and batched saves; lightweight Server-Sent Events (SSE) for real-time queue updates and document lock notifications.

## 2. Component Breakdown & Data Flow

<div align="center" style="margin: 6px 0;">
  <img src="data:image/png;base64,${img2Base64}" alt="Next.js App Shell Architecture" style="width: 100%; max-width: 820px;" />
</div>

### Review Queue ( \`/queue\` )
- **What it does:** Allows analysts to quickly search, filter, and sort through thousands of pending documents.
- **How it works:** The server handles cursor-based pagination and search, returning one page at a time while the client caches results. A live event channel updates document statuses in place without jumping rows under the cursor. Filter settings mirror in the URL (\`?status=pending&type=invoice\`) for shareable bookmarks.
- **Why:** Keeps memory consumption flat and scrolling smooth regardless of queue size.

### Document Viewport ( \`/review/:id\` - Left Pane )
- **What it does:** Displays multi-page documents (PDF/scanned images) with 2D zoom and pan to magnify fine print and center bounding boxes.
- **How it works:** The base canvas renders pages using standard client-side PDF rendering (unmounting off-screen pages in 10+ page contracts to save memory). A transparent SVG layer sits directly on top, rendering highlight boxes. Zooming and panning stay smooth during interaction. Once zooming stops, the document is redrawn sharp at the new size so fine scanned print remains clear and readable.
- **Why:** Decoupling the document image from highlight boxes enables instant hover/select states without expensive canvas redraws.

### Field Extraction Editor ( \`/review/:id\` - Right Pane )
- **What it does:** Displays 10 to 200 AI-extracted fields in a vertical form list (single-line dates/amounts to multi-line contract clauses).
- **Visual State Model:** Each field and bounding box reflects one of four clear visual states:
  1. *Unreviewed (Default):* Neutral gray border indicating raw AI data awaiting verification.
  2. *Active (Focused):* High-contrast blue border with synchronized document canvas highlight.
  3. *Confirmed / Corrected:* Subtle green border with a checkmark badge once verified.
  4. *Needs Attention (Low Confidence / Format Error):* Amber border with a warning badge and text tag (*Low Confidence* or *Invalid Format*).
- **Why:** Delivers immediate visual clarity across 200 fields. We deliberately keep all fields in the DOM with memoized components rather than virtualizing them: 200 fields is lightweight, and keeping them on the page preserves native browser \`Ctrl+F\` search, screen readers, and predictable keyboard focus.

### Keyboard Navigation & On-Screen Actions
- **What it does:** Provides mouse-free keyboard ergonomics for power users paired with accessible on-screen buttons for all core workflows.
- **How it works:** A centralized listener captures commands (\`Tab\` and \`Shift+Tab\` to navigate fields, \`Enter\` to confirm single-line fields, \`Ctrl+Enter\` to confirm multi-line textareas, \`Ctrl+Shift+Enter\` to approve the document, and arrow keys when the document viewer has focus). Visible buttons mirror these actions.
- **Why:** Maximizes daily analyst speed while ensuring full accessibility and discoverability.

### Sync Manager & Persistence Engine
- **What it does:** Manages saving, offline buffering, background prefetching, and network synchronization.
- **How it works:** Field changes write immediately to browser IndexedDB as local draft entries, which a background sync batches and flushes to the server (\`PATCH /api/documents/:id/fields\`). As the analyst approaches completion of the document (reaching high review progress), the engine requests the server to reserve and pre-fetch the next assigned document in the background, ensuring instant transitions without duplicate assignments.
- **Why:** Protects against Wi-Fi drops or closed laptops while eliminating waiting time between consecutive reviews.

## 3. The Three Hardest Problems & Architectural Solutions

### Problem 1: Smooth Bidirectional Coordinate Sync with 200+ Fields
- **The Challenge:** Selecting a field must jump and center the document box; clicking a box must select and scroll to that field in the list. Doing this smoothly across multi-page documents under zoom/pan easily causes stutter if not architected carefully.
- **Approach:**
  1. *Normalized Percentage Coordinates (0.0 to 1.0):* Coordinates are stored as percentages relative to page width and height (\`x, y, width, height\`). This ensures bounding boxes stay perfectly aligned across all monitor resolutions and zoom levels: \`Screen Position = (Percentage × Page Dimension × Zoom) + Pan Offset\`.
  2. *Hardware-Accelerated CSS Transforms:* Moving and zooming uses \`translate3d\` and \`scale\` on the viewport container without expensive canvas redraws during movement.
  3. *Fast In-Memory Click Detection:* Clicking the document converts the click position into page percentage coordinates to identify the selected box directly in memory without querying the DOM.
  4. *Coordinated Smooth Scrolling:* Selecting a field animates the viewport to center the box while auto-scrolling the form list to keep the field in view.

### Problem 2: Multi-Analyst Concurrency & Preventing Lost Work
- **The Challenge:** Prevent concurrent editing conflicts across analysts while protecting uncommitted work against network drops and browser interruptions.
- **Approach:**

<div align="center" style="margin: 8px 0;">
  <img src="data:image/jpeg;base64,${img1Base64}" alt="Architectural Approach Flow" style="width: 100%; max-width: 780px;" />
</div>

  1. *Temporary Locks with Heartbeats:* When an analyst opens a document, the client acquires a short-lived lease with an expiration time. A periodic background HTTP request (\`POST /api/documents/:id/heartbeat\`) renews the lease while active. If the tab closes or connection drops, the lease expires on the backend so colleagues are never locked out.
  2. *Saving Locally Before Network Requests:* Every edit is immediately saved locally in IndexedDB before being sent to the server. The UI updates optimistically with immediate visual response.
  3. *Graceful Offline & Conflict Resolution:* When disconnected, a prominent offline indicator warns the analyst that real-time lock renewal is paused. Work continues locally. Upon reconnect, the client validates the document lock before flushing pending edits. If the lease expired during extended downtime and another analyst is currently editing or has modified the document, the server returns \`409 Conflict\`. Rather than losing work or overwriting active edits, the client preserves local drafts and displays a side-by-side resolution panel (*Your Local Draft* vs *Current Server Value*) so the analyst can decide without data loss.
  4. *Background & Multi-Tab Safety:* If an analyst switches tabs, the lock refreshes automatically upon returning. If the same document is opened in a second tab, the new tab defaults to read-only mode with an option to take over editing, preventing duplicate saves from the same browser.

### Problem 3: Fast Keyboard Ergonomics & WCAG 2.1 AA Compliance
- **The Challenge:** Processing thousands of daily data points requires mouse-free speed while complying fully with WCAG 2.1 AA accessibility standards.
- **Approach:**
  1. *Keyboard-First Workflow & Document Lifecycle:* Sensible defaults are provided out of the box with custom shortcut mapping available in settings: \`Tab\` and \`Shift+Tab\` navigate focus between fields without altering review state, while field confirmation is always an explicit action (\`Enter\` for single-line inputs, \`Ctrl+Enter\` for multi-line textareas, or a visible checkmark button). This ensures analysts never mark unread fields as verified by simply navigating past them. Submitting (\`Ctrl+Shift+Enter\`) or Rejecting a document flushes all pending edits first and provides a brief undo window to prevent accidental actions. Single-key shortcuts only act when the document viewer has explicit focus to prevent intercepting form typing.
  2. *Isolated Form Inputs:* Each input manages local state with selector subscriptions; editing field #120 only updates that component, eliminating form-wide re-render lag.
  3. *Accessibility & Screen Reader Support:* Opening a document automatically places initial focus on the first actionable field, while the document viewer has its own keyboard-accessible focus ring. Form fields link AI confidence and validation messages via \`aria-describedby\`, system status changes are announced politely (via \`aria-live="polite"\`) without interrupting typing, and all visual elements satisfy standard contrast ratios.

## 4. Key Assumptions & Engineering Strategy

1. **Backend Contract Assumptions:**
   - *Lease & Versioning:* The server validates document lock tokens on writes and returns HTTP 409 if a conflict occurs.
   - *Queue & Real-time Sync:* The server handles filtering and pagination for large document lists, broadcasts live lock status changes, and returns missed updates upon client reconnection.
   - *AI Metadata:* The backend provides normalized coordinates (\`[0.0, 1.0]\`), page numbers, confidence scores (\`0.00 - 1.00\`), and field validation schemas.
2. **Usage & Session Safety:**
   - *Document Volume & Scale:* Documents are typically 1–10 page PDFs or scans processed by teams of concurrent analysts. Modern desktop browsers are used for comfortable side-by-side review.
   - *Data Privacy & Session Safety:* Unsaved local drafts prompt for confirmation before an intentional logout to prevent accidental data loss; automatic session expiration securely preserves drafts on the device until re-authentication by the same user.
3. **Engineering Tradeoffs (Alternatives Considered):**
   - *Exclusive Locks vs. Multi-User Collaborative Editing:* Document review workflows assign one analyst per task. Exclusive locks with heartbeats prevent overlapping edits reliably, avoiding the unnecessary complexity of real-time collaborative editing engines.
   - *Server-Sent Events vs. WebSockets:* Document workflows only require one-way server broadcasts (lock status and queue updates). SSE operates over standard HTTP with built-in reconnection, eliminating the infrastructure complexity of stateful WebSockets.
   - *Native DOM vs. List Virtualization:* Rendering 200 form fields is lightweight for modern browsers. Keeping all fields in the DOM preserves native in-page search (\`Ctrl+F\`), screen reader document outlines, and smooth keyboard tabbing without focus jumps.
`;

const targetPath = path.join(__dirname, '..', 'Makai_Labs_Technical_Exercise_Solution.md');
fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully wrote updated 5-page Makai_Labs_Technical_Exercise_Solution.md');
