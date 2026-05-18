// Main app shell
const { useState: useStateA, useMemo: useMemoA, useEffect: useEffectA } = React;

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',           icon: 'dashboard' },
  { id: 'masterlist', label: 'Masterlist',          icon: 'users',     section: 'data' },
  { id: 'visualizer', label: 'Connections',         icon: 'network',   section: 'data' },
  { id: 'groups',     label: 'Group Formation',     icon: 'grid',      section: 'plan' },
  { id: 'rooms',      label: 'Room Assignment',     icon: 'bed',       section: 'plan' },
  { id: 'reports',    label: 'Reports & Export',    icon: 'file',      section: 'output' },
];

const App = () => {
  const [view, setView] = useStateA('dashboard');
  // Init state from mock data, preserve across navigation
  const [candidates, setCandidates] = useStateA(() => MOCK_CANDIDATES.map(c => ({...c, groupId: null, roomId: null})));
  const [connections, setConnections] = useStateA(MOCK_CONNECTIONS);
  const [groups, setGroups] = useStateA(MOCK_GROUPS);
  const [rooms, setRooms] = useStateA(MOCK_ROOMS);

  // Persist navigation in URL hash
  useEffectA(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && NAV.find(n => n.id === hash)) setView(hash);
    const onHash = () => {
      const h = window.location.hash.replace('#', '');
      if (h && NAV.find(n => n.id === h)) setView(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffectA(() => {
    if (window.location.hash.replace('#', '') !== view) {
      window.history.replaceState(null, '', '#' + view);
    }
  }, [view]);

  // Pre-seed a couple of group + room placements so the dashboard isn't all-zero
  useEffectA(() => {
    setCandidates(prev => {
      // Only seed if untouched
      if (prev.some(c => c.groupId || c.roomId)) return prev;
      const seeds = {
        c01: { groupId: 'g1', roomId: 'rF1' },
        c47: { groupId: 'g1', roomId: 'rF1' }, // sibling — will conflict
        c02: { groupId: 'g2', roomId: 'rM1' },
        c04: { groupId: 'g2', roomId: 'rM1' }, // classmates — conflict
        c03: { groupId: 'g3', roomId: 'rF2' },
        c05: { groupId: 'g4', roomId: 'rF2' },
        c06: { groupId: 'g2', roomId: 'rM2' },
        c07: { groupId: 'g3', roomId: 'rF3' },
        c08: { groupId: 'g4', roomId: 'rM2' },
        c09: { groupId: 'g3', roomId: 'rM3' },
        c10: { groupId: 'g4', roomId: 'rF1' },
      };
      return prev.map(c => seeds[c.id] ? {...c, ...seeds[c.id]} : c);
    });
  }, []);

  // Conflict computation — used by Dashboard and Reports
  const conflicts = useMemoA(() => {
    const cMap = Object.fromEntries(candidates.map(c => [c.id, c]));
    const gMap = Object.fromEntries(groups.map(g => [g.id, g]));
    const rMap = Object.fromEntries(rooms.map(r => [r.id, r]));
    const groupConflicts = [];
    const roomConflicts = [];
    connections.forEach(e => {
      const a = cMap[e.from], b = cMap[e.to];
      if (!a || !b) return;
      if (a.groupId && a.groupId === b.groupId) {
        groupConflicts.push({
          kind: 'group',
          a, b, type: e.type,
          locationName: gMap[a.groupId]?.name,
          label: `${a.firstName} ${a.lastName} & ${b.firstName} ${b.lastName}`,
          context: `Same group: ${gMap[a.groupId]?.name} · ${e.type}`,
        });
      }
      if (a.roomId && a.roomId === b.roomId) {
        roomConflicts.push({
          kind: 'room',
          a, b, type: e.type,
          locationName: rMap[a.roomId]?.name,
          label: `${a.firstName} ${a.lastName} & ${b.firstName} ${b.lastName}`,
          context: `Same room: ${rMap[a.roomId]?.name} · ${e.type}`,
        });
      }
    });
    return { groupConflicts, roomConflicts };
  }, [candidates, connections, groups, rooms]);

  const viewMeta = NAV.find(n => n.id === view);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div style={{minWidth: 0}}>
            <div className="brand-name">Shepherd's Grouping</div>
            <div className="brand-sub">BLD Youth Ministry</div>
          </div>
        </div>

        <div className="nav-section-label">Overview</div>
        {NAV.filter(n => !n.section).map(n => <NavItem key={n.id} item={n} active={view === n.id} onClick={() => setView(n.id)} conflicts={conflicts}/>)}

        <div className="nav-section-label">Candidate data</div>
        {NAV.filter(n => n.section === 'data').map(n => <NavItem key={n.id} item={n} active={view === n.id} onClick={() => setView(n.id)} conflicts={conflicts} connectionCount={connections.length}/>)}

        <div className="nav-section-label">Planning</div>
        {NAV.filter(n => n.section === 'plan').map(n => <NavItem key={n.id} item={n} active={view === n.id} onClick={() => setView(n.id)} conflicts={conflicts}/>)}

        <div className="nav-section-label">Output</div>
        {NAV.filter(n => n.section === 'output').map(n => <NavItem key={n.id} item={n} active={view === n.id} onClick={() => setView(n.id)} conflicts={conflicts}/>)}

        <div className="sidebar-foot">
          <div className="avatar">JR</div>
          <div style={{flex: 1, minWidth: 0}}>
            <div className="who">Ate Joan Reyes</div>
            <div className="who-sub">Head Shepherd · Admin</div>
          </div>
          <button className="btn-ghost" style={{padding: 6, color: '#8a99ae', borderRadius: 6}}><Icon name="settings" size={15}/></button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <Icon name={viewMeta.icon} size={18} style={{color: 'var(--accent)'}}/>
          <div>
            <h1>{viewMeta.label}</h1>
          </div>
          <div className="spacer"/>
          <span className="batch-pill"><span className="dot"/>Active batch: {MOCK_BATCH}</span>
          <button className="btn btn-sm btn-ghost" style={{position: 'relative'}}>
            <Icon name="bell" size={15}/>
            <span style={{position: 'absolute', top: 2, right: 4, width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)'}}/>
          </button>
        </header>

        <div className="content">
          {view === 'dashboard'  && <Dashboard  candidates={candidates} connections={connections} groups={groups} rooms={rooms} conflicts={conflicts} onNav={setView}/>}
          {view === 'masterlist' && <Masterlist candidates={candidates} setCandidates={setCandidates} connections={connections} groups={groups} rooms={rooms} onNav={setView}/>}
          {view === 'visualizer' && <Visualizer candidates={candidates} connections={connections} groups={groups}/>}
          {view === 'groups'     && <Groups     candidates={candidates} setCandidates={setCandidates} connections={connections} groups={groups} setGroups={setGroups} conflicts={conflicts}/>}
          {view === 'rooms'      && <Rooms      candidates={candidates} setCandidates={setCandidates} connections={connections} rooms={rooms} setRooms={setRooms} groups={groups}/>}
          {view === 'reports'    && <Reports    candidates={candidates} connections={connections} groups={groups} rooms={rooms} conflicts={conflicts}/>}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ item, active, onClick, conflicts, connectionCount }) => {
  let badge = null;
  let warnClass = '';
  if (item.id === 'groups') {
    const n = conflicts.groupConflicts.length;
    if (n > 0) { badge = n; warnClass = 'warn-badge'; }
  }
  if (item.id === 'rooms') {
    const n = conflicts.roomConflicts.length;
    if (n > 0) { badge = n; warnClass = 'warn-badge'; }
  }
  if (item.id === 'visualizer' && connectionCount) badge = connectionCount;
  return (
    <button className={"nav-item " + (active ? 'active ' : '') + warnClass} onClick={onClick}>
      <Icon name={item.icon} size={17} className="nav-icon"/>
      <span>{item.label}</span>
      {badge != null && <span className="nav-badge">{badge}</span>}
    </button>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
