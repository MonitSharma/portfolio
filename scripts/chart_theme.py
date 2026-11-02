"""Shared chart look for the portfolio's project pages.

Each project page has its own palette (see assets/css/project-personalities.css);
its charts use the same paper, ink and accent so they read as part of the page.
Type matches the site: Source Serif 4 for words, IBM Plex Mono for numbers.
"""
from __future__ import annotations

import os
from pathlib import Path

os.environ.setdefault('MPLCONFIGDIR', '/private/tmp/monit-portfolio-mpl')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager

PORTFOLIO = Path(__file__).resolve().parents[1]
IMGS = PORTFOLIO / 'assets' / 'imgs'
SERIF, MONO = 'Source Serif 4', 'IBM Plex Mono'

for font in (Path(__file__).parent / 'fonts').glob('*.ttf'):
    font_manager.fontManager.addfont(str(font))

# paper/ink/muted/grid follow the page; `series` are categorical colours tuned to sit
# next to that page's accent; `ramp` is a light-to-dark scale for ordered magnitudes.
THEMES = {
    'quantum-hpc': dict(
        paper='#fbfaef', ink='#333b2b', muted='#69705b', grid='#e4e5cf', faint='#c9c8b2',
        series=['#657337', '#b5562b', '#2f7f78', '#c49a2c', '#7d4a6e', '#4b6a88'],
        ramp=['#b4c27a', '#9caf60', '#84984c', '#6c7f3f', '#566533', '#414d27', '#2d351b']),
    'qsvt-linear-solvers': dict(
        paper='#f8fbfe', ink='#20364f', muted='#586e82', grid='#dfe8f0', faint='#9ab5cb',
        series=['#346a9c', '#c8643b', '#3a8f8a', '#7a5a9e', '#b23a48', '#20364f'],
        ramp=['#9dbcd8', '#7ea9cf', '#5f93c2', '#447daf', '#346a9c', '#244c73', '#18344f']),
    'peaked-circuits': dict(
        paper='#fafbff', ink='#252c46', muted='#606a82', grid='#e2e6f0', faint='#aeb8d0',
        series=['#4b5797', '#b98b3a', '#6f8f5a', '#9c4f6a', '#252c46'],
        ramp=['#a6b2e2', '#8f9fd4', '#7887c4', '#6170ad', '#4b5797', '#343e72', '#252c46']),
    'ecdsa': dict(
        paper='#fffaf4', ink='#332d29', muted='#6b5e53', grid='#eadfd3', faint='#bfae9c',
        series=['#97522c', '#5d4a3c', '#c99a6b', '#6f7f63', '#332d29'],
        ramp=['#dbb08a', '#cf9a6c', '#c28358', '#b77546', '#97522c', '#723c20', '#4f2915']),
}


def apply(project: str) -> dict:
    t = THEMES[project]
    plt.rcParams.update({
        'figure.facecolor': t['paper'], 'axes.facecolor': t['paper'], 'savefig.facecolor': t['paper'],
        'font.family': 'serif', 'font.serif': [SERIF, 'Georgia', 'DejaVu Serif'],
        'mathtext.fontset': 'custom', 'mathtext.rm': SERIF, 'mathtext.it': SERIF + ':italic',
        'font.size': 11.5, 'axes.titlesize': 13, 'axes.titleweight': 'semibold', 'axes.titlelocation': 'left',
        'axes.labelsize': 11.5, 'axes.labelcolor': t['muted'], 'axes.edgecolor': t['faint'],
        'axes.titlecolor': t['ink'], 'text.color': t['ink'],
        'axes.linewidth': .8, 'axes.spines.top': False, 'axes.spines.right': False,
        'axes.grid': True, 'grid.color': t['grid'], 'grid.linewidth': .7, 'axes.axisbelow': True,
        'xtick.color': t['muted'], 'ytick.color': t['muted'], 'xtick.labelcolor': t['muted'], 'ytick.labelcolor': t['muted'],
        'xtick.major.size': 0, 'ytick.major.size': 0, 'xtick.minor.size': 0, 'ytick.minor.size': 0,
        'legend.frameon': False, 'legend.fontsize': 10.5, 'legend.labelcolor': t['ink'],
        'lines.linewidth': 2, 'lines.markersize': 6, 'patch.edgecolor': t['paper'],
        'axes.prop_cycle': plt.cycler(color=t['series']),
        'savefig.dpi': 200, 'svg.fonttype': 'none',
    })
    return t


def mono_ticks(fig) -> None:
    """Numeric tick labels in the mono face, like the data on the pages; words stay serif."""
    import re
    fig.canvas.draw()
    numeric = re.compile(r'^[\s\d.,−\-+×%e^$\\{}mathrfsKMB]*$')
    for ax in fig.axes:
        for label in ax.get_xticklabels() + ax.get_yticklabels():
            if label.get_text() and numeric.match(label.get_text()):
                label.set_fontfamily(MONO)
                label.set_fontsize(9.5)


def save_png(fig, path: Path, **kw) -> None:
    mono_ticks(fig)
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, bbox_inches='tight', pad_inches=.2, **kw)
    plt.close(fig)
    print('wrote', path.relative_to(PORTFOLIO))
