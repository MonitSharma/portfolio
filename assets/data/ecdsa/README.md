# ECDSA project figure evidence

The public comparison is a dated snapshot of 14 October 2026. `public-frontier.json`
contains officially scored records, the derived Pareto frontier, and an explicitly
labeled reproduction of an existing public circuit. It excludes failed, pending,
claimed-only, and non-score-related rejected submissions. The source endpoint,
retrieval time, and eligibility rule are stored alongside the data.

`component-evidence.json` contains isolated V-form fixture measurements from the
linked experiment receipt. These are emitted gate counts; they are not official
whole-circuit scores. The integrated candidate failed validation.

Regenerate the three PNG and SVG figures from the portfolio directory with:

```sh
python scripts/build-ecdsa-figures.py
```

The renderer requires Matplotlib and NumPy and reads only these pinned files.
It does not execute or alter the challenge implementation.
