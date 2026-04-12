"""Application Timeline — aggregate all activity for a job into a chronological feed."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone


def make_timeline_event(
    *,
    job_id: str,
    event_type: str = "note",
    title: str = "",
    description: str = "",
    occurred_at: str | None = None,
    metadata: dict | None = None,
    user_id: str | None = None,
) -> dict:
    """Create a manual timeline event."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": f"evt-{uuid.uuid4().hex[:12]}",
        "job_id": job_id,
        "event_type": event_type,
        "title": title,
        "description": description,
        "occurred_at": occurred_at or now,
        "metadata": metadata or {},
        "created_at": now,
    }


EVENT_TYPE_LABELS = {
    "status_change": "Status Changed",
    "application_sent": "Application Sent",
    "interview_scheduled": "Interview Scheduled",
    "interview_completed": "Interview Completed",
    "outreach_sent": "Outreach Sent",
    "offer_received": "Offer Received",
    "note": "Note Added",
    "document_generated": "Document Generated",
    "contact_added": "Contact Added",
    "custom": "Custom Event",
}


def build_job_timeline(
    job: dict,
    interviews: list[dict],
    outreach: list[dict],
    contacts: list[dict],
    manual_events: list[dict],
) -> list[dict]:
    """Aggregate all activity for a job into a single chronological timeline.

    Pulls from:
    - Job status changes (created_at, applied_at, updated_at)
    - Interview notes
    - Outreach messages
    - Contacts added for this job
    - Manual events the user has added
    """
    events: list[dict] = []
    job_id = job.get("id", "")

    # Job created
    events.append({
        "id": f"evt-auto-created-{job_id}",
        "job_id": job_id,
        "event_type": "status_change",
        "title": "Job bookmarked",
        "description": f"Added {job.get('title', '')} at {job.get('company', '')} to tracker",
        "occurred_at": job.get("created_at", ""),
        "metadata": {"status": "bookmarked", "source": job.get("source", "")},
    })

    # Applied
    if job.get("applied_at"):
        events.append({
            "id": f"evt-auto-applied-{job_id}",
            "job_id": job_id,
            "event_type": "application_sent",
            "title": "Application submitted",
            "description": f"Applied for {job.get('title', '')} at {job.get('company', '')}",
            "occurred_at": job["applied_at"],
            "metadata": {"status": "applied"},
        })

    # Status changes (offer, rejected, etc.)
    status = job.get("status", "bookmarked")
    if status in ("offer", "rejected", "ghosted", "interviewing"):
        label_map = {
            "offer": "Offer received",
            "rejected": "Application rejected",
            "ghosted": "No response (ghosted)",
            "interviewing": "Moved to interviewing",
        }
        events.append({
            "id": f"evt-auto-status-{job_id}",
            "job_id": job_id,
            "event_type": "offer_received" if status == "offer" else "status_change",
            "title": label_map.get(status, f"Status: {status}"),
            "description": job.get("notes", "") or "",
            "occurred_at": job.get("updated_at", ""),
            "metadata": {"status": status},
        })

    # Interviews
    for iv in interviews:
        if iv.get("job_id") != job_id:
            continue
        etype = "interview_completed" if iv.get("status") == "completed" else "interview_scheduled"
        title = iv.get("round_name", "Interview")
        desc_parts = []
        if iv.get("interviewer_name"):
            desc_parts.append(f"with {iv['interviewer_name']}")
        if iv.get("notes"):
            desc_parts.append(iv["notes"][:200])
        events.append({
            "id": f"evt-auto-iv-{iv.get('id', '')}",
            "job_id": job_id,
            "event_type": etype,
            "title": title,
            "description": " — ".join(desc_parts) if desc_parts else "",
            "occurred_at": iv.get("scheduled_at") or iv.get("created_at", ""),
            "metadata": {"interview_id": iv.get("id"), "status": iv.get("status")},
        })

    # Outreach (if linked by company match — simple heuristic)
    company = (job.get("company") or "").lower()
    for msg in outreach:
        body_lower = (msg.get("body") or "").lower()
        if company and company in body_lower:
            events.append({
                "id": f"evt-auto-msg-{msg.get('id', '')}",
                "job_id": job_id,
                "event_type": "outreach_sent",
                "title": f"{'Thank-you' if msg.get('message_purpose') == 'thank_you' else 'Outreach'} to {msg.get('recipient_name', 'contact')}",
                "description": (msg.get("subject") or "")[:200],
                "occurred_at": msg.get("created_at", ""),
                "metadata": {"outreach_id": msg.get("id"), "type": msg.get("message_type")},
            })

    # Contacts
    for ct in contacts:
        if ct.get("job_id") != job_id:
            continue
        events.append({
            "id": f"evt-auto-ct-{ct.get('id', '')}",
            "job_id": job_id,
            "event_type": "contact_added",
            "title": f"Contact: {ct.get('name', 'Unknown')}",
            "description": f"{ct.get('role', '')} — {ct.get('relationship', '')}".strip(" — "),
            "occurred_at": ct.get("created_at", ""),
            "metadata": {"contact_id": ct.get("id")},
        })

    # Manual events
    for evt in manual_events:
        if evt.get("job_id") == job_id:
            events.append(evt)

    # Sort chronologically (newest first)
    events.sort(key=lambda e: e.get("occurred_at", ""), reverse=True)
    return events
