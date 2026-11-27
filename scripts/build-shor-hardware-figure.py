"""Render the RSA-2048 hardware landscape figure from the site's runtime data."""

from pathlib import Path

import matplotlib
import yaml

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FixedLocator, NullLocator

SITE = Path(__file__).resolve().parents[1]
OUT = SITE / "assets/imgs/shor/hardware-landscape.png"
DATA = yaml.safe_load((SITE / "_data/shor_hardware_estimates.yml").read_text(encoding="utf-8"))

INK = "#111827"
MUTED = "#374151"
GRID = "#e2e8f0"
OURS = "#0b63c4"
COLORS = {
    "surface": "#4b5563",
    "atoms": "#0f766e",
    "qldpc": "#6d28d9",
    "cat": "#9a3412",
}

# Short plot labels and label offsets (points) keyed by the scenario ID.
LABELS = {
    "ge21": ("Gidney & Ekerå 2021", (-12, -26), "right"),
    "gidney25": ("Gidney 2025", (120, 40), "left"),
    "cain-compact": ("Cain et al. · compact", (125, 10), "left"),
    "cain-balanced": ("Cain et al. · balanced", (125, 12), "left"),
    "cain-102k": ("Cain et al. · parallel", (125, 30), "left"),
    "pin10-month": ("Pinnacle 1.0", (125, 20), "left"),
    "pin12-std": ("Pinnacle 1.2", (-25, 18), "right"),
    "pin12-low": ("Pinnacle 1.2 · lower error", (150, -20), "left"),
    "cat-serial": ("Cat qubits · serial", (-10, 70), "center"),
    "cat-fast": ("Cat qubits · 10 chips", (15, 25), "left"),
    "our-surface": ("Our surface-code scenario", (70, -15), "left"),
    "our-balanced": ("Our Cain balanced scenario", (95, -45), "left"),
    "our-pinnacle": ("Our Pinnacle 1.0 scenario", (35, 8), "left"),
    "our-cat": ("Our cat-qubit scenario", (-55, -36), "center"),
}
TABLE = [
    ("Gidney surface code", "our-surface"),
    ("Cain balanced", "our-balanced"),
    ("Pinnacle 1.0", "our-pinnacle"),
    ("LDPC cat qubits", "our-cat"),
]

plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11})


def qubits(n, exact=False):
    if exact and n < 1e6:
        return f"{n:,.0f}"
    if n >= 1e6:
        return f"{n / 1e6:.2f}".rstrip("0").rstrip(".") + "M"
    return f"{n / 1e3:.1f}".rstrip("0").rstrip(".") + "k"


def years_or_days(days):
    if days < 1:
        return f"{days:.3f} days"
    return f"{days / 365.25:.1f} years" if days >= 365 else f"{days:.2f} days"


by_id = {row["id"]: row for row in DATA["estimates"] + DATA["ours"]}
our_ids = {row["id"] for row in DATA["ours"]}
fig = plt.figure(figsize=(16, 12.4), dpi=100, facecolor="white")
fig.text(0.122, 0.955, "What would it take to factor RSA-2048?", fontsize=30, weight="bold", color=INK)
fig.text(0.122, 0.918, "Published hardware estimates and our conditional scenarios (★)", fontsize=17, color=MUTED)
ax = fig.add_axes([0.122, 0.355, 0.84, 0.49])
ax.set(xscale="log", yscale="log", xlim=(8000, 3.6e7), ylim=(0.036, 220 * 365.25))
ax.xaxis.set_major_locator(FixedLocator([1e4, 1e5, 1e6, 1e7]))
ax.xaxis.set_major_formatter(lambda v, _: {1e4: "10k", 1e5: "100k", 1e6: "1M", 1e7: "10M"}[v])
ticks = {1 / 24: "1 hour", 1: "1 day", 30: "1 month", 365.25: "1 year", 3652.5: "10 years", 36525: "100 years"}
ax.yaxis.set_major_locator(FixedLocator(list(ticks)))
ax.yaxis.set_major_formatter(lambda v, _: ticks.get(v, ""))
for axis in (ax.xaxis, ax.yaxis):
    axis.set_minor_locator(NullLocator())
ax.grid(color=GRID, linewidth=1.2)
ax.set_axisbelow(True)
ax.tick_params(labelsize=15, colors=MUTED, length=0)
for name in ("top", "right"):
    ax.spines[name].set_visible(False)
ax.set_xlabel("Physical qubits (log scale)", fontsize=15, labelpad=10)
ax.set_ylabel("Estimated time to factor (log scale)", fontsize=15, labelpad=10)

for key, (label, offset, ha) in LABELS.items():
    row = by_id[key]
    ours = key in our_ids
    color = OURS if ours else COLORS[row["family"]]
    point = (row["qubits"], row["days"])
    marker = "*" if ours else ("v" if row.get("bound") else "o")
    ax.scatter(*point, s=320 if ours else 110, marker=marker, color=color,
               edgecolors="white", linewidths=1, zorder=4)
    ax.annotate(f"{label}\n{qubits(row['qubits'])} · {row['time']}", point,
                xytext=offset, textcoords="offset points", ha=ha, va="center",
                fontsize=14, color=color, linespacing=1.5,
                arrowprops={"arrowstyle": "-", "color": color, "lw": 1.1, "shrinkA": 0, "shrinkB": 7},
                bbox={"facecolor": "white", "edgecolor": "none", "pad": 2}, zorder=5)

fig.text(0.122, 0.24, "Comparisons within each model", fontsize=20, weight="bold", color=INK)
fig.text(0.122, 0.208, "Physical qubits and estimated time to factor", fontsize=14, color=MUTED)
columns = (0.128, 0.42, 0.672)
top, step = 0.18, 0.0255
for i, header in enumerate(("Hardware model", "Reference used in our paper", "Our circuit")):
    fig.text(columns[i], top, header, fontsize=14, weight="bold", color=INK, va="center")
for r, (model, key) in enumerate(TABLE):
    row = by_id[key]
    y = top - (r + 1) * step
    if r % 2 == 0:
        fig.patches.append(plt.Rectangle((0.122, y - step / 2), 0.84, step, transform=fig.transFigure,
                                         color="#f1f5fa", zorder=0))
    ref_qubits = qubits(row["ref_qubits"], True)
    if row["family"] in ("cat", "qldpc"):
        ref_qubits = f"≤{ref_qubits}"
    fig.text(columns[0], y, model, fontsize=14, color=INK, va="center")
    fig.text(columns[1], y, f"{ref_qubits} · {years_or_days(row['ref_days'])}",
             fontsize=14, color=INK, va="center")
    fig.text(columns[2], y, f"{qubits(row['qubits'], True)} · {row['time']}",
             fontsize=14, color=OURS, va="center")
fig.patches.append(plt.Rectangle((0.122, top - step / 2), 0.84, step, transform=fig.transFigure,
                                 color="#f1f5fa", zorder=0))
low, high = by_id["our-cat"]["range"]
fig.text(0.122, 0.035, f"The cat-qubit projection is {low:.3f}–{high:.3f} days across the two residual-overhead assumptions.",
         fontsize=14, color=MUTED)
fig.savefig(OUT, dpi=100, facecolor="white", metadata={"Software": None})
print(OUT)
