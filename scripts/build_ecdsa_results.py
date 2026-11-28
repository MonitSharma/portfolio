#!/usr/bin/env python3
"""Build _data/ecdsa_results.json for the ECDSA project page.

Inputs come from the ecdsa repo (branch shor/ecdlp-m0-m1):
  shor/results/r14-frontier.json
  shor/data/leaderboard_snapshot_<UTC>.json
  shor/results/r7-toy.json
Usage: python3 scripts/build_ecdsa_results.py <ecdsa-repo>/shor > _data/ecdsa_results.json
"""
import json, sys, glob, os

shor = sys.argv[1]
r14 = json.load(open(os.path.join(shor, 'results/r14-frontier.json')))
snap_path = sorted(glob.glob(os.path.join(shor, 'data/leaderboard_snapshot_*.json')))[-1]
snap = json.load(open(snap_path))
toy = json.load(open(os.path.join(shor, 'results/r7-toy.json')))

MINE = 'anchor-q1464'
def kid(k):
    return {'anchor-q1464': '8d704a6b', 'anchor-q1234': '1829986e'}.get(k, k)
def author(a):
    return 'MonitSharma' if a.startswith('MonitSharma') else a

kernels = []
for k in r14['kernels']:
    if k['kernel'].endswith('-anq'):
        continue
    b = k['best']
    kernels.append({
        'id': kid(k['kernel']), 'author': author(k['author']), 'mine': k['kernel'] == MINE,
        'q': k['kernel_qubits'], 't': round(k['kernel_mean']),
        'fail': k['f'], 'fail_up': k['f_up'], 'shots': k['shots'],
        'dirty_parent': k['parent_dirty_shots'], 'dirty_lifted': k['cand_dirty_shots'],
        'offset_tof': round(k['lifted_mean'] - k['kernel_mean']),
        'best': {'w': b['w'], 'q': b['logical_qubits'], 'adds': b['additions'],
                 'mean': b['toffoli_mean'], 'worst': b['toffoli_worst'],
                 'kept': b['toffoli_worst_per_kept'], 'p_keep': round(b['p_keep_up95'], 4)},
    })
lifted = {kid(k['kernel']): k['lifted_mean'] for k in r14['kernels']}

points = []
for p in r14['points']:
    if p['counting'] != 'full' or p['kernel'].endswith('-anq'):
        continue
    i = kid(p['kernel'])
    adds = round(p['additions'] * lifted[i])
    points.append({'id': i, 'w': p['w'], 'q': p['logical_qubits'], 'n': p['additions'],
                   'loads': p['loads'], 'mean': p['toffoli_mean'], 'worst': p['toffoli_worst'],
                   'kept': p['toffoli_worst_per_kept'], 'add_part': adds,
                   'lookup_part': p['toffoli_mean'] - adds})

pareto = [{'id': kid(p['kernel']), 'w': p['w'], 'q': p['logical_qubits'],
           'kept': p['toffoli_worst_per_kept']} for p in r14['pareto'] if p['counting'] == 'full']

published = [{'name': p['name'], 'q': p['logical_qubits'], 'kept': round(p['per_kept']), 'tof': round(p['toffoli']),
              'per_add': round(p['per_addition'])} for p in r14['published_same_assembly']]

for k in kernels:
    fit = [p for p in published if p['q'] <= k['best']['q']]
    if fit:
        b = min(fit, key=lambda p: p['kept'])
        k['cmp'] = {'name': b['name'], 'q': b['q'], 'kept': b['kept'], 'ratio': f"{b['kept'] / k['best']['kept']:.2f}"}
kernels.sort(key=lambda k: k['best']['q'])

hw = []
pick = {('d4d0d7fb', 13), ('anchor-q1464', 13), ('bc74166b', 13), ('ee410040', 12), ('b358f68c', 12), ('fa14a7d3', 12)}
for h in r14['hardware']:
    ours = h['name'].startswith('This work')
    if ours and (h['kernel'], h['w']) not in pick:
        continue
    hw.append({'name': h['name'] if not ours else kid(h['kernel']), 'ours': ours,
               'mine': ours and h['kernel'] == MINE, 'q': h['logical_qubits'],
               'tof': h['toffolis_total'],
               'sc15': round(h['surface_code_babbush_assumption_minutes'], 1),
               'scg': round(h['surface_code_gidney2025_minutes'], 1),
               'cain': round(h['cain2026_balanced_days'], 1), 'cains': round(h['cain2026_space_efficient_days'], 1),
               'cat': round(h['ldpc_cat_primitive_hours'], 2),
               'pin': round(h['pinnacle_primitive_hours_p1e-3'], 2)})

