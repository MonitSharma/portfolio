# ECDSA project figure evidence

The current public comparison is a dated snapshot of 20 October 2026.
`public-frontier.json` contains officially scored records, their solver attribution,
the derived Pareto frontier, global objective leaders, and the owner's best official
results. It excludes failed,
pending, claimed-only, and non-score-related rejected submissions. The source
endpoint, retrieval time, and eligibility rule are stored alongside the data.

`official-records-20261020.json` preserves public service metrics, dispositions,
source revisions, and submission notes. The latest product entry is accepted and
promoted but has since been superseded by another participant. The current
lowest-Toffoli entry is officially scored and Pareto-optimal, with a rejection
solely because its product is not lower. Its official service result supersedes
the earlier queued label in the pinned repository note.

`validation-evidence-20261020.json` records separate fresh-input diagnostic counts
from the public notes: 2,097,152 shots per source for the Toffoli circuit, and
16,777,216 per source for the product circuit. These measurements are not the
9,024-shot packets used for the official scores.

The unaltered browser captures `leaderboard-product-20261017.jpg` and
`leaderboard-pareto-20261017.jpg` show the challenge's two leaderboard views.
Their visible times are Singapore time. The project retains the Spacetime image
as a clearly historical product-champion milestone, rather than current standings.

Earlier snapshots are retained in `public-frontier-20261014.json` and
`public-frontier-20261017.json`, with the older official receipts kept separately.
`component-evidence.json`, `compact-reciprocal.*`, and `product-comparison.*` are
historical material from that earlier project version. The failed compact
reciprocal experiment is separate from the two record circuits presented now.

Regenerate the two current PNG and SVG plots from the portfolio directory with:

```sh
python scripts/build-ecdsa-figures.py
```

The renderer requires Matplotlib and reads only the pinned public snapshot.
It does not execute or alter the challenge implementation.
