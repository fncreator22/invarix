"""Deterministic Northwind Pay sample bundle + ground truth (docs/07-seed-spec.md).

Usage: python scripts/generate_seed.py   (writes data/seed/northwind.json and data/ground_truth.json)
"""

import json
import random
from pathlib import Path

AS_OF = 1792195200  # 17 Oct 2026 00:00 UTC
DAY = 86400
ROOT = Path(__file__).resolve().parent.parent
rng = random.Random(20261017)


def d(days: float) -> int:
    return AS_OF + int(days * DAY)


def slug(name: str) -> str:
    return name.lower().replace(" ", "_").replace("-", "_").replace("'", "")


# ---------------------------------------------------------------- org
TEAMS = {
    "team_payments": "Payments Platform",
    "team_ledger": "Ledger",
    "team_identity": "Identity",
    "team_mobile": "Mobile",
    "team_data": "Data Platform",
    "team_infra": "Infrastructure",
    "team_merchant": "Merchant Experience",
    "team_it": "Corporate IT",
}

# (name, title, team) — first listed active person per team is its lead unless overridden below.
PEOPLE = [
    ("Marcus Bell", "Engineering Manager", "team_payments"),
    ("Priya Raman", "Staff Engineer", "team_payments"),
    ("Hana Sato", "Senior Engineer", "team_payments"),
    ("Luis Ortega", "Engineer", "team_payments"),
    ("Grace Mensah", "Engineer", "team_payments"),
    ("Elena Petrova", "Engineering Manager", "team_ledger"),
    ("Dmitri Volkov", "Senior Engineer", "team_ledger"),
    ("Tomás Silva", "Engineer", "team_ledger"),
    ("Aisha Khan", "Engineer", "team_ledger"),
    ("Ben Carter", "Engineer", "team_ledger"),
    ("Yuki Tanaka", "Engineering Manager", "team_identity"),
    ("Omar Haddad", "Security Engineer", "team_identity"),
    ("Chloe Martin", "Engineer", "team_identity"),
    ("Ravi Iyer", "Engineer", "team_identity"),
    ("Sofia Rossi", "Engineer", "team_identity"),
    ("Daniel Kim", "Engineering Manager", "team_mobile"),
    ("Amara Nwosu", "Senior Engineer", "team_mobile"),
    ("Jonas Weber", "Engineer", "team_mobile"),
    ("Mei Lin", "Engineer", "team_mobile"),
    ("Kofi Asante", "Engineer", "team_mobile"),
    ("Laura Jensen", "Engineering Manager", "team_data"),
    ("Arjun Mehta", "Data Engineer", "team_data"),
    ("Nora Fischer", "Data Engineer", "team_data"),
    ("Pedro Alves", "ML Engineer", "team_data"),
    ("Fatima Zahra", "Analytics Engineer", "team_data"),
    ("Sam Okafor", "Site Reliability Engineer", "team_infra"),
    ("Rachel Green", "Engineering Manager", "team_infra"),
    ("Ivan Horvat", "Platform Engineer", "team_infra"),
    ("Zoe Adams", "Platform Engineer", "team_infra"),
    ("Kenji Mori", "Platform Engineer", "team_infra"),
    ("Olivia Brown", "Engineering Manager", "team_merchant"),
    ("Mateo García", "Senior Engineer", "team_merchant"),
    ("Leila Ahmadi", "Engineer", "team_merchant"),
    ("Noah Wilson", "Engineer", "team_merchant"),
    ("Ingrid Larsen", "Engineer", "team_merchant"),
    ("Patrick O'Neill", "IT Manager", "team_it"),
    ("Sara Lindqvist", "IT Engineer", "team_it"),
    ("Victor Dubois", "IT Engineer", "team_it"),
    ("Hiro Nakamura", "IT Engineer", "team_it"),
    ("Anika Patel", "Security & Compliance Lead", "team_it"),
]