# Public leaderboard: every officially scored submission (accepted, or scored but
# "did not improve current best"). Keep only those that were on the public
# Pareto frontier (qubits, Toffolis) when they were scored.
scored = []
for s in snap['submissions']:
    m = s.get('officialMetrics') or {}
    if s.get('status') not in ('accepted', 'rejected') or not m.get('qubits') or not m.get('toffoli'):
        continue
    scored.append((s['scorePublishedAt'] or s['createdAt'], m['qubits'], m['toffoli'],
                   s.get('solverUsername') or '', s['id'][:8]))
scored.sort()
def frontier(rows):
    best = []
    for q, t in sorted(rows):
        if not best or t < best[-1][1]:
            best.append((q, t))
    return best

def thin(stairs, step=0.012):
    # keep a staircase point when Toffolis drop by >1.2% (log-scale) or at the ends
    out = []
    for q, t in stairs:
        if not out or t < out[-1][1] * (1 - step) or (q, t) == stairs[-1]:
            out.append((q, t))
    return out

fu = snap['fetched_utc']
snap_date = fu[:10] if '-' in fu[:10] else f'{fu[:4]}-{fu[4:6]}-{fu[6:8]}'
dates = ['2026-06-30', '2026-07-31', '2026-08-31', '2026-09-30', '2026-10-31', snap_date]
history = []
for d in dates:
    rows = [(q, t) for when, q, t, who, i in scored if when[:10] <= d]
    full = frontier(rows)
    lt, lq, lp = min(full, key=lambda x: x[1]), min(full, key=lambda x: x[0]), min(full, key=lambda x: x[0] * x[1])
    history.append({'date': d, 'stairs': [list(x) for x in thin(full)],
                    'low_t': list(lt), 'low_q': list(lq), 'best_prod': list(lp)})
board = [{'q': q, 't': t, 'd': when[:10], 'id': i} for when, q, t, who, i in scored if who == 'MonitSharma']
board = [list(x) for x in frontier([(b['q'], b['t']) for b in board])]
leaders = {}
for when, q, t, who, i in scored:
    for key, val in (('toffoli', t), ('qubits', q), ('product', q * t)):
        if key not in leaders or val < leaders[key]['v']:
            leaders[key] = {'v': val, 'q': q, 't': t, 'who': who, 'id': i, 'd': when[:10]}
n_scored = len(scored)
curves = [{'p': c['p'], 'w': c['w'], 'branches': c['branches_checked'], 'wrong': c['wrong_value_branches'],
           'exhaustive': c['exhaustive'], 'exceptional': c['exceptional_fraction'],
           'success': round(c['single_run_success'], 4) if 'single_run_success' in c else None,
           'runs99': c.get('runs_for_99pct')} for c in toy['curves']]

fmt = lambda n: f'{n:,}'
for k in kernels:
    k['q_fmt'] = fmt(k['best']['q'])
    k['kept_fmt'] = f"{k['best']['kept'] / 1e6:.1f}M"
    if 'cmp' in k:
        k['cmp']['kept_fmt'] = f"{k['cmp']['kept'] / 1e6:.1f}M"
for v in leaders.values():
    v['t_fmt'], v['q_fmt'] = fmt(v['t']), fmt(v['q'])

json.dump({'snapshot_utc': snap['fetched_utc'], 'snapshot_date': snap_date, 'n_scored': n_scored, 'n_scored_fmt': fmt(n_scored), 'kernels': kernels, 'points': points, 'pareto': pareto,
           'published': published, 'hardware': hw, 'history': history, 'mine_frontier': board, 'leaders': leaders, 'toy': curves,
           'references': [
               {'name': 'Challenge starting circuit', 'q': 2715, 't': 3940000},
               {'name': 'Google, low-gate (private)', 'q': 1425, 't': 2100000},
               {'name': 'Google, low-qubit (private)', 'q': 1175, 't': 2700000},
           ]}, sys.stdout, separators=(',', ':'))
