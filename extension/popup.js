/**
 * AutoAppli Popup Script
 *
 * Communicates with the content script to extract job data from the active tab,
 * and with the background worker to save jobs to the API.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const jobSection = document.getElementById("job-section");
  const noJobSection = document.getElementById("no-job-section");
  const statusEl = document.getElementById("status");
  const saveBtn = document.getElementById("save-btn");

  const titleEl = document.getElementById("job-title");
  const companyEl = document.getElementById("job-company");
  const locationEl = document.getElementById("job-location");
  const sourceEl = document.getElementById("job-source");
  const descPreviewEl = document.getElementById("job-desc-preview");

  const settingsToggle = document.getElementById("settings-toggle");
  const settingsPanel = document.getElementById("settings-panel");
  const apiUrlInput = document.getElementById("api-url");
  const authTokenInput = document.getElementById("auth-token");
  const saveSettingsBtn = document.getElementById("save-settings-btn");

  let extractedJob = null;

  // ── Load settings ──────────────────────────────────────────────────

  const settings = await sendBg({ type: "GET_SETTINGS" });
  if (settings) {
    apiUrlInput.value = settings.apiUrl || "";
    authTokenInput.value = settings.authToken || "";
  }

  // ── Extract job from active tab ────────────────────────────────────

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");

    const response = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_JOB" });

    if (response?.ok && response.data) {
      extractedJob = response.data;
      showJob(extractedJob);
    } else {
      showNoJob();
    }
  } catch {
    // Content script might not be injected (non-matching page)
    showNoJob();
  }

  // ── Save button ────────────────────────────────────────────────────

  saveBtn.addEventListener("click", async () => {
    if (!extractedJob) return;

    // Check settings first
    const currentSettings = await sendBg({ type: "GET_SETTINGS" });
    if (!currentSettings?.apiUrl) {
      showStatus("error", "Set your API URL in Settings below first.");
      settingsPanel.classList.remove("hidden");
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const result = await sendBg({ type: "SAVE_JOB", data: extractedJob });

    if (result?.ok) {
      if (result.duplicate) {
        saveBtn.className = "btn btn-warning";
        saveBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Already on your board`;
        showStatus("info", "This job is already saved to your board.");
      } else {
        saveBtn.className = "btn btn-success";
        saveBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Saved to Board`;
        showStatus("success", "Job saved! It's in your Bookmarked column.");
      }
    } else {
      saveBtn.disabled = false;
      saveBtn.textContent = "Retry Save";
      showStatus("error", result?.error || "Failed to save. Check your API URL.");
    }
  });

  // ── Settings ───────────────────────────────────────────────────────

  settingsToggle.addEventListener("click", () => {
    settingsPanel.classList.toggle("hidden");
  });

  saveSettingsBtn.addEventListener("click", async () => {
    const newSettings = {
      apiUrl: apiUrlInput.value.trim(),
      authToken: authTokenInput.value.trim(),
    };
    await sendBg({ type: "SAVE_SETTINGS", settings: newSettings });
    showStatus("success", "Settings saved!");
    setTimeout(() => statusEl.classList.add("hidden"), 2000);
  });

  // ── Helpers ────────────────────────────────────────────────────────

  function showJob(job) {
    titleEl.textContent = job.title || "Untitled Position";
    companyEl.textContent = job.company || "Unknown Company";
    locationEl.textContent = job.location || "";
    sourceEl.textContent = job.source || "web";

    if (job.description) {
      descPreviewEl.textContent = job.description.substring(0, 200) + "...";
    } else {
      descPreviewEl.textContent = "No description extracted.";
    }

    jobSection.classList.remove("hidden");
    noJobSection.classList.add("hidden");
  }

  function showNoJob() {
    jobSection.classList.add("hidden");
    noJobSection.classList.remove("hidden");
  }

  function showStatus(type, message) {
    statusEl.textContent = message;
    statusEl.className = `status status-${type}`;
    statusEl.classList.remove("hidden");
  }

  function sendBg(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (resp) => {
        resolve(resp);
      });
    });
  }
});
