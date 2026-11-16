# CareOS — Oracle Cloud Infrastructure (OCI) Always Free Stack Guide

> **Architecture (Option B):** Dedicated Cloud Instance running on Oracle Cloud Infrastructure (OCI) Always Free Ampere A1 (ARM64).
> **Services Hosted:**
> 1. **CareOS Fastify REST API Gateway** (`api:3000`)
> 2. **24/7 SLA Clock, Telematics & ERP Background Worker** (`worker`)
> 3. **Caddy Reverse Proxy with Automatic Zero-Config SSL** (`ports 80 & 443`)
> **Frontend:** Hosted on Hostinger Managed Hosting (`https://relaxed-dodgerblue-newt-58.hostingersite.com` or custom domain).
> **Database:** Supabase Cloud Singapore (`https://vbckrirksziluvwqpamx.supabase.co`).

---

## 1. OCI Always Free Specifications & Provisioning

Oracle Cloud Infrastructure (OCI) provides permanently free compute resources:

| Parameter | Recommended Specification | Notes |
| :--- | :--- | :--- |
| **Instance Shape** | `VM.Standard.A1.Flex` (Ampere Altra A1 ARM64) | 4 OCPUs and 24 GB RAM permanently free under OCI Always Free. |
| **Operating System** | **Ubuntu 22.04 LTS (AArch64)** or **Oracle Linux 9 (aarch64)** | Clean cloud-init image. |
| **Boot Volume** | 50 GB to 100 GB (Always Free allows up to 200 GB total) | Balanced performance. |
| **Public IP** | Ephemeral or Reserved Public IPv4 | Free standard public IPv4. |
| **Monthly Cost** | **$0.00 / month (Always Free)** | Permanent free tier allocation. |

---

## 2. Step-by-Step OCI Provisioning in Oracle Cloud Console

### Step 1: Create Compute Instance
1. Log in to [cloud.oracle.com](https://cloud.oracle.com).
2. Go to **Menu** → **Compute** → **Instances** → Click **Create Instance**.
3. **Name**: `careos-cloud-instance`
4. **Image and Shape**:
   - Image: **Ubuntu 22.04 Minimal (aarch64)** (or Oracle Linux 9).
   - Shape: Click **Change Shape** → Select **Ampere** → Select `VM.Standard.A1.Flex`.
   - Allocate: **2 to 4 OCPUs** and **12 to 24 GB RAM** (Always Free eligible).
5. **Networking**:
   - Create a new Virtual Cloud Network (VCN) or select existing.
   - Ensure **Assign a public IPv4 address** is checked.
6. **Add SSH Keys**:
   - Select **Generate a key pair for me** and save the private key (e.g., `ssh-key-careos.key`), OR upload your existing public key (`id_ed25519.pub`).
7. Click **Create**. The instance will be ready in 30–60 seconds.

---

### Step 2: Open Ingress Ports in OCI Security List
OCI VCNs block all inbound traffic except port 22 by default. You must open ports 80, 443, and 3000 in your VCN:
1. In the OCI Console, navigate to **Compute** → **Instances** → Click your instance (`careos-cloud-instance`).
2. Under **Primary VNIC**, click your **Subnet**.
3. Under **Security Lists**, click **Default Security List for...**.
4. Click **Add Ingress Rules**:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `TCP`
   - **Destination Port Range**: `80, 443, 3000`
   - **Description**: `CareOS Web, SSL, and API Gateway`
5. Click **Add Ingress Rules**.

---

### Step 3: Connect via SSH & Run the Automated Setup Script

1. Open your terminal and connect to your instance:
   ```bash
   chmod 400 ssh-key-careos.key
   ssh -i ssh-key-careos.key ubuntu@<YOUR_OCI_PUBLIC_IP>
   ```

2. Clone or copy your CareOS repository to `/opt/careos`:
   ```bash
   sudo mkdir -p /opt/careos
   sudo chown -R $USER:$USER /opt/careos
   git clone https://github.com/azharmallayil/CareOS.git /opt/careos
   cd /opt/careos/deployment/oci
   ```

3. Run the automated OCI bootstrap script:
   ```bash
   ./setup-oci.sh
   ```
   *This script automatically updates the system, installs Docker & Docker Compose, and unblocks the OCI Linux host firewall (`iptables` / `firewalld`) for ports 80, 443, and 3000.*

---

### Step 4: Configure Production Environment Variables

Edit the `.env` file created in `deployment/oci`:
```bash
nano /opt/careos/deployment/oci/.env
```

Ensure the following variables are set:
```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# Supabase Credentials (Singapore)
SUPABASE_URL=https://vbckrirksziluvwqpamx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY2tyaXJrc3ppbHV2d3FwYW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2Njg5OTcsImV4cCI6MjExMDI0NDk5N30.76jizSAIaVw3MXHAY87fNOfsUO3Ev6BTE4I5jRmFQIM
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>
SUPABASE_JWT_SECRET=<YOUR_SUPABASE_JWT_SECRET>

# Secrets
COOKIE_SECRET=32_char_random_secret_here
JWT_SECRET=32_char_random_secret_here

# Allowed Frontend Origins (Include your Hostinger domain)
CORS_ORIGINS=https://relaxed-dodgerblue-newt-58.hostingersite.com,http://localhost:5173
```

---

### Step 5: Start the CareOS Multi-Container Stack

Launch the stack using Docker Compose:
```bash
cd /opt/careos/deployment/oci
docker compose up -d --build
```

Verify that all three containers are running healthy:
```bash
docker compose ps
```
Expected output:
```
NAME            IMAGE                  COMMAND                  SERVICE   STATUS              PORTS
careos-api      careos-api:latest      "node apps/api/dist/…"   api       running (healthy)   0.0.0.0:3000->3000/tcp
careos-worker   careos-worker:latest   "node dist/index.js"     worker    running (healthy)   
careos-caddy    caddy:2-alpine         "caddy run --config …"   caddy     running             0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

---

## 3. Smoke Testing & Verification

From your local machine or browser, verify the API is responding:

1. **Health Endpoint**:
   ```bash
   curl -i http://<YOUR_OCI_PUBLIC_IP>:3000/health
   # Expected: HTTP/1.1 200 OK -> {"status":"ok","timestamp":"..."}
   ```

2. **OpenAPI 3.0 Documentation**:
   Visit `http://<YOUR_OCI_PUBLIC_IP>:3000/documentation` in your browser.

3. **Check Live Worker Logs**:
   ```bash
   docker compose logs -f worker
   # Shows SLA engine ticking and polling PostgreSQL job queue
   ```
