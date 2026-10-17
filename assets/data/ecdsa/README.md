# ECDSA project figure evidence

The current public comparison is a dated snapshot of 17 October 2026.
`public-frontier.json` contains officially scored records, their solver attribution,
the derived Pareto frontier, and the product and Toffoli leaders. It excludes failed,
pending, claimed-only, and non-score-related rejected submissions. The source
endpoint, retrieval time, and eligibility rule are stored alongside the data.

`official-records-20261017.json` preserves the public service metrics, disposition,
source revisions, and submission notes for both records. The product entry is
accepted and promoted; the lowest-Toffoli entry is officially scored and included
on the Pareto leaderboard but rejected solely because its product is not lower.

The unaltered browser captures `leaderboard-product-20261017.jpg` and
`leaderboard-pareto-20261017.jpg` show the challenge's two leaderboard views.
Their visible times are Singapore time. The leaderboard is live, so the project
labels these records and captures with the verification date.

The original 14 October snapshot is retained in `public-frontier-20261014.json`.
`component-evidence.json`, `compact-reciprocal.*`, and `product-comparison.*` are
historical material from that earlier project version. The failed compact
reciprocal experiment is separate from the two record circuits presented now.

Regenerate the two current PNG and SVG plots from the portfolio directory with:

```sh
python scripts/build-ecdsa-figures.py
```

The renderer requires Matplotlib and NumPy and reads only these pinned files.
It does not execute or alter the challenge implementation.
