# Ultra-Budget XMRig Mining Rig — Blueprint & ROI Analysis

*Compiled: 2026-07-12. All prices/market data are point-in-time and volatile — re-check before buying.*

## Market Snapshot (as of 2026-07-12)

| Metric | Value | Notes |
|---|---|---|
| XMR price | ~$322 | Ranged $300–$325 in early July 2026 |
| Network hashrate | ~5.5–5.8 GH/s | RandomX |
| Difficulty | ~655 G | Retargets every block to ~120 s |
| Block reward | 0.6 XMR | Tail emission (fixed, no more halvings) |
| Blocks/day | 720 | 86,400 s ÷ 120 s |
| Network emission | ~432 XMR/day | 720 × 0.6 |
| **Revenue per KH/s/day (direct XMR)** | **~$0.024** | 432 × (1000 / 5.5e9) × $322, minus ~1% fee |
| **Revenue per KH/s/day (MoneroOcean, +~12%)** | **~$0.027** | Algo-switch uplift, paid in XMR |

> **Reality check up front:** In 2026, CPU mining profit is dominated by **hashes-per-watt**, not raw hashrate. At $0.10/kWh a cheap Zen 3 rig is roughly break-even; only efficient Zen 4 chips clear a real margin. Below $0.06/kWh (or free power) almost anything profits; above $0.12/kWh most CPUs lose money.

---

## 1. The Hardware Blueprint

RandomX loves **large L3 cache + low-latency dual-channel memory + Infinity Fabric synced 1:1**. Core count matters only if each thread gets ~2 MB of L3. That single fact drives every choice below.

### Build A — Lowest Upfront Cost (AM4 / Zen 3) — the literal "ultra-budget" answer

| Part | Model | Why | Price (used/new) |
|---|---|---|---|
| **CPU** | **AMD Ryzen 9 5900X** (12C/24T) | **64 MB L3** (2× CCD) is the RandomX sweet spot; ~13.5 KH/s tuned | ~$200 used |
| **Motherboard** | **MSI B450M PRO-VDH MAX** (or ASRock B450 Pro4) | Cheapest board that **allows memory overclock** (A520 does NOT — avoid it). Has BIOS Flashback for Zen 3 support | ~$55 |
| **RAM** | **2×8 GB DDR4-3600 CL16** (dual-channel) | Dual-channel is mandatory; single-channel halves hashrate. 16 GB is enough (RandomX dataset ≈2.3 GB). Dual-rank (2×16) adds ~2–3% if budget allows | ~$45–90 |
| **PSU** | Corsair CX450 / EVGA 500 BR (80+ Bronze) | CPU-only rig pulls ~135–200 W; 450 W is ample and efficient at low load | ~$45 |
| **Storage** | 128 GB SATA SSD (or boot from USB, headless) | OS only; miner is tiny | ~$15 |
| **Cooler** | Thermalright Assassin X 120 / Peerless Assassin | Sustained 100% load needs real cooling to hold the undervolt | ~$20 |
| **Frame** | Open-air bench / cardboard / $15 frame | No GPU, no fancy case needed | ~$0–15 |
| **TOTAL** | | | **~$390–430** |

- **Hashrate:** ~13.5 KH/s tuned (13,120 H/s stock → ~14,000 H/s with DDR4-3800 CL16)
- **Efficiency:** ~90–100 H/W at the wall (undervolted)

### Build B — Best Efficiency / Best Long-Run Value (AM5 / Zen 4) — *recommended if power ≥ $0.08*

| Part | Model | Notes | Price |
|---|---|---|---|
| **CPU** | **AMD Ryzen 9 7900 (non-X, 65 W)** | ~22 KH/s at ~95 W wall → **~230 H/W**. The efficiency king per dollar. (7950X ≈29 KH/s @ ~145 W if you want more absolute output.) | ~$330 (7900) / ~$450 (7950X) |
| **Motherboard** | Cheapest B650 (ASRock B650M-HDV/M.2) | AM5, supports EXPO memory OC | ~$110 |
| **RAM** | 2×16 GB DDR5-6000 CL30 (EXPO) | Zen 4 RandomX scales hard with DDR5 bandwidth + FCLK | ~$95 |
| PSU / SSD / Cooler / Frame | Same class as Build A | | ~$95 |
| **TOTAL** | | | **~$540 (7900) / ~$650 (7950X)** |