LEADS = {  # team -> [(person_name, since_days, until_days|None)]
    "team_payments": [("Priya Raman", -900, -46), ("Marcus Bell", -46, None)],
    "team_ledger": [("Elena Petrova", -700, None)],
    "team_identity": [("Yuki Tanaka", -800, None)],
    "team_mobile": [("Daniel Kim", -600, None)],
    "team_data": [("Laura Jensen", -650, None)],
    "team_infra": [("Rachel Green", -750, None)],
    "team_merchant": [("Olivia Brown", -500, None)],
    "team_it": [("Patrick O'Neill", -1000, None)],
}
LEFT = {"Priya Raman": -46, "Kofi Asante": -120}  # left 31 Aug 2026 / 19 Jun 2026
MOVED = {"Dmitri Volkov": ("team_ledger", "team_data", -32)}  # moved 15 Sep 2026


def pid(name: str) -> str:
    return "per_" + slug(name.replace("á", "a").replace("í", "i").replace("é", "e"))


teams = [{"id": t, "name": n} for t, n in TEAMS.items()]
people, memberships, leads = [], [], []
for name, title, team in PEOPLE:
    left_at = LEFT.get(name)
    people.append({
        "id": pid(name),
        "name": name,
        "email": pid(name)[4:].replace("_", ".") + "@northwindpay.example",
        "title": title,
        "role": title,
        "status": "left" if left_at is not None else "active",
    })
    since = -rng.randint(200, 1200)
    if name in MOVED:
        old, new, at = MOVED[name]
        memberships.append({"person_id": pid(name), "team_id": old, "since": d(since), "until": d(at)})
        memberships.append({"person_id": pid(name), "team_id": new, "since": d(at), "until": None})
    else:
        memberships.append({"person_id": pid(name), "team_id": team, "since": d(since),
                            "until": d(left_at) if left_at is not None else None})
for team, spans in LEADS.items():
    for name, s, u in spans:
        leads.append({"person_id": pid(name), "team_id": team, "since": d(s), "until": d(u) if u is not None else None})


def current_members(team: str) -> list[str]:
    return [m["person_id"] for m in memberships if m["team_id"] == team and m["until"] is None
            and next(p for p in people if p["id"] == m["person_id"])["status"] == "active"]


def lead_of(team: str) -> str:
    return next(x["person_id"] for x in leads if x["team_id"] == team and x["until"] is None)


# ---------------------------------------------------------------- services
SERVICES = [  # id-token, team, tier, customer_facing, description
    ("checkout_api", "team_payments", 1, True, "Public checkout API used by merchant storefronts"),
    ("payments_gateway", "team_payments", 1, False, "Routes authorizations to acquirers and card networks"),
    ("fraud_scoring", "team_payments", 1, False, "Real-time fraud risk scoring for transactions"),
    ("card_vault", "team_payments", 1, False, "PCI-scoped tokenization and card data vault"),
    ("ledger", "team_ledger", 1, False, "Double-entry ledger of all money movement"),
    ("reconciliation", "team_ledger", 2, False, "Daily reconciliation against bank and acquirer files"),
    ("payouts", "team_ledger", 1, True, "Merchant payout scheduling and bank transfers"),
    ("auth", "team_identity", 1, False, "Authentication, sessions and MFA"),
    ("user_profile", "team_identity", 2, False, "Consumer and merchant profile store"),
    ("mobile_api", "team_mobile", 1, True, "Backend for the consumer mobile wallet"),
    ("push_notifications", "team_mobile", 2, False, "Push and in-app notification delivery"),
    ("data_warehouse", "team_data", 2, False, "Analytical warehouse"),
    ("etl_pipeline", "team_data", 2, False, "Batch ingestion into the warehouse"),
    ("reporting", "team_data", 3, False, "Merchant and finance reporting"),
    ("ml_features", "team_data", 2, False, "Feature store for fraud and risk models"),
    ("k8s_platform", "team_infra", 1, False, "Shared Kubernetes runtime"),
    ("secrets_manager", "team_infra", 1, False, "Secrets and key management"),
    ("ci_runner", "team_infra", 3, False, "Build and test runners"),
    ("observability", "team_infra", 2, False, "Metrics, logs and tracing"),
    ("merchant_dashboard", "team_merchant", 2, True, "Merchant web dashboard"),
    ("onboarding_kyc", "team_merchant", 1, True, "Merchant onboarding and KYC checks"),
    ("webhooks", "team_merchant", 2, False, "Outbound merchant webhooks"),
    ("status_page", "team_it", 3, False, "Public status page"),
    ("docs_portal", "team_it", 3, False, "Internal documentation portal"),
    ("email_relay", "team_it", 3, False, "Transactional email relay"),
]
CONTROL_SERVICES = ["svc_status_page", "svc_docs_portal", "svc_email_relay"]
services = [{"id": f"svc_{t}", "name": t.replace("_", "-"), "tier": tier, "customer_facing": cf,
             "description": desc, "team_id": team} for t, team, tier, cf, desc in SERVICES]
