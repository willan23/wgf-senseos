#!/usr/bin/env python3
"""
WGF SenseOS X-Fi bridge.

Reads one JSON request from stdin, runs the upstream X-Fi XRF55 HAR model with
the Wi-Fi/CSI modality enabled, and writes one JSON response to stdout.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any


def fail(message: str, code: int = 2) -> None:
    print(json.dumps({"error": message}), file=sys.stderr)
    raise SystemExit(code)


def load_request() -> dict[str, Any]:
    try:
        payload = sys.stdin.read()
        request = json.loads(payload)
    except Exception as exc:  # pragma: no cover - defensive CLI boundary
        fail(f"invalid JSON request: {exc}")

    if request.get("schemaVersion") != "wgf-xfi-v1":
        fail("unsupported request schemaVersion")
    if request.get("task") != "xrf55_har" or request.get("modality") != "wifi":
        fail("unsupported X-Fi task/modality")

    wifi_csi = request.get("wifiCsi")
    if not isinstance(wifi_csi, list) or len(wifi_csi) != 270:
        fail("wifiCsi must be a 270-channel matrix")
    if any(not isinstance(row, list) or len(row) != 1000 for row in wifi_csi):
        fail("wifiCsi rows must each contain 1000 timesteps")

    return request


def strip_state_dict_prefixes(state: dict[str, Any]) -> dict[str, Any]:
    if "state_dict" in state and isinstance(state["state_dict"], dict):
        state = state["state_dict"]

    cleaned: dict[str, Any] = {}
    for key, value in state.items():
        cleaned_key = key
        for prefix in ("module.", "model."):
            if cleaned_key.startswith(prefix):
                cleaned_key = cleaned_key[len(prefix):]
        cleaned[cleaned_key] = value
    return cleaned


def main() -> int:
    start = time.perf_counter()
    request = load_request()

    repo_dir = Path(os.environ.get("XFI_REPO_DIR", "")).resolve()
    task_dir = repo_dir / "XRF55_HAR"
    weights_path = Path(os.environ.get("XFI_WEIGHTS_PATH", "")).resolve()
    model_depth = int(os.environ.get("XFI_MODEL_DEPTH", "5"))
    num_classes = int(os.environ.get("XFI_NUM_CLASSES", "55"))
    device_name = os.environ.get("XFI_DEVICE", "cpu")
    strict_weights = os.environ.get("XFI_STRICT_WEIGHTS", "true").lower() != "false"

    if not repo_dir.is_dir():
        fail(f"XFI_REPO_DIR does not exist: {repo_dir}")
    if not task_dir.is_dir():
        fail(f"X-Fi XRF55_HAR task directory does not exist: {task_dir}")
    if not weights_path.is_file():
        fail(f"XFI_WEIGHTS_PATH does not exist: {weights_path}")

    required_backbones = [
        task_dir / "backbone_models" / "WIFI" / "wifi_ResNet18.pt",
        task_dir / "backbone_models" / "mmWave" / "mmwave_ResNet18.pt",
        task_dir / "backbone_models" / "RFID" / "rfid_ResNet18.pt",
    ]
    missing = [str(path) for path in required_backbones if not path.is_file()]
    if missing:
        fail("missing X-Fi pretrained backbone(s): " + "; ".join(missing))

    sys.path.insert(0, str(task_dir))
    os.chdir(task_dir)

    try:
        import numpy as np
        import torch
        import torch.nn.functional as F
        from X_Fi import X_Fi
    except Exception as exc:  # pragma: no cover - dependency boundary
        fail(f"failed to import X-Fi runtime dependencies: {exc}")

    if device_name.startswith("cuda") and not torch.cuda.is_available():
        fail(f"requested device {device_name}, but CUDA is not available")

    device = torch.device(device_name)

    try:
        model = X_Fi(model_depth=model_depth, num_classes=num_classes)
    except TypeError:
        model = X_Fi(model_depth=model_depth)

    state = torch.load(weights_path, map_location=device)
    if isinstance(state, dict):
        load_result = model.load_state_dict(strip_state_dict_prefixes(state), strict=strict_weights)
        if not strict_weights:
            print(
                json.dumps({
                    "warning": "X-Fi weights loaded with strict=false",
                    "missingKeys": list(load_result.missing_keys),
                    "unexpectedKeys": list(load_result.unexpected_keys),
                }),
                file=sys.stderr,
            )
    else:
        fail("XFI_WEIGHTS_PATH must contain a PyTorch state_dict/checkpoint")

    model.eval()
    model.to(device)

    wifi = np.asarray(request["wifiCsi"], dtype=np.float32)
    wifi_tensor = torch.from_numpy(wifi).unsqueeze(0).to(device)

    # X-Fi ignores disabled modalities through modality_list. These tensors are
    # passed only to satisfy the upstream forward signature.
    mmwave_tensor = torch.zeros((1, 17, 256, 128), dtype=torch.float32, device=device)
    rfid_tensor = torch.zeros((1, 1, 1), dtype=torch.float32, device=device)
    modality_list = [False, True, False]

    captured: dict[str, torch.Tensor] = {}

    def capture_embedding(_module: Any, _inputs: Any, output: torch.Tensor) -> None:
        captured["embedding"] = output.detach()

    hook = model.X_Fusion_block.classification_head.norm.register_forward_hook(capture_embedding)
    try:
        with torch.no_grad():
            logits_tensor = model(mmwave_tensor, wifi_tensor, rfid_tensor, modality_list)
            probs = F.softmax(logits_tensor, dim=1)
    finally:
        hook.remove()

    logits = logits_tensor.squeeze(0).detach().cpu().tolist()
    probabilities = probs.squeeze(0).detach().cpu().tolist()
    class_index = int(max(range(len(probabilities)), key=probabilities.__getitem__))
    confidence = float(probabilities[class_index])

    embedding_tensor = captured.get("embedding")
    if embedding_tensor is None:
        fail("failed to capture X-Fi penultimate embedding")

    embedding = embedding_tensor.squeeze(0).detach().cpu().tolist()

    response = {
        "schemaVersion": "wgf-xfi-v1",
        "task": "xrf55_har",
        "modality": "wifi",
        "model": {
            "repoDir": str(repo_dir),
            "weightsPath": str(weights_path),
            "modelDepth": model_depth,
            "numClasses": num_classes,
            "device": str(device),
        },
        "prediction": {
            "classIndex": class_index,
            "confidence": confidence,
            "logits": logits,
        },
        "embedding": embedding,
        "timingMs": int((time.perf_counter() - start) * 1000),
    }
    print(json.dumps(response, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