- **Why it wins:** ~2× the hashes-per-watt of Zen 3. At normal power prices, efficiency — not upfront cost — decides whether you profit at all.

### CPUs considered and why not

- **Ryzen 5 5500 (~$70):** Cheapest, but only 16 MB L3 → starves RandomX threads. Poor H/W. Skip.
- **Ryzen 5 5600 (~$100):** 32 MB L3, ~6.7 KH/s @ ~76 W. Decent H/W but low absolute margin.
- **Ryzen 7 5700X (~$140):** 8C, 32 MB L3, ~9 KH/s @ 65 W TDP. Good efficiency, middle ground.
- **Ryzen 9 5950X (~$300):** 16C, 64 MB L3, ~17.5 KH/s. Best Zen 3 hashrate but worse $/KH/s than the 5900X.
- **Used server EPYC (7B12/7742):** Enormous hashrate & great H/W, but higher upfront + platform complexity — not "ultra-budget."

---

## 2. Financial Analysis & ROI

Assumptions: MoneroOcean effective revenue **~$0.027/KH/s/day**, tuned/undervolted wall power, XMR $322.

### Build A — Ryzen 9 5900X (~$410 upfront, 13.5 KH/s, ~135 W wall)

- **Daily gross revenue:** 13.5 × $0.027 ≈ **$0.365/day** (direct-XMR pool ≈ $0.324/day)
- **Daily energy:** 0.135 kW × 24 h = **3.24 kWh/day**

| Power price | Daily electricity | Net/day | Net/month | Break-even (ROI) |
|---|---|---|---|---|
| **$0.05/kWh** | $0.162 | **+$0.203** | +$6.09 | ~1,970 days (~5.4 yr) |
| **$0.10/kWh** | $0.324 | **+$0.041** | +$1.23 | ~10,000 days (effectively never*) |
| **$0.15/kWh** | $0.486 | **−$0.121** | −$3.63 | Never — loses money |

### Build B — Ryzen 9 7900 (~$540 upfront, 22 KH/s, ~95 W wall)

- **Daily gross revenue:** 22 × $0.027 ≈ **$0.594/day**
- **Daily energy:** 0.095 kW × 24 h = **2.28 kWh/day**

| Power price | Daily electricity | Net/day | Net/month | Break-even (ROI) |
|---|---|---|---|---|
| **$0.05/kWh** | $0.114 | **+$0.480** | +$14.40 | ~1,125 days (~3.1 yr) |
| **$0.10/kWh** | $0.228 | **+$0.366** | +$10.98 | ~1,475 days (~4.0 yr) |
| **$0.15/kWh** | $0.342 | **+$0.252** | +$7.56 | ~2,143 days (~5.9 yr) |

\* At $0.10/kWh the 5900X barely covers its own electricity — hardware ROI stretches past the hardware's useful life. **This is the honest headline:** the cheaper build is *not* the more profitable build unless your power is very cheap or free.

**Sensitivity:** Revenue scales linearly with XMR price and inversely with network hashrate. If XMR doubles (or difficulty drops), halve the break-even days. If more miners join and hashrate rises, it lengthens. Treat every ROI number as a moving target.

---

## 3. Optimal Mining Method

| Method | Verdict | Detail |
|---|---|---|
| **A. Direct XMR pool** (P2Pool / SupportXMR) | Solid baseline | P2Pool = 0% fee + decentralized but needs a full node & ~higher variance for small rigs; SupportXMR ≈1% fee, easy. Predictable, pure XMR. |
| **B. MoneroOcean (algo-switching, pays in XMR)** | ✅ **Most profitable, recommended** | 0% fee, auto-mines the most profitable RandomX-family coin each moment, pays you in XMR. Historically **+5–15%/month** over static XMR. Set-and-forget. Min payout 0.003 XMR. |
| **C. CPU + cheap secondary GPU (dual mining)** | ❌ Not worth it | RandomX is a CPU-only algorithm — GPUs are terrible at it. Bolting on a GPU to mine a *different* algo (KawPow/etc.) rarely out-earns its own wattage in 2026 and its idle draw drags down your rig's overall H/W. Only consider if you already own an efficient GPU **and** power is free. |