svc_team = {s["id"]: s["team_id"] for s in services}

DEPS = {
    "checkout_api": ["payments_gateway", "fraud_scoring", "auth"],
    "payments_gateway": ["card_vault", "ledger"],
    "fraud_scoring": ["ml_features"],
    "ml_features": ["data_warehouse"],
    "reconciliation": ["ledger", "data_warehouse"],
    "payouts": ["ledger"],
    "auth": ["user_profile", "secrets_manager"],
    "card_vault": ["secrets_manager"],
    "mobile_api": ["auth", "payments_gateway", "push_notifications"],
    "merchant_dashboard": ["reporting", "webhooks", "auth"],
    "reporting": ["data_warehouse"],
    "etl_pipeline": ["data_warehouse"],
    "onboarding_kyc": ["user_profile"],
    "observability": ["k8s_platform"],
    "ci_runner": ["k8s_platform"],
}
dependencies = [{"from": f"svc_{a}", "to": f"svc_{b}"} for a, bs in DEPS.items() for b in bs]

customer_paths = [
    {"id": "cp_checkout", "name": "Checkout", "description": "Shopper pays a merchant online",
     "service_ids": ["svc_checkout_api"]},
    {"id": "cp_mobile_pay", "name": "Mobile wallet pay", "description": "Consumer pays with the wallet app",
     "service_ids": ["svc_mobile_api"]},
    {"id": "cp_merchant_payouts", "name": "Merchant payouts", "description": "Merchant receives settlement funds",
     "service_ids": ["svc_payouts", "svc_merchant_dashboard"]},
    {"id": "cp_merchant_signup", "name": "Merchant sign-up", "description": "New merchant completes onboarding",
     "service_ids": ["svc_onboarding_kyc"]},
]

CONTROLS = [  # token, name, framework, severity_weight
    ("encrypt_at_rest", "Encryption at rest", "PCI DSS 3.5", 5),
    ("tls_modern", "Modern TLS only (1.2+)", "PCI DSS 4.2", 5),
    ("tls_pinning", "Certificate pinning in mobile clients", "OWASP MASVS", 4),
    ("key_rotation", "Cryptographic key rotation", "PCI DSS 3.6", 5),
    ("mfa_admin", "MFA for administrative access", "SOC 2 CC6.1", 4),
    ("code_review", "Mandatory code review", "SOC 2 CC8.1", 3),
    ("test_coverage", "Required automated tests before release", "Internal SDLC", 2),
    ("change_approval", "Change approval before production deploy", "SOC 2 CC8.1", 3),
    ("pii_export", "No manual export of personal data", "GDPR Art. 32", 4),
    ("cost_budget", "Service cost budget limits", "FinOps policy", 1),
    ("strong_customer_auth", "Strong customer authentication (3-D Secure)", "PSD2 SCA", 5),
    ("vuln_patching", "Critical vulnerabilities patched within 14 days", "SOC 2 CC7.1", 4),
]
controls = [{"id": f"ctl_{t}", "name": n, "framework": f, "severity_weight": w, "description": n}
            for t, n, f, w in CONTROLS]

runbooks = [{"id": f"rbk_{t}", "name": n, "url": f"https://wiki.northwindpay.example/runbooks/{t}"} for t, n in [
    ("acquirer_failover", "Acquirer failover"), ("vault_break_glass", "Vault break-glass access"),
    ("ledger_replay", "Ledger replay"), ("auth_lockout", "Auth mass-lockout recovery"),
    ("etl_backfill", "ETL backfill"), ("cert_rotation", "Certificate rotation"),
]]

# ---------------------------------------------------------------- exceptions
exceptions, ccs, evidence, renewals = [], [], [], []


def cc(cid, desc, verified_days=-5, ok=True, relies_on=()):
    ccs.append({"id": cid, "description": desc, "last_verified_at": d(verified_days) if verified_days is not None else None,
                "verified_ok": ok, "verify_interval_days": 30, "relies_on": list(relies_on)})
    return cid


