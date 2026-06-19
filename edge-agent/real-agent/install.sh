#!/bin/bash
# =============================================
# WGF SenseOS — Real Edge Agent Installation
# For Raspberry Pi 4 with OpenWrt + Nexmon CSI
# =============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="wgf-csi-agent"
SERVICE_USER="root"

echo ""
echo "WGF SenseOS Real Edge Agent Installer"
echo "====================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: Please run as root (sudo ./install.sh)"
    exit 1
fi

# Install Python dependencies
echo "[1/4] Installing Python dependencies..."
if command -v pip3 &> /dev/null; then
    pip3 install -r "$SCRIPT_DIR/requirements.txt"
elif command -v pip &> /dev/null; then
    pip install -r "$SCRIPT_DIR/requirements.txt"
else
    echo "ERROR: pip not found. Install python3-pip first."
    exit 1
fi

# Create config from template if not exists
echo "[2/4] Checking configuration..."
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    cat > "$SCRIPT_DIR/.env" << 'EOF'
# WGF SenseOS Edge Agent Configuration
UWSC_AGENT_ID=nexmon-agent-001
UWSC_SERVER_URL=http://localhost:3000
UWSC_ORG_ID=demo-org
UWSC_SITE_ID=demo-site
UWSC_SENSOR_ID=nexmon-sensor-001
EOF
    echo "  Created .env template. Please edit with your settings."
fi

# Setup Nexmon CSI capture interface
echo "[3/4] Checking Nexmon CSI setup..."
if command -v nexutil &> /dev/null; then
    echo "  nexutil found: $(which nexutil)"
else
    echo "  WARNING: nexutil not found. Install nexmon first."
    echo "  See: https://github.com/seemoo-lab/nexmon_csi"
fi

# Install systemd service
echo "[4/4] Installing systemd service..."
cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=WGF SenseOS CSI Edge Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${SERVICE_USER}
WorkingDirectory=${SCRIPT_DIR}
EnvironmentFile=${SCRIPT_DIR}/.env
ExecStart=$(which python3) ${SCRIPT_DIR}/main.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# Resource limits
MemoryMax=256M
CPUQuota=80%

# Security
NoNewPrivileges=yes
ProtectSystem=strict
ReadWritePaths=/var/log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
echo "  Service installed: ${SERVICE_NAME}"
echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your server/org/site IDs"
echo "  2. Start Nexmon CSI capture on port 5500"
echo "  3. Start the agent:"
echo "       sudo systemctl start ${SERVICE_NAME}"
echo "       sudo systemctl enable ${SERVICE_NAME}"
echo ""
echo "  View logs:"
echo "       sudo journalctl -u ${SERVICE_NAME} -f"
echo ""
