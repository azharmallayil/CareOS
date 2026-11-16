#!/usr/bin/env bash
# ==============================================================================
# CareOS — Oracle Cloud Infrastructure (OCI) Always Free Auto-Setup Script
# Compatible with: Ubuntu 22.04 LTS / 24.04 LTS & Oracle Linux 9 (ARM64 / x86_64)
# ==============================================================================

set -euo pipefail

echo "=================================================================="
echo "  CareOS — OCI Always Free Compute Automated Provisioning Script  "
echo "=================================================================="

# 1. Detect Architecture and OS
ARCH=$(uname -m)
echo "==> Detected CPU Architecture: ${ARCH}"

# 2. Update System Packages
echo "==> Updating system packages..."
if command -v apt-get &> /dev/null; then
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg lsb-release git iptables-persistent
elif command -v dnf &> /dev/null; then
    sudo dnf update -y
    sudo dnf install -y curl git firewalld
fi

# 3. Install Docker Engine & Docker Compose (if not already installed)
if ! command -v docker &> /dev/null; then
    echo "==> Installing Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm -f get-docker.sh

    sudo usermod -aG docker "${USER}" || true
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "==> Docker installed successfully."
else
    echo "==> Docker is already installed."
fi

# 4. Open Inbound Ports on OCI Host Firewall (80, 443, 3000)
# Note: Oracle Cloud default Linux images block all inbound ports via iptables/firewalld
echo "==> Configuring host firewall for HTTP (80), HTTPS (443), and Fastify API (3000)..."
if command -v iptables &> /dev/null; then
    sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT || true
    sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT || true
    sudo iptables -I INPUT 1 -p tcp --dport 3000 -j ACCEPT || true
    if command -v netfilter-persistent &> /dev/null; then
        sudo netfilter-persistent save || true
    fi
fi

if command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --zone=public --permanent --add-port=80/tcp || true
    sudo firewall-cmd --zone=public --permanent --add-port=443/tcp || true
    sudo firewall-cmd --zone=public --permanent --add-port=3000/tcp || true
    sudo firewall-cmd --reload || true
fi

# 5. Verify .env file exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ ! -f "${SCRIPT_DIR}/.env" ]; then
    echo ""
    echo "⚠️  WARNING: ${SCRIPT_DIR}/.env not found!"
    echo "Creating .env from .env.example..."
    cp "${SCRIPT_DIR}/.env.example" "${SCRIPT_DIR}/.env"
    echo "👉 Please edit ${SCRIPT_DIR}/.env and supply your SUPABASE_SERVICE_ROLE_KEY before starting containers."
fi

echo ""
echo "=================================================================="
echo "  OCI VM Setup Complete!                                          "
echo "  To launch the CareOS API + Background Worker stack:             "
echo "                                                                  "
echo "    cd ${SCRIPT_DIR}                                              "
echo "    docker compose up -d --build                                  "
echo "                                                                  "
echo "  To view live container logs:                                    "
echo "    docker compose logs -f                                        "
echo "=================================================================="
