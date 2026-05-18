// Room Assignment — drag & drop with gender constraints
const { useState: useStateR, useMemo: useMemoR } = React;

const Rooms = ({ candidates, setCandidates, connections, rooms, setRooms, groups }) => {
  const [genderTab, setGenderTab] = useStateR('M');
  const [draggingId, setDraggingId] = useStateR(null);
  const [dragOver, setDragOver] = useStateR(null);
  const [dropError, setDropError] = useStateR(null);

  const cMap = useMemoR(() => Object.fromEntries(candidates.map(c => [c.id, c])), [candidates]);

  const adj = useMemoR(() => {
    const m = {};
    candidates.forEach(c => m[c.id] = []);
    connections.forEach(e => { if (m[e.from]) m[e.from].push(e.to); if (m[e.to]) m[e.to].push(e.from); });
    return m;
  }, [candidates, connections]);

  const roomConflicts = useMemoR(() => {
    const map = {};
    rooms.forEach(r => map[r.id] = []);
    connections.forEach(e => {
      const a = cMap[e.from], b = cMap[e.to];
      if (a?.roomId && a.roomId === b?.roomId) map[a.roomId].push({a, b, type: e.type});
    });
    return map;
  }, [candidates, connections, rooms, cMap]);

  const filteredRooms = rooms.filter(r => r.gender === genderTab);
  const pool = candidates.filter(c => c.gender === genderTab && !c.roomId);

  const moveTo = (cid, rid) => {
    if (rid !== null) {
      const room = rooms.find(r => r.id === rid);
      const candidate = cMap[cid];
      if (room.gender !== candidate.gender) {
        setDropError(`${candidate.firstName} ${candidate.lastName} cannot be placed in ${room.name} — gender mismatch.`);
        setTimeout(() => setDropError(null), 3000);
        return;
      }
    }
    setCandidates(prev => prev.map(c => c.id === cid ? {...c, roomId: rid} : c));
  };

  const onDragStart = (id) => (e) => { setDraggingId(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); };
  const onDragEnd = () => { setDraggingId(null); setDragOver(null); };

  const autoFill = () => {
    const cs = candidates.filter(c => c.gender === genderTab && !c.roomId);
    let i = 0;
    const updates = {};
    cs.forEach(c => {
      // find next room with space
      for (let attempt = 0; attempt < filteredRooms.length; attempt++) {
        const r = filteredRooms[(i + attempt) % filteredRooms.length];
        const taken = candidates.filter(x => x.roomId === r.id).length + (updates[r.id] || 0);
        if (taken < r.capacity) {
          c._assign = r.id;
          updates[r.id] = (updates[r.id] || 0) + 1;
          i = (i + attempt + 1) % filteredRooms.length;
          break;
        }
      }
    });
    setCandidates(prev => prev.map(c => {
      const u = cs.find(x => x.id === c.id);
      return u?._assign ? {...c, roomId: u._assign} : c;
    }));
  };

  const totalCapacity = filteredRooms.reduce((s, r) => s + r.capacity, 0);
  const totalAssigned = candidates.filter(c => c.gender === genderTab && c.roomId).length;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Room Assignment</h2>
          <p>Gender is a hard constraint — male candidates can only go in male rooms. Relationship conflicts in shared rooms are flagged but not blocked.</p>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="plus" size={14}/> Add room</button>
          <button className="btn" onClick={autoFill}><Icon name="sparkle" size={14}/> Auto-fill</button>
          <button className="btn btn-primary"><Icon name="check" size={14}/> Finalize</button>
        </div>
      </div>

      <div className="tabs">
        <div className={"tab " + (genderTab === 'M' ? 'active' : '')} onClick={() => setGenderTab('M')}>
          ♂ Male rooms <Chip kind="male">{rooms.filter(r => r.gender === 'M').length}</Chip>
        </div>
        <div className={"tab " + (genderTab === 'F' ? 'active' : '')} onClick={() => setGenderTab('F')}>
          ♀ Female rooms <Chip kind="female">{rooms.filter(r => r.gender === 'F').length}</Chip>
        </div>
      </div>

      {/* status banner */}
      <div style={{display: 'flex', gap: 14, marginBottom: 14}}>
        <div style={{flex: 1, padding: '10px 14px', background: 'white', border: '1px solid var(--line)', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 12}}>
          <div style={{flex: 1}}>
            <div style={{fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700}}>Capacity used</div>
            <div style={{fontSize: 18, fontWeight: 700, marginTop: 2}} className="mono">{totalAssigned} / {totalCapacity}</div>
          </div>
          <div style={{flex: 2}}>
            <div style={{height: 8, background: 'var(--line-2)', borderRadius: 99, overflow: 'hidden'}}>
              <div style={{height: '100%', width: `${(totalAssigned/totalCapacity)*100}%`, background: genderTab === 'M' ? '#3b82f6' : '#ec4899'}}/>
            </div>
          </div>
        </div>
        <div style={{padding: '10px 14px', background: 'white', border: '1px solid var(--line)', borderRadius: 9}}>
          <div style={{fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700}}>Conflicts</div>
          <div style={{fontSize: 18, fontWeight: 700, marginTop: 2, color: Object.values(roomConflicts).flat().length ? 'var(--danger)' : 'var(--ok)'}} className="mono">
            {filteredRooms.reduce((s, r) => s + (roomConflicts[r.id]?.length || 0), 0)}
          </div>
        </div>
        <div style={{padding: '10px 14px', background: 'white', border: '1px solid var(--line)', borderRadius: 9}}>
          <div style={{fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700}}>Unassigned</div>
          <div style={{fontSize: 18, fontWeight: 700, marginTop: 2}} className="mono">{pool.length}</div>
        </div>
      </div>

      {dropError && (
        <div style={{padding: '10px 14px', background: 'var(--danger-soft)', border: '1px solid #f5b5b5', borderRadius: 9, color: '#991b1b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14}}>
          <Icon name="alert" size={16}/> {dropError}
        </div>
      )}

      <div style={{display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14, height: 'calc(100vh - 360px)', minHeight: 460}}>
        {/* Pool */}
        <div className="card" style={{padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
          <div style={{padding: '12px 14px', borderBottom: '1px solid var(--line-2)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <h3 style={{margin: 0, fontSize: 14, fontWeight: 700}}>{genderTab === 'M' ? '♂ Male' : '♀ Female'} candidates</h3>
              <Chip kind={genderTab === 'M' ? 'male' : 'female'}>{pool.length}</Chip>
            </div>
            <div style={{fontSize: 11.5, color: 'var(--muted)', marginTop: 4}}>{candidates.filter(c => c.gender === genderTab).length - pool.length} already placed</div>
          </div>
          <div
            style={{flex: 1, overflow: 'auto', padding: 10}}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) moveTo(id, null); }}
          >
            {pool.length === 0 && (
              <div style={{padding: 20, textAlign: 'center', color: 'var(--ok)', background: 'var(--ok-soft)', borderRadius: 8}}>
                <Icon name="check" size={22}/>
                <div style={{fontWeight: 700, marginTop: 4}}>All placed</div>
              </div>
            )}
            <div style={{display: 'flex', flexDirection: 'column', gap: 5}}>
              {pool.map(c => (
                <div key={c.id} draggable onDragStart={onDragStart(c.id)} onDragEnd={onDragEnd}
                  style={{display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', background: 'white', border: '1px solid var(--line)', borderRadius: 7, cursor: 'grab', opacity: draggingId === c.id ? 0.4 : 1, userSelect: 'none'}}
                >
                  <Icon name="drag" size={12} style={{color: 'var(--muted-2)'}}/>
                  <Initials first={c.firstName} last={c.lastName} gender={c.gender} size={24}/>
                  <div style={{flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}}>{c.firstName} {c.lastName}</div>
                  {c.allergies && <span style={{fontSize: 10}} title={c.allergies}>⚠</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rooms grid */}
        <div style={{overflow: 'auto', paddingRight: 4}}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12}}>
            {filteredRooms.map(r => {
              const members = candidates.filter(c => c.roomId === r.id);
              const conflicts = roomConflicts[r.id] || [];
              const conflictIds = new Set(conflicts.flatMap(c => [c.a.id, c.b.id]));
              const isOver = dragOver === r.id;
              const overCapacity = members.length > r.capacity;
              return (
                <div key={r.id} className="card"
                  style={{
                    padding: 0,
                    border: isOver ? '2px solid var(--accent)' : (overCapacity ? '1px solid #f5b5b5' : '1px solid var(--line)'),
                    background: isOver ? 'var(--accent-soft)' : 'white',
                    transition: 'all 0.12s',
                  }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(r.id); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) moveTo(id, r.id); setDragOver(null); }}
                >
                  <div style={{padding: '11px 14px', borderBottom: '1px solid var(--line-2)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                      <div style={{width: 28, height: 28, borderRadius: 7, background: r.gender === 'M' ? '#dbeafe' : '#fce4ef', color: r.gender === 'M' ? '#1d4ed8' : '#be185d', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <Icon name="bed" size={15}/>
                      </div>
                      <div style={{flex: 1, minWidth: 0}}>
                        <div style={{fontWeight: 700, fontSize: 14}}>{r.name}</div>
                        <div style={{fontSize: 11, color: 'var(--muted)'}}>{r.floor} · {r.beds} beds</div>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <div className="mono" style={{fontSize: 14, fontWeight: 700, color: overCapacity ? 'var(--danger)' : 'var(--ink)'}}>{members.length}/{r.capacity}</div>
                        <div style={{fontSize: 10, color: 'var(--muted)'}}>{r.capacity - members.length >= 0 ? `${r.capacity - members.length} free` : `${members.length - r.capacity} over`}</div>
                      </div>
                    </div>
                    <div style={{display: 'flex', gap: 4, marginTop: 8}}>
                      <Chip kind={r.gender === 'M' ? 'male' : 'female'}>{r.gender === 'M' ? '♂' : '♀'} only</Chip>
                      {overCapacity && <Chip kind="danger">⚠ Over capacity</Chip>}
                      {conflicts.length > 0 && <Chip kind="danger">{conflicts.length} conflict</Chip>}
                      {members.length === r.capacity && <Chip kind="ok">Full</Chip>}
                    </div>
                  </div>
                  <div style={{padding: 10, minHeight: 80}}>
                    {members.length === 0 ? (
                      <div style={{padding: '16px 10px', textAlign: 'center', color: 'var(--muted)', fontSize: 12, border: '2px dashed var(--line)', borderRadius: 7}}>Drop {r.gender === 'M' ? 'male' : 'female'} candidates here</div>
                    ) : (
                      <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                        {members.map(m => (
                          <div key={m.id} draggable onDragStart={onDragStart(m.id)} onDragEnd={onDragEnd}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 7,
                              padding: '5px 7px',
                              background: conflictIds.has(m.id) ? 'var(--danger-soft)' : 'var(--bg-soft)',
                              border: '1px solid ' + (conflictIds.has(m.id) ? '#f5b5b5' : 'transparent'),
                              borderRadius: 6,
                              cursor: 'grab', opacity: draggingId === m.id ? 0.4 : 1, userSelect: 'none', fontSize: 12,
                            }}
                          >
                            <Initials first={m.firstName} last={m.lastName} gender={m.gender} size={20}/>
                            <div style={{flex: 1, minWidth: 0, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{m.firstName} {m.lastName}</div>
                            {m.allergies && <span style={{fontSize: 9}} title={m.allergies}>⚠</span>}
                            {conflictIds.has(m.id) && <Icon name="alert" size={11} style={{color: 'var(--danger)'}}/>}
                            <button onClick={() => moveTo(m.id, null)} style={{background: 'none', color: 'var(--muted)', padding: 2}}><Icon name="close" size={10}/></button>
                          </div>
                        ))}
                      </div>
                    )}
                    {conflicts.length > 0 && (
                      <div style={{marginTop: 8, padding: '6px 8px', background: '#fee2e2', borderRadius: 6, fontSize: 11, color: '#7f1d1d'}}>
                        {conflicts.map((c, i) => (<div key={i}><b>{c.a.firstName}</b> &amp; <b>{c.b.firstName}</b> · {c.type}</div>))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

window.Rooms = Rooms;
