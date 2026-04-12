/**
 * AutoAppli Background Service Worker
 *
 * Handles:
 * - API communication with the AutoAppli backend
 * - Storing/retrieving settings (API URL, auth token)
 * - Badge updates when a job is detected
 */

// ── Settings ───────────────────────────────────────────────────────────

async function getSettings() {
  const result = await chrome.storage.local.get(["apiUrl", "authToken"]);
  return {
    apiUrl: result.apiUrl || "",
    authToken: result.authToken || "",
  };
}

async function saveSettings(settings) {
  await chrome.storage.local.set(settings);
}

// ── API calls ──────────────────────────────────────────────────────────

async function saveJobToApi(jobData) {
  const { apiUrl, authToken } = await getSettings();

  if (!apiUrl) {
    return { ok: false, error: "API URL not configured. Open extension settings." };
  }

  const endpoint = `${apiUrl.replace(/\/+$/, "")}/api/v1/jobs`;

  const body = {
    company: jobData.company || "Unknown",
    title: jobData.title || "Untitled Position",
    url: jobData.url || null,
    description: jobData.description || null,
    source: `extension-${jobData.source || "unknown"}`,
  };

  try {
    const headers = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const resp = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "Unknown error");
      return { ok: false, error: `API error ${resp.status}: ${text}` };
    }

    const result = await resp.json();

    if (result.duplicate) {
      return { ok: true, duplicate: true, job: result };
    }

    return { ok: true, duplicate: false, job: result };
  } catch (err) {
    return { ok: false, error: `Network error: ${err.message}` };
  }
}

// ── Message handling ───────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SAVE_JOB") {
    saveJobToApi(msg.data).then(sendResponse);
    return true; // async
  }

  if (msg.type === "GET_SETTINGS") {
    getSettings().then(sendResponse);
    return true;
  }

  if (msg.type === "SAVE_SETTINGS") {
    saveSettings(msg.settings).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "JOB_DETECTED") {
    // Update badge to show a job was found on this tab
    if (sender.tab?.id) {
      chrome.action.setBadgeText({ text: "✓", tabId: sender.tab.id });
      chrome.action.setBadgeBackgroundColor({ color: "#22c55e", tabId: sender.tab.id });
    }
  }
});

// Clear badge when navigating away
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    chrome.action.setBadgeText({ text: "", tabId });
  }
});
