# Mubin — AWS Deployment Handoff

> Context doc to resume the AWS deployment work. Last updated: 2026-06-04.
> The app is **live** on AWS and also still deployed on **Vercel** (`main` branch).

---

## TL;DR — current state

- **App is LIVE** at **http://56.68.51.25** (plain HTTP — no DNS/SSL yet, by choice).
- Runs as a **Next.js 16 standalone container + Caddy reverse proxy** via `docker compose` on a single **EC2 t3.micro** in **ap-southeast-5 (Malaysia)**.
- A **$10/mo AWS Budget** guards the account (email alerts at 80% actual + forecast).
- All deploy files live on the **`production`** git branch (kept separate from Vercel's `main`).
- **Open decision:** keep the EC2 box running, or tear it down. See [Decision pending](#decision-pending).

---

## Key facts / identifiers

| Thing | Value |
|---|---|
| AWS account | `307181770253` |
| IAM user | `mubin-deployer` |
| Region | `ap-southeast-5` (Malaysia) |
| CloudFormation stack | `mubin-prod` |
| Instance type | `t3.micro` (1 GiB RAM, burstable) — Free Tier eligible |
| AMI | `ami-0fd3f210040ef0ff6` (Amazon Linux 2023 x86_64) |
| Elastic IP (stable) | **`56.68.51.25`** |
| Default VPC / Subnet | `vpc-0643e4dc0fd8c7502` / `subnet-07f08b4d68de8d1d8` |
| SSH allowed from | `175.139.116.252/32` (owner IP at setup time) |
| Open ports | 22 (owner IP only), 80, 443 |
| Budget | `mubin-monthly-10usd` — $10/mo, alerts → `harithjamadi33@gmail.com` |
| SSH key | `deploy/mubin-key.pem` (gitignored; **not** in this repo's history) |
| Git remote | `https://github.com/harithjamadi/quran-study.git` |
| Deploy branch | `production` (EC2 deploys from here; Vercel uses `main`) |

---

## Architecture

```
Internet ──▶ Caddy (container, ports 80/443) ──▶ app (Next.js standalone, internal :3000)
                 │
                 └─ auto Let's Encrypt TLS (once a real domain points here)
EC2 t3.micro (Amazon Linux 2023) + 2 GB swap + Docker + docker compose
```

- The Next.js container is **internal-only** (`expose`, not `ports`) — never reachable directly; only Caddy can talk to it.
- App needs a running server (not pure static) because of API route handlers:
  `src/app/api/lemma/[lemma]/route.ts` and `src/app/api/roots/[root]/route.ts`
  (they read URL-encoded Arabic JSON files from `public/data/`). **Verified working** on the live box.

### Files (all on `production` branch)
- `docker-compose.yml` — app + Caddy services.
- `Caddyfile` — currently a `:80` block (HTTP on the IP). Swap to the `mubinapp.com` block for auto-HTTPS.
- `deploy/cloudformation.yml` — SG + instance + Elastic IP + cloud-init bootstrap.
- `deploy/budget.json` + `deploy/budget-notifications.json` — budget definition.
- `deploy/deploy.ps1` — idempotent orchestrator (budget → key → stack).
- `.dockerignore` — excludes `deploy/`, `.planning`, etc.

---

## How to access / operate

```bash
# Visit
http://56.68.51.25

# SSH (run from the deploy/ folder where mubin-key.pem lives)
ssh -i mubin-key.pem ec2-user@56.68.51.25

# Watch the boot/build log
ssh -i mubin-key.pem ec2-user@56.68.51.25 'sudo tail -100 /var/log/mubin-bootstrap.log'

# Redeploy after pushing to the `production` branch
ssh -i mubin-key.pem ec2-user@56.68.51.25
  cd /opt/mubin && git pull && docker compose up -d --build
```

> **Build note:** `next build` on 1 GiB RAM relies on the 2 GB swap the bootstrap adds. If a future build OOMs, confirm swap is on (`swapon --show`).

---

## Next steps (when ready)

### Enable `mubinapp.com` + free SSL (Let's Encrypt)
1. At your DNS registrar, add an **A record: `mubinapp.com` → `56.68.51.25`**.
2. In `Caddyfile`, delete the `:80 { ... }` block and uncomment the `mubinapp.com { ... }` block.
3. Commit + push to `production`, then on the box: `cd /opt/mubin && git pull && docker compose up -d`.
4. Caddy automatically obtains and auto-renews the cert. (Port 443 is already open.)

### If the repo is private
The bootstrap does an unauthenticated `git clone`. If `quran-study` becomes private, switch to a GitHub deploy key or token on the instance, or pre-bake the image.

---

## Decision pending: keep or tear down?

**Honest assessment from the discussion:**
- For a **personal / non-commercial** app, **Vercel free (Hobby)** is the better home — zero ops, global CDN, auto-deploys, multi-region reliability. The EC2 box costs ~**$8–11/mo** after the 12-month Free Tier window.
- **Keep the EC2 box if:** the site is/will be **commercial** (Vercel Hobby is non-commercial; Pro is $20/mo), you want **full control / no lock-in**, you're **learning AWS**, or you need to colocate other services.
- **Reliability & high traffic:** **Vercel wins decisively.** A single t3.micro is one box in one AZ with no CDN and no autoscaling — fine for low/moderate traffic (this app is mostly prerendered/cached, so it stretches further than typical), but no redundancy and global latency. Matching Vercel on AWS needs ALB + Auto Scaling + CloudFront (~$20–40+/mo, real ops).

### Tear down (guaranteed $0)
```powershell
aws cloudformation delete-stack --region ap-southeast-5 --stack-name mubin-prod
aws cloudformation wait stack-delete-complete --region ap-southeast-5 --stack-name mubin-prod
aws ec2 delete-key-pair --region ap-southeast-5 --key-name mubin-key
aws budgets delete-budget --account-id 307181770253 --budget-name mubin-monthly-10usd
```
> The Elastic IP releases automatically with the stack. Don't leave a half-deleted stack — an **unattached** Elastic IP starts billing.

---

## Verification done (2026-06-04)
- `GET /` → `200 OK`, served `Via: 1.1 Caddy`, title "Mubin — Making the Quran Clear".
- API route `GET /api/roots/<arabic-root>` → `200` with JSON; unknown root → `404 {"error":"root not found"}` (correct).
- Budget created and confirmed ($10/mo).
- Stack `mubin-prod` → `CREATE_COMPLETE`.