def exc(eid, title, kind, sev, granted, expires, control, svcs, owner, *, status="active", approver=None,
        cc_ids=(), desc=None, ev=None, **extra):
    team = svc_team[svcs[0]]
    exceptions.append({
        "id": eid, "title": title, "kind": kind, "status": status, "severity": sev,
        "granted_at": d(granted), "expires_at": d(expires), "description": desc or title,
        "control_id": control, "service_ids": list(svcs), "owner_id": owner,
        "approver_id": approver or lead_of(team), "compensating_control_ids": list(cc_ids),
        "requester_kind": "person", **extra,
    })
    if ev:
        kind_, ref, excerpt = ev
        evidence.append({"id": "ev_" + eid[4:], "exception_id": eid, "kind": kind_, "source_ref": ref,
                         "captured_at": d(granted), "excerpt": excerpt})


SAM = pid("Sam Okafor")

# S1 Checkout Collision (+R1 expiring/expired, +R7 stale, +R3 via Sam)
exc("exc_chk_3ds_bypass", "3-D Secure challenge bypass for low-value carts", "flag_override", 4, -60, 3,
    "ctl_strong_customer_auth", ["svc_checkout_api"], pid("Hana Sato"),
    cc_ids=[cc("cc_fraud_spot_check", "Manual fraud spot-check of bypassed transactions", relies_on=[SAM])],
    ev=("ticket", "PAY-4821", "Conversion dropped 6% with 3DS on sub-€30 carts; bypass approved until the frictionless flow ships."))
exc("exc_gw_tls_legacy", "Legacy TLS 1.1 allowed on acquirer link", "security_waiver", 5, -120, -2,
    "ctl_tls_modern", ["svc_payments_gateway"], pid("Luis Ortega"),
    cc_ids=[cc("cc_acquirer_ip_allowlist", "IP allowlist on the acquirer link", verified_days=-60,
               relies_on=["rbk_acquirer_failover"])],
    ev=("email", "acquirer-thread-2026-06", "Acquirer cannot move off TLS 1.1 before their Q3 upgrade."))
exc("exc_gw_rate_limit", "Raised authorization rate limit for holiday peak", "cost_limit_extension", 3, -30, 45,
    "ctl_cost_budget", ["svc_payments_gateway"], pid("Grace Mensah"),
    cc_ids=[cc("cc_refund_manual_review", "Manual review of refunds above €500", relies_on=[SAM])])
exc("exc_fraud_model_skip", "Model drift tests skipped for fraud model v12", "skipped_test", 3, -20, 40,
    "ctl_test_coverage", ["svc_fraud_scoring"], pid("Hana Sato"),
    cc_ids=[cc("cc_fraud_shadow", "Shadow scoring against model v11")])
exc("exc_vault_hsm_pin", "HSM firmware pinned to vulnerable version", "emergency_change", 4, -25, 50,
    "ctl_vuln_patching", ["svc_card_vault"], pid("Grace Mensah"),
    cc_ids=[cc("cc_vault_log_review", "Nightly vault access log review", relies_on=[SAM])],
    ev=("ticket", "SEC-1177", "Vendor firmware 4.2 breaks tokenization; staying on 4.0.3 with compensating monitoring."))

# S2 Ghost Owner (left) + moved owner
exc("exc_ghost_vault_key", "Key rotation deferred for card-vault master key", "security_waiver", 4, -150, 30,
    "ctl_key_rotation", ["svc_card_vault"], pid("Priya Raman"), approver=pid("Rachel Green"),
    ev=("chat", "#payments-eng 2026-05-20", "Priya: rotating the master key needs a vault freeze; I'll own this until Q4."))
exc("exc_ledger_batch_export", "Manual batch export of ledger entries for auditors", "data_export_permission", 3, -90, 25,
    "ctl_pii_export", ["svc_reconciliation"], pid("Dmitri Volkov"),
    cc_ids=[cc("cc_export_encrypted", "Exports encrypted and deleted after 7 days")])

