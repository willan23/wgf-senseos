#!/usr/bin/env python3
"""
WGF SenseOS — Real Edge Agent (Nexmon CSI)
Captures real WiFi CSI data from Nexmon firmware and sends to the WGF SenseOS server.

Usage:
    python main.py
    python main.py --config config.yaml
    python main.py --server http://192.168.1.100:3000 --org my-org --site my-site
"""

import argparse
import os
import sys
import time
import signal
import yaml
import psutil
from pathlib import Path

from csi_capture import CsiCapture
from csi_processor import CsiProcessor
from ingestion_client import IngestionClient


def load_config(config_path: str = None) -> dict:
    default_config = {
        "agent_id": os.environ.get("UWSC_AGENT_ID", "nexmon-agent-001"),
        "server_url": os.environ.get("UWSC_SERVER_URL", "http://localhost:3000"),
        "org_id": os.environ.get("UWSC_ORG_ID", "demo-org"),
        "site_id": os.environ.get("UWSC_SITE_ID", "demo-site"),
        "sensor_id": os.environ.get("UWSC_SENSOR_ID", "nexmon-sensor-001"),
        "capture": {
            "port": 5500,
            "bind_address": "0.0.0.0",
            "bandwidth_mhz": 80,
            "chip": "bcm43455c0",
        },
        "ingestion": {
            "batch_size": 10,
            "send_interval_ms": 100,
            "heartbeat_interval_s": 30,
            "max_retries": 3,
            "retry_delay_ms": 1000,
        },
        "processing": {
            "temporal_window_size": 30,
            "normalize": True,
            "compute_rf_fingerprint": True,
        },
        "firmware_version": "real-agent-v1.0.0",
    }

    if config_path and os.path.exists(config_path):
        with open(config_path, 'r') as f:
            file_config = yaml.safe_load(f) or {}
        if "capture" in file_config:
            default_config["capture"].update(file_config["capture"])
        if "ingestion" in file_config:
            default_config["ingestion"].update(file_config["ingestion"])
        if "processing" in file_config:
            default_config["processing"].update(file_config["processing"])
        for key in ("agent_id", "server_url", "org_id", "site_id", "sensor_id",
                     "firmware_version"):
            if key in file_config:
                default_config[key] = file_config[key]

    return default_config


def parse_args():
    parser = argparse.ArgumentParser(description="WGF SenseOS Real Edge Agent")
    parser.add_argument("--config", default=None, help="Path to config YAML")
    parser.add_argument("--server", default=None, help="Server URL")
    parser.add_argument("--org", default=None, help="Organization ID")
    parser.add_argument("--site", default=None, help="Site ID")
    parser.add_argument("--sensor", default=None, help="Sensor ID")
    parser.add_argument("--agent", default=None, help="Agent ID")
    parser.add_argument("--port", type=int, default=None, help="CSI capture port")
    parser.add_argument("--chip", default=None, help="WiFi chip (bcm43455c0, bcm4366c0)")
    parser.add_argument("--bandwidth", type=int, default=None, help="Bandwidth in MHz")
    parser.add_argument("--batch", type=int, default=None, help="Batch size")
    parser.add_argument("--interval", type=int, default=None, help="Send interval ms")
    return parser.parse_args()


def get_system_info():
    try:
        cpu = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        return {
            "cpu_percent": cpu,
            "memory_mb": mem.used / (1024 * 1024),
            "signal_quality": 0.9,
        }
    except Exception:
        return {"cpu_percent": 0, "memory_mb": 0, "signal_quality": 0.9}


