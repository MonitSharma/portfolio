"""Re-render the Quantum + HPC page charts in the page's palette.

Runs the plotting code from the quantum_hpc repository against its saved results,
with qhpc.style recoloured and every save redirected here. Nothing is written to
that repository.  Usage:  <quantum_hpc>/.venv/bin/python scripts/restyle_qhpc_charts.py
"""
import runpy
import sys
from pathlib import Path

import chart_theme

QHPC = Path(__file__).resolve().parents[3] / 'quantum_hpc'
OUT = chart_theme.IMGS / 'qhpc'
MACHINE = 'macos-apple-m3-pro'
sys.path.insert(0, str(QHPC / 'common'))
from qhpc import style  # noqa: E402

t = chart_theme.THEMES['quantum-hpc']
olive, rust, teal, ochre, plum, slate = t['series']
style.SURFACE, style.INK, style.INK_2, style.INK_3, style.GRID = t['paper'], t['ink'], t['muted'], t['faint'], t['grid']
style.BLUE, style.ORANGE, style.AQUA, style.YELLOW, style.MAGENTA, style.GREEN, style.VIOLET, style.RED = (
    olive, rust, teal, ochre, plum, '#4f7a3a', slate, '#a3392f')
style.LANG = {'python': olive, 'cpp': rust}
style.PHASE = {'build': olive, 'adapter': rust, 'simulate': teal, 'other': '#d3d1bd'}
style.MACHINE = {'macos-apple-m3-pro': teal, 'wsl-intel-i7-12700k': plum}
style.RAMP = t['ramp']
style.apply = lambda: chart_theme.apply('quantum-hpc')

WANTED = {'amdahl', 'construction_machines', 'exponential_wall', 'first_vs_warm', 'processes_vs_threads', 'strong_scaling'}


def save(fig, path, dpi=200):
    name = Path(path).name
    if name in WANTED:
        chart_theme.save_png(fig, OUT / f'{name}.png', dpi=dpi)
    else:
        chart_theme.plt.close(fig)


style.save = save

for project in ['qaoa_full_runtime', 'parallel_simulation_scaling', 'hardware_transpilation', 'parallel_parameter_sweeps']:
    results = QHPC / 'projects' / project / 'results' / MACHINE / 'study-01'
    sys.argv = ['plot.py', str(results)]
    runpy.run_path(str(QHPC / 'projects' / project / 'scripts' / 'plot.py'), run_name='__main__')

machines = runpy.run_path(str(QHPC / 'scripts' / 'compare_machines.py'), run_name='restyle')
style.apply()
machines['construction']()