# S4 Renewal Treadmill
mobile_owner = pid("Amara Nwosu")
tls_cc = cc("cc_mobile_runtime_check", "Runtime integrity check in the wallet app", relies_on=["rbk_cert_rotation"])
for i, (g, e, st) in enumerate([(-300, -210, "renewed"), (-210, -120, "renewed"), (-120, -30, "renewed"), (-30, 60, "active")], 1):
    exc(f"exc_tls_pin_{i}", "Certificate pinning disabled in wallet app", "security_waiver", 3, g, e,
        "ctl_tls_pinning", ["svc_mobile_api"], mobile_owner, status=st, cc_ids=[tls_cc])
    if i > 1:
        renewals.append({"from": f"exc_tls_pin_{i}", "to": f"exc_tls_pin_{i - 1}"})

# S5 Quiet Expiry Week (Data Platform, 28 Oct – 2 Nov)
for eid, title, kind, sev, exp, svc, owner in [
    ("exc_etl_pii_columns", "PII columns ingested unmasked during migration", "data_export_permission", 3, 11, "svc_etl_pipeline", "Arjun Mehta"),
    ("exc_etl_change_freeze", "Pipeline deploys without change approval", "emergency_change", 2, 12, "svc_etl_pipeline", "Nora Fischer"),
    ("exc_reporting_budget", "Reporting cluster over cost budget", "cost_limit_extension", 2, 14, "svc_reporting", "Fatima Zahra"),
    ("exc_features_tests", "Feature store integration tests skipped", "skipped_test", 2, 16, "svc_ml_features", "Pedro Alves"),
]:
    ctl = {"data_export_permission": "ctl_pii_export", "emergency_change": "ctl_change_approval",
           "cost_limit_extension": "ctl_cost_budget", "skipped_test": "ctl_test_coverage"}[kind]
    exc(eid, title, kind, sev, -60, exp, ctl, [svc], pid(owner),
        cc_ids=[cc("cc_" + eid[4:], f"Weekly check: {title.lower()}")])

# Control services: one healthy exception each
for svc, title, owner in [("svc_status_page", "Status page served without CDN failover", "Sara Lindqvist"),
                          ("svc_docs_portal", "Docs portal behind basic auth instead of SSO", "Victor Dubois"),
                          ("svc_email_relay", "Email relay cost budget raised for newsletter", "Hiro Nakamura")]:
    exc("exc_ctl_" + svc[4:], title, "security_waiver" if "auth" in title else "cost_limit_extension", 1, -20, 90,
        "ctl_cost_budget" if "budget" in title else "ctl_mfa_admin", [svc], pid(owner),
        cc_ids=[cc("cc_ctl_" + svc[4:], "Monthly manual verification")])

# Noise: healthy active exceptions on non-control services
NOISE_TITLES = {
    "security_waiver": ["Admin console reachable without VPN", "Service account with broad IAM role", "Container image runs as root",
                        "Audit log retention below policy", "Shared credentials for batch job"],
    "flag_override": ["Feature flag forced on for beta merchants", "Kill switch disabled during migration", "Legacy API version kept enabled"],
    "skipped_test": ["Contract tests skipped for internal client", "Load test skipped before release", "Flaky e2e suite quarantined"],
    "cost_limit_extension": ["Autoscaling ceiling raised", "Log ingestion over budget", "Reserved capacity extension"],
    "data_export_permission": ["Analyst export of anonymized sample", "Partner data share for pilot"],
    "emergency_change": ["Hotfix deployed without second reviewer", "Database index created in production by hand"],
}
CTL_FOR = {"security_waiver": ["ctl_mfa_admin", "ctl_encrypt_at_rest", "ctl_vuln_patching"],
           "flag_override": ["ctl_change_approval", "ctl_code_review"],
           "skipped_test": ["ctl_test_coverage"],
           "cost_limit_extension": ["ctl_cost_budget"],
           "data_export_permission": ["ctl_pii_export"],
           "emergency_change": ["ctl_change_approval", "ctl_code_review"]}
