#!/bin/bash
# ==============================================================================
# CareOS — Oracle Cloud Infrastructure (OCI) Cloud-Init Auto-Bootstrap Script
# Automatically executes on first boot when creating your OCI Compute Instance.
# ==============================================================================

set -euo pipefail

exec > >(tee -a /var/log/careos-bootstrap.log) 2>&1

echo "=================================================================="
echo "  CareOS — Initializing OCI Always Free Compute Instance          "
echo "=================================================================="

# 1. Update system packages
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg lsb-release git iptables-persistent

# 2. Install Docker Engine & Docker Compose
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
sh /tmp/get-docker.sh
rm -f /tmp/get-docker.sh

usermod -aG docker ubuntu || true
systemctl enable docker
systemctl start docker

# 3. Open OCI Host Firewall (Ports 80, 443, 3000)
# Note: Oracle Linux & Ubuntu images block all ports except 22 by default
iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT || true
iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT || true
iptables -I INPUT 1 -p tcp --dport 3000 -j ACCEPT || true
netfilter-persistent save || true

# 4. Clone CareOS Repository to /opt/careos
mkdir -p /opt/careos
if [ ! -d "/opt/careos/.git" ]; then
    git clone https://github.com/azharmallayil/CareOS.git /opt/careos
fi

# 5. Set ownership to the default 'ubuntu' user
chown -R ubuntu:ubuntu /opt/careos

# 6. Initialize .env file from .env.example
if [ ! -f "/opt/careos/deployment/oci/.env" ]; then
    cp /opt/careos/deployment/oci/.env.example /opt/careos/deployment/oci/.env
    chown ubuntu:ubuntu /opt/careos/deployment/oci/.env
fi

echo "=================================================================="
echo "  CareOS Bootstrap Finished Successfully!                         "
echo "=================================================================="
