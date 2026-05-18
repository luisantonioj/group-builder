// Group Formation — drag & drop workspace
const { useState: useStateG, useMemo: useMemoG, useRef: useRefG } = React;

const Groups = ({ candidates, setCandidates, connections, groups, setGroups, conflicts }) => {
  const [poolFilter, setPoolFilter] = useStateG({ gender: 'all', q: '' });
  const [draggingId, setDraggingId] = useStateG(null);
  const [dragOverGroup, setDragOverGroup] = useStateG(null);
  const [locked, setLocked] = useStateG(false);
  const [showSetup, setShowSetup] = useStateG(false);

  const adj = useMemoG(() => {
    const m = {};
    candidates.forEach(c => m[c.id] = []);
    connections.forEach(e => {
      if (m[e.from]) m[e.from].push(e.to);
      if (m[e.to]) m[e.to].push(e.from);
    });
    return m;
  }, [candidates, connections]);

  const pool = useMemoG(() => {
    let p = candidates.filter(c => !c.groupId);
    if (poolFilter.gender !== 'all') p = p.filter(c => c.gender === poolFilter.gender);
    if (poolFilter.q) {
      const q = poolFilter.q.toLowerCase();
      p = p.filter(c => (c.firstName + ' ' + c.lastName).toLowerCase().includes(q));
    }
    return p;
  }, [candidates, poolFilter]);

  const moveTo = (candidateId, targetGroupId) => {
    if (locked) return;
    setCandidates(prev => prev.map(c => c.id === candidateId ? {...c, groupId: targetGroupId} : c));
  };

  // Group conflicts — pairs of connected candidates in same group
  const groupConflicts = useMemoG(() => {
    const map = {};
    groups.forEach(g => map[g.id] = []);
    connections.forEach(e => {
      const a = candidates.find(c => c.id === e.from);
      const b = candidates.find(c => c.id === e.to);
      if (a?.groupId && a.groupId === b?.groupId) {
        map[a.groupId].push({ a, b, type: e.type });
      }
    });
    return map;
  }, [candidates, connections, groups]);

  const onDragStart = (id) => (e) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const onDragEnd = () => { setDraggingId(null); setDragOverGroup(null); };

  // Auto-distribute (simple round-robin within gender, biased to spread clusters)
  const distributeEvenly = () => {
    if (locked) return;
    const males = candidates.filter(c => c.gender === 'M').sort((a,b) => (adj[b.id]?.length||0) - (adj[a.id]?.length||0));
    const females = candidates.filter(c => c.gender === 'F').sort((a,b) => (adj[b.id]?.length||0) - (adj[a.id]?.length||0));
    const assign = [...candidates];
    const gids = groups.map(g => g.id);
    [males, females].forEach(list => {
      list.forEach((c, i) => {
        const gid = gids[i % gids.length];
        const idx = assign.findIndex(x => x.id === c.id);
        assign[idx] = {...assign[idx], groupId: gid};
      });
    });
    setCandidates(assign);
  };

  const clearAll = () => {
    if (locked) return;
    setCandidates(candidates.map(c => ({...c, groupId: null})));
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Group Formation</h2>
          <p>Drag candidates from the pool into groups. The system flags conflicts when connected candidates land together — you can override with a note.</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={clearAll} disabled={locked}><Icon name="refresh" size={14}/> Clear all</button>
          <button className="btn" onClick={distributeEvenly} disabled={locked}><Icon name="sparkle" size={14}/> Distribute evenly</button>
          <button className="btn" onClick={() => setShowSetup(true)} disabled={locked}><Icon name="settings" size={14}/> Configure</button>
          <button className={"btn " + (locked ? 'btn-accent' : 'btn-primary')} onClick={() => setLocked(!locked)}>
            <Icon name={locked ? 'unlock' : 'lock'} size={14}/> {locked ? 'Unlock' : 'Save & lock'}
          </button>
        </div>
      </div>

      {/* Conflict banner */}
      {(() => {
        const total = Object.values(groupConflicts).reduce((s, arr) => s + arr.length, 0);
        if (total === 0 && pool.length > 0) return (
          <div style={{padding: '10px 14px', background: 'var(--accent-soft)', border: '1px solid #b8d4e8', color: 'var(--accent-dark)', borderRadius: 9, marginBottom: 14, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10}}>
            <Icon name="info" size={16}/> {pool.length} candidate{pool.length === 1 ? '' : 's'} still in the pool. No conflicts yet — keep going.
          </div>
        );
        if (total > 0) return (
          <div style={{padding: '10px 14px', background: 'var(--danger-soft)', border: '1px solid #f5b5b5', color: '#991b1b', borderRadius: 9, marginBottom: 14, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10}}>
            <Icon name="alert" size={16}/> <b>{total}</b> conflict{total === 1 ? '' : 's'} detected across {Object.values(groupConflicts).filter(a => a.length > 0).length} group{Object.values(groupConflicts).filter(a => a.length > 0).length === 1 ? '' : 's'}. Conflicts are highlighted in red but don't block placement.
          </div>
        );
        if (pool.length === 0) return (
          <div style={{padding: '10px 14px', background: 'var(--ok-soft)', border: '1px solid #b7e4c7', color: '#15803d', borderRadius: 9, marginBottom: 14, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10}}>
            <Icon name="check" size={16}/> All {candidates.length} candidates have been grouped! Press <b>Save &amp; lock</b> to finalize.
          </div>
        );
      })()}

      <div style={{display: 'grid', gridTemplateColumns: '300px 1fr', gap: 14, height: 'calc(100vh - 260px)', minHeight: 540}}>

        {/* Pool */}
        <div className="card" style={{padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
          <div style={{padding: '12px 14px', borderBottom: '1px solid var(--line-2)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8}}>
              <h3 style={{margin: 0, fontSize: 14, fontWeight: 700}}>Candidate pool</h3>
              <Chip>{pool.length}</Chip>
              <div style={{marginLeft: 'auto', fontSize: 11, color: 'var(--muted)'}}>{candidates.length - pool.length} grouped</div>
            </div>
            <SearchInput value={poolFilter.q} onChange={v => setPoolFilter({...poolFilter, q: v})} placeholder="Search pool…" />
            <div style={{display: 'flex', gap: 4, padding: 3, background: 'var(--bg-soft)', borderRadius: 7, marginTop: 8}}>
              {['all', 'M', 'F'].map(g => (
                <button key={g} className={"btn btn-sm " + (poolFilter.gender === g ? 'btn-primary' : 'btn-ghost')} style={{flex: 1, borderColor: 'transparent', padding: '4px 8px'}} onClick={() => setPoolFilter({...poolFilter, gender: g})}>
                  {g === 'all' ? 'Both' : g === 'M' ? '♂' : '♀'}
                </button>
              ))}
            </div>
          </div>
          <div
            style={{flex: 1, overflow: 'auto', padding: 10, background: pool.length === 0 ? 'var(--ok-soft)' : 'transparent'}}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) moveTo(id, null); }}
          >
            {pool.length === 0 && (
              <div style={{textAlign: 'center', padding: '30px 10px', color: '#15803d'}}>
                <Icon name="check" size={28}/>
                <div style={{fontWeight: 700, marginTop: 6}}>Pool empty</div>
                <div style={{fontSize: 12}}>Drop candidates back here to ungroup.</div>
              </div>
            )}
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              {pool.map(c => <PoolCard key={c.id} c={c} degree={adj[c.id]?.length || 0} onDragStart={onDragStart(c.id)} onDragEnd={onDragEnd} dragging={draggingId === c.id}/>)}
            </div>
          </div>
        </div>

        {/* Group canvas */}
        <div style={{overflow: 'auto', paddingRight: 4}}>
          <div style={{display: 'grid', gridTemplateColumns: `repeat(${Math.min(groups.length, 2)}, 1fr)`, gap: 12}}>
            {groups.map(g => {
              const members = candidates.filter(c => c.groupId === g.id);
              const conflicts = groupConflicts[g.id] || [];
              const conflictIds = new Set(conflicts.flatMap(c => [c.a.id, c.b.id]));
              const males = members.filter(m => m.gender === 'M').length;
              const isOver = dragOverGroup === g.id;
              return (
                <div
                  key={g.id}
                  className="card"
                  style={{padding: 0, border: isOver ? '2px solid var(--accent)' : (conflicts.length ? '1px solid #f5b5b5' : '1px solid var(--line)'), background: isOver ? 'var(--accent-soft)' : 'white', transition: 'all 0.12s', minHeight: 220}}
                  onDragOver={(e) => { e.preventDefault(); setDragOverGroup(g.id); }}
                  onDragLeave={() => setDragOverGroup(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain');
                    if (id) moveTo(id, g.id);
                    setDragOverGroup(null);
                  }}
                >
                  <div style={{padding: '11px 14px', borderBottom: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', gap: 8}}>
                    <div style={{width: 28, height: 28, borderRadius: 7, background: 'var(--ink-2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700}}>{g.name.match(/\d+/)?.[0] || '?'}</div>
                    <div style={{flex: 1, minWidth: 0}}>
                      <div style={{fontWeight: 700, fontSize: 14, letterSpacing: '-0.005em'}}>{g.name}</div>
                      <div style={{fontSize: 11, color: 'var(--muted)'}}>
                        <span className="mono" style={{fontWeight: 600, color: members.length > g.capacity ? 'var(--danger)' : 'var(--ink-3)'}}>{members.length}</span> / {g.capacity}
                        <span style={{margin: '0 6px', color: 'var(--line)'}}>·</span>
                        <span className="mono">{males}♂ {members.length-males}♀</span>
                      </div>
                    </div>
                    {conflicts.length > 0 && <Chip kind="danger">{conflicts.length} conflict</Chip>}
                    {members.length === g.capacity && <Chip kind="ok">Full</Chip>}
                  </div>
                  <div style={{padding: 10}}>
                    {members.length === 0 ? (
                      <div style={{padding: '24px 10px', textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, border: '2px dashed var(--line)', borderRadius: 8}}>Drag candidates here</div>
                    ) : (
                      <div style={{display: 'flex', flexDirection: 'column', gap: 5}}>
                        {members.map(m => (
                          <MemberCard
                            key={m.id} c={m}
                            isConflict={conflictIds.has(m.id)}
                            onDragStart={onDragStart(m.id)}
                            onDragEnd={onDragEnd}
                            dragging={draggingId === m.id}
                            onRemove={() => moveTo(m.id, null)}
                          />
                        ))}
                      </div>
                    )}
                    {conflicts.length > 0 && (
                      <div style={{marginTop: 8, padding: '8px 10px', background: 'var(--danger-soft)', borderRadius: 7, fontSize: 11.5}}>
                        <div style={{fontWeight: 700, color: '#991b1b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6}}>
                          <Icon name="alert" size={12}/> Conflicts in this group
                        </div>
                        {conflicts.map((c, i) => (
                          <div key={i} style={{color: '#7f1d1d', fontSize: 11}}>
                            <b>{c.a.firstName} {c.a.lastName.slice(0,1)}.</b> ↔ <b>{c.b.firstName} {c.b.lastName.slice(0,1)}.</b> <span style={{color: '#991b1b'}}>({c.type})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal open={showSetup} onClose={() => setShowSetup(false)} title="Group setup"
        footer={<><button className="btn" onClick={() => setShowSetup(false)}>Cancel</button><button className="btn btn-primary" onClick={() => setShowSetup(false)}><Icon name="check" size={13}/> Apply</button></>}
      >
        <div className="form-grid">
          <label className="field span2"><span className="lbl">Number of groups</span><input className="input" type="number" defaultValue={groups.length}/></label>
          <label className="field"><span className="lbl">Max per group</span><input className="input" type="number" defaultValue={12}/></label>
          <label className="field"><span className="lbl">Naming convention</span><select className="select"><option>Kordero 1, 2, 3…</option><option>Group A, B, C…</option><option>Custom names</option></select></label>
        </div>
        <div style={{marginTop: 14, padding: 12, background: 'var(--accent-soft)', borderRadius: 8, fontSize: 12.5, color: 'var(--accent-dark)', display: 'flex', gap: 10}}>
          <Icon name="info" size={16}/>
          <div>With {candidates.length} candidates and {groups.length} groups, expected average is {Math.ceil(candidates.length / groups.length)} per group.</div>
        </div>
      </Modal>
    </>
  );
};

const PoolCard = ({ c, degree, onDragStart, onDragEnd, dragging }) => (
  <div
    draggable
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 9px',
      background: dragging ? 'var(--accent-soft)' : 'white',
      border: '1px solid ' + (dragging ? 'var(--accent)' : 'var(--line)'),
      borderRadius: 8,
      cursor: 'grab',
      opacity: dragging ? 0.5 : 1,
      transition: 'opacity 0.1s',
      userSelect: 'none',
    }}
  >
    <Icon name="drag" size={14} style={{color: 'var(--muted-2)', flexShrink: 0}}/>
    <Initials first={c.firstName} last={c.lastName} gender={c.gender} size={26}/>
    <div style={{flex: 1, minWidth: 0}}>
      <div style={{fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{c.firstName} {c.lastName}</div>
      <div style={{fontSize: 10, color: 'var(--muted)'}}>{c.age} · {c.school.split(' ').slice(0,2).join(' ')}</div>
    </div>
    {degree > 0 && (
      <div title={`${degree} known connection${degree === 1 ? '' : 's'}`} style={{
        fontSize: 10, fontWeight: 700,
        color: degree >= 3 ? 'var(--warn)' : 'var(--muted)',
        background: degree >= 3 ? 'var(--warn-soft)' : 'var(--bg-soft)',
        padding: '2px 6px', borderRadius: 99,
        display: 'inline-flex', alignItems: 'center', gap: 3,
      }}>
        <Icon name="network" size={10}/> {degree}
      </div>
    )}
  </div>
);

const MemberCard = ({ c, isConflict, onDragStart, onDragEnd, dragging, onRemove }) => (
  <div
    draggable
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '6px 8px',
      background: isConflict ? 'var(--danger-soft)' : 'var(--bg-soft)',
      border: '1px solid ' + (isConflict ? '#f5b5b5' : 'transparent'),
      borderRadius: 7,
      cursor: 'grab',
      opacity: dragging ? 0.4 : 1,
      userSelect: 'none',
    }}
  >
    <Initials first={c.firstName} last={c.lastName} gender={c.gender} size={22}/>
    <div style={{flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
      {c.firstName} {c.lastName}
    </div>
    {c.allergies && <span title={"Allergy: " + c.allergies} style={{fontSize: 10}}>⚠</span>}
    {isConflict && <Icon name="alert" size={12} style={{color: 'var(--danger)'}} title="Conflict in this group"/>}
    <button className="btn-ghost" onClick={onRemove} style={{padding: '2px 4px', borderRadius: 4, color: 'var(--muted)'}}>
      <Icon name="close" size={11}/>
    </button>
  </div>
);

window.Groups = Groups;
