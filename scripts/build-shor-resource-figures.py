"""Render the RSA-2048 logical resource plots from the site's estimate data."""

from pathlib import Path

import matplotlib
import yaml

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.ticker import FixedLocator, FuncFormatter, NullLocator

SITE = Path(__file__).resolve().parents[1]
OUT = SITE / "assets/imgs/shor"
ESTIMATES = yaml.safe_load((SITE / "_data/shor_resource_estimates.yml").read_text())
PAPER = "#fffdfa"
INK = "#2a2521"
MUTED = "#635951"
GRID = "#e9e1d8"
ACCENT = "#85394b"
PRIOR = "#5f625d"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 10,
    "svg.fonttype": "path",
    "svg.hashsalt": "rsa-2048-resource-estimates",
})


def compact(value, _position=None):
    for scale, suffix in ((1e12, "T"), (1e9, "B"), (1e3, "k")):
        if value >= scale:
            return f"{value / scale:g}{suffix}"
    return f"{value:g}"


def base_chart(size, subtitle):
    fig, ax = plt.subplots(figsize=size, facecolor=PAPER)
    ax.set_facecolor(PAPER)
    fig.subplots_adjust(left=0.14, right=0.96, top=0.84, bottom=0.15)
    fig.text(0.14, 0.93, subtitle, color=INK, fontsize=13, weight="bold")
    ax.grid(color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.set_xlabel("Logical qubits", color=INK, labelpad=10)
    ax.set_ylabel("T equivalents per execution", color=INK, labelpad=9)
    ax.tick_params(colors=MUTED, length=3, width=0.8, labelsize=10)
    for name in ("top", "right"):
        ax.spines[name].set_visible(False)
    for name in ("bottom", "left"):
        ax.spines[name].set_color("#a99e92")
    return fig, ax


def plot_points(ax, estimates, labels):
    for estimate in estimates:
        ours = estimate.get("ours", False)
        color = ACCENT if ours else PRIOR
        point = (estimate["qubits"], 4 * estimate["toffoli"])
        ax.scatter(*point, marker="*" if ours else "o", s=130 if ours else 43,
                   c=color, edgecolors=PAPER, linewidths=0.9, zorder=4 if ours else 3)
        if estimate["label"] in labels:
            dx, dy = labels[estimate["label"]]
            ax.annotate(
                estimate["label"], point, xytext=(dx, dy), textcoords="offset points",
                ha="right" if dx < 0 else "left", va="center", fontsize=10,
                color=color, weight="bold" if ours else "normal",
                arrowprops={"arrowstyle": "-", "color": color, "lw": 0.7,
                            "shrinkA": 3, "shrinkB": 5},
                bbox={"facecolor": PAPER, "edgecolor": "none", "pad": 1.2},
                zorder=5,
            )


def overview():
    fig, ax = base_chart((8.5, 6), "Published estimates since 1996")
    ax.set(xscale="log", yscale="log", xlim=(1160, 21000), ylim=(7.5e8, 4.4e13))
    ax.xaxis.set_major_locator(FixedLocator([1500, 2500, 4000, 6000, 10000, 16000]))
    ax.yaxis.set_major_locator(FixedLocator([1e9, 1e10, 1e11, 1e12, 1e13]))
    for axis in (ax.xaxis, ax.yaxis):
        axis.set_major_formatter(FuncFormatter(compact))
        axis.set_minor_locator(NullLocator())
    ax.axvspan(1350, 1900, ymin=0, ymax=0.16, color="#f4e5e7", zorder=0)
    plot_points(ax, ESTIMATES, {
        "Vedral et al. ’96": (-10, 15),
        "Zalka ’98 · serial": (8, -12),
        "Zalka ’98 · lookahead": (10, -15),
        "Fowler et al. ’12": (-11, 0),
        "Häner et al. ’17": (11, 0),
        "Gidney & Ekerå ’21": (11, 2),
        "Chevignard et al. ’24": (12, 11),
    })
    ax.annotate("Recent circuits →", (1870, 2.6e9), xytext=(13, 5),
                textcoords="offset points", color=ACCENT, fontsize=9)
    return fig


def detail():
    fig, ax = base_chart((6, 6), "Recent circuits, enlarged")
    ax.set(xlim=(1360, 1920), ylim=(0.82e9, 3.6e9))
    ax.xaxis.set_major_locator(FixedLocator([1400, 1500, 1600, 1700, 1800, 1900]))
    ax.yaxis.set_major_locator(FixedLocator([1e9, 1.5e9, 2e9, 2.5e9, 3e9, 3.5e9]))
    ax.xaxis.set_major_formatter(FuncFormatter(lambda value, _: f"{value:,.0f}"))
    ax.yaxis.set_major_formatter(FuncFormatter(compact))
    recent = [row for row in ESTIMATES if 1360 <= row["qubits"] <= 1920 and row["toffoli"] < 9e8]
    plot_points(ax, recent, {
        "Gidney ’25": (10, -16),
        "Pappalardo et al. ’26": (14, 12),
        "Two primes": (12, -6),
        "Six primes": (-12, 15),
        "Eight primes": (-12, -13),
    })
    return fig


for name, plot in (("logical-resources", overview), ("logical-resources-detail", detail)):
    figure = plot()
    path = OUT / f"{name}.svg"
    figure.savefig(path, metadata={"Date": None})
    plt.close(figure)
    path.write_text("".join(line.rstrip() + "\n" for line in path.read_text().splitlines()))
