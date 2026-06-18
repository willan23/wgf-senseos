#!/usr/bin/env python3
"""
WGF SenseOS — Nexmon CSI Test Data Generator
Generates realistic CSI data in the exact binary format that Nexmon firmware produces.
Allows development and testing without physical hardware.

Usage:
    python test_generator.py --scenario walking --duration 60
    python test_generator.py --scenario fall --output capture.pcap
    python test_generator.py --scenario breathing --port 5500 --send
"""

import argparse
import socket
import struct
import time
import math
import cmath
import random
import numpy as np
from typing import Optional, Generator
from dataclasses import dataclass
from enum import Enum


class Scenario(Enum):
    EMPTY = "empty"
    BREATHING = "breathing"
    WALKING = "walking"
    TWO_PEOPLE = "two_people"
    FALL = "fall"
    INTRUDER = "intruder"
    SPOOFING = "spoofing"


@dataclass
class CsiConfig:
    bandwidth_mhz: int = 80
    chip: str = "bcm43455c0"
    channel: int = 157
    core: int = 0
    nss: int = 0
    source_mac: bytes = b'\xaa\xbb\xcc\xdd\xee\xff'
    antenna_spacing_m: float = 0.025
    wifi_freq_ghz: float = 5.18


def get_subcarrier_count(bw: int) -> int:
    return {20: 64, 40: 128, 80: 256}.get(bw, 64)


def get_guard_indices(bw: int) -> list:
    guards = {
        20: list(range(0, 5)) + [32] + list(range(60, 64)),
        40: list(range(0, 5)) + [32, 33] + list(range(59, 64)),
        80: list(range(0, 5)) + [32, 33] + list(range(59, 64)),
    }
    return guards.get(bw, [])


class NexmonCsiGenerator:
    def __init__(self, config: CsiConfig):
        self.config = config
        self.nfft = get_subcarrier_count(config.bandwidth_mhz)
        self.guard_indices = get_guard_indices(config.bandwidth_mhz)
        self.valid_count = self.nfft - len(self.guard_indices)
        self.frame_count = 0
        self.start_time = time.time()

    def _generate_scenario_signal(self, scenario: Scenario, t: float,
                                   subcarrier_idx: int) -> complex:
        """Generate realistic CSI value for a given scenario."""
        freq = self.config.wifi_freq_ghz * 1e9
        spacing = self.config.antenna_spacing_m
        c = 3e8

        phase_shift = 2 * math.pi * freq * spacing * subcarrier_idx / c
        base = 0.5 * cmath.exp(1j * phase_shift)

        if scenario == Scenario.EMPTY:
            noise = 0.01 * (random.gauss(0, 1) + 1j * random.gauss(0, 1))
            return base + noise

        elif scenario == Scenario.BREATHING:
            breath_rate = 0.25
            breath_amp = 0.03
            breathing = breath_amp * math.sin(2 * math.pi * breath_rate * t)
            noise = 0.01 * (random.gauss(0, 1) + 1j * random.gauss(0, 1))
            return base * (1 + breathing) + noise

        elif scenario == Scenario.WALKING:
            walk_freq1 = 1.8
            walk_freq2 = 2.3
            walk_amp = 0.15
            walking = walk_amp * (
                0.6 * math.sin(2 * math.pi * walk_freq1 * t + subcarrier_idx * 0.1) +
                0.4 * math.sin(2 * math.pi * walk_freq2 * t + subcarrier_idx * 0.15)
            )
            noise = 0.02 * (random.gauss(0, 1) + 1j * random.gauss(0, 1))
            return base * (1 + walking) + noise

        elif scenario == Scenario.TWO_PEOPLE:
            walk1 = 0.12 * math.sin(2 * math.pi * 1.8 * t + subcarrier_idx * 0.1)
            walk2 = 0.10 * math.sin(2 * math.pi * 2.1 * t + subcarrier_idx * 0.2 + 1.5)
            noise = 0.02 * (random.gauss(0, 1) + 1j * random.gauss(0, 1))
            return base * (1 + walk1 + walk2) + noise

        elif scenario == Scenario.FALL:
            if t < 3.0:
                walking = 0.12 * math.sin(2 * math.pi * 1.8 * t + subcarrier_idx * 0.1)
                return base * (1 + walking)
            elif t < 3.5:
                impact = 0.8 * math.exp(-10 * (t - 3.0))
                spike = impact * math.sin(2 * math.pi * 10 * (t - 3.0))
                return base * (1 + spike)
            else:
                breathing = 0.02 * math.sin(2 * math.pi * 0.16 * t)
                return base * (1 + breathing)

        elif scenario == Scenario.INTRUDER:
            intruder = 0.18 * math.sin(2 * math.pi * 2.0 * t + subcarrier_idx * 0.12)
            noise = 0.03 * (random.gauss(0, 1) + 1j * random.gauss(0, 1))
            return base * (1 + intruder) + noise

        elif scenario == Scenario.SPOOFING:
            walking = 0.12 * math.sin(2 * math.pi * 1.5 * t + subcarrier_idx * 0.1)
            noise = 0.05 * (random.gauss(0, 1) + 1j * random.gauss(0, 1))
            return base * (1 + walking) + noise

        return base

    def generate_frame(self, scenario: Scenario, timestamp: float) -> bytes:
        """Generate a complete Nexmon CSI UDP packet."""
        csi_values = []
        valid_idx = 0

        for i in range(self.nfft):
            if i in self.guard_indices:
                csi_values.append(complex(0, 0))
            else:
                csi_val = self._generate_scenario_signal(scenario, timestamp, valid_idx)
                csi_values.append(csi_val)
                valid_idx += 1

        if self.config.chip == "bcm43455c0":
            raw_csi = self._encode_int16(csi_values)
        else:
            raw_csi = self._encode_float(csi_values)

        rssi = -65 + random.gauss(0, 2)
        seq_num = self.frame_count & 0xFFFF
        csiconf = (self.config.core & 0x07) | ((self.config.nss & 0x07) << 3)

        chanspec = self.config.channel << 4 | 0x02

        header = struct.pack('<H', 0x1111)
        header += struct.pack('<b', int(rssi))
        header += struct.pack('B', 0x08)
        header += self.config.source_mac
        header += struct.pack('<H', seq_num)
        header += struct.pack('<H', csiconf)
        header += struct.pack('<H', chanspec)
        header += struct.pack('<H', 0x4345)

        phystatus = b'\x00' * 12
        header += phystatus

        if self.config.bandwidth_mhz == 20:
            header += b'\x00' * 28

        self.frame_count += 1
        return header + raw_csi

    def _encode_int16(self, csi_values: list) -> bytes:
        """Encode CSI values as int16 pairs (bcm43455c0 format)."""
        raw = bytearray()
        for val in csi_values:
            real_int = int(max(-32768, min(32767, val.real * 1000)))
            imag_int = int(max(-32768, min(32767, val.imag * 1000)))
            raw += struct.pack('<hh', real_int, imag_int)
        return bytes(raw)

    def _encode_float(self, csi_values: list) -> bytes:
        """Encode CSI values as float format (bcm4366c0 format)."""
        raw = bytearray()
        for val in csi_values:
            raw += struct.pack('<f', float(val.real))
            raw += struct.pack('<f', float(val.imag))
        return bytes(raw)


