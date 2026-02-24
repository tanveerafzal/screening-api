# Screening API — Requirements Document

## 1. Overview

The Screening API provides automated entity screening against global sanctions lists, watchlists, and regulatory databases. It wraps the OpenSanctions/yente matching engine with an intelligent categorization layer that returns clear verdicts and risk levels for compliance decision-making.

### Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /match/:dataset` | Raw matching — returns unprocessed results from OpenSanctions |
| `POST /search/:dataset` | Text search — search entities by keyword with filters |
| `POST /screen/:dataset` | **Smart screening** — categorized results with verdicts and risk levels |

The `/screen` endpoint is the primary integration point for compliance workflows. It calls `/match` internally and layers categorization logic on top.

---

## 2. Required Scan Types

The screening system must cover the following scan types. Each scan maps to one or more screening categories and is sourced from OpenSanctions topic data where available.

| # | Required Scan | Screening Category | Coverage | Data Source |
|---|---|---|---|---|
| 1 | OFAC / Global Sanctions Scan | `SANCTIONED` | Covered | OpenSanctions (`sanction`, `sanction.linked`, `sanction.counter`) |
| 2 | Global Terrorist Scan | `TERRORISM` | Covered | OpenSanctions (`crime.terror`) |
| 3 | Politically Exposed Person (PEP) Scan | `PEP` | Covered | OpenSanctions (`role.pep`) |
| 4 | Public Profile Scan | `POI` | Partial | OpenSanctions (`poi`). Limited to persons of interest in the OpenSanctions database. Does not cover general public profile data. |
| 5 | Public Court Records | — | **Not covered** | Not available in OpenSanctions. Requires external data source integration (e.g., PACER, LexisNexis, local court APIs). |
| 6 | Fraud Scan | `FRAUD` | Covered | OpenSanctions (`crime.fraud`, `crime.fin`, `crime.cyber`) |
| 7 | Known Affiliation Scan | `PEP_ASSOCIATE` | Covered | OpenSanctions (`role.rca` — relatives/close associates of PEPs) |
| 8 | Public Safety Scan | `WANTED` + `TRAFFICKING` | Covered | OpenSanctions (`wanted`, `crime.traffick`, `crime.traffick.drug`, `crime.traffick.human`, `forced.labor`) |
| 9 | Criminal Scan | `CRIME` | Covered | OpenSanctions (`crime`, `crime.war`, `crime.boss`, `crime.env`, `crime.theft`) |
| 10 | Sex Offender Scan | — | **Not covered** | Not available in OpenSanctions. Requires external data source integration (e.g., US NSOPW, state-level registries). |
| 11 | Global Clearance Scan | `CLEAR` verdict | Covered | When no matches are found above the score threshold, the entity receives a `CLEAR` verdict. |

### Coverage Gaps

Two scan types require external data sources not available in OpenSanctions:

1. **Public Court Records** — Court filings, judgments, and litigation records. Would require integration with services like LexisNexis, PACER (US federal courts), or jurisdiction-specific court APIs.

2. **Sex Offender Scan** — Sex offender registry data. Would require integration with the US National Sex Offender Public Website (NSOPW) API or equivalent registries for other jurisdictions.

---

## 3. Screening Categories

Each matched entity is categorized based on its `properties.topics` from OpenSanctions. A single entity can appear in multiple categories if it has multiple topics.

### Category Definitions

| Category | Risk Level | Verdict | Description |
|---|---|---|---|
| `SANCTIONED` | `critical` | `FLAG` | Entity appears on a government sanctions list (OFAC SDN, EU FSF, UN SC, etc.) or is directly linked to a sanctioned entity. |
| `TERRORISM` | `critical` | `FLAG` | Entity is associated with terrorism or terrorist organizations. |
| `WANTED` | `critical` | `FLAG` | Entity is wanted by law enforcement (Interpol, national agencies). |
| `FRAUD` | `high` | `FLAG` | Entity is associated with fraud, financial crime, or cybercrime. |
| `CRIME` | `high` | `FLAG` | Entity is associated with general criminal activity (war crimes, organized crime, environmental crime, theft). |
| `TRAFFICKING` | `high` | `FLAG` | Entity is associated with human trafficking, drug trafficking, or forced labor. |
| `PEP` | `medium` | `REVIEW` | Entity is a Politically Exposed Person (current or former government official, senior political figure). |
| `DEBARMENT` | `medium` | `REVIEW` | Entity is debarred from public procurement or subject to regulatory enforcement action. |
| `POI` | `low` | `REVIEW` | Entity is a person of interest warranting public scrutiny but not meeting PEP or sanctions criteria. |
| `PEP_ASSOCIATE` | `low` | `REVIEW` | Entity is a relative or close associate of a PEP. |

