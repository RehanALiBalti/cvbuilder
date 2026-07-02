# AI CV Builder — Ubuntu Deployment Guide

Deploy **backend** (FastAPI :8001) + **frontend** (React/Vite static) on Ubuntu with **nginx**, **systemd**, and **Ollama**.

---

## Same server as JAMS (`/cvbuilder` subpath) — recommended for you

JAMS already on **http://65.108.236.135/** → CV Builder will be **http://65.108.236.135/cvbuilder/**

### On Ubuntu server (SSH)

```bash
# 1. Clone CV Builder (first time)
sudo git clone https://github.com/YOUR_USERNAME/cvbuilder.git /opt/cvbuilder
sudo chown -R www-data:www-data /opt/cvbuilder

# 2. Install + nginx + systemd (one command)
sudo DOMAIN=65.108.236.135 bash /opt/cvbuilder/deploy/install-alongside-jams.sh
```

This script:
- Builds frontend with `/cvbuilder/` base path
- Starts `cvbuilder-backend` on port **8001**
- Updates nginx so JAMS stays at `/` and CV Builder at `/cvbuilder/`
- Reuses existing **Ollama** (same `qwen2.5:7b`)

### After code update

```bash
cd /opt/cvbuilder
sudo -u www-data git pull
sudo DOMAIN=65.108.236.135 bash /opt/cvbuilder/deploy/install-alongside-jams.sh
```

### Verify

```bash
curl http://127.0.0.1:8001/api/health
curl http://127.0.0.1/cvbuilder/api/health
```

Browser: **http://65.108.236.135/cvbuilder/**

---

## Standalone deploy (separate domain/IP)

Recommended: Ubuntu 22.04/24.04, 4+ GB RAM (8 GB better for Ollama).

---

## Quick deploy (Git clone)

### 1. GitHub par repo banayein

1. https://github.com/new
2. Name: `cvbuilder` (Public)
3. README / .gitignore **mat** add karein
4. Create repository

### 2. Windows se push

```powershell
cd E:\python\ji\cvbuilder
git remote add origin https://github.com/YOUR_USERNAME/cvbuilder.git
git push -u origin main
```

### 3. Ubuntu server par clone + setup

```bash
sudo apt update
sudo apt install -y git

sudo git clone https://github.com/YOUR_USERNAME/cvbuilder.git /opt/cvbuilder
sudo chown -R www-data:www-data /opt/cvbuilder
cd /opt/cvbuilder
sudo DOMAIN=YOUR_SERVER_IP bash /opt/cvbuilder/deploy/ubuntu-setup.sh
```

`YOUR_SERVER_IP` = apna public IP (e.g. `203.0.113.10`)

### 4. Services start

```bash
sudo nano /opt/cvbuilder/.env
```

```env
CVBUILDER_CORS_ORIGINS=http://203.0.113.10
OLLAMA_MODEL=qwen2.5:7b
```

```bash
sudo systemctl start cvbuilder-backend
sudo systemctl reload nginx

sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
```

Browser: **http://YOUR_SERVER_IP**

---

## Code update (server par)

```bash
cd /opt/cvbuilder
sudo -u www-data git pull

source .venv/bin/activate
pip install -r requirements.txt

sudo bash /opt/cvbuilder/deploy/rebuild-frontend.sh
sudo systemctl restart cvbuilder-backend
```

---

## Architecture

```
Browser → nginx:80
            ├── /          → frontend/dist (React SPA)
            └── /api/*     → uvicorn 127.0.0.1:8001 (FastAPI)
                                    └── Ollama 127.0.0.1:11434 (Qwen)
```

Ollama port **11434** internet par expose **mat** karein.

---

## HTTPS (optional)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d cvbuilder.example.com
```

`.env` mein `https://` domain add karein, phir:

```bash
sudo systemctl restart cvbuilder-backend
```

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| 502 Bad Gateway | `sudo journalctl -u cvbuilder-backend -f` |
| AI slow / fails | `ollama list` — `qwen2.5:7b` pulled hona chahiye |
| CORS error | `.env` mein `CVBUILDER_CORS_ORIGINS` sahi domain/IP |
| Frontend blank | `ls /opt/cvbuilder/frontend/dist` — rebuild karein |

```bash
sudo systemctl status cvbuilder-backend nginx ollama
curl http://127.0.0.1:8001/api/health
curl http://127.0.0.1/api/health
sudo journalctl -u cvbuilder-backend -n 50 --no-pager
```

**Quick fix:**

```bash
sudo DOMAIN=YOUR_IP bash /opt/cvbuilder/deploy/finish-setup.sh
```

---

## ZIP upload (Git ke bina)

ZIP mein **na** rakhein: `.venv`, `frontend/node_modules`, `frontend/dist`, `data/cvs/`

```bash
cd ~
unzip cvbuilder.zip
sudo mv cvbuilder /opt/cvbuilder
sudo chown -R www-data:www-data /opt/cvbuilder
sudo DOMAIN=YOUR_IP bash /opt/cvbuilder/deploy/ubuntu-setup.sh
```
