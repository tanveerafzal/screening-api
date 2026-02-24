# Screening API

A Node.js/Express API wrapper for OpenSanctions sanctions screening. Supports both self-hosted yente and the hosted OpenSanctions API.

## Features

- **Dual Backend Support**: Switch between self-hosted yente or OpenSanctions hosted API
- **Full API Coverage**: Match, Search, Entities, and system endpoints
- **TypeScript**: Full type safety
- **Production Ready**: Docker, Kubernetes, rate limiting, health checks
- **Batch Processing**: Support for batch entity matching

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/match/:dataset` | Match entities against watchlists |
| GET | `/search/:dataset` | Search for entities |
| GET | `/entities/:entityId` | Get entity by ID |
| GET | `/healthz` | Health check |
| GET | `/readyz` | Readiness check |
| GET | `/catalog` | List available datasets |
| GET | `/algorithms` | List matching algorithms |
| GET | `/info` | Service information |

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Running yente instance (or OpenSanctions API key)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### Configuration

Edit `.env`:

```bash
# Use yente (self-hosted)
SCREENING_BACKEND=yente
YENTE_BASE_URL=http://localhost:8000

# Or use hosted OpenSanctions API
SCREENING_BACKEND=hosted
OPENSANCTIONS_API_KEY=your-api-key
```

### Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Usage Examples

### Match a Person

```bash
curl -X POST http://localhost:3000/match/default \
  -H "Content-Type: application/json" \
  -d '{
    "queries": {
      "q1": {
        "schema": "Person",
        "properties": {
          "name": ["Vladimir Putin"],
          "birthDate": ["1952"]
        }
      }
    }
  }'
```

### Match a Company

```bash
curl -X POST http://localhost:3000/match/default \
  -H "Content-Type: application/json" \
  -d '{
    "queries": {
      "company1": {
        "schema": "Company",
        "properties": {
          "name": ["Gazprom"],
          "jurisdiction": ["Russia"]
        }
      }
    }
  }'
```

### Batch Match

```bash
curl -X POST "http://localhost:3000/match/default?threshold=0.7&limit=5" \
  -H "Content-Type: application/json" \
  -d '{
    "queries": {
      "person1": {
        "schema": "Person",
        "properties": {
          "name": ["John Smith"],
          "nationality": ["US"]
        }
      },
      "person2": {
        "schema": "Person",
        "properties": {
          "name": ["Jane Doe"],
          "birthDate": ["1980"]
        }
      }
    }
  }'
```

### Search

```bash
curl "http://localhost:3000/search/default?q=putin&limit=10"
```

### Get Entity

```bash
curl "http://localhost:3000/entities/Q7747"
```

## Query Parameters

### Match Endpoint

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results per query (default: 5, max: 500) |
| `threshold` | number | Score threshold 0-1 (default: 0.7) |
| `algorithm` | string | Scoring algorithm (default: "best") |
| `topics` | string[] | Filter by topics (sanction, crime, pep) |
| `include_dataset` | string[] | Include specific datasets |
| `exclude_dataset` | string[] | Exclude specific datasets |

### Search Endpoint

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (required) |
| `schema` | string | Entity type filter |
| `limit` | number | Max results (default: 10) |
| `offset` | number | Pagination offset |
| `countries` | string[] | Country filter |
| `fuzzy` | boolean | Enable fuzzy matching |

## Docker

### Build

```bash
docker build -t screening-api .
```

### Run

```bash
docker run -p 3000:3000 \
  -e SCREENING_BACKEND=yente \
  -e YENTE_BASE_URL=http://host.docker.internal:8000 \
  screening-api
```

## Kubernetes Deployment

See `kubernetes/deployment.yaml` for GKE deployment manifests.

```bash
# Build and push image
docker build -t gcr.io/YOUR_PROJECT/screening-api:latest .
docker push gcr.io/YOUR_PROJECT/screening-api:latest

# Deploy
kubectl apply -f kubernetes/deployment.yaml
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Your Application                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Screening API                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                Express Server                        │   │
│  │  • Rate Limiting                                     │   │
│  │  • Request Validation                                │   │
│  │  • Error Handling                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Screening Service                       │   │
│  │  • Backend Selection (yente/hosted)                  │   │
│  │  • Request Forwarding                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
           ┌──────────────┴──────────────┐
           │                             │
           ▼                             ▼
┌──────────────────────┐    ┌──────────────────────┐
│   Yente (GKE)        │    │  OpenSanctions API   │
│   Self-hosted        │    │  Hosted              │
└──────────────────────┘    └──────────────────────┘
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment |
| `SCREENING_BACKEND` | yente | Backend: "yente" or "hosted" |
| `YENTE_BASE_URL` | http://localhost:8000 | Yente URL |
| `OPENSANCTIONS_API_URL` | https://api.opensanctions.org | Hosted API URL |
| `OPENSANCTIONS_API_KEY` | - | API key for hosted |
| `REQUEST_TIMEOUT_MS` | 30000 | Request timeout |
| `MAX_BATCH_SIZE` | 50 | Max queries per batch |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |

## License

MIT
