# Token Radar — which pre-token protocol is worth farming next

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/lkk667/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/lkk667/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A web dashboard that ranks the protocols that record no token yet by what their launch would be worth, each with the steps to farm it. It reads a sealed DefiLlama snapshot (758 protocols, 14 November 2026), covers the whole 40-protocol watchlist plus every other rankable pre-token protocol — 289 rows — and prices each one with a model read off the snapshot itself: the TVL multiple is the median market-cap-to-TVL ratio of the live-token protocols in that category, not a hand-picked number.

## The model (radar-2)

```
multiple   = median mcap / TVL of live tokens in the protocol's category
             (fewer than 3 live tokens: the snapshot median, clamped 0.05–0.80)
base       = TVL × multiple
growth     = 1 + clamp(7d change, -50%, 150%) / 100 × 0.6
maturity   = 0.7 + min(age, 1095d) / 1095 × 0.3   (age unknown: 365d)
breadth    = 1 + 0.01 × min(chains, 10)
implied    = TVL × multiple × growth × maturity × breadth
```

No protocol name is ever special-cased. The dashboard states the formula, prints the category multiples the run computed, and has a sandbox that re-runs the same formula in the browser so a reader can move the constants and watch the board re-rank.

## The dashboard

- **Board** — sortable, searchable, filterable by category, chain and watchlist; every row opens a detail view.
- **Detail view** — the implied value built factor by factor, plus a six-step farm plan with what each step costs and how long it takes.
- **Live tokens** — the protocols whose token already trades, at the market's own values, so the model's multiples can be checked.
- **Model & method** — the formula, the category table, and the sandbox.

“Records no token” means the snapshot record carries none — it is not proof the protocol has none. An implied value is this entry's own claim, never a promise of a launch, a price or an airdrop.

## Run it

Node 22.18 or later, standard library only:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <path to the kit's input/snapshot.json>
```

`main.ts` writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and `dossier.json` to the output directory. Two runs write the same bytes.

[make.fun bounty: Build the best token launch radar](https://make.fun/bounty/token-radar-01)
