const STORAGE_KEY = 'lu-khach:player-id:v1';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let sessionId: string | null = null;

/** Browser profile identity for local saves, independent of names and WebSocket sessions. */
export function getOrCreatePlayerId(): string {
    if (sessionId) return sessionId;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && UUID_PATTERN.test(saved)) {
            sessionId = saved;
            return saved;
        }
    } catch { /* Keep a session identity when browser storage is disabled. */ }

    // getRandomValues also works on LAN HTTP where randomUUID may be unavailable.
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    sessionId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    try { localStorage.setItem(STORAGE_KEY, sessionId); } catch { /* Saving is optional. */ }
    return sessionId;
}
