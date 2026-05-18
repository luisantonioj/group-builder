// Connection Visualizer — SVG network graph
const { useState: useStateV, useEffect: useEffectV, useMemo: useMemoV, useRef: useRefV } = React;

const Visualizer = ({ candidates, connections, groups }) => {
  const [selected, setSelected] = useStateV(null);
  const [filter, setFilter] = useStateV('all'); // all, unassigned, conflicting
  const [view, setView] = useStateV('graph'); // graph, clusters, list
  const [hoveredCluster, setHoveredCluster] = useStateV(null);

  // Build adjacency
  const adj = useMemoV(() => {
    const m = {};
    candidates.forEach(c => m[c.id] = []);
    connections.forEach(e => {
      if (m[e.from]) m[e.from].push({id: e.to, type: e.type, source: e.source});
      if (m[e.to]) m[e.to].push({id: e.from, type: e.type, source: e.source});
    });
    return m;
  }, [candidates, connections]);

  // Compute connected components (clusters)
  const clusters = useMemoV(() => {
    const visited = new Set();
    const out = [];
    candidates.forEach(c => {
      if (visited.has(c.id)) return;
      const cluster = [];
      const stack = [c.id];
      while (stack.length) {
        const id = stack.pop();
        if (visited.has(id)) continue;
        visited.add(id);
        cluster.push(id);
        (adj[id] || []).forEach(n => !visited.has(n.id) && stack.push(n.id));
      }
      out.push(cluster);
    });
    return out.sort((a,b) => b.length - a.length);
  }, [candidates, adj]);

  // Compute static node positions using cluster-grouped force-ish layout (deterministic)
  const positions = useMemoV(() => {
    const W = 800, H = 540;
    const pos = {};
    const bigClusters = clusters.filter(c => c.length > 1);
    const singletons = clusters.filter(c => c.length === 1);

    // Arrange big clusters in a grid
    const cols = Math.ceil(Math.sqrt(bigClusters.length));
    const cellW = W / cols;
    bigClusters.forEach((cluster, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = cellW * col + cellW / 2;
      const cy = 90 + row * 180;
      const radius = Math.min(60, 22 + cluster.length * 6);
      cluster.forEach((id, j) => {
        const angle = (j / cluster.length) * Math.PI * 2 - Math.PI / 2;
        pos[id] = {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          clusterIdx: i,
        };
      });
    });

    // Place singletons along bottom
    const startY = H - 50;
    singletons.forEach((cluster, i) => {
      pos[cluster[0]] = {
        x: 40 + (i % 18) * (W - 80) / 17,
        y: startY + Math.floor(i / 18) * 28,
        clusterIdx: -1,
      };
    });

    return pos;
  }, [clusters]);

  // Find the cluster containing selected
  const selectedCluster = useMemoV(() => {
    if (!selected) return null;
    return clusters.find(c => c.includes(selected)) || null;
  }, [selected, clusters]);

  // First-degree neighbors of selected
  const neighbors = useMemoV(() => {
    if (!selected) return new Set();
    return new Set((adj[selected] || []).map(n => n.id));
  }, [selected, adj]);

  // Conflicts: group conflicts (people in same group who are connected)
  const conflictPairs = useMemoV(() => {
    const set = new Set();
    connections.forEach(e => {
      const a = candidates.find(c => c.id === e.from);
      const b = candidates.find(c => c.id === e.to);
      if (a?.groupId && a.groupId === b?.groupId) {
        set.add(`${e.from}-${e.to}`);
      }
    });
    return set;
  }, [candidates, connections]);

  const isConflicting = (e) => conflictPairs.has(`${e.from}-${e.to}`) || conflictPairs.has(`${e.to}-${e.from}`);

  const cMap = useMemoV(() => Object.fromEntries(candidates.map(c => [c.id, c])), [candidates]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Connection Visualizer</h2>
          <p>Visualize how candidates know each other. Larger nodes have more connections — use this to plan group splits before you start dragging.</p>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="plus" size={14}/> Add manual connection</button>
          <button className="btn"><Icon name="download" size={14}/> Export graph</button>
        </div>
      </div>

      <div className="tabs">
        <div className={"tab " + (view === 'graph' ? 'active' : '')} onClick={() => setView('graph')}>Network graph</div>
        <div className={"tab " + (view === 'clusters' ? 'active' : '')} onClick={() => setView('clusters')}>Clusters <Chip>{clusters.filter(c => c.length > 1).length}</Chip></div>
        <div className={"tab " + (view === 'list' ? 'active' : '')} onClick={() => setView('list')}>Relationship table <Chip>{connections.length}</Chip></div>
      </div>

      {view === 'graph' && (
        <div style={{display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14}}>
          <div className="card" style={{padding: 0, overflow: 'hidden', position: 'relative'}}>
            <div style={{position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', gap: 8, zIndex: 5, pointerEvents: 'none'}}>
              <div style={{display: 'flex', gap: 4, padding: 3, background: 'white', border: '1px solid var(--line)', borderRadius: 8, boxShadow: 'var(--shadow-sm)', pointerEvents: 'auto'}}>
                {[{k:'all',l:'All'},{k:'unassigned',l:'Unassigned only'},{k:'conflicting',l:'Conflicts only'}].map(f => (
                  <button key={f.k} className={"btn btn-sm " + (filter === f.k ? 'btn-primary' : 'btn-ghost')} style={{borderColor: 'transparent'}} onClick={() => setFilter(f.k)}>{f.l}</button>
                ))}
              </div>
              <div style={{marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', background: 'white', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)', pointerEvents: 'auto', fontSize: 11.5}}>
                <span style={{color: 'var(--muted)', fontWeight: 600}}>Legend:</span>
                <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}><span style={{width: 10, height: 10, background: '#3b82f6', borderRadius: '50%'}}/>Male</span>
                <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}><span style={{width: 10, height: 10, background: '#ec4899', borderRadius: '50%'}}/>Female</span>
                <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}><span style={{width: 18, height: 2, background: '#dc2626'}}/>Conflict</span>
              </div>
            </div>

            <svg viewBox="0 0 800 600" style={{width: '100%', height: '100%', minHeight: 580, display: 'block', cursor: selected ? 'default' : 'grab', background: 'radial-gradient(ellipse at center, #fafbfd 0%, #f0f4fa 100%)'}}>
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e3e8ef" strokeWidth="0.5" opacity="0.4"/>
                </pattern>
              </defs>
              <rect width="800" height="600" fill="url(#grid)" />

              {/* Edges */}
              {connections.map((e, i) => {
                const a = positions[e.from], b = positions[e.to];
                if (!a || !b) return null;
                const isConflict = isConflicting(e);
                const isHighlighted = selected && (e.from === selected || e.to === selected);
                const dimmed = selected && !isHighlighted;
                if (filter === 'conflicting' && !isConflict) return null;
                return (
                  <line key={i}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={isConflict ? '#dc2626' : (isHighlighted ? '#1e3a5f' : '#cbd5e1')}
                    strokeWidth={isHighlighted ? 2.2 : (isConflict ? 1.8 : 1.2)}
                    opacity={dimmed ? 0.12 : (isConflict ? 0.9 : 0.55)}
                    strokeDasharray={e.source === 'manual' ? '4 3' : undefined}
                  />
                );
              })}

              {/* Nodes */}
              {candidates.map(c => {
                const p = positions[c.id];
                if (!p) return null;
                const degree = (adj[c.id] || []).length;
                const r = 6 + Math.min(degree, 6) * 1.4;
                const isSelected = c.id === selected;
                const isNeighbor = neighbors.has(c.id);
                const dimmed = selected && !isSelected && !isNeighbor;
                const showLabel = degree >= 2 || isSelected || isNeighbor;
                if (filter === 'unassigned' && c.groupId) return null;
                if (filter === 'conflicting') {
                  const hasConflict = (adj[c.id] || []).some(n => {
                    const other = cMap[n.id];
                    return other?.groupId && other.groupId === c.groupId;
                  });
                  if (!hasConflict) return null;
                }
                return (
                  <g key={c.id} transform={`translate(${p.x}, ${p.y})`}
                    style={{cursor: 'pointer'}}
                    onClick={(e) => { e.stopPropagation(); setSelected(c.id === selected ? null : c.id); }}
                  >
                    <circle r={r + 4}
                      fill={isSelected ? '#1e3a5f' : 'transparent'}
                      opacity={isSelected ? 0.15 : 0}
                    />
                    <circle r={r}
                      fill={c.gender === 'M' ? '#3b82f6' : '#ec4899'}
                      stroke={isSelected ? '#1e3a5f' : 'white'}
                      strokeWidth={isSelected ? 3 : 2}
                      opacity={dimmed ? 0.25 : 1}
                    />
                    {showLabel && (
                      <text
                        y={-r - 6}
                        textAnchor="middle"
                        fontSize={9.5}
                        fontWeight={isSelected ? 700 : 500}
                        fill={isSelected ? '#0f1b2d' : '#1e3a5f'}
                        opacity={dimmed ? 0.3 : 1}
                        style={{pointerEvents: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif'}}
                      >
                        {c.firstName.split(' ')[0]} {c.lastName.slice(0, 6)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Background click to deselect */}
              <rect width="800" height="600" fill="transparent" onClick={() => setSelected(null)} style={{cursor: 'default'}} />
            </svg>
          </div>

          {/* Right panel: selected candidate detail */}
          <div className="card" style={{padding: 0, alignSelf: 'start', position: 'sticky', top: 0}}>
            {selected ? (() => {
              const c = cMap[selected];
              const myConns = (adj[selected] || []).map(n => ({ ...n, candidate: cMap[n.id] }));
              return (
                <>
                  <div style={{padding: 18, borderBottom: '1px solid var(--line-2)'}}>
                    <div style={{display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12}}>
                      <Initials first={c.firstName} last={c.lastName} gender={c.gender} size={48} />
                      <div style={{flex: 1, minWidth: 0}}>
                        <div style={{fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em'}}>{c.lastName}, {c.firstName}</div>
                        <div style={{fontSize: 12, color: 'var(--muted)'}}>{c.age} · {c.school}</div>
                      </div>
                    </div>
                    <div style={{display: 'flex', gap: 6}}>
                      <GenderChip g={c.gender}/>
                      {c.groupId ? <Chip kind="accent">{groups.find(g => g.id === c.groupId)?.name}</Chip> : <Chip kind="warn">Unassigned</Chip>}
                      <Chip>{myConns.length} edge{myConns.length === 1 ? '' : 's'}</Chip>
                    </div>
                  </div>
                  <div style={{padding: 14}}>
                    <div style={{fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', fontWeight: 700, marginBottom: 10}}>Connections ({myConns.length})</div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                      {myConns.length === 0 && <div style={{fontSize: 12.5, color: 'var(--muted)', padding: 12, background: 'var(--bg-soft)', borderRadius: 8, textAlign: 'center'}}>No known connections.</div>}
                      {myConns.map((n, i) => {
                        const inSameGroup = n.candidate?.groupId && n.candidate.groupId === c.groupId;
                        return (
                          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 8, padding: 7, borderRadius: 7, background: inSameGroup ? 'var(--danger-soft)' : 'var(--bg-soft)'}}>
                            <Initials first={n.candidate?.firstName} last={n.candidate?.lastName} gender={n.candidate?.gender} size={26}/>
                            <div style={{flex: 1, minWidth: 0}}>
                              <div style={{fontSize: 12.5, fontWeight: 600}}>{n.candidate?.firstName} {n.candidate?.lastName}</div>
                              <div style={{fontSize: 10.5, color: 'var(--muted)'}}>{n.type} · {n.source}</div>
                            </div>
                            {inSameGroup && <Icon name="alert" size={14} style={{color: 'var(--danger)'}} title="Same group — conflict"/>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="hr"/>
                    <button className="btn" style={{width: '100%'}} onClick={() => setSelected(null)}>Clear selection</button>
                  </div>
                </>
              );
            })() : (
              <div style={{padding: 28, textAlign: 'center'}}>
                <div style={{width: 56, height: 56, margin: '0 auto 12px', borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <Icon name="network" size={26}/>
                </div>
                <div style={{fontSize: 14, fontWeight: 700, marginBottom: 4}}>Click a node to inspect</div>
                <div style={{fontSize: 12.5, color: 'var(--muted)'}}>Selecting a candidate highlights all first-degree connections in the graph.</div>
                <div style={{marginTop: 18, padding: 12, background: 'var(--bg-soft)', borderRadius: 8, textAlign: 'left'}}>
                  <div style={{fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', fontWeight: 700, marginBottom: 8}}>Graph stats</div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span className="muted">Nodes</span><b className="mono">{candidates.length}</b></div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span className="muted">Edges</span><b className="mono">{connections.length}</b></div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span className="muted">Clusters (≥ 2)</span><b className="mono">{clusters.filter(c => c.length >= 2).length}</b></div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span className="muted">Isolates</span><b className="mono">{clusters.filter(c => c.length === 1).length}</b></div>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}><span className="muted">Largest cluster</span><b className="mono">{clusters[0]?.length || 0}</b></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'clusters' && (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14}}>
          {clusters.filter(c => c.length > 1).map((cluster, idx) => (
            <Card key={idx} title={`Cluster ${idx + 1}`} sub={`${cluster.length} candidates`} action={<Chip kind={cluster.length >= 4 ? 'warn' : 'accent'}>{cluster.length >= 4 ? 'High split priority' : 'Low priority'}</Chip>}>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10}}>
                {cluster.map(id => {
                  const c = cMap[id];
                  return (
                    <div key={id} style={{display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 4px', background: 'var(--bg-soft)', borderRadius: 99}}>
                      <Initials first={c.firstName} last={c.lastName} gender={c.gender} size={22}/>
                      <div style={{fontSize: 12, fontWeight: 600}}>{c.firstName} {c.lastName.slice(0,1)}.</div>
                    </div>
                  );
                })}
              </div>
              <div style={{fontSize: 11.5, color: 'var(--muted)'}}>Common context: <b style={{color: 'var(--ink-3)', fontWeight: 600}}>{cMap[cluster[0]]?.school}</b></div>
            </Card>
          ))}
        </div>
      )}

      {view === 'list' && (
        <div className="table-wrap">
          <table className="dt">
            <thead>
              <tr><th>From</th><th></th><th>To</th><th>Type</th><th>Source</th><th>Note</th><th>Same group?</th></tr>
            </thead>
            <tbody>
              {connections.map((e, i) => {
                const a = cMap[e.from], b = cMap[e.to];
                const sameGroup = a?.groupId && a.groupId === b?.groupId;
                return (
                  <tr key={i} style={{cursor: 'default'}}>
                    <td style={{fontWeight: 600}}>{a?.firstName} {a?.lastName}</td>
                    <td><Icon name="chevronRight" size={14} style={{color: 'var(--muted-2)'}}/></td>
                    <td style={{fontWeight: 600}}>{b?.firstName} {b?.lastName}</td>
                    <td><Chip kind="accent">{e.type}</Chip></td>
                    <td><Chip kind={e.source === 'manual' ? 'warn' : 'default'}>{e.source}</Chip></td>
                    <td style={{fontSize: 12, color: 'var(--muted)'}}>{e.note || '—'}</td>
                    <td>{sameGroup ? <Chip kind="danger">⚠ Conflict</Chip> : <Chip kind="ok">OK</Chip>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

window.Visualizer = Visualizer;
