"""
WGF SenseOS — Real Edge Agent Ingestion Client
Sends CSI frame batches and heartbeats to the WGF SenseOS server.
"""

import time
import uuid
import json
import threading
import requests
from typing import Optional


class IngestionClient:
    def __init__(self, server_url: str, agent_id: str, org_id: str,
                 site_id: str, sensor_id: str,
                 max_retries: int = 3, retry_delay_ms: int = 1000):
        self.server_url = server_url.rstrip("/")
        self.agent_id = agent_id
        self.org_id = org_id
        self.site_id = site_id
        self.sensor_id = sensor_id
        self.max_retries = max_retries
        self.retry_delay_ms = retry_delay_ms
        self._session = requests.Session()
        self._session.headers.update({
            "Content-Type": "application/json",
            "X-Agent-Id": agent_id,
        })
        self.sent_batches = 0
        self.sent_heartbeats = 0
        self.errors = 0

    def send_batch(self, frames: list) -> Optional[dict]:
        if not frames:
            return None

        message = {
            "protocol": "v1",
            "type": "csi_frame_batch",
            "messageId": str(uuid.uuid4()),
            "agentId": self.agent_id,
            "organizationId": self.org_id,
            "siteId": self.site_id,
            "sentAt": int(time.time() * 1000),
            "payload": {
                "frames": frames,
                "batchSize": len(frames),
                "periodMs": int((frames[-1]["timestamp"] - frames[0]["timestamp"])
                                if len(frames) > 1 else 0),
            },
        }

        for attempt in range(self.max_retries):
            try:
                resp = self._session.post(
                    f"{self.server_url}/api/uwsc/ingest",
                    json=message,
                    timeout=5,
                )
                if resp.ok:
                    self.sent_batches += 1
                    data = resp.json()
                    return data
                elif resp.status_code >= 500:
                    time.sleep(self.retry_delay_ms / 1000)
                    continue
                else:
                    self.errors += 1
                    return None
            except requests.RequestException:
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay_ms / 1000)
                continue

        self.errors += 1
        return None

    def send_heartbeat(self, cpu_percent: float = 0.0,
                       memory_mb: float = 0.0,
                       wifi_channel: int = 6,
                       firmware_version: str = "real-v1.0.0",
                       uptime_seconds: int = 0,
                       signal_quality: float = 0.9) -> bool:
        message = {
            "protocol": "v1",
            "type": "heartbeat",
            "messageId": str(uuid.uuid4()),
            "agentId": self.agent_id,
            "organizationId": self.org_id,
            "siteId": self.site_id,
            "sentAt": int(time.time() * 1000),
            "payload": {
                "agentId": self.agent_id,
                "sensorIds": [self.sensor_id],
                "cpuUsagePercent": cpu_percent,
                "memoryUsageMb": memory_mb,
                "wifiChannel": wifi_channel,
                "firmwareVersion": firmware_version,
                "uptimeSeconds": uptime_seconds,
                "signalQualityScore": signal_quality,
            },
        }

        try:
            resp = self._session.post(
                f"{self.server_url}/api/uwsc/heartbeat",
                json=message,
                timeout=5,
            )
            if resp.ok:
                self.sent_heartbeats += 1
                return True
        except requests.RequestException:
            pass
        return False

    def start_heartbeat_thread(self, interval_s: int = 30,
                                get_system_info=None):
        def _heartbeat_loop():
            while not self._stop_event.is_set():
                info = get_system_info() if get_system_info else {}
                self.send_heartbeat(
                    cpu_percent=info.get("cpu_percent", 0),
                    memory_mb=info.get("memory_mb", 0),
                    wifi_channel=info.get("wifi_channel", 6),
                    uptime_seconds=int(time.time() - self._start_time),
                    signal_quality=info.get("signal_quality", 0.9),
                )
                self._stop_event.wait(interval_s)

        self._stop_event = threading.Event()
        self._start_time = time.time()
        t = threading.Thread(target=_heartbeat_loop, daemon=True)
        t.start()
        return t

    def stop(self):
        if hasattr(self, '_stop_event'):
            self._stop_event.set()

    @property
    def stats(self) -> dict:
        return {
            "sent_batches": self.sent_batches,
            "sent_heartbeats": self.sent_heartbeats,
            "errors": self.errors,
        }
