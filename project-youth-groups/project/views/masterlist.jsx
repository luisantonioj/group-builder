// Masterlist (Candidate Management) view
const { useState: useStateM, useMemo: useMemoM } = React;

const ALLERGY_COLOR = "#d97706";

const Masterlist = ({ candidates, setCandidates, connections, groups, rooms, onNav }) => {
  const [search, setSearch] = useStateM('');
  const [genderFilter, setGenderFilter] = useStateM('all');
  const [statusFilter, setStatusFilter] = useStateM('all');
  const [sortKey, setSortKey] = useStateM('lastName');
  const [sortDir, setSortDir] = useStateM('asc');
  const [editing, setEditing] = useStateM(null); // candidate id or 'new'
  const [importOpen, setImportOpen] = useStateM(false);

  const conn = useMemoM(() => {
    const map = {};
    connections.forEach(e => {
      map[e.from] = (map[e.from] || 0) + 1;
      map[e.to] = (map[e.to] || 0) + 1;
    });
    return map;
  }, [connections]);

  const filtered = useMemoM(() => {
    let rows = [...candidates];
    if (genderFilter !== 'all') rows = rows.filter(c => c.gender === genderFilter);
    if (statusFilter === 'unassigned') rows = rows.filter(c => !c.groupId);
    if (statusFilter === 'assigned') rows = rows.filter(c => c.groupId);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(c =>
        (c.firstName + ' ' + c.lastName).toLowerCase().includes(q) ||
        c.school.toLowerCase().includes(q) ||
        c.inviter.toLowerCase().includes(q) ||
        c.contact.includes(q)
      );
    }
    rows.sort((a,b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === 'connections') { av = conn[a.id]||0; bv = conn[b.id]||0; }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return rows;
  }, [candidates, search, genderFilter, statusFilter, sortKey, sortDir, conn]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const SortHead = ({ k, children }) => (
    <th onClick={() => toggleSort(k)}>
      <span style={{display: 'inline-flex', alignItems: 'center', gap: 4}}>
        {children}
        {sortKey === k && <Icon name="chevronDown" size={12} style={{transform: sortDir === 'asc' ? 'rotate(180deg)' : 'none'}}/>}
      </span>
    </th>
  );

  const groupName = (id) => groups.find(g => g.id === id)?.name;
  const editingCandidate = editing && editing !== 'new' ? candidates.find(c => c.id === editing) : null;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Masterlist</h2>
          <p>All candidates registered for {MOCK_BATCH}. Click a row to view and edit details, or import a new batch from spreadsheet.</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setImportOpen(true)}><Icon name="upload" size={14}/> Import .xlsx / .csv</button>
          <button className="btn"><Icon name="download" size={14}/> Export</button>
          <button className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" size={14}/> Add candidate</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap'}}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, school, inviter, contact…" />
        <div style={{display: 'flex', gap: 4, padding: 3, background: 'white', border: '1px solid var(--line)', borderRadius: 8}}>
          {['all', 'M', 'F'].map(g => (
            <button key={g} className={"btn btn-sm " + (genderFilter === g ? 'btn-primary' : 'btn-ghost')} style={{borderColor: 'transparent'}} onClick={() => setGenderFilter(g)}>
              {g === 'all' ? 'All genders' : g === 'M' ? '♂ Male' : '♀ Female'}
            </button>
          ))}
        </div>
        <div style={{display: 'flex', gap: 4, padding: 3, background: 'white', border: '1px solid var(--line)', borderRadius: 8}}>
          {[{k:'all',l:'All'},{k:'assigned',l:'Grouped'},{k:'unassigned',l:'Ungrouped'}].map(s => (
            <button key={s.k} className={"btn btn-sm " + (statusFilter === s.k ? 'btn-primary' : 'btn-ghost')} style={{borderColor: 'transparent'}} onClick={() => setStatusFilter(s.k)}>{s.l}</button>
          ))}
        </div>
        <div style={{marginLeft: 'auto', fontSize: 12.5, color: 'var(--muted)'}}>
          Showing <b className="mono" style={{color: 'var(--ink-2)'}}>{filtered.length}</b> of {candidates.length}
        </div>
      </div>

      <div className="table-wrap">
        <table className="dt">
          <thead>
            <tr>
              <SortHead k="lastName">Name</SortHead>
              <SortHead k="gender">Gender</SortHead>
              <SortHead k="age">Age</SortHead>
              <SortHead k="school">School / Work</SortHead>
              <th>Inviter</th>
              <SortHead k="connections">Connections</SortHead>
              <th>Group</th>
              <th>Room</th>
              <th style={{width: 36}}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} onClick={() => setEditing(c.id)}>
                <td>
                  <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                    <Initials first={c.firstName} last={c.lastName} gender={c.gender} size={32} />
                    <div>
                      <div style={{fontWeight: 600}}>{c.lastName}, {c.firstName}</div>
                      <div style={{fontSize: 11.5, color: 'var(--muted)'}} className="mono">{c.contact}</div>
                    </div>
                    {c.allergies && (
                      <span title={"Allergy: " + c.allergies} style={{
                        marginLeft: 4, fontSize: 10, color: ALLERGY_COLOR, fontWeight: 700,
                        background: '#fef3c7', padding: '2px 6px', borderRadius: 99
                      }}>⚠ allergy</span>
                    )}
                  </div>
                </td>
                <td><GenderChip g={c.gender} /></td>
                <td className="mono">{c.age}</td>
                <td style={{fontSize: 12.5, color: 'var(--ink-3)'}}>{c.school}</td>
                <td style={{fontSize: 12.5}}>
                  {c.inviter === 'N/A' ? <span style={{color: 'var(--muted-2)', fontStyle: 'italic'}}>—</span> : <span>{c.inviter}</span>}
                </td>
                <td>
                  <span className="mono" style={{fontSize: 12.5, fontWeight: 600, color: (conn[c.id]||0) >= 3 ? 'var(--warn)' : 'var(--ink-3)'}}>
                    {conn[c.id] || 0}
                  </span>
                  {(conn[c.id]||0) >= 3 && <Icon name="alert" size={12} style={{color: 'var(--warn)', marginLeft: 4, verticalAlign: '-2px'}} />}
                </td>
                <td>
                  {c.groupId
                    ? <Chip kind="accent">{groupName(c.groupId)}</Chip>
                    : <span style={{color: 'var(--muted-2)', fontSize: 12}}>—</span>}
                </td>
                <td>
                  {c.roomId
                    ? <Chip>{rooms.find(r => r.id === c.roomId)?.name}</Chip>
                    : <span style={{color: 'var(--muted-2)', fontSize: 12}}>—</span>}
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditing(c.id)}><Icon name="edit" size={13}/></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{textAlign: 'center', padding: 40, color: 'var(--muted)'}}>No candidates match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      <CandidateEditor
        candidate={editingCandidate}
        isNew={editing === 'new'}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSave={(data) => {
          if (editing === 'new') {
            const id = 'c' + String(candidates.length + 1).padStart(2, '0');
            setCandidates([...candidates, {...data, id, joined: new Date().toISOString().slice(0,16).replace('T',' ')}]);
          } else {
            setCandidates(candidates.map(c => c.id === editing ? {...c, ...data} : c));
          }
          setEditing(null);
        }}
        onDelete={() => {
          setCandidates(candidates.filter(c => c.id !== editing));
          setEditing(null);
        }}
        candidates={candidates}
        groups={groups}
        rooms={rooms}
        connections={connections.filter(e => e.from === editing || e.to === editing)}
      />

      <ImportFlow open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
};

