"""Render the RSA-2048 hardware landscape figure from the site's runtime data."""

from pathlib import Path

import matplotlib
import yaml

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FixedLocator, NullLocator

SITE = Path(__file__).resolve().parents[1]
OUT = SITE / "assets/imgs/shor/hardware-landscape.png"
ROWS = yaml.safe_load((SITE / "_data/shor_runtime_estimates.yml").read_text())

INK = "#111827"
MUTED = "#374151"
GRID = "#e2e8f0"
OURS = "#0b63c4"
COLORS = {
    "Surface code": "#4b5563",
    "Neutral atoms": "#0f766e",
    "Pinnacle": "#6d28d9",
    "Cat qubits": "#9a3412",
}

# Short plot labels and label offsets (points) keyed by the data name.
LABELS = {
    "Gidney & Ekerå (2021)": ("Gidney & Ekerå 2021", (-12, -26), "right"),
    "Gidney (2025)": ("Gidney 2025", (120, 40), "left"),
    "Cain et al. · space-efficient": ("Cain et al. · compact", (125, -5), "left"),
    "Cain et al. · balanced": ("Cain et al. · balanced", (125, 0), "left"),
    "Cain et al. · parallel": ("Cain et al. · parallel", (125, 30), "left"),
    "Pinnacle 1.0 · one-month budget": ("Pinnacle 1.0", (125, 20), "left"),
    "Pinnacle 1.2 · standard error": ("Pinnacle 1.2", (90, 35), "left"),
    "Pinnacle 1.2 · lower error": ("Pinnacle 1.2 · lower error", (150, -20), "left"),
    "Pappalardo et al. · serial": ("Cat qubits · serial", (-10, 70), "center"),
    "Pappalardo et al. · ten chips": ("Cat qubits · 10 chips", (15, 25), "left"),
    "This work · surface-code scenario": ("Our surface-code scenario", (60, 20), "left"),
    "This work · balanced neutral atoms": ("Our Cain balanced scenario", (95, -45), "left"),
    "This work · Pinnacle 1.0 scenario": ("Our Pinnacle 1.0 scenario", (35, -25), "left"),
    "This work · cat-qubit scenario": ("Our cat-qubit scenario", (-10, -55), "center"),
}
TABLE = [
    ("Gidney surface code", "This work · surface-code scenario", "6 primes"),
    ("Cain balanced", "This work · balanced neutral atoms", "2 primes"),
    ("Pinnacle 1.0", "This work · Pinnacle 1.0 scenario", "8 primes"),
    ("LDPC cat qubits", "This work · cat-qubit scenario", "8 primes"),
]

plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11})


def qubits(n, exact=False):
    if exact and n < 1e6:
        return f"{n:,.0f}"
    if n >= 1e6:
        return f"{n / 1e6:.2f}".rstrip("0").rstrip(".") + "M"
    return f"{n / 1e3:.1f}".rstrip("0").rstrip(".") + "k"


def years_or_days(days):
    return f"{days / 365.25:.1f} years" if days >= 365 else f"{days:.2f} days"


by_name = {row["name"]: row for row in ROWS}
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

for row in ROWS:
    ours = row.get("ours", False)
    color = OURS if ours else COLORS[row["architecture"]]
    point = (row["qubits"], row["time_days"])
    marker = "*" if ours else ("v" if "≤" in row["time_label"] else "o")
    ax.scatter(*point, s=320 if ours else 110, marker=marker, color=color,
               edgecolors="white", linewidths=1, zorder=4)
    label, offset, ha = LABELS[row["name"]]
    ax.annotate(f"{label}\n{qubits(row['qubits'])} · {row['time_label']}", point,
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
for r, (model, name, primes) in enumerate(TABLE):
    row = by_name[name]
    y = top - (r + 1) * step
    if r % 2 == 0:
        fig.patches.append(plt.Rectangle((0.122, y - step / 2), 0.84, step, transform=fig.transFigure,
                                         color="#f1f5fa", zorder=0))
    ref = row["reference"]
    fig.text(columns[0], y, model, fontsize=14, color=INK, va="center")
    fig.text(columns[1], y, f"{qubits(ref['qubits'], True)} · {years_or_days(ref['time_days'])}",
             fontsize=14, color=INK, va="center")
    fig.text(columns[2], y, f"{qubits(row['qubits'], True)} · {row['time_label']} · {primes}",
             fontsize=14, color=OURS, va="center")
fig.patches.append(plt.Rectangle((0.122, top - step / 2), 0.84, step, transform=fig.transFigure,
                                 color="#f1f5fa", zorder=0))
low, high = by_name["This work · cat-qubit scenario"]["time_range_days"]
fig.text(0.122, 0.035, f"The cat-qubit scenario spans {low:.2f}–{high:.2f} days as movement and measurement overhead varies.",
         fontsize=14, color=MUTED)
fig.savefig(OUT, dpi=100, facecolor="white", metadata={"Software": None})
print(OUT)
