# 07 — Sample dataset and ground truth: Northwind Pay

| Field | Value |
| --- | --- |
| **Replaces** | "blueprint §15" referenced by `06` T-013 (no blueprint exists) |
| **Generator** | `scripts/generate_seed.py` → `data/seed/northwind.json` (bundle v1, `03` §13.2) and `data/ground_truth.json` |
| **Determinism** | `random.Random(20261017)`; output is byte-identical across runs (CI checks the SHA-256) |
| **Simulated as-of** | **17 Oct 2026 00:00 UTC** (`1792195200`); all dates are defined as day offsets from it |

## 1. Company

Northwind Pay is a mid-size payments company: card checkout for merchants, a consumer mobile wallet, merchant payouts, and KYC onboarding.

| Entity | Count |
| --- | --- |
| Teams | 8 |
| People | 40 (2 have left, 1 moved team) |
| Services | 25 |
| Customer paths | 4 |
| Controls | 12 |
| Exceptions | 60 (active, renewed, closed, revoked, draft) |
| Compensating controls, runbooks, evidence | as generated |

### 1.1 Teams and services

| Team | Services (tier, customer-facing) |
| --- | --- |
| Payments Platform | checkout-api (1, yes), payments-gateway (1), fraud-scoring (1), card-vault (1) |
| Ledger | ledger (1), reconciliation (2), payouts (1, yes) |
| Identity | auth (1), user-profile (2) |
| Mobile | mobile-api (1, yes), push-notifications (2) |
| Data Platform | data-warehouse (2), etl-pipeline (2), reporting (3), ml-features (2) |
| Infrastructure | k8s-platform (1), secrets-manager (1), ci-runner (3), observability (2) |
| Merchant Experience | merchant-dashboard (2, yes), onboarding-kyc (1, yes), webhooks (2) |
| Corporate IT | status-page (3), docs-portal (3), email-relay (3) — **control services** |

### 1.2 Dependencies (dependent → dependency)

checkout-api → payments-gateway, fraud-scoring, auth · payments-gateway → card-vault, ledger · fraud-scoring → ml-features · ml-features → data-warehouse · reconciliation → ledger, data-warehouse · payouts → ledger · auth → user-profile, secrets-manager · card-vault → secrets-manager · mobile-api → auth, payments-gateway, push-notifications · merchant-dashboard → reporting, webhooks, auth · reporting → data-warehouse · etl-pipeline → data-warehouse · onboarding-kyc → user-profile · observability → k8s-platform · ci-runner → k8s-platform.

Control services have **no** dependencies in either direction and are unreachable from customer paths.

### 1.3 Customer paths

Checkout → checkout-api · Mobile wallet pay → mobile-api · Merchant payouts → payouts, merchant-dashboard · Merchant sign-up → onboarding-kyc.

## 2. Planted scenarios (ground truth)

| ID | Name | Planted facts | Must fire |
| --- | --- | --- | --- |
| **S1** | Checkout Collision | 5 active exceptions within 2 hops of checkout-api (on checkout-api, payments-gateway ×2, fraud-scoring, card-vault-adjacent via payments-gateway), two of severity 4–5; the Checkout customer path requires checkout-api | **R4** on `svc_checkout_api`; **R8** on `cp_checkout`; checkout-api and payments-gateway score **critical** |
| **S2** | Ghost Owner | `exc_ghost_vault_key` (card-vault, key-rotation waiver) owned by Priya Raman, who **left** on 31 Aug 2026; current Payments Platform lead is Marcus Bell. Second case: Dmitri Volkov **moved** from Ledger to Data Platform on 15 Sep 2026 and still owns `exc_ledger_batch_export` | **R2** on both exceptions; owner resolution ranks Marcus Bell (team lead) first for the first, the Ledger lead first for the second |
| **S3** | Single Fallback | Three compensating controls ("manual review of refunds", "manual fraud spot-check", "nightly vault access log review") all rely on Sam Okafor | **R3** on `per_sam_okafor` |
| **S4** | Renewal Treadmill | TLS-pinning waiver on mobile-api renewed three times (chain of 4: 3 `renewed` + 1 `active`) | **R5** on the active link, `chain_length = 4` |
| **S5** | Quiet Expiry Week | 4 Data Platform exceptions expire between 28 Oct and 2 Nov 2026 | **R6** on `team_data` |

**Control services** (status-page, docs-portal, email-relay): each has one healthy exception (severity 1–2, verified compensating control, valid owner, expiry > 60 days). They must produce **zero alerts** and score **low**.

## 3. Noise (realistic background)

22 healthy active exceptions spread across non-control services: severity 1–3, expiry 20–200 days out, granted 10–150 days ago, verified compensating controls, valid owners. Plus 17 historical `closed`/`revoked` exceptions and three `draft`s. Noise is allowed to trigger R4/R8 where the graph genuinely warrants it; it must not trigger any alert on a control service.

## 4. Ground truth file

`data/ground_truth.json`:

```json
{
  "as_of": 1792195200,
  "scenarios": [{"id": "S1", "expect": [{"rule": "R4", "subject": "svc_checkout_api"}, {"rule": "R8", "subject": "cp_checkout"}]}],
  "critical_services": ["svc_checkout_api", "svc_payments_gateway"],
  "control_services": ["svc_status_page", "svc_docs_portal", "svc_email_relay"],
  "owner_resolution": [{"exception": "exc_ghost_vault_key", "expected_first": "per_marcus_bell"}]
}
```

The eval (`eval/run_eval.py`) passes when every expected `(rule, subject)` exists (recall 5/5), no alert touches a control service, critical services are in the critical band, controls are in the low band, and owner resolution matches.
