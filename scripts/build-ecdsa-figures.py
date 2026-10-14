"""Render website figures from pinned, public ECDSA research evidence.

Run with Python, Matplotlib and NumPy. This never runs or modifies challenge code.
PNG and SVG exports are written to assets/imgs/ecdsa.
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
DATA = ROOT / 'assets/data/ecdsa'
OUT = ROOT / 'assets/imgs/ecdsa'
OUT.mkdir(parents=True, exist_ok=True)
public = json.loads((DATA / 'public-frontier.json').read_text())
component = json.loads((DATA / 'component-evidence.json').read_text())
PAPER, INK, MUTED = '#f6f5f0', '#202e2d', '#63716b'
GREEN, LINE, GRAY, ORANGE = '#216653', '#dedfd5', '#9ca8a1', '#a66036'
plt.rcParams.update({'font.family':'DejaVu Sans', 'font.size':13, 'axes.labelsize':14,
                     'axes.edgecolor':LINE, 'axes.labelcolor':INK, 'text.color':INK,
                     'xtick.color':MUTED, 'ytick.color':MUTED, 'axes.spines.top':False,
                     'axes.spines.right':False, 'figure.facecolor':PAPER,
                     'axes.facecolor':PAPER, 'svg.fonttype':'none'})

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
    svg_path = OUT/(name+'.svg')
    fig.savefig(svg_path,facecolor=PAPER)
    svg_path.write_text('\n'.join(line.rstrip() for line in svg_path.read_text().splitlines())+'\n')
    plt.close(fig)

# Public Pareto frontier: strictly admitted records, not claimed or failed experiments.
scored=public['scored']; frontier=public['frontier']; leaders=public['leaders']
assert len(frontier)==public['frontier_count']
assert all(s['qubits']*s['toffolis']==s['product'] for s in scored)
fig,ax=frame('Less storage, or fewer gates?',
             f"Public reference circuits · {public['eligible_count']:,} scored records · {len(frontier)} Pareto points · 14 Oct 2026")
ax.scatter([s['qubits'] for s in scored],[s['toffolis'] for s in scored],s=15,color=GRAY,alpha=.25,edgecolors='none',label='Officially scored records')
ax.plot([s['qubits'] for s in frontier],[s['toffolis'] for s in frontier],'-o',color=GREEN,lw=2.4,markersize=4.2,label='Derived Pareto frontier')
ax.set_yscale('log'); ax.set_xlim(620,2820)
ax.set_ylim(5.8e5,max(s['toffolis'] for s in scored)*1.6)
ax.set_yticks([1e6,1e7,1e8,1e9]);ax.set_yticklabels(['1M','10M','100M','1B'])
ax.yaxis.set_minor_locator(NullLocator());ax.grid(axis='y',color=LINE,lw=.8)
ax.set_xlabel('Peak logical qubits',labelpad=14);ax.set_ylabel('Mean executed Toffolis · logarithmic scale',labelpad=15,fontsize=12)
ax.legend(loc='upper right',frameon=False,fontsize=11.5,handlelength=2.2)
q=leaders['width'];p=leaders['product']
ax.scatter([q['qubits'],p['qubits']],[q['toffolis'],p['toffolis']],s=95,color=GREEN,edgecolor=PAPER,lw=2,zorder=5)
annotation=dict(arrowprops=dict(arrowstyle='-',color=MUTED,lw=1),fontsize=12.5,
                bbox=dict(boxstyle='square,pad=.35',facecolor=PAPER,edgecolor='none',alpha=.95))
ax.annotate(f"Lowest width\n{q['qubits']:,} qubits · {q['toffolis']/1e6:.2f}M Toffolis",
            xy=(q['qubits'],q['toffolis']),xytext=(1090,8e8),**annotation)
ax.annotate(f"Lowest product\n{p['qubits']:,} qubits · {p['toffolis']:,} Toffolis",
            xy=(p['qubits'],p['toffolis']),xytext=(1600,1.45e6),**annotation)
save(fig,'public-frontier','Lower and farther left uses fewer resources. A logarithmic gate axis keeps the wide tradeoff visible.\nSource: ECDSA.fail public API. Accepted and explicit score-only rejections; failures and claimed-only scores excluded.')

# Zoom on the scalar score, without visually merging the nearly coincident leaders.
fig,ax=frame('Fewer gates can still cost more',
             'Q × T balances circuit width with executed Toffolis · public comparison, not an original record',
             position=(.365,.24,.57,.50))
repro=public['reproduction']; best=leaders['product']['product']
rows=[('Lowest Toffolis',leaders['gates'],ORANGE),('Reproduced baseline',repro,MUTED),('Lowest product',leaders['product'],GREEN)]
for y,(label,s,color) in zip([2,1,0],rows):
    excess=100*(s['product']/best-1)
    ax.hlines(y,0,excess,color=LINE,lw=3,zorder=1)
    ax.scatter([excess],[y],s=140,facecolor=PAPER if label=='Reproduced baseline' else color,
               edgecolor=color,lw=2,zorder=3)
    ax.text(excess+.0018,y,f'+{excess:.4f}%' if excess else 'Reference',va='center',fontsize=13,color=color)
    ax.text(-.026,y+.11,label,va='center',fontsize=13,color=INK,clip_on=False)
    ax.text(-.026,y-.14,f"{s['qubits']:,} Q · {s['toffolis']:,} T",va='center',fontsize=11.5,color=MUTED,clip_on=False)
ax.set_xlim(-.0018,.052);ax.set_ylim(-.6,2.6);ax.set_yticks([])
ax.spines.left.set_visible(False);ax.axvline(0,color=LINE,lw=1)
ax.set_xticks([0,.01,.02,.03,.04]);ax.xaxis.set_major_formatter(FuncFormatter(lambda x,p:f'{x:.2f}%'))
ax.set_xlabel('Product score above the public minimum',labelpad=16)
save(fig,'product-comparison',f"Public minimum: {best:,}. Reproduced baseline: {repro['product']:,} on its original 9,024-shot packet.\nThe reproduction uses an existing public circuit; passing this packet does not establish arbitrary-input correctness.")

# Local research evidence: emitted fixture counts, never an official whole-circuit score.
fig,ax=frame('A smaller reciprocal, fewer gates',
             '572 fewer emitted Toffolis per V-form · three fixture layouts · full candidate failed validation',
             position=(.20,.23,.72,.53))
for y,row in zip([2,1,0],component['prices']):
    a,b=row['baseline'],row['compact'];assert a-b==572
    ax.barh(y+.15,a,height=.24,color=GRAY,label='Original reciprocal' if y==2 else None)
    ax.barh(y-.15,b,height=.24,color=GREEN,label='Compact reciprocal' if y==2 else None)
    ax.text(a+180,y+.15,f'{a:,}',va='center',fontsize=12,color=MUTED)
    ax.text(b+180,y-.15,f'{b:,}',va='center',fontsize=12,color=GREEN)
    ax.text(24400,y,f'−572\n{100*(a-b)/a:.1f}% fewer',ha='right',va='center',fontsize=12,color=GREEN,linespacing=1.5)
ax.set_xlim(0,25000);ax.set_ylim(-.6,2.85)
ax.set_yticks([2,1,0]);ax.set_yticklabels(['0 clean\nhelper lanes','4 clean\nhelper lanes','8 clean\nhelper lanes'])
ax.set_xticks([0,5000,10000,15000,20000]);ax.xaxis.set_major_formatter(FuncFormatter(lambda x,p:f'{x:,.0f}'))
ax.grid(axis='x',color=LINE,lw=.8);ax.spines.left.set_visible(False)
ax.set_xlabel('Emitted Toffolis per isolated V-form fixture',labelpad=14)
ax.legend(loc='upper center',bbox_to_anchor=(.5,1.12),ncol=2,frameon=False,fontsize=11.5)
save(fig,'compact-reciprocal','17 focused tests passed; 1,536 V-form cases and 1,089,536 phase coefficients checked.\nThese component savings are experimental. The integrated candidate has no qualified score or public submission.')
print('Generated three figures, each exported as PNG and SVG.')
