"""
WGF SenseOS — Real Edge Agent CSI Processor
Processes raw CSI frames: temporal windowing, normalization, RF fingerprinting.
"""

import time
import numpy as np
from collections import deque
from typing import Optional
from csi_capture import CsiFrame


class CsiProcessor:
    def __init__(self, temporal_window_size: int = 30,
                 normalize: bool = True,
                 compute_rf_fingerprint: bool = True):
        self.temporal_window_size = temporal_window_size
        self.normalize = normalize
        self.compute_rf_fingerprint = compute_rf_fingerprint

        self._amplitude_window: deque = deque(maxlen=temporal_window_size)
        self._phase_window: deque = deque(maxlen=temporal_window_size)
        self._timestamp_window: deque = deque(maxlen=temporal_window_size)
        self._rssi_window: deque = deque(maxlen=temporal_window_size)
        self._phase_noise_history: deque = deque(maxlen=100)
        self._rssi_history: deque = deque(maxlen=100)
        self._timing_jitter_history: deque = deque(maxlen=100)
        self._last_frame_time: Optional[float] = None

    def process_frame(self, frame: CsiFrame) -> dict:
        self._amplitude_window.append(frame.amplitude.copy())
        self._phase_window.append(frame.phase.copy())
        self._timestamp_window.append(frame.timestamp)
        self._rssi_window.append(frame.rssi)

        self._rssi_history.append(frame.rssi)
        if self._last_frame_time is not None:
            jitter = abs(frame.timestamp - self._last_frame_time - 0.1)
            self._timing_jitter_history.append(jitter)
        self._last_frame_time = frame.timestamp

        phase_diff = np.abs(np.diff(frame.phase))
        self._phase_noise_history.append(float(np.var(phase_diff)))

        result = {
            "messageId": f"{frame.src_mac.hex()}-{frame.seq_num}",
            "sensorId": None,
            "organizationId": None,
            "siteId": None,
            "timestamp": int(frame.timestamp * 1000),
            "amplitude": frame.amplitude.tolist(),
            "phase": frame.phase.tolist(),
            "subcarrierCount": frame.num_subcarriers,
            "antennaIndex": frame.core,
            "rssi": float(frame.rssi),
            "noiseFloor": -95.0,
            "isSimulated": False,
            "scenarioTag": "real_capture",
            "firmwareVersion": "nexmon-v1.0.0",
            "rfAuthenticityScore": 0.95,
        }

        if self.compute_rf_fingerprint:
            fingerprint = self._compute_rf_fingerprint(frame)
            result.update(fingerprint)

        return result

    def _compute_rf_fingerprint(self, frame: CsiFrame) -> dict:
        scores = {}

        if len(self._phase_noise_history) >= 10:
            recent_phase_noise = list(self._phase_noise_history)[-10:]
            avg_phase_noise = float(np.mean(recent_phase_noise))
            baseline_phase_noise = float(np.mean(list(self._phase_noise_history)[:-10])) if len(self._phase_noise_history) > 10 else avg_phase_noise
            phase_noise_ratio = avg_phase_noise / max(baseline_phase_noise, 1e-10)
            scores["phaseNoiseVariance"] = min(phase_noise_ratio, 1.0)

        if len(self._rssi_history) >= 10:
            recent_rssi = list(self._rssi_history)[-10:]
            rssi_std = float(np.std(recent_rssi))
            scores["iqImbalanceScore"] = min(rssi_std / 10.0, 1.0)

        if len(self._timing_jitter_history) >= 10:
            recent_jitter = list(self._timing_jitter_history)[-10:]
            avg_jitter = float(np.mean(recent_jitter))
            scores["packetTimingJitter"] = avg_jitter * 1000

        if len(self._rssi_history) >= 20:
            recent_20 = list(self._rssi_history)[-20:]
            drift = abs(recent_20[-1] - recent_20[0])
            scores["rssiDrift"] = drift

        return scores

    def get_temporal_window(self) -> Optional[dict]:
        if len(self._amplitude_window) < 2:
            return None

        amp_array = np.array(list(self._amplitude_window), dtype=np.float32)
        phase_array = np.array(list(self._phase_window), dtype=np.float32)

        if self.normalize and amp_array.size > 0:
            mean = amp_array.mean()
            std = amp_array.std()
            if std > 1e-8:
                amp_array = (amp_array - mean) / std

        return {
            "amplitude": amp_array,
            "phase": phase_array,
            "timestamps": list(self._timestamp_window),
            "num_frames": len(self._amplitude_window),
        }

    def reset(self):
        self._amplitude_window.clear()
        self._phase_window.clear()
        self._timestamp_window.clear()
        self._rssi_window.clear()
        self._phase_noise_history.clear()
        self._rssi_history.clear()
        self._timing_jitter_history.clear()
        self._last_frame_time = None
