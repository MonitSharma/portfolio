"""Render portfolio figures from pinned public ECDSA leaderboard evidence.

Requires Matplotlib; never runs or modifies challenge code.
"""
from pathlib import Path
from datetime import date
import os
os.environ.setdefault('MPLCONFIGDIR', '/private/tmp/monit-ecdsa-mpl')
os.environ.setdefault('XDG_CACHE_HOME', '/private/tmp/monit-ecdsa-cache')
import json
import textwrap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter, NullLocator

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
assert leaders['gates']['solver']=='MonitSharma'
assert len(frontier)==public['frontier_count']
dated=date.fromisoformat(public['snapshot_date']).strftime('%d %b %Y')
fig,ax=frame('A new low-Toffoli record',
    f"{public['eligible_count']:,} officially scored entries · {len(frontier)} Pareto points · {dated}")
ax.scatter([s['qubits'] for s in scored],[s['toffolis'] for s in scored],s=15,
    color=GRAY,alpha=.25,edgecolors='none',label='Officially scored entries')
ax.step([s['qubits'] for s in frontier],[s['toffolis'] for s in frontier],where='post',
    color=GREEN,lw=2.2,label='Public Pareto frontier')
q,p,t=(leaders[k] for k in ['width','product','gates'])
ax.scatter([t['qubits']],[t['toffolis']],s=95,color=ORANGE,edgecolor=PAPER,lw=1.6,
    zorder=5,label='My Toffoli record')
ax.scatter([p['qubits']],[p['toffolis']],s=50,color=GREEN,edgecolor=PAPER,lw=1.2,zorder=4)
ax.set_yscale('log'); ax.set_xlim(610,2820)
ax.set_ylim(5.8e5,max(s['toffolis'] for s in scored)*1.6)
ax.set_yticks([1e6,1e7,1e8,1e9]);ax.set_yticklabels(['1M','10M','100M','1B'])
ax.yaxis.set_minor_locator(NullLocator());ax.grid(axis='y',color=LINE,lw=.8)
ax.set_xlabel('Peak logical qubits',labelpad=14)
ax.set_ylabel('Mean executed Toffolis · logarithmic scale',labelpad=15,fontsize=12)
ax.legend(loc='upper right',frameon=False,fontsize=10.5,handlelength=2.2)
annotation=dict(arrowprops=dict(arrowstyle='-',color=MUTED,lw=1),fontsize=12,
    bbox=dict(boxstyle='square,pad=.3',facecolor=PAPER,edgecolor='none',alpha=.96))
ax.annotate(f"Lowest width · {q['solver']}\n{q['qubits']:,} Q · {q['toffolis']/1e6:.2f}M T",
    xy=(q['qubits'],q['toffolis']),xytext=(1000,9e8),**annotation)
ax.annotate(f"Lowest public product\n{p['qubits']:,} Q · {p['toffolis']:,} T",
    xy=(p['qubits'],p['toffolis']),xytext=(1370,3.5e6),color=GREEN,**annotation)
ax.annotate(f"My lowest-Toffoli record\n{t['qubits']:,} Q · {t['toffolis']:,} T",
    xy=(t['qubits'],t['toffolis']),xytext=(2040,1.12e6),color=ORANGE,**annotation)
save(fig,'public-frontier',
    'Moving left saves logical qubits; moving down saves gates. The orange point is my current gate-count record.\nSource: ECDSA.fail API. Accepted and score-only rejected entries; failures and claimed-only scores excluded.')

prev=public['previous_records']['gates']
assert prev['created_at']<t['created_at']
assert prev['qubits']>t['qubits'] and prev['toffolis']>t['toffolis']
saved_t=prev['toffolis']-t['toffolis'];saved_q=prev['qubits']-t['qubits']
fig,axq=frame('Fewer gates, less workspace',
    f'{saved_t:,} fewer executed Toffolis · {saved_q:,} fewer logical qubits · official record comparison',
    position=(.17,.30,.31,.38))
axt=fig.add_axes((.62,.30,.31,.38))
for ax,key,title,xmax,ticks in [
    (axq,'qubits','Peak logical qubits',2300,[0,500,1000,1500,2000]),
    (axt,'toffolis','Executed Toffolis',930000,[0,250000,500000,750000])]:
    ax.set_axisbelow(True);ax.tick_params(length=0,pad=9)
    ax.barh([1,0],[prev[key],t[key]],height=.36,color=[GRAY,GREEN])
    ax.set_xlim(0,xmax);ax.set_ylim(-.6,1.6)
    ax.set_title(title,fontsize=14,loc='left',pad=18)
    ax.set_xticks(ticks);ax.grid(axis='x',color=LINE,lw=.8)
    ax.xaxis.set_major_formatter(FuncFormatter(lambda x,pos,measure=key:f'{x:,.0f}' if measure=='qubits' else '0' if x==0 else f'{x/1000:.0f}K'))
    ax.spines.left.set_visible(False)
    for y,row,color in [(1,prev,MUTED),(0,t,GREEN)]:
        ax.text(row[key]+xmax*.025,y,f'{row[key]:,}',va='center',color=color,fontsize=12)
    ax.set_yticks([1,0])
    ax.set_yticklabels(['Previous\nrecord','New\nrecord'] if key=='qubits' else [])
fig.text(.17,.77,f'−{saved_q:,} qubits  /  −{100*saved_q/prev["qubits"]:.2f}%',fontsize=13,color=GREEN)
fig.text(.62,.77,f'−{saved_t:,} Toffolis  /  −{100*saved_t/prev["toffolis"]:.5f}%',fontsize=13,color=GREEN)
save(fig,'record-tradeoffs',
    'Both axes start at zero. Labels show whole-circuit official metrics; the small gate reduction is not magnified.\nSource: ECDSA.fail API. Previous record: 18 Oct 2026; new record: 20 Oct 2026. Gate counts are rounded means.')
print('Generated two updated figures, each exported as PNG and SVG.')
