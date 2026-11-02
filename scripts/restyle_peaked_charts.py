"""Re-render the Peaked Circuit Recovery diagnostics in the page's palette.

Same figure as p12-helios-recovery/tools/generate_tracker_plots.py (same shots,
same statistics), restyled for the portfolio. Reads that repository, writes only here.
Usage:  python scripts/restyle_peaked_charts.py
"""
import json
from collections import Counter
from pathlib import Path

import numpy as np
from matplotlib.ticker import MaxNLocator

import chart_theme

ROOT = Path(__file__).resolve().parents[3] / 'p12-helios-recovery' / 'results' / 'tracker_submissions'
OUT = chart_theme.IMGS / 'peaked'
CONFIG = {
    'p11': ('classical/raw/c902a6a1-0e91-48cf-b5ba-44831fcc7726.shots.jsonl',
            '10101110111010011111100010110011101011101011111001010101101100001110101110010000010100001001100000',
            'P11 on Helios-1: observed frequency and candidate distances'),
    'p12': ('classical/raw/reconstructed_200_shots.jsonl',
            '10100011110010100111000100011100110001011111011100111001010110101011001001000000101000100000111100',
            'P12 on Helios-1: observed frequency and candidate distances'),
}


def hamming(left, right):
    return sum(a != b for a, b in zip(left, right, strict=True))


def generate(name, shot_file, answer, title):
    t = chart_theme.apply('peaked-circuits')
    indigo, gold, sage = t['series'][:3]
    plt = chart_theme.plt
    lines = (ROOT / name / shot_file).read_text().splitlines()
    shots = [json.loads(line)['canonical_bitstring'] for line in lines if line.strip()]
    counts = Counter(shots)
    ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:15]
    distances = [hamming(shot, answer) for shot in shots]
    agreement = [sum(shot[i] == answer[i] for shot in shots) / len(shots) for i in range(len(answer))]

    fig, axes = plt.subplots(2, 2, figsize=(13, 9), gridspec_kw={'height_ratios': [1, 1.05]})
    fig.suptitle(title, fontsize=17, fontweight='bold', x=.015, y=.995, ha='left', color=t['ink'])
    freq_ax, dist_ax = axes[0]
    agree_ax, summary_ax = axes[1]

    ranks = np.arange(1, len(ranked) + 1)
    freqs = [count for _, count in ranked]
    freq_ax.bar(ranks, freqs, color=indigo, width=.72)
    freq_ax.set_title(f'Exact-string frequency  ·  n = {len(shots)}, unique = {len(counts)}')
    freq_ax.set(xlabel='Observed-string rank', ylabel='Frequency (shots)', xticks=ranks)
    freq_ax.grid(axis='x', visible=False)
    freq_ax.set_ylim(0, max(freqs) * 1.18)
    for ax in (freq_ax, dist_ax):
        ax.yaxis.set_major_locator(MaxNLocator(integer=True))
    for rank, count in zip(ranks, freqs, strict=True):
        freq_ax.text(rank, count + .03, str(count), ha='center', va='bottom', fontsize=9.5,
                     fontfamily=chart_theme.MONO, color=t['ink'])

    dist_ax.hist(distances, bins=np.arange(min(distances) - .5, max(distances) + 1.5, 1),
                 color=gold, edgecolor=t['paper'], linewidth=1)
    median = np.median(distances)
    dist_ax.axvline(median, color=t['ink'], linestyle=(0, (4, 3)), linewidth=1.3, label=f'median = {median:.0f}')
    dist_ax.set_title('Hamming distance to the recovered string')
    dist_ax.set(xlabel='Hamming distance (bits)', ylabel='Frequency (shots)')
    dist_ax.grid(axis='x', visible=False)
    dist_ax.legend(loc='upper left')

    positions = np.arange(1, len(answer) + 1)
    agree_ax.plot(positions, agreement, color=indigo, linewidth=1.6)
    agree_ax.fill_between(positions, agreement, .5, color=t['ramp'][1], alpha=.35, linewidth=0)
    agree_ax.axhline(.5, color=t['muted'], linestyle=':', linewidth=1)
    agree_ax.set_title('Per-bit agreement with the recovered string')
    agree_ax.set(xlabel='Bit position', ylabel='Agreement across shots', ylim=(0, 1.02))

    summary_ax.axis('off')
    summary_ax.text(.04, .92, 'Dataset summary', fontsize=13, fontweight='bold', transform=summary_ax.transAxes)
    rows = [('Shots analysed', f'{len(shots)}'), ('Unique strings', f'{len(counts)}'),
            ('Mean Hamming distance', f'{np.mean(distances):.2f} bits'),
            ('Exact recovered-string hits', f'{sum(d == 0 for d in distances)}')]
    for i, (label, value) in enumerate(rows):
        y = .74 - i * .2
        summary_ax.text(.04, y, label, fontsize=11.5, color=t['muted'], transform=summary_ax.transAxes, va='top')
        summary_ax.text(.04, y - .085, value, fontsize=17, fontfamily=chart_theme.MONO, color=t['ink'],
                        transform=summary_ax.transAxes, va='top')

    fig.tight_layout(rect=(0, 0, 1, .965), h_pad=2.5, w_pad=3)
    chart_theme.save_png(fig, OUT / f'{name}_frequency_and_distance.png', dpi=200)


for package, args in CONFIG.items():
    generate(package, *args)