def main():
    args = parse_args()
    config = load_config(args.config)

    if args.server:
        config["server_url"] = args.server
    if args.org:
        config["org_id"] = args.org
    if args.site:
        config["site_id"] = args.site
    if args.sensor:
        config["sensor_id"] = args.sensor
    if args.agent:
        config["agent_id"] = args.agent
    if args.port:
        config["capture"]["port"] = args.port
    if args.chip:
        config["capture"]["chip"] = args.chip
    if args.bandwidth:
        config["capture"]["bandwidth_mhz"] = args.bandwidth
    if args.batch:
        config["ingestion"]["batch_size"] = args.batch
    if args.interval:
        config["ingestion"]["send_interval_ms"] = args.interval

    capture_cfg = config["capture"]
    ingest_cfg = config["ingestion"]
    proc_cfg = config["processing"]

    print(f"\nWGF SenseOS Real Edge Agent")
    print(f"  Agent ID    : {config['agent_id']}")
    print(f"  Organization: {config['org_id']}")
    print(f"  Site        : {config['site_id']}")
    print(f"  Sensor      : {config['sensor_id']}")
    print(f"  Server      : {config['server_url']}")
    print(f"  Chip        : {capture_cfg['chip']}")
    print(f"  Bandwidth   : {capture_cfg['bandwidth_mhz']} MHz")
    print(f"  Port        : {capture_cfg['port']}")
    print(f"  Batch Size  : {ingest_cfg['batch_size']}")
    print(f"  Interval    : {ingest_cfg['send_interval_ms']}ms")
    print(f"\n  Press Ctrl+C to stop.\n")

    capture = CsiCapture(
        port=capture_cfg["port"],
        bind_address=capture_cfg["bind_address"],
        bandwidth_mhz=capture_cfg["bandwidth_mhz"],
        chip=capture_cfg["chip"],
    )

    processor = CsiProcessor(
        temporal_window_size=proc_cfg["temporal_window_size"],
        normalize=proc_cfg["normalize"],
        compute_rf_fingerprint=proc_cfg["compute_rf_fingerprint"],
    )

    client = IngestionClient(
        server_url=config["server_url"],
        agent_id=config["agent_id"],
        org_id=config["org_id"],
        site_id=config["site_id"],
        sensor_id=config["sensor_id"],
        max_retries=ingest_cfg["max_retries"],
        retry_delay_ms=ingest_cfg["retry_delay_ms"],
    )

    running = True

    def signal_handler(sig, frame):
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        capture.start()
    except OSError as e:
        print(f"\n  ERROR: Could not bind to port {capture_cfg['port']}: {e}")
        print(f"  Make sure Nexmon CSI is running and sending to port {capture_cfg['port']}")
        sys.exit(1)

    heartbeat_thread = client.start_heartbeat_thread(
        interval_s=ingest_cfg["heartbeat_interval_s"],
        get_system_info=get_system_info,
    )

    frame_buffer = []
    t = 0
    interval_s = ingest_cfg["send_interval_ms"] / 1000.0
    last_report = time.time()

    print(f"  Listening for CSI on port {capture_cfg['port']}...\n")

    while running:
        frame = capture.capture_one()
        if frame is not None:
            processed = processor.process_frame(frame)
            processed["sensorId"] = config["sensor_id"]
            processed["organizationId"] = config["org_id"]
            processed["siteId"] = config["site_id"]
            frame_buffer.append(processed)

        if len(frame_buffer) >= ingest_cfg["batch_size"]:
            batch = frame_buffer[:ingest_cfg["batch_size"]]
            frame_buffer = frame_buffer[ingest_cfg["batch_size"]:]
            result = client.send_batch(batch)
            t += 1

            if time.time() - last_report >= 5.0:
                fps = capture.frames_per_second
                stats = client.stats
                print(f"\r  Sent batch #{t} | {fps:.1f} fps | "
                      f"{stats['sent_batches']} batches | "
                      f"{stats['errors']} errors   ", end="", flush=True)
                last_report = time.time()

        time.sleep(interval_s / 10)

    print(f"\n\n  Shutting down...")
    capture.stop()
    client.stop()

    stats = client.stats
    print(f"  Final stats: {stats['sent_batches']} batches sent, "
          f"{stats['sent_heartbeats']} heartbeats, {stats['errors']} errors")
    print(f"  Total CSI frames captured: {capture.frame_count}")
    print(f"\n  Agent stopped gracefully.\n")


if __name__ == "__main__":
    main()
