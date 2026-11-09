# ECDSA project figure evidence

`public-frontier-20261109.json` records the 9 November 2026 public frontier,
the three objective leaders, and MonitSharma's best scored results. It records
the source endpoint and eligibility rules. The frontier keeps one
representative per nondominated resource pair. The two plotted dates use the
same criterion: accepted or score-only rejected submissions with consistent
official resource metrics.

`public-frontier.json` is the earlier snapshot from 20 October 2026, retained for
the comparison plot and the historical gate-count figure. Earlier snapshots
are in `public-frontier-20261014.json` and `public-frontier-20261017.json`.

`official-records-20261020.json` and `validation-evidence-20261020.json` preserve the
service metrics and separate fresh-input tests for the 20 October entries.
For the 21 October low-gate circuit, the official receipt and submission note
are linked from the project page.

The browser captures `leaderboard-product-20261017.jpg` and
`leaderboard-pareto-20261017.jpg` record historical standings in Singapore time.
`component-evidence.json`, `compact-reciprocal.*`, and `product-comparison.*` record
earlier experiments.

Regenerate the PNG and SVG plots from the portfolio directory with:

```sh
python scripts/build-ecdsa-figures.py
```

The renderer requires Matplotlib and uses the two pinned snapshots.
