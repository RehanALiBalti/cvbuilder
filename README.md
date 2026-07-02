# AI CV Builder

Standalone AI-powered professional CV builder using **Ollama Qwen** (`qwen2.5:7b`).

## Project Structure

```
cvbuilder/
├── app.py              # Backend entry (uvicorn)
├── backend/
│   ├── main.py         # FastAPI REST API
│   ├── llm.py          # Ollama Qwen integration
│   ├── ai_service.py   # AI CV features
│   ├── storage.py      # JSON persistence
│   └── ...
├── frontend/           # React + Vite UI
├── postman/            # Postman collection
└── data/               # Stored CVs (local)
```

## Setup

### 1. Ollama

```powershell
ollama pull qwen2.5:7b
ollama serve
```

### 2. Python Backend

```powershell
cd E:\python\ji\cvbuilder
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

API: **http://127.0.0.1:8001**

### 3. Frontend

```powershell
cd E:\python\ji\cvbuilder\frontend
npm install
npm run dev
```

UI: **http://localhost:5174**

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_MODEL` | `qwen2.5:7b` | Ollama model name |
| `OLLAMA_URL` | `http://localhost:11434/api/generate` | Ollama API |
| `CVBUILDER_PORT` | `8001` | API port |
| `CVBUILDER_DATA_DIR` | `data` | CV storage directory |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health + Ollama status |
| GET | `/api/templates` | List CV templates |
| GET/POST | `/api/cvs` | List / create CVs |
| GET/PUT/DELETE | `/api/cvs/{id}` | CRUD |
| POST | `/api/cvs/{id}/duplicate` | Duplicate CV |
| PATCH | `/api/cvs/{id}/rename` | Rename CV |
| GET | `/api/cvs/{id}/versions` | Version history |
| GET | `/api/cvs/{id}/export/pdf` | PDF download |
| GET | `/api/cvs/{id}/export/docx` | DOCX download |
| POST | `/api/ai/generate` | AI full CV generation |
| POST | `/api/ai/regenerate-section` | Section regeneration |
| POST | `/api/ai/analyze` | Resume analysis |
| POST | `/api/ai/optimize-job` | Job optimization |
| POST | `/api/ai/cover-letter` | Cover letter |
| POST | `/api/ai/career-guidance` | Career guidance |
| POST | `/api/ai/linkedin` | LinkedIn bio |

## Postman

Import into Postman:

- `postman/CV_Builder_API.postman_collection.json`
- `postman/CV_Builder_Local.postman_environment.json`

**Test flow:** Health Check → Create CV → AI Generate → Export PDF

## Features

- AI CV generation from raw text
- Section-wise regeneration & text enhancement
- Multiple writing tones & 5 templates
- CV management with auto-save & version history
- Resume analysis & job optimization
- Cover letter, career guidance, LinkedIn bio
- PDF & DOCX export

## Git & Deploy

Full guide: [deploy/DEPLOY.md](deploy/DEPLOY.md)

### Same server as JAMS (subpath `/cvbuilder`)

| App | URL |
|-----|-----|
| JAMS | http://65.108.236.135/ |
| CV Builder | http://65.108.236.135/cvbuilder/ |

Server par:
```bash
sudo git clone https://github.com/YOUR_USERNAME/cvbuilder.git /opt/cvbuilder
sudo DOMAIN=65.108.236.135 bash /opt/cvbuilder/deploy/install-alongside-jams.sh
```

**Push to GitHub:**

```powershell
cd E:\python\ji\cvbuilder
git remote add origin https://github.com/YOUR_USERNAME/cvbuilder.git
git push -u origin main
```

**Deploy on Ubuntu:**

```bash
sudo git clone https://github.com/YOUR_USERNAME/cvbuilder.git /opt/cvbuilder
sudo chown -R www-data:www-data /opt/cvbuilder
sudo DOMAIN=YOUR_SERVER_IP bash /opt/cvbuilder/deploy/ubuntu-setup.sh
sudo systemctl start cvbuilder-backend
```
