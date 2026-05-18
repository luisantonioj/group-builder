// Dashboard view
const { useState: useStateD, useMemo: useMemoD } = React;

const StatTile = ({ label, value, sub, color, icon, trend }) => (
  <div className="card card-pad" style={{position: 'relative'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: color + '22', color: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name={icon} size={20} />
      </div>
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em'}}>{label}</div>
        <div style={{fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.1, marginTop: 2}}>{value}</div>
        {sub && <div style={{fontSize: 11.5, color: 'var(--muted)', marginTop: 3}}>{sub}</div>}
      </div>
    </div>
    {trend && <div style={{position: 'absolute', top: 14, right: 14, fontSize: 11, color: 'var(--ok)', fontWeight: 600}}>{trend}</div>}
  </div>
);

const Dashboard = ({ candidates, connections, groups, rooms, onNav, conflicts }) => {
  const total = candidates.length;
  const male = candidates.filter(c => c.gender === 'M').length;
  const female = total - male;
  const assigned = candidates.filter(c => c.groupId).length;
  const unassigned = total - assigned;
  const roomed = candidates.filter(c => c.roomId).length;
  const groupConflicts = conflicts.groupConflicts;
  const roomConflicts = conflicts.roomConflicts;
  const totalConflicts = groupConflicts.length + roomConflicts.length;

  // age distribution
  const ageBuckets = useMemoD(() => {
    const buckets = [{label: '16', value: 0}, {label: '17', value: 0}, {label: '18', value: 0}, {label: '19', value: 0}, {label: '20+', value: 0}];
    candidates.forEach(c => {
      if (c.age <= 16) buckets[0].value++;
      else if (c.age === 17) buckets[1].value++;
      else if (c.age === 18) buckets[2].value++;
      else if (c.age === 19) buckets[3].value++;
      else buckets[4].value++;
    });
    return buckets;
  }, [candidates]);

  // outreach analytics
  const outreach = useMemoD(() => {
    const m = {};
    candidates.forEach(c => {
      let k = 'Other';
      const h = (c.heard || '').toLowerCase();
      if (h.includes('classmate') || h.includes('school')) k = 'School';
      else if (h.includes('choir') || h.includes('parish') || h.includes('church') || h.includes('bld')) k = 'Parish / BLD';
      else if (h.includes('office') || h.includes('work')) k = 'Workplace';
      else if (h.includes('sister') || h.includes('brother') || h.includes('cousin') || h.includes('ate') || h.includes('kuya') || h.includes('tita')) k = 'Family';
      else if (h.includes('online') || h.includes('facebook') || h.includes('poster')) k = 'Online / Posters';
      else k = 'Friend invited';
      m[k] = (m[k] || 0) + 1;
    });
    const colors = ['#2e86c1', '#1e3a5f', '#0ea5e9', '#9333ea', '#f59e0b', '#64748b'];
    return Object.entries(m).map(([label, value], i) => ({label, value, color: colors[i % colors.length]}));
  }, [candidates]);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Quick overview of the current Youth Encounter batch. Conflict counts update in real time as you assign candidates.</p>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="refresh" size={14}/> Refresh</button>
          <button className="btn btn-primary" onClick={() => onNav('masterlist')}><Icon name="plus" size={14}/> Add candidate</button>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20}}>
        <StatTile label="Candidates" value={total} sub={`${male} male · ${female} female`} color="#2e86c1" icon="users" />
        <StatTile label="Groups formed" value={`${new Set(candidates.filter(c => c.groupId).map(c => c.groupId)).size} / ${groups.length}`} sub={`${assigned} of ${total} assigned`} color="#1e3a5f" icon="grid" />
        <StatTile label="Room assignments" value={`${roomed} / ${total}`} sub={`${total - roomed} pending`} color="#9333ea" icon="bed" />
        <StatTile label="Active conflicts" value={totalConflicts} sub={`${groupConflicts.length} group · ${roomConflicts.length} room`} color={totalConflicts > 0 ? "#dc2626" : "#16a34a"} icon={totalConflicts > 0 ? "alert" : "check"} />
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, marginBottom: 14}}>
        {/* Gender + age */}
        <Card title="Batch composition" sub={MOCK_BATCH + " · " + total + " candidates"}>
          <div style={{display: 'flex', gap: 28, alignItems: 'center'}}>
            <div style={{position: 'relative'}}>
              <Donut data={[
                {value: male, color: '#3b82f6'},
                {value: female, color: '#ec4899'},
              ]} />
              <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                <div style={{fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em'}}>{total}</div>
                <div style={{fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600}}>total</div>
              </div>
            </div>
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 14}}>
              <div>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6}}>
                  <div style={{width: 10, height: 10, borderRadius: 3, background: '#3b82f6'}}/>
                  <div style={{fontWeight: 600, fontSize: 13}}>Male</div>
                  <div style={{marginLeft: 'auto', fontWeight: 600, color: 'var(--ink-3)'}}>{male} <span className="muted" style={{fontWeight: 500}}>({Math.round(male/total*100)}%)</span></div>
                </div>
                <div style={{height: 6, background: '#eef1f6', borderRadius: 99, overflow: 'hidden'}}>
                  <div style={{height: '100%', width: `${male/total*100}%`, background: '#3b82f6'}}/>
                </div>
              </div>
              <div>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6}}>
                  <div style={{width: 10, height: 10, borderRadius: 3, background: '#ec4899'}}/>
                  <div style={{fontWeight: 600, fontSize: 13}}>Female</div>
                  <div style={{marginLeft: 'auto', fontWeight: 600, color: 'var(--ink-3)'}}>{female} <span className="muted" style={{fontWeight: 500}}>({Math.round(female/total*100)}%)</span></div>
                </div>
                <div style={{height: 6, background: '#eef1f6', borderRadius: 99, overflow: 'hidden'}}>
                  <div style={{height: '100%', width: `${female/total*100}%`, background: '#ec4899'}}/>
                </div>
              </div>
            </div>
          </div>
          <div className="hr"/>
          <div>
            <div style={{fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10}}>Age distribution</div>
            <SimpleBars data={ageBuckets} color="#2e86c1" />
          </div>
        </Card>

        {/* Conflicts */}
        <Card title="Conflict summary" sub="Detected from the relationship graph" action={
          totalConflicts > 0
            ? <Chip kind="danger">{totalConflicts} active</Chip>
            : <Chip kind="ok">All clear</Chip>
        }>
          {totalConflicts === 0 ? (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 8}}>
              <div style={{width: 48, height: 48, borderRadius: 12, background: 'var(--ok-soft)', color: 'var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Icon name="check" size={24} />
              </div>
              <div style={{fontSize: 14, fontWeight: 600}}>No conflicts detected</div>
              <div style={{fontSize: 12, color: 'var(--muted)', textAlign: 'center'}}>Start dragging candidates into groups to see live conflict checking.</div>
            </div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
              {[...groupConflicts.slice(0, 4), ...roomConflicts.slice(0, 2)].map((c, i) => (
                <div key={i} style={{display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--danger-soft)', border: '1px solid #fbbaba', borderRadius: 9}}>
                  <Icon name="alert" size={16} style={{color: 'var(--danger)', flexShrink: 0}} />
                  <div style={{flex: 1, fontSize: 12.5}}>
                    <div style={{fontWeight: 600, color: 'var(--ink-2)'}}>{c.label}</div>
                    <div style={{color: 'var(--muted)'}}>{c.context}</div>
                  </div>
                  <button className="btn btn-sm" onClick={() => onNav(c.kind === 'group' ? 'groups' : 'rooms')}>Open</button>
                </div>
              ))}
              {totalConflicts > 6 && <div style={{fontSize: 12, color: 'var(--muted)', textAlign: 'center', paddingTop: 4}}>+ {totalConflicts - 6} more</div>}
            </div>
          )}
        </Card>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 14}}>
        {/* Outreach */}
        <Card title="How candidates heard about YE" sub="Outreach analytics">
          <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
            {outreach.sort((a,b) => b.value - a.value).map((o, i) => (
              <div key={i}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}>
                  <div style={{width: 8, height: 8, borderRadius: 2, background: o.color}}/>
                  <div style={{fontSize: 13, fontWeight: 500}}>{o.label}</div>
                  <div style={{marginLeft: 'auto', fontSize: 12, color: 'var(--muted)', fontWeight: 600}} className="mono">{o.value}</div>
                </div>
                <div style={{height: 5, background: '#eef1f6', borderRadius: 99, overflow: 'hidden'}}>
                  <div style={{height: '100%', width: `${o.value/total*100}%`, background: o.color}}/>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Activity */}
        <Card title="Recent activity" sub="Audit trail · last 30 days" action={<button className="btn btn-sm btn-ghost">View all</button>}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 0}}>
            {MOCK_ACTIVITY.map((a, i) => (
              <div key={i} style={{display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < MOCK_ACTIVITY.length - 1 ? '1px solid var(--line-2)' : 'none'}}>
                <div style={{width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0}}>
                  {a.who.split(' ').map(w => w[0]).join('').slice(0,2)}
                </div>
                <div style={{flex: 1, fontSize: 13}}>
                  <div><b style={{fontWeight: 600, color: 'var(--ink-2)'}}>{a.who}</b> <span style={{color: 'var(--muted)'}}>{a.action}</span></div>
                  <div style={{fontSize: 11.5, color: 'var(--muted-2)', marginTop: 2}}>{a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
};

window.Dashboard = Dashboard;