noise_services = [s["id"] for s in services if s["id"] not in CONTROL_SERVICES]
spare_runbooks = ["rbk_vault_break_glass", "rbk_ledger_replay", "rbk_auth_lockout", "rbk_etl_backfill"]
for i in range(1, 23):
    svc = rng.choice(noise_services)
    kind = rng.choice(sorted(NOISE_TITLES))
    sev = rng.choice([1, 1, 2, 2, 2, 3])
    owner = rng.choice([p for p in current_members(svc_team[svc]) if p != lead_of(svc_team[svc])])
    cc_ids = []
    if sev >= 3 or rng.random() < 0.6:
        relies = [spare_runbooks.pop()] if spare_runbooks and rng.random() < 0.5 else []
        cc_ids = [cc(f"cc_n{i:02d}", "Compensating monitoring and alerting", verified_days=-rng.randint(1, 20), relies_on=relies)]
    exc(f"exc_n{i:02d}", rng.choice(NOISE_TITLES[kind]), kind, sev, -rng.randint(10, 150), rng.randint(35, 200),
        rng.choice(CTL_FOR[kind]), [svc], owner, cc_ids=cc_ids)

# Historical: closed / revoked (the departed Kofi owns one), and drafts
for i in range(1, 18):
    svc = rng.choice(noise_services)
    kind = rng.choice(sorted(NOISE_TITLES))
    status = "closed" if i % 3 else "revoked"
    g = -rng.randint(200, 400)
    owner = pid("Kofi Asante") if i == 1 else rng.choice(current_members(svc_team[svc]))
    end = g + rng.randint(30, 120)
    extra = {"closed_at": d(end), "closed_reason": "Underlying fix shipped"} if status == "closed" else {"revoked_at": d(end)}
    exc(f"exc_h{i:02d}", rng.choice(NOISE_TITLES[kind]), kind, rng.randint(1, 4), g, end + 30,
        rng.choice(CTL_FOR[kind]), [svc], owner, status=status, **extra)
for i, (svc, title, kind) in enumerate([("svc_webhooks", "Webhook signing disabled for one partner", "security_waiver"),
                                        ("svc_ci_runner", "Skip SAST on documentation-only builds", "skipped_test"),
                                        ("svc_payouts", "Same-day payout limit increase", "cost_limit_extension")], 1):
    exc(f"exc_d{i:02d}", title, kind, 2, 0, 60, CTL_FOR[kind][0], [svc],
        rng.choice(current_members(svc_team[svc])), status="draft")

assert len(exceptions) == 60, len(exceptions)

bundle = {
    "bundle_version": 1,
    "exported_at": AS_OF,
    "teams": teams, "people": people, "memberships": memberships, "leads": leads,
    "services": services, "dependencies": dependencies, "customer_paths": customer_paths, "controls": controls,
    "runbooks": runbooks, "compensating_controls": ccs, "exceptions": exceptions, "evidence": evidence,
    "renewals": renewals,
}

ground_truth = {
    "as_of": AS_OF,
    "scenarios": [
        {"id": "S1", "name": "Checkout Collision", "expect": [{"rule": "R4", "subject": "svc_checkout_api"},
                                                              {"rule": "R8", "subject": "cp_checkout"}]},
        {"id": "S2", "name": "Ghost Owner", "expect": [{"rule": "R2", "subject": "exc_ghost_vault_key"},
                                                       {"rule": "R2", "subject": "exc_ledger_batch_export"}]},
        {"id": "S3", "name": "Single Fallback", "expect": [{"rule": "R3", "subject": SAM}]},
        {"id": "S4", "name": "Renewal Treadmill", "expect": [{"rule": "R5", "subject": "exc_tls_pin_4"}]},
        {"id": "S5", "name": "Quiet Expiry Week", "expect": [{"rule": "R6", "subject": "team_data"}]},
    ],
    "critical_services": ["svc_checkout_api", "svc_payments_gateway"],
    "control_services": CONTROL_SERVICES,
    "owner_resolution": [
        {"exception": "exc_ghost_vault_key", "expected_first": pid("Marcus Bell")},
        {"exception": "exc_ledger_batch_export", "expected_first": pid("Elena Petrova")},
    ],
}

if __name__ == "__main__":
    (ROOT / "data/seed").mkdir(parents=True, exist_ok=True)
    (ROOT / "data/seed/northwind.json").write_text(json.dumps(bundle, indent=1, ensure_ascii=False) + "\n")
    (ROOT / "data/ground_truth.json").write_text(json.dumps(ground_truth, indent=1) + "\n")
    print(f"teams={len(teams)} people={len(people)} services={len(services)} exceptions={len(exceptions)} "
          f"ccs={len(ccs)} evidence={len(evidence)}")