class UdpSender:
    def __init__(self, port: int = 5500, target_ip: str = "255.255.255.255"):
        self.port = port
        self.target_ip = target_ip
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

    def send(self, data: bytes):
        self.sock.sendto(data, (self.target_ip, self.port))

    def close(self):
        self.sock.close()


def run_test_mode(scenario: Scenario, duration: float, send_udp: bool,
                  port: int, output_file: Optional[str]):
    """Run the CSI test generator."""
    config = CsiConfig()
    generator = NexmonCsiGenerator(config)

    sender = None
    if send_udp:
        sender = UdpSender(port=port)

    pcap_file = None
    if output_file:
        pcap_file = open(output_file, 'wb')
        write_pcap_header(pcap_file)

    print(f"\nWGF SenseOS CSI Test Generator")
    print(f"  Scenario  : {scenario.value}")
    print(f"  Duration  : {duration}s")
    print(f"  Bandwidth : {config.bandwidth_mhz} MHz")
    print(f"  Chip      : {config.chip}")
    print(f"  Subcarriers: {generator.valid_count} (after guard filtering)")
    print(f"  UDP Port  : {port}")
    print(f"  Send UDP  : {send_udp}")
    print(f"  Output    : {output_file or 'none'}")
    print(f"\n  Press Ctrl+C to stop.\n")

    start_time = time.time()
    frame_interval = 0.01

    try:
        while time.time() - start_time < duration:
            t = time.time() - start_time
            frame_data = generator.generate_frame(scenario, t)

            if sender:
                sender.send(frame_data)

            if pcap_file:
                write_pcap_record(pcap_file, frame_data)

            if generator.frame_count % 100 == 0:
                fps = generator.frame_count / max(t, 0.001)
                print(f"\r  Frames: {generator.frame_count} | "
                      f"FPS: {fps:.1f} | "
                      f"Time: {t:.1f}s / {duration}s   ", end="", flush=True)

            time.sleep(frame_interval)

    except KeyboardInterrupt:
        pass
    finally:
        if sender:
            sender.close()
        if pcap_file:
            pcap_file.close()

    elapsed = time.time() - start_time
    fps = generator.frame_count / max(elapsed, 0.001)
    print(f"\n\n  Done! {generator.frame_count} frames in {elapsed:.1f}s ({fps:.1f} FPS)")


def write_pcap_header(f):
    f.write(struct.pack('<IHHiIII',
        0xa1b2c3d4,
        2, 4,
        0,
        0,
        65535,
        228
    ))


def write_pcap_record(f, data: bytes):
    ts = time.time()
    ts_sec = int(ts)
    ts_usec = int((ts - ts_sec) * 1e6)
    f.write(struct.pack('<IIII', ts_sec, ts_usec, len(data), len(data)))
    f.write(data)


def main():
    parser = argparse.ArgumentParser(description="WGF SenseOS CSI Test Generator")
    parser.add_argument("--scenario", type=str, default="walking",
                       choices=[s.value for s in Scenario],
                       help="CSI scenario to simulate")
    parser.add_argument("--duration", type=float, default=60,
                       help="Duration in seconds")
    parser.add_argument("--port", type=int, default=5500,
                       help="UDP port for CSI broadcast")
    parser.add_argument("--send", action="store_true",
                       help="Send CSI frames via UDP broadcast")
    parser.add_argument("--output", type=str, default=None,
                       help="Output pcap file path")
    parser.add_argument("--bandwidth", type=int, default=80,
                       choices=[20, 40, 80],
                       help="WiFi bandwidth in MHz")
    parser.add_argument("--chip", type=str, default="bcm43455c0",
                       choices=["bcm43455c0", "bcm4366c0"],
                       help="WiFi chip type")

    args = parser.parse_args()

    scenario = Scenario(args.scenario)
    config = CsiConfig(bandwidth_mhz=args.bandwidth, chip=args.chip)

    run_test_mode(
        scenario=scenario,
        duration=args.duration,
        send_udp=args.send,
        port=args.port,
        output_file=args.output,
    )


if __name__ == "__main__":
    main()