### Topic-to-Category Mapping

| OpenSanctions Topic | Category | Risk Level |
|---|---|---|
| `sanction` | SANCTIONED | critical |
| `sanction.linked` | SANCTIONED | critical |
| `sanction.counter` | SANCTIONED | critical |
| `crime.terror` | TERRORISM | critical |
| `wanted` | WANTED | critical |
| `crime.fraud` | FRAUD | high |
| `crime.fin` | FRAUD | high |
| `crime.cyber` | FRAUD | high |
| `crime` | CRIME | high |
| `crime.war` | CRIME | high |
| `crime.boss` | CRIME | high |
| `crime.env` | CRIME | high |
| `crime.theft` | CRIME | high |
| `crime.traffick` | TRAFFICKING | high |
| `crime.traffick.drug` | TRAFFICKING | high |
| `crime.traffick.human` | TRAFFICKING | high |
| `forced.labor` | TRAFFICKING | high |
| `role.pep` | PEP | medium |
| `debarment` | DEBARMENT | medium |
| `reg.action` | DEBARMENT | medium |
| `reg.warn` | DEBARMENT | medium |
| `poi` | POI | low |
| `role.rca` | PEP_ASSOCIATE | low |

---

## 4. Risk Levels

| Risk Level | Severity | Description |
|---|---|---|
| `critical` | Highest | Entity is on a sanctions or terrorism list, or is actively wanted. Immediate block recommended. |
| `high` | Elevated | Entity has criminal, fraud, or trafficking associations. Should be flagged for compliance review. |
| `medium` | Moderate | Entity is a PEP or has regulatory issues. Enhanced due diligence required. |
| `low` | Informational | Entity is a person of interest or associate of a PEP. Note for awareness. |

---

## 5. Verdicts

Each screened entity receives a verdict based on the highest-risk match found:

| Verdict | Condition | Recommended Action |
|---|---|---|
| `CLEAR` | No matches above the score threshold | Proceed — no action required |
| `FLAG` | Has at least one `critical` or `high` risk match | Block or escalate — requires compliance officer review before proceeding |
| `REVIEW` | Has `medium` or `low` risk matches only | Enhanced due diligence — review PEP/regulatory records before proceeding |

### Verdict Hierarchy

```
CLEAR < REVIEW < FLAG
```

The verdict is determined by the **highest-risk match** found for the entity. If any match is `critical` or `high`, the verdict is `FLAG` regardless of other lower-risk matches.

---

## 6. API Specification

### Endpoint

```
POST /screen/:dataset
```

### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `threshold` | float | `0.7` | Minimum matching score (0-1). Higher values = stricter matching, fewer false positives. |
| `limit` | int | `10` | Maximum number of raw matches to evaluate per query. |
| `algorithm` | string | `best` | Scoring algorithm for matching. |

### Request Body

Same format as `/match` — a JSON object with a `queries` map:

```json
{
  "queries": {
    "q1": {
      "schema": "Person",
      "properties": {
        "name": ["Vladimir Putin"],
        "birthDate": ["1952"]
      }
    }
  }
}
```

### Supported Entity Schemas

- `Person` — individuals (name, DOB, nationality, ID numbers)
- `Company` — companies (name, jurisdiction, registration number)
- `Organization` — organizations (name, country)
- `LegalEntity` — generic legal entities
- `Vessel` — ships (name, IMO number, flag)
- `Aircraft` — aircraft (name, country)
- `CryptoWallet` — crypto wallets (public key, currency)

### Response Format