const CandidateEditor = ({ candidate, isNew, open, onClose, onSave, onDelete, candidates, groups, rooms, connections }) => {
  const [form, setForm] = useStateM({});
  const [tab, setTab] = useStateM('details');
  React.useEffect(() => {
    if (open) {
      setForm(candidate ? {...candidate} : {
        firstName: '', lastName: '', gender: 'M', age: 17, school: '',
        inviter: '', contact: '', facebook: '', address: '', birthday: '',
        allergies: '', father: '', mother: '', heard: ''
      });
      setTab('details');
    }
  }, [open, candidate?.id]);

  if (!open) return null;
  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const myConns = connections.map(e => {
    const otherId = e.from === candidate?.id ? e.to : e.from;
    const other = candidates.find(c => c.id === otherId);
    return { ...e, other };
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? 'Add new candidate' : `${candidate?.lastName}, ${candidate?.firstName}`}
      maxWidth={760}
      footer={
        <>
          {!isNew && <button className="btn btn-danger" onClick={onDelete}><Icon name="trash" size={13}/> Delete</button>}
          <div style={{flex: 1}}/>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>
            <Icon name="check" size={13}/> {isNew ? 'Add candidate' : 'Save changes'}
          </button>
        </>
      }
    >
      {!isNew && (
        <div className="tabs" style={{marginBottom: 16}}>
          <div className={"tab " + (tab === 'details' ? 'active' : '')} onClick={() => setTab('details')}>Details</div>
          <div className={"tab " + (tab === 'connections' ? 'active' : '')} onClick={() => setTab('connections')}>
            Connections <Chip>{myConns.length}</Chip>
          </div>
          <div className={"tab " + (tab === 'notes' ? 'active' : '')} onClick={() => setTab('notes')}>Shepherd notes</div>
        </div>
      )}

      {tab === 'details' && (
        <div className="form-grid">
          <label className="field">
            <span className="lbl">First name *</span>
            <input className="input" value={form.firstName || ''} onChange={e => set('firstName', e.target.value)} />
          </label>
          <label className="field">
            <span className="lbl">Last name *</span>
            <input className="input" value={form.lastName || ''} onChange={e => set('lastName', e.target.value)} />
          </label>
          <label className="field">
            <span className="lbl">Gender *</span>
            <select className="select" value={form.gender || 'M'} onChange={e => set('gender', e.target.value)}>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </label>
          <label className="field">
            <span className="lbl">Age</span>
            <input className="input" type="number" min="14" max="35" value={form.age || ''} onChange={e => set('age', +e.target.value)} />
          </label>
          <label className="field">
            <span className="lbl">Birthday</span>
            <input className="input" type="date" value={form.birthday || ''} onChange={e => set('birthday', e.target.value)} />
          </label>
          <label className="field">
            <span className="lbl">Personal contact</span>
            <input className="input" value={form.contact || ''} onChange={e => set('contact', e.target.value)} placeholder="09XX-XXX-XXXX" />
          </label>
          <label className="field span2">
            <span className="lbl">Address</span>
            <input className="input" value={form.address || ''} onChange={e => set('address', e.target.value)} />
          </label>
          <label className="field">
            <span className="lbl">School / Workplace</span>
            <input className="input" value={form.school || ''} onChange={e => set('school', e.target.value)} />
          </label>
          <label className="field">
            <span className="lbl">Facebook</span>
            <input className="input" value={form.facebook || ''} onChange={e => set('facebook', e.target.value)} />
          </label>
          <label className="field span2">
            <span className="lbl">Inviter <span style={{textTransform: 'none', fontWeight: 400, color: 'var(--muted-2)'}}>(searchable — links to existing candidate)</span></span>
            <input className="input" value={form.inviter || ''} onChange={e => set('inviter', e.target.value)} placeholder="Type a name or 'N/A'" />
          </label>
          <label className="field">
            <span className="lbl">Father (name / contact)</span>
            <input className="input" value={form.father || ''} onChange={e => set('father', e.target.value)} />
          </label>
          <label className="field">
            <span className="lbl">Mother (name / contact)</span>
            <input className="input" value={form.mother || ''} onChange={e => set('mother', e.target.value)} />
          </label>
          <label className="field">
            <span className="lbl">Food allergies</span>
            <input className="input" value={form.allergies || ''} onChange={e => set('allergies', e.target.value)} placeholder="Leave blank if none" />
          </label>
          <label className="field">
            <span className="lbl">How they heard</span>
            <input className="input" value={form.heard || ''} onChange={e => set('heard', e.target.value)} />
          </label>
        </div>
      )}

      {tab === 'connections' && !isNew && (
        <div>
          <div style={{display: 'flex', alignItems: 'center', marginBottom: 12}}>
            <div style={{fontSize: 13, color: 'var(--muted)'}}>{myConns.length} known connection{myConns.length === 1 ? '' : 's'}. Manually add another to flag conflicts during grouping.</div>
            <button className="btn btn-sm btn-primary" style={{marginLeft: 'auto'}}><Icon name="plus" size={13}/> Add connection</button>
          </div>
          {myConns.length === 0 && <div style={{padding: 20, textAlign: 'center', color: 'var(--muted)', background: 'var(--bg-soft)', borderRadius: 8}}>No connections yet.</div>}
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            {myConns.map((c, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--bg-soft)', borderRadius: 8}}>
                {c.other ? <Initials first={c.other.firstName} last={c.other.lastName} gender={c.other.gender} size={28} /> : <div style={{width:28,height:28}}/>}
                <div style={{flex: 1}}>
                  <div style={{fontWeight: 600, fontSize: 13}}>{c.other?.lastName}, {c.other?.firstName}</div>
                  <div style={{fontSize: 11.5, color: 'var(--muted)'}}>{c.other?.school}</div>
                </div>
                <Chip kind="accent">{c.type}</Chip>
                <Chip>{c.source}</Chip>
                <button className="btn btn-sm btn-ghost"><Icon name="trash" size={13}/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'notes' && !isNew && (
        <div>
          <label className="field">
            <span className="lbl">Internal shepherd notes <span style={{textTransform: 'none', fontWeight: 400, color: 'var(--muted-2)'}}>(not visible to candidate)</span></span>
            <textarea className="textarea" rows={6} placeholder="Quiet, mentioned being new to BLD. Mother accompanies on weekends — keep her informed about pickup." value={form.notes || ''} onChange={e => set('notes', e.target.value)}/>
          </label>
          <div style={{marginTop: 14, padding: 12, background: 'var(--accent-soft)', borderRadius: 8, fontSize: 12.5, color: 'var(--accent-dark)', display: 'flex', gap: 10}}>
            <Icon name="info" size={16}/>
            <div>Notes are only visible to shepherds with edit access. They appear on group rosters during YE weekend.</div>
          </div>
        </div>
      )}
    </Modal>
  );
};

const ImportFlow = ({ open, onClose }) => {
  const [step, setStep] = useStateM(1);
  React.useEffect(() => { if (open) setStep(1); }, [open]);

  const mockColumns = ["Pangalan", "Kasarian", "Edad", "School", "Cellphone", "Sinong nag-imbita", "Date of Birth"];
  const mockFields = [
    { col: "Pangalan",       field: "full_name",       confidence: 0.95 },
    { col: "Kasarian",       field: "gender",          confidence: 0.92 },
    { col: "Edad",           field: "age",             confidence: 0.97 },
    { col: "School",         field: "school",          confidence: 0.99 },
    { col: "Cellphone",      field: "personal_contact",confidence: 0.91 },
    { col: "Sinong nag-imbita", field: "inviter_name", confidence: 0.83 },
    { col: "Date of Birth",  field: "birthday",        confidence: 0.94 },
  ];
  const mockPreview = [
    { name: "Carlos Andres Reyes",  gender: "M", age: 18, school: "DLSU Manila",     contact: "0917-555-3201", inviter: "Patricia Anne Reyes", status: 'new' },
    { name: "Mae Anne Gutierrez",   gender: "F", age: 17, school: "St. Bridget",     contact: "0917-555-3202", inviter: "Sophia Aquino",       status: 'new' },
    { name: "Joaquin Santos",       gender: "M", age: 18, school: "De La Salle Lipa",contact: "0917-234-1802", inviter: "Patricia Anne Reyes", status: 'duplicate' },
    { name: "Lara Marie de Jesus",  gender: "F", age: 19, school: "Lyceum",          contact: "0917-555-3204", inviter: "N/A",                 status: 'new' },
    { name: "Marco Tristan Lopez",  gender: "M", age: 20, school: "Concentrix",      contact: "0917-555-3205", inviter: "Marco Garcia",         status: 'new' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Import candidates" maxWidth={780}
      footer={
        <>
          {step > 1 && <button className="btn" onClick={() => setStep(step-1)}><Icon name="chevronLeft" size={13}/> Back</button>}
          <div style={{flex: 1}}/>
          <button className="btn" onClick={onClose}>Cancel</button>
          {step < 3 && <button className="btn btn-primary" onClick={() => setStep(step+1)}>Continue <Icon name="chevronRight" size={13}/></button>}
          {step === 3 && <button className="btn btn-accent" onClick={onClose}><Icon name="check" size={13}/> Import 4 candidates</button>}
        </>
      }
    >
      {/* Stepper */}
      <div style={{display: 'flex', gap: 4, marginBottom: 18}}>
        {['Upload', 'Map columns', 'Preview & confirm'].map((label, i) => (
          <div key={i} style={{flex: 1, display: 'flex', alignItems: 'center', gap: 8}}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: i+1 <= step ? 'var(--accent)' : 'var(--bg-soft)',
              color: i+1 <= step ? 'white' : 'var(--muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>{i+1 < step ? <Icon name="check" size={12}/> : i+1}</div>
            <div style={{fontSize: 12.5, fontWeight: 600, color: i+1 === step ? 'var(--ink)' : 'var(--muted)'}}>{label}</div>
            {i < 2 && <div style={{flex: 1, height: 2, background: 'var(--line)', marginLeft: 4}}/>}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div style={{
          border: '2px dashed var(--accent)', background: 'var(--accent-soft)',
          borderRadius: 12, padding: 40, textAlign: 'center'
        }}>
          <div style={{width: 56, height: 56, margin: '0 auto 12px', borderRadius: 14, background: 'white', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Icon name="upload" size={26}/>
          </div>
          <div style={{fontSize: 15, fontWeight: 700, marginBottom: 4}}>Drop your registration spreadsheet here</div>
          <div style={{fontSize: 12.5, color: 'var(--muted)', marginBottom: 14}}>or click to browse · accepts .xlsx, .csv up to 5 MB</div>
          <button className="btn btn-primary">Choose file</button>
          <div style={{marginTop: 18, fontSize: 11.5, color: 'var(--muted)'}}>
            Tip: download our <a style={{color: 'var(--accent-dark)', fontWeight: 600}}>YE registration template</a> to skip column mapping.
          </div>
          <div style={{marginTop: 16, padding: 10, background: 'white', borderRadius: 8, border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left'}}>
            <Icon name="file" size={18} style={{color: 'var(--ok)'}}/>
            <div style={{flex: 1}}>
              <div style={{fontWeight: 600, fontSize: 13}}>registration_batch3.xlsx</div>
              <div style={{fontSize: 11.5, color: 'var(--muted)'}} className="mono">5 rows · uploaded just now</div>
            </div>
            <Chip kind="ok">Ready</Chip>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{fontSize: 13, color: 'var(--muted)', marginBottom: 12}}>We auto-detected these columns. Review the matches — high confidence ones can be left as-is.</div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            <div style={{display: 'grid', gridTemplateColumns: '1.2fr 28px 1.4fr 80px', gap: 10, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', padding: '0 10px'}}>
              <div>Column in your file</div>
              <div></div>
              <div>Maps to system field</div>
              <div>Confidence</div>
            </div>
            {mockFields.map((m, i) => (
              <div key={i} style={{display: 'grid', gridTemplateColumns: '1.2fr 28px 1.4fr 80px', gap: 10, alignItems: 'center', padding: '10px', background: 'var(--bg-soft)', borderRadius: 8}}>
                <div style={{fontWeight: 600, fontSize: 13}} className="mono">{m.col}</div>
                <Icon name="chevronRight" size={14} style={{color: 'var(--muted)'}}/>
                <select className="select">
                  <option>{m.field}</option>
                  <option>(skip column)</option>
                </select>
                <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                  <div style={{flex: 1, height: 4, background: 'var(--line)', borderRadius: 99}}>
                    <div style={{height: '100%', width: `${m.confidence*100}%`, background: m.confidence > 0.9 ? 'var(--ok)' : 'var(--warn)', borderRadius: 99}}/>
                  </div>
                  <span className="mono" style={{fontSize: 11, color: 'var(--muted)', fontWeight: 600}}>{Math.round(m.confidence*100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{display: 'flex', gap: 10, marginBottom: 12}}>
            <Chip kind="ok">4 new candidates</Chip>
            <Chip kind="warn">1 duplicate</Chip>
            <Chip>5 total rows</Chip>
          </div>
          <div className="table-wrap" style={{marginBottom: 12}}>
            <table className="dt">
              <thead>
                <tr><th>Status</th><th>Name</th><th>G</th><th>Age</th><th>Inviter</th></tr>
              </thead>
              <tbody>
                {mockPreview.map((r, i) => (
                  <tr key={i} style={{cursor: 'default'}}>
                    <td>{r.status === 'duplicate' ? <Chip kind="warn">⚠ duplicate</Chip> : <Chip kind="ok">+ new</Chip>}</td>
                    <td style={{fontWeight: 600}}>{r.name}</td>
                    <td><GenderChip g={r.gender}/></td>
                    <td className="mono">{r.age}</td>
                    <td style={{fontSize: 12.5}}>{r.inviter === 'N/A' ? <span className="muted">—</span> : r.inviter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{padding: 12, background: 'var(--warn-soft)', borderRadius: 8, fontSize: 12.5, display: 'flex', gap: 10, color: '#854d0e'}}>
            <Icon name="alert" size={16} style={{flexShrink: 0, marginTop: 1}}/>
            <div>1 candidate (Joaquin Santos) matches an existing record by phone number. We'll <b>skip</b> this row — choose <a style={{color: '#7c2d12', fontWeight: 700}}>override</a> if you want to replace the existing entry.</div>
          </div>
        </div>
      )}
    </Modal>
  );
};

window.Masterlist = Masterlist;
