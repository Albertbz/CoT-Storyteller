const { bridge_url, bridge_api_key } = require('../configs/config.json');

const BASE_URL = (bridge_url ?? '').replace(/\/$/, '');
const TIMEOUT_MS = 8000;

/**
 * Build headers common to every request.
 */
function buildHeaders(extra = {}) {
    return {
        ...(bridge_api_key ? { 'X-Api-Key': bridge_api_key } : {}),
        ...extra,
    };
}

/**
 * Fetch with a timeout (Node 18+ has native fetch; falls back to node-fetch if needed).
 */
async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        const json = await res.json();
        if (!res.ok) {
            throw new Error(json?.error ?? `HTTP ${res.status}`);
        }
        return json;
    } catch (err) {
        if (err.name === 'AbortError') throw new Error('Bridge request timed out.');
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * GET  /endpoint  → parsed JSON
 */
async function bridgeGet(endpoint) {
    return fetchWithTimeout(`${BASE_URL}${endpoint}`, {
        headers: buildHeaders(),
    });
}

/**
 * POST /endpoint  body: object → parsed JSON
 */
async function bridgePost(endpoint, body = {}) {
    return fetchWithTimeout(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: buildHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
    });
}

function handleWebhookData(body) {
    const { type, data } = JSON.parse(body);

    if (type === 'date') {
        require('node:fs').writeFileSync('./vs-date-cache.json', JSON.stringify({ ...data, cachedAt: new Date().toISOString() }, null, 2));
        console.log(`[StorytellerBridge] Day cached → ${data.dateFormatted}`);
    }

    if (type === 'death') {
        const channel = client.channels.cache.get(require('./configs/config.json').death_channel_id);
        if (channel) channel.send(`💀 **${data.player}** died — cause: ${data.cause}${data.source ? ` (${data.source})` : ''}`);
        console.log(`[StorytellerBridge] Death: ${data.player}`);
    }
}


module.exports = { bridgeGet, bridgePost, handleWebhookData };