**On GhostRider (Raptoreum):** also CPU-based and Zen chips do well on it, but coin liquidity/price have cratered and it's higher variance. MoneroOcean already captures the best RandomX-family coin automatically, so there's little reason to run a separate GhostRider pool. **Bottom line: run Method B (MoneroOcean).**

---

## 4. Step-by-Step Configuration

### Operating System — use **Linux** (Ubuntu Server 24.04 LTS, headless)
- Linux supports **1 GB huge pages** (Windows caps at 2 MB) → the single biggest hashrate boost, typically **+3–10%** over Windows.
- Lower idle overhead, run headless, auto-restart with `systemd`.
- Windows works but you must enable "Lock pages in memory" (Large Pages) via `gpedit`, run XMRig as Administrator, and you still leave 1 GB-page gains on the table.

### Critical BIOS settings (maximize H/W)
1. **Memory:** Enable **XMP (Intel) / EXPO or DOCP (AMD)** to hit rated speed. Then tune manually:
   - Zen 3: DDR4-3600–3800, CL16, low tRFC, Command Rate 1T if stable.
   - Zen 4: DDR5-6000, CL30 (EXPO), tune FCLK up.
2. **Infinity Fabric 1:1:** Keep **FCLK : UCLK : MCLK = 1:1:1** (FCLK 1800–1900 for DDR4-3600–3800). Latency > raw MHz for RandomX — never let the fabric fall out of sync.
3. **Undervolt for efficiency (this is where profit is made):**
   - **PBO → Curve Optimizer:** negative all-core offset, start **−20** and push toward −30 if stable. Holds clocks at lower voltage/heat.
   - **or Eco Mode / custom PPT-TDC-EDC:** cap the 5900X to ~65–105 W PPT to chase max hashes-per-watt (you lose a little hashrate, gain a lot of efficiency).
4. **Keep SMT ON** — RandomX uses 2 threads/core on Zen 9 chips (plenty of L3 to feed them).
5. **Trim idle draw:** disable onboard audio, RGB, extra USB/SATA controllers, Wi-Fi if unused.

### XMRig setup (run as root/admin)
- Enable in `config.json`: `"randomx": { "1gb-pages": true, "rdmsr": true, "wrmsr": true }`, plus `"huge-pages": true` and `"huge-pages-jit": true`.
- Running as **root on Linux lets XMRig apply MSR register tweaks automatically** (~+5–8%) and reserve huge pages.
- Reserve 1 GB pages at boot via GRUB: `default_hugepagesz=1G hugepagesz=1G hugepages=3`.
- Set the pool to `gulf.moneroocean.stream:10128` (TLS: `20128`), your XMR address as the user, and let it auto-tune thread count/affinity (or pin threads = 2 × physical cores).
- Verify after launch: XMRig prints `huge pages 100%` and `1GB pages` — if not, hashrate will be ~15–20% low.

---

## Sources
- [CoinWarz — Monero hashrate](https://www.coinwarz.com/mining/monero/hashrate-chart) / [difficulty](https://www.coinwarz.com/mining/monero/difficulty-chart)
- [minerstat — RandomX / XMR difficulty](https://minerstat.com/algorithm/randomx)
- [XMR mining profitability in 2026 (changee)](https://changee.com/xmr-mining-profitability-in-2026)
- [XMRig official RandomX benchmark DB](https://xmrig.com/benchmark)
- [Best budget mining CPUs 2026 (cpumining.pro)](https://cpumining.pro/en/blog/best-cpus-for-monero)
- [Best Monero pools 2026 (Coin Bureau)](https://coinbureau.com/mining/best-monero-pools)
- [Monero mining guide 2026 (Paybis)](https://paybis.com/blog/how-to-mine-monero/)

*Not financial advice. Verify local electricity rates, hardware prices, and live network stats before purchasing.*
