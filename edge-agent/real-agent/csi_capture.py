"""
WGF SenseOS — Real Edge Agent CSI Capture (Nexmon)
Captures raw CSI frames via UDP from Nexmon firmware on Raspberry Pi.
"""

import socket
import struct
import time
import numpy as np
from typing import Optional, NamedTuple


class CsiFrame(NamedTuple):
    timestamp: float
    rssi: int
    fc: int
    src_mac: bytes
    seq_num: int
    core: int
    nss: int
    chanspec: int
    chip_id: int
    amplitude: np.ndarray
    phase: np.ndarray
    raw_csi: np.ndarray
    bandwidth_mhz: int
    num_subcarriers: int


# Guard/null subcarrier indices to filter out per bandwidth
GUARD_NULL_INDICES = {
    20: list(range(0, 5)) + [32] + list(range(60, 64)),
    40: list(range(0, 5)) + [32, 33] + list(range(59, 64)),
    80: list(range(0, 5)) + [32, 33] + list(range(59, 64)),
}

MAGIC = 0x1111
HEADER_SIZE = 30
PHYS_STATUS_SIZE = 12
PADDING_20MHZ = 28


def unpack_float_bcm4366c0(raw_values: np.ndarray) -> np.ndarray:
    """Decode bcm4366c0 floating-point CSI format.
    Each uint32: sign(1) real(12) | sign(1) imag(12) | exponent(6)
    """
    nexp = 6
    nman = 12
    ep = 1 << (nexp - 1)
    mask_mantissa = (1 << nman) - 1
    mask_exp = (1 << nexp) - 1

    real_parts = np.zeros(len(raw_values), dtype=np.float64)
    imag_parts = np.zeros(len(raw_values), dtype=np.float64)

    for i, val in enumerate(raw_values):
        val = int(val)
        sign_imag = 1 if (val >> 31) & 1 == 0 else -1
        imag_mantissa = (val >> (nman + nexp)) & mask_mantissa
        sign_real = 1 if (val >> nman) & 1 == 0 else -1
        real_mantissa = val & mask_mantissa
        exponent = (val >> nman) & mask_exp

        scale = 2.0 ** (exponent - ep)
        real_parts[i] = sign_real * real_mantissa * scale
        imag_parts[i] = sign_imag * imag_mantissa * scale

    return real_parts + 1j * imag_parts


def parse_int16_csi(raw_values: np.ndarray) -> np.ndarray:
    """Parse bcm43455c0 int16 CSI format.
    Each uint32: bits[31:16] = imaginary, bits[15:0] = real
    """
    real_parts = (raw_values & 0xFFFF).astype(np.int16).astype(np.float64)
    imag_parts = ((raw_values >> 16) & 0xFFFF).astype(np.int16).astype(np.float64)
    return real_parts + 1j * imag_parts


def get_guard_null_indices(bandwidth_mhz: int) -> list:
    return GUARD_NULL_INDICES.get(bandwidth_mhz, [])


def get_subcarrier_count(bandwidth_mhz: int) -> int:
    return {20: 64, 40: 128, 80: 256}.get(bandwidth_mhz, 64)


def extract_bandwidth_from_chanspec(chanspec: int) -> int:
    bw_bits = chanspec & 0x03
    return {0: 20, 1: 40, 2: 80}.get(bw_bits, 20)


class CsiCapture:
    def __init__(self, port: int = 5500, bind_address: str = "0.0.0.0",
                 bandwidth_mhz: int = 80, chip: str = "bcm43455c0"):
        self.port = port
        self.bind_address = bind_address
        self.bandwidth_mhz = bandwidth_mhz
        self.chip = chip
        self.num_subcarriers = get_subcarrier_count(bandwidth_mhz)
        self.sock: Optional[socket.socket] = None
        self.frame_count = 0
        self.start_time = time.time()
        self._use_float_format = chip in ("bcm4358", "bcm4366c0")

    def start(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.settimeout(1.0)
        self.sock.bind((self.bind_address, self.port))
        self.start_time = time.time()
        self.frame_count = 0

    def stop(self):
        if self.sock:
            self.sock.close()
            self.sock = None

    def _parse_packet(self, data: bytes) -> Optional[CsiFrame]:
        if len(data) < HEADER_SIZE:
            return None

        magic = struct.unpack_from('<H', data, 0)[0]
        if magic != MAGIC:
            return None

        rssi = struct.unpack_from('<b', data, 2)[0]
        fc = data[3]
        src_mac = data[4:10]
        seq_num = struct.unpack_from('<H', data, 10)[0]
        csiconf = struct.unpack_from('<H', data, 12)[0]
        core = csiconf & 0x07
        nss = (csiconf >> 3) & 0x07
        chanspec = struct.unpack_from('<H', data, 14)[0]
        chip_id = struct.unpack_from('<H', data, 16)[0]

        bw = extract_bandwidth_from_chanspec(chanspec)
        nfft = get_subcarrier_count(bw)

        csi_offset = HEADER_SIZE + PHYS_STATUS_SIZE
        if bw == 20:
            csi_offset += PADDING_20MHZ

        bytes_needed = nfft * 4
        if len(data) < csi_offset + bytes_needed:
            return None

        raw_values = np.frombuffer(data, dtype=np.uint32, count=nfft,
                                   offset=csi_offset)

        if self._use_float_format:
            csi_complex = unpack_float_bcm4366c0(raw_values)
        else:
            csi_complex = parse_int16_csi(raw_values)

        csi_shifted = np.fft.fftshift(csi_complex)

        guard_indices = get_guard_null_indices(bw)
        valid_mask = np.ones(nfft, dtype=bool)
        for idx in guard_indices:
            if idx < nfft:
                valid_mask[idx] = False

        csi_valid = csi_shifted[valid_mask]

        amplitude = np.abs(csi_valid).astype(np.float32)
        phase = np.angle(csi_valid, deg=False).astype(np.float32)

        self.frame_count += 1

        return CsiFrame(
            timestamp=time.time(),
            rssi=rssi,
            fc=fc,
            src_mac=src_mac,
            seq_num=seq_num,
            core=core,
            nss=nss,
            chanspec=chanspec,
            chip_id=chip_id,
            amplitude=amplitude,
            phase=phase,
            raw_csi=csi_valid,
            bandwidth_mhz=bw,
            num_subcarriers=len(csi_valid),
        )

    def capture_one(self) -> Optional[CsiFrame]:
        if not self.sock:
            return None
        try:
            data, addr = self.sock.recvfrom(65535)
            return self._parse_packet(data)
        except socket.timeout:
            return None
        except Exception:
            return None

    @property
    def frames_per_second(self) -> float:
        elapsed = time.time() - self.start_time
        if elapsed <= 0:
            return 0.0
        return self.frame_count / elapsed