```json
{
  "results": {
    "q1": {
      "query": { "schema": "Person", "properties": { "name": ["Vladimir Putin"] } },
      "verdict": "FLAG",
      "riskLevel": "critical",
      "summary": "Matched 3 sanctions lists, 1 PEP record",
      "hits": {
        "sanctioned": [
          {
            "id": "Q7747",
            "caption": "Vladimir Vladimirovich Putin",
            "score": 0.95,
            "category": "SANCTIONED",
            "riskLevel": "critical",
            "datasets": ["us_ofac_sdn", "eu_fsf", "un_sc_sanctions"],
            "topics": ["sanction", "role.pep"]
          }
        ],
        "terrorism": [],
        "wanted": [],
        "fraud": [],
        "crime": [],
        "trafficking": [],
        "pep": [
          {
            "id": "Q7747",
            "caption": "Vladimir Vladimirovich Putin",
            "score": 0.95,
            "category": "PEP",
            "riskLevel": "medium",
            "datasets": ["ru_acf_bribetakers"],
            "topics": ["sanction", "role.pep"]
          }
        ],
        "debarment": [],
        "poi": [],
        "pepAssociate": []
      },
      "totalHits": 2
    }
  },
  "summary": {
    "totalScreened": 1,
    "flagged": 1,
    "review": 0,
    "clear": 0
  }
}
```

### Response Fields

| Field | Description |
|---|---|
| `results` | Map of query ID to screening result |
| `results[id].verdict` | `CLEAR`, `FLAG`, or `REVIEW` |
| `results[id].riskLevel` | Highest risk level found (`critical`, `high`, `medium`, `low`, or `null` if clear) |
| `results[id].summary` | Human-readable summary of matches |
| `results[id].hits` | Categorized match arrays grouped by category |
| `results[id].totalHits` | Total number of categorized hits across all categories |
| `summary.totalScreened` | Number of entities screened in the batch |
| `summary.flagged` | Count of entities with `FLAG` verdict |
| `summary.review` | Count of entities with `REVIEW` verdict |
| `summary.clear` | Count of entities with `CLEAR` verdict |

---

## 7. Batch Screening

The `/screen` endpoint supports batch screening of up to 50 entities per request (configurable via `MAX_BATCH_SIZE` environment variable). Each entity in the batch receives its own independent verdict.

```json
{
  "queries": {
    "person1": { "schema": "Person", "properties": { "name": ["Vladimir Putin"] } },
    "person2": { "schema": "Person", "properties": { "name": ["John Smith"] } },
    "company1": { "schema": "Company", "properties": { "name": ["Gazprom"] } }
  }
}
```

The response `summary` provides aggregate counts for quick triage.

---

## 8. Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `SCREENING_BACKEND` | `yente` | Backend: `yente` (self-hosted) or `hosted` (OpenSanctions API) |
| `YENTE_BASE_URL` | `http://localhost:8000` | Base URL for self-hosted yente instance |
| `OPENSANCTIONS_API_URL` | `https://api.opensanctions.org` | Base URL for hosted OpenSanctions API |
| `OPENSANCTIONS_API_KEY` | — | API key for hosted OpenSanctions API |
| `MAX_BATCH_SIZE` | `50` | Maximum entities per batch request |
| `REQUEST_TIMEOUT_MS` | `30000` | Timeout for upstream API requests (ms) |

---

## 9. Scan Type to Category Mapping Summary

| Required Scan | Category(ies) | Status |
|---|---|---|
| OFAC / Global Sanctions | SANCTIONED | Covered |
| Global Terrorist Scan | TERRORISM | Covered |
| Politically Exposed Person Scan | PEP | Covered |
| Public Profile Scan | POI | Partial (OpenSanctions POI data only) |
| Public Court Records | — | **Not covered** (needs external source) |
| Fraud Scan | FRAUD | Covered |
| Known Affiliation Scan | PEP_ASSOCIATE | Covered |
| Public Safety Scan | WANTED, TRAFFICKING | Covered |
| Criminal Scan | CRIME | Covered |
| Sex Offender Scan | — | **Not covered** (needs external source) |
| Global Clearance Scan | CLEAR verdict | Covered |

---

## 10. Future Enhancements

### External Data Source Integration

To achieve full coverage of all required scan types, the following external integrations are planned:

1. **Public Court Records**
   - US: PACER API for federal courts, state court APIs
   - International: WorldCompliance, LexisNexis
   - Integration point: additional category `COURT_RECORDS` with `medium` risk level

2. **Sex Offender Registry**
   - US: NSOPW (National Sex Offender Public Website) API
   - International: jurisdiction-specific registries
   - Integration point: additional category `SEX_OFFENDER` with `critical` risk level

### Additional Enhancements

- Configurable risk level overrides per category (allow clients to customize)
- Webhook notifications for `FLAG` verdicts
- Audit trail / screening history persistence
- Continuous monitoring (re-screen on list updates)
- PDF report generation per screening result
