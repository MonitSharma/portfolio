"""Render portfolio figures from pinned public ECDSA leaderboard evidence.

Requires Matplotlib and NumPy; never runs or modifies challenge code.
"""
from pathlib import Path
import os
os.environ.setdefault('MPLCONFIGDIR', '/private/tmp/monit-ecdsa-mpl')
os.environ.setdefault('XDG_CACHE_HOME', '/private/tmp/monit-ecdsa-cache')
import json
import textwrap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter, NullLocator
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/imgs/ecdsa'
public = json.loads((ROOT / 'assets/data/ecdsa/public-frontier.json').read_text())
PAPER, INK, MUTED = '#f6f5f0', '#202e2d', '#63716b'
GREEN, LINE, GRAY, ORANGE = '#216653', '#dedfd5', '#9ca8a1', '#a66036'
plt.rcParams.update({'font.family':'DejaVu Sans', 'font.size':13,
    'axes.labelsize':14, 'axes.edgecolor':LINE, 'axes.labelcolor':INK,
    'text.color':INK, 'xtick.color':MUTED, 'ytick.color':MUTED,
    'axes.spines.top':False, 'axes.spines.right':False,
    'figure.facecolor':PAPER, 'axes.facecolor':PAPER, 'svg.fonttype':'none'})


def frame(title, subtitle, position=(.16,.24,.785,.52)):
    fig = plt.figure(figsize=(11.4,7.1))
    fig.text(.065,.945,title,fontsize=22,fontweight='bold',va='top')
    fig.text(.065,.875,subtitle,fontsize=12.5,color=MUTED,va='top')
    ax = fig.add_axes(position)
    ax.set_axisbelow(True)
    ax.tick_params(length=0,pad=9)
    return fig,ax


def save(fig, name, footer):
    wrapped='\n'.join(textwrap.fill(line, width=112) for line in footer.splitlines())
    fig.text(.065,.105,wrapped,fontsize=10.5,color=MUTED,va='top',linespacing=1.5)
    fig.savefig(OUT/(name+'.png'),dpi=180,facecolor=PAPER)
    svg_path=OUT/(name+'.svg')
    fig.savefig(svg_path,facecolor=PAPER)
    svg_path.write_text('\n'.join(line.rstrip() for line in svg_path.read_text().splitlines())+'\n')
    plt.close(fig)


scored=public['scored']; frontier=public['frontier']; leaders=public['leaders']
assert all(s['qubits']*s['toffolis']==s['product'] for s in scored)
assert leaders['gates']['solver']==leaders['product']['solver']=='MonitSharma'
date=public['snapshot_date']
fig,ax=frame('Two records on the public frontier',
    f"Monit Sharma · {public['eligible_count']:,} scored records · {len(frontier)} Pareto points · {date}")
ax.scatter([s['qubits'] for s in scored],[s['toffolis'] for s in scored],s=15,
    color=GRAY,alpha=.25,edgecolors='none',label='Officially scored records')
# A step frontier shows the best attainable gate count at each width budget.
ax.step([s['qubits'] for s in frontier],[s['toffolis'] for s in frontier],where='post',
    color=GREEN,lw=2.2,label='Public Pareto frontier')
ours=[s for s in frontier if s['solver']=='MonitSharma']
assert len(ours)==public['owner_frontier_count']
ax.scatter([s['qubits'] for s in ours],[s['toffolis'] for s in ours],s=60,
    color=ORANGE,edgecolor=PAPER,lw=1,zorder=4,label='My frontier submissions')
ax.set_yscale('log'); ax.set_xlim(610,2820)
ax.set_ylim(5.8e5,max(s['toffolis'] for s in scored)*1.6)
ax.set_yticks([1e6,1e7,1e8,1e9]);ax.set_yticklabels(['1M','10M','100M','1B'])
ax.yaxis.set_minor_locator(NullLocator());ax.grid(axis='y',color=LINE,lw=.8)
ax.set_xlabel('Peak logical qubits',labelpad=14)
ax.set_ylabel('Mean executed Toffolis · logarithmic scale',labelpad=15,fontsize=12)
ax.legend(loc='upper right',frameon=False,fontsize=10.5,handlelength=2.2)
annotation=dict(arrowprops=dict(arrowstyle='-',color=MUTED,lw=1),fontsize=12,
    bbox=dict(boxstyle='square,pad=.3',facecolor=PAPER,edgecolor='none',alpha=.96))
q,p,t=(leaders[k] for k in ['width','product','gates'])
ax.annotate(f"Lowest width · {q['solver']}\n{q['qubits']:,} Q · {q['toffolis']/1e6:.2f}M T",
    xy=(q['qubits'],q['toffolis']),xytext=(1000,7e8),**annotation)
ax.annotate(f"My lowest product\n{p['qubits']:,} Q · {p['toffolis']:,} T",
    xy=(p['qubits'],p['toffolis']),xytext=(1320,3.5e6),color=ORANGE,**annotation)
ax.annotate(f"My lowest Toffolis\n{t['qubits']:,} Q · {t['toffolis']:,} T",
    xy=(t['qubits'],t['toffolis']),xytext=(2070,1.1e6),color=ORANGE,**annotation)
save(fig,'public-frontier',
    'Orange points mark my officially scored submissions; the green step is the nondominated frontier.\nSource: ECDSA.fail API. Accepted and score-only rejected entries; failures and claimed-only scores excluded.')

fig,ax=frame('Two records, two resource budgets',
    f'My officially scored circuits · lower and farther left is better · {date}',
    position=(.16,.25,.785,.50))
xs=np.linspace(1050,1700,300)
for row,color,label in [(p,GREEN,'Lowest product'),(t,ORANGE,'Lowest Toffolis')]:
    ax.plot(xs,row['product']/xs,color=color,alpha=.32,lw=1.5,ls='--')
    ax.scatter([row['qubits']],[row['toffolis']],s=150,color=color,edgecolor=PAPER,lw=2,zorder=5,label=label)
ax.annotate(f"Lowest product\n{p['qubits']:,} Q × {p['toffolis']:,} T\nQ × T = {p['product']:,}",
    xy=(p['qubits'],p['toffolis']),xytext=(1090,775000),color=GREEN,fontsize=12.5,
    arrowprops=dict(arrowstyle='-',color=GREEN,lw=1),va='top',linespacing=1.6)
ax.annotate(f"Lowest Toffolis\n{t['qubits']:,} Q × {t['toffolis']:,} T\nQ × T = {t['product']:,}",
    xy=(t['qubits'],t['toffolis']),xytext=(1330,741500),color=ORANGE,fontsize=12.5,
    arrowprops=dict(arrowstyle='-',color=ORANGE,lw=1),va='bottom',linespacing=1.6)
ax.set_xlim(1050,1700);ax.set_ylim(739000,778000)
ax.set_yticks([740000,750000,760000,770000])
ax.yaxis.set_major_formatter(FuncFormatter(lambda x,pos:f'{x:,.0f}'))
ax.set_xlabel('Peak logical qubits',labelpad=14)
ax.set_ylabel('Rounded mean executed Toffolis',labelpad=15,fontsize=12)
ax.grid(axis='y',color=LINE,lw=.8)
save(fig,'record-tradeoffs',
    'Dashed curves show equal Q × T products. Both axes use zoomed linear scales.\nThe lowest-gate circuit uses 322 more qubits, so its product is higher. Source: ECDSA.fail public API.')
print('Generated two current leaderboard figures, each exported as PNG and SVG.')
