"""Re-render the QSVT page charts in the page's palette.

Loads the qsvt-linear-solvers figure script, swaps its colour constants and style,
and writes only the three charts the page uses into assets/imgs/qsvt. Nothing is
written to that repository.  Usage:  <qsvt-linear-solvers>/.venv/bin/python scripts/restyle_qsvt_charts.py
"""
import importlib.util
import sys
import tempfile
from pathlib import Path

import chart_theme
from matplotlib.figure import Figure

QSVT = Path(__file__).resolve().parents[3] / 'qsvt-linear-solvers'
OUT = chart_theme.IMGS / 'qsvt'
sys.path.insert(0, str(QSVT))
spec = importlib.util.spec_from_file_location('qsvt_figures', QSVT / 'docs' / 'generate_readme_figures.py')
figs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(figs)

t = chart_theme.THEMES['qsvt-linear-solvers']
ibm, helios, emulator, _, accent, ink = t['series']
figs.INK, figs.MUTED, figs.IDEAL = t['ink'], t['muted'], '#6f8396'
figs.TEAL, figs.CORAL, figs.BLUE, figs.ACCENT = emulator, helios, ibm, accent
figs.PLATFORM_COLOR = {'Noiseless circuit ideal': figs.IDEAL, 'Quantinuum Helios-1E-lite': emulator,
                       'Quantinuum Helios-1': helios, 'IBM Kingston': ibm}
figs.FIG_DIR = Path(tempfile.mkdtemp(prefix='qsvt-figs-'))


def _title(ax, title, subtitle=None):
    # The original uses a fixed pad sized for one subtitle line; leave room for each line.
    lines = subtitle.count('\n') + 1 if subtitle else 0
    ax.set_title(title, fontsize=15, fontweight='bold', pad=18 + 14 * lines, loc='left')
    if subtitle:
        ax.text(0.0, 1.02, subtitle, transform=ax.transAxes, fontsize=10.5,
                color=figs.MUTED, ha='left', va='bottom', linespacing=1.1)


figs._title = _title
chart_theme.apply('qsvt-linear-solvers')

_savefig = Figure.savefig


def savefig(fig, path, *args, **kw):
    chart_theme.mono_ticks(fig)
    kw.setdefault('pad_inches', .2)
    _savefig(fig, OUT / Path(path).name, *args, **kw)
    print('wrote', (OUT / Path(path).name).relative_to(chart_theme.PORTFOLIO))


Figure.savefig = savefig
results = figs.load()
figs.fig_polynomial()
figs.fig_accuracy(results)
figs.fig_hardware_solution(results)
