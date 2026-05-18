// Reports & Export view
const { useState: useStateRp, useMemo: useMemoRp } = React;

const Reports = ({ candidates, connections, groups, rooms, conflicts }) => {
  const [activeReport, setActiveReport] = useStateRp('groups');

  const cMap = useMemoRp(() => Object.fromEntries(candidates.map(c => [c.id, c])), [candidates]);
  const total = candidates.length;
  const male = candidates.filter(c => c.gender === 'M').length;
  const groupedCount = candidates.filter(c => c.groupId).length;
  const roomedCount = candidates.filter(c => c.roomId).length;
  const avgGroupSize = groups.length ? (groupedCount / groups.length).toFixed(1) : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Reports &amp; Export</h2>
          <p>Print-ready outputs for YE weekend. Export as PDF for printing or Excel for archiving.</p>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="download" size={14}/> Excel (.xlsx)</button>
          <button className="btn btn-primary"><Icon name="download" size={14}/> Print PDF packet</button>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18}}>
        {[
          { label: 'Total candidates', value: total, sub: `${male}♂ ${total-male}♀` },
          { label: 'Avg group size', value: avgGroupSize, sub: `across ${groups.length} groups` },
          { label: 'Rooms used', value: rooms.filter(r => candidates.some(c => c.roomId === r.id)).length + '/' + rooms.length, sub: roomedCount + ' candidates placed' },
          { label: 'Open conflicts', value: conflicts.groupConflicts.length + conflicts.roomConflicts.length, sub: 'requires shepherd note' },
        ].map((s, i) => (
          <div key={i} className="card card-pad" style={{borderTop: '3px solid var(--accent)'}}>
            <div style={{fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em'}}>{s.label}</div>
            <div style={{fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4}} className="mono">{s.value}</div>
            <div style={{fontSize: 11.5, color: 'var(--muted)', marginTop: 2}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        <div className={"tab " + (activeReport === 'groups' ? 'active' : '')} onClick={() => setActiveReport('groups')}>Group rosters</div>
        <div className={"tab " + (activeReport === 'rooms' ? 'active' : '')} onClick={() => setActiveReport('rooms')}>Room assignments</div>
        <div className={"tab " + (activeReport === 'conflicts' ? 'active' : '')} onClick={() => setActiveReport('conflicts')}>Conflict report</div>
        <div className={"tab " + (activeReport === 'allergies' ? 'active' : '')} onClick={() => setActiveReport('allergies')}>Allergies &amp; care</div>
        <div className={"tab " + (activeReport === 'emergency' ? 'active' : '')} onClick={() => setActiveReport('emergency')}>Emergency contacts</div>
      </div>

      {activeReport === 'groups' && (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14}}>
          {groups.map(g => {
            const members = candidates.filter(c => c.groupId === g.id);
            return (
              <div key={g.id} className="card" style={{padding: 0}}>
                <div style={{padding: '14px 18px', borderBottom: '1px solid var(--line-2)', background: '#fafbfd', display: 'flex', alignItems: 'center', gap: 10}}>
                  <div>
                    <div style={{fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em'}}>{MOCK_BATCH}</div>
                    <div style={{fontSize: 17, fontWeight: 800, letterSpacing: '-0.015em'}}>{g.name}</div>
                  </div>
                  <div style={{marginLeft: 'auto', textAlign: 'right'}}>
                    <div className="mono" style={{fontSize: 18, fontWeight: 700}}>{members.length}</div>
                    <div style={{fontSize: 10, color: 'var(--muted)'}}>members</div>
                  </div>
                </div>
                <div style={{padding: 12}}>
                  {members.length === 0 ? (
                    <div style={{padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12.5}}>No members assigned.</div>
                  ) : (
                    <table className="dt" style={{fontSize: 12}}>
                      <thead>
                        <tr><th style={{padding: '6px 10px'}}>#</th><th style={{padding: '6px 10px'}}>Name</th><th style={{padding: '6px 10px'}}>Age</th><th style={{padding: '6px 10px'}}>Room</th><th style={{padding: '6px 10px'}}>Notes</th></tr>
                      </thead>
                      <tbody>
                        {members.map((m, i) => (
                          <tr key={m.id} style={{cursor: 'default'}}>
                            <td className="mono" style={{padding: '6px 10px', color: 'var(--muted)'}}>{String(i+1).padStart(2,'0')}</td>
                            <td style={{padding: '6px 10px'}}>
                              <div style={{display: 'flex', alignItems: 'center', gap: 7}}>
                                <Initials first={m.firstName} last={m.lastName} gender={m.gender} size={22}/>
                                <span style={{fontWeight: 600}}>{m.lastName}, {m.firstName}</span>
                              </div>
                            </td>
                            <td style={{padding: '6px 10px'}} className="mono">{m.age}{m.gender}</td>
                            <td style={{padding: '6px 10px', fontSize: 11.5}}>{m.roomId ? rooms.find(r => r.id === m.roomId)?.name : <span className="muted">—</span>}</td>
                            <td style={{padding: '6px 10px', fontSize: 11.5}}>{m.allergies && <span style={{color: 'var(--warn)', fontWeight: 600}}>⚠ {m.allergies}</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeReport === 'rooms' && (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14}}>
          {rooms.map(r => {
            const members = candidates.filter(c => c.roomId === r.id);
            return (
              <div key={r.id} className="card" style={{padding: 0}}>
                <div style={{padding: '12px 16px', borderBottom: '1px solid var(--line-2)', background: r.gender === 'M' ? '#eff6ff' : '#fdf2f8'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <Icon name="bed" size={16} style={{color: r.gender === 'M' ? '#1d4ed8' : '#be185d'}}/>
                    <div style={{fontWeight: 700, fontSize: 14}}>{r.name}</div>
                    <Chip kind={r.gender === 'M' ? 'male' : 'female'}>{r.gender === 'M' ? '♂' : '♀'}</Chip>
                    <div style={{marginLeft: 'auto', fontSize: 11, color: 'var(--muted)'}} className="mono">{members.length}/{r.capacity}</div>
                  </div>
                  <div style={{fontSize: 11, color: 'var(--muted)', marginTop: 4}}>{r.floor} · {r.beds} beds</div>
                </div>
                <div style={{padding: 10}}>
                  {members.length === 0 ? (
                    <div style={{padding: 14, textAlign: 'center', color: 'var(--muted)', fontSize: 12}}>Empty</div>
                  ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                      {members.map((m, i) => (
                        <div key={m.id} style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '5px 8px', borderRadius: 6, background: 'var(--bg-soft)'}}>
                          <span className="mono" style={{fontSize: 10, color: 'var(--muted)', width: 18}}>{String(i+1).padStart(2,'0')}</span>
                          <Initials first={m.firstName} last={m.lastName} gender={m.gender} size={22}/>
                          <div style={{flex: 1, fontWeight: 600}}>{m.firstName} {m.lastName}</div>
                          <span className="mono muted" style={{fontSize: 11}}>{m.age}</span>
                          {m.groupId && <Chip kind="accent">{groups.find(g => g.id === m.groupId)?.name}</Chip>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeReport === 'conflicts' && (
        <div className="table-wrap">
          <table className="dt">
            <thead><tr><th>Location</th><th>Type</th><th>Candidate A</th><th>Candidate B</th><th>Relationship</th><th>Shepherd note</th><th>Status</th></tr></thead>
            <tbody>
              {[...conflicts.groupConflicts, ...conflicts.roomConflicts].length === 0 && (
                <tr><td colSpan={7} style={{textAlign: 'center', padding: 30, color: 'var(--ok)'}}><Icon name="check" size={18}/> No conflicts — every grouping is clean.</td></tr>
              )}
              {conflicts.groupConflicts.map((c, i) => (
                <tr key={'g'+i} style={{cursor: 'default'}}>
                  <td><Chip kind="accent">{c.locationName}</Chip></td>
                  <td><Chip>Group</Chip></td>
                  <td style={{fontWeight: 600}}>{c.a.firstName} {c.a.lastName}</td>
                  <td style={{fontWeight: 600}}>{c.b.firstName} {c.b.lastName}</td>
                  <td><Chip kind="warn">{c.type}</Chip></td>
                  <td style={{fontSize: 12, color: 'var(--muted)', fontStyle: 'italic'}}>{i === 0 ? 'Siblings — okay if stays together, parents requested.' : '—'}</td>
                  <td>{i === 0 ? <Chip kind="ok">Accepted</Chip> : <Chip kind="danger">Open</Chip>}</td>
                </tr>
              ))}
              {conflicts.roomConflicts.map((c, i) => (
                <tr key={'r'+i} style={{cursor: 'default'}}>
                  <td><Chip>{c.locationName}</Chip></td>
                  <td><Chip kind="warn">Room</Chip></td>
                  <td style={{fontWeight: 600}}>{c.a.firstName} {c.a.lastName}</td>
                  <td style={{fontWeight: 600}}>{c.b.firstName} {c.b.lastName}</td>
                  <td><Chip kind="warn">{c.type}</Chip></td>
                  <td style={{fontSize: 12, color: 'var(--muted)'}}>—</td>
                  <td><Chip kind="danger">Open</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeReport === 'allergies' && (
        <Card title="Candidates with food allergies or medical notes" sub="Distributed to kitchen team & first-aid">
          <div className="table-wrap" style={{border: 'none'}}>
            <table className="dt">
              <thead><tr><th>Name</th><th>Group</th><th>Room</th><th>Allergy / note</th><th>Parent contact</th></tr></thead>
              <tbody>
                {candidates.filter(c => c.allergies).map(c => (
                  <tr key={c.id} style={{cursor: 'default'}}>
                    <td>
                      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <Initials first={c.firstName} last={c.lastName} gender={c.gender} size={26}/>
                        <span style={{fontWeight: 600}}>{c.lastName}, {c.firstName}</span>
                      </div>
                    </td>
                    <td>{c.groupId ? <Chip kind="accent">{groups.find(g => g.id === c.groupId)?.name}</Chip> : <span className="muted">—</span>}</td>
                    <td>{c.roomId ? <Chip>{rooms.find(r => r.id === c.roomId)?.name}</Chip> : <span className="muted">—</span>}</td>
                    <td><Chip kind="warn">⚠ {c.allergies}</Chip></td>
                    <td className="mono" style={{fontSize: 11.5, color: 'var(--muted)'}}>{c.mother.split('/')[1]?.trim()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeReport === 'emergency' && (
        <Card title="Emergency contacts" sub="Printed for shepherds — keep accessible during YE weekend">
          <div className="table-wrap" style={{border: 'none'}}>
            <table className="dt">
              <thead><tr><th>Candidate</th><th>Group · Room</th><th>Father</th><th>Mother</th><th>Address</th></tr></thead>
              <tbody>
                {candidates.slice(0, 15).map(c => (
                  <tr key={c.id} style={{cursor: 'default'}}>
                    <td><span style={{fontWeight: 600}}>{c.lastName}, {c.firstName}</span> <span className="muted mono" style={{fontSize: 11}}>{c.age}{c.gender}</span></td>
                    <td style={{fontSize: 11.5}}>
                      {c.groupId && <Chip kind="accent">{groups.find(g => g.id === c.groupId)?.name}</Chip>}{' '}
                      {c.roomId && <Chip>{rooms.find(r => r.id === c.roomId)?.name}</Chip>}
                    </td>
                    <td style={{fontSize: 11.5}}>{c.father}</td>
                    <td style={{fontSize: 11.5}}>{c.mother}</td>
                    <td style={{fontSize: 11.5, color: 'var(--muted)'}}>{c.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{padding: 12, background: 'var(--bg-soft)', borderTop: '1px solid var(--line-2)', fontSize: 12, color: 'var(--muted)', textAlign: 'center'}}>
            Showing first 15 of {candidates.length} · <a style={{color: 'var(--accent-dark)', fontWeight: 600}}>View all</a>
          </div>
        </Card>
      )}
    </>
  );
};

window.Reports = Reports;
