// ca-app.jsx — CA persona screens

// ── CA Home ─────────────────────────────────────────────────────────────────
function CAHome({ state, ca, theme, density, navigate }) {
  const score = CABT_caScorecard(ca, state);
  const status = CABT_scoreToStatus(score.composite);
  const myClients = state.clients.filter(c => c.assignedCA === ca.id && !c.cancelDate);

  // Health distribution
  const buckets = { green: 0, yellow: 0, red: 0, gray: 0 };
  myClients.forEach(c => {
    const sub = CABT_clientSubScores(c, state.monthlyMetrics, state.surveys, state.config);
    const s = CABT_scoreToStatus(sub.composite);
    buckets[s]++;
  });

  // Today's prompts
  const currentMonth = CABT_currentMonthIso();
  const missingThisMonth = myClients.filter(c =>
    !state.monthlyMetrics.some(m => m.clientId === c.id && m.month === currentMonth)
  );
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 6);
  const noRecentSurvey = myClients.filter(c =>
    !state.surveys.some(s => s.clientId === c.id && new Date(s.date) >= cutoff)
  );

  // Recent activity (logged by this CA)
  const recentActivity = [
    ...state.monthlyMetrics
      .filter(m => myClients.some(c => c.id === m.clientId))
      .map(m => ({ kind: 'metric', date: m.month, item: m, label: 'Monthly metrics', clientId: m.clientId })),
    ...state.growthEvents
      .filter(e => e.loggedBy === ca.id)
      .map(e => ({ kind: 'event', date: e.date, item: e, label: e.eventType, clientId: e.clientId })),
    ...state.surveys
      .filter(s => s.submittedBy === ca.id)
      .map(s => ({ kind: 'survey', date: s.date, item: s, label: 'Survey', clientId: s.clientId })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const bonusColor = STATUS[status];
  const projected = score.finalPayout;

  return (
    <div style={{ padding: '8px 16px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Greeting + bonus card */}
      <div style={{
        background: theme.accent, color: theme.accentInk,
        borderRadius: theme.radius + 4, padding: '22px 22px 20px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 180, height: 180,
          borderRadius: '50%', background: theme.gold, opacity: 0.18,
        }} />
        <div style={{ fontFamily: theme.serif, fontSize: 13, opacity: 0.7, letterSpacing: 0.3, marginBottom: 4 }}>
          Hey {ca.name.split(' ')[0]} — Q2 2026
        </div>
        <div style={{ fontFamily: theme.serif, fontSize: 22, fontWeight: 400, lineHeight: 1.25, letterSpacing: -0.3, marginBottom: 14, maxWidth: 280 }}>
          You're on track for <em style={{ color: theme.gold, fontStyle: 'normal', fontWeight: 600 }}>{CABT_fmtMoney(projected)}</em> this quarter.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
          <ScoreRing
            value={score.composite}
            size={84} stroke={6}
            color={bonusColor}
            bg="rgba(255,255,255,0.12)"
            label={
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: theme.accentInk, fontVariantNumeric: 'tabular-nums' }}>
                  {(score.composite * 100).toFixed(0)}
                </div>
                <div style={{ fontSize: 10, opacity: 0.65, letterSpacing: 0.6, marginTop: 2 }}>COMPOSITE</div>
              </div>
            }
          />
          <div style={{ flex: 1, fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
            <div>Performance <span style={{ float: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{(score.performance*100).toFixed(0)}</span></div>
            <div>Retention <span style={{ float: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{(score.retention*100).toFixed(0)}</span></div>
            <div>Growth <span style={{ float: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{(score.growth*100).toFixed(0)}</span></div>
          </div>
        </div>
      </div>

      {/* Book health chips */}
      <div>
        <SectionLabel theme={theme}>Book health · {myClients.length} clients</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { key: 'green',  count: buckets.green,  label: 'On track' },
            { key: 'yellow', count: buckets.yellow, label: 'Watch' },
            { key: 'red',    count: buckets.red,    label: 'At risk' },
          ].map(b => (
            <button
              key={b.key}
              onClick={() => navigate('book', { filter: b.key })}
              style={{
                background: theme.surface, border: `1px solid ${theme.rule}`,
                borderRadius: theme.radius, padding: '14px 12px', cursor: 'pointer',
                textAlign: 'left', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: STATUS[b.key] }} />
                <span style={{ fontSize: 11, color: theme.inkMuted, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}>{b.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: theme.ink, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{b.count}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Data completeness alert */}
      {score.bookCompleteness < 0.80 && (
        <Banner
          tone="warning"
          icon="alert"
          title="Book data incomplete"
          action="Log now"
          onAction={() => navigate('book', { filter: 'needs-data' })}
          theme={theme}
        >
          You're at {CABT_fmtPct(score.bookCompleteness)} for Q2. Performance bonus reduces proportionally.
        </Banner>
      )}

      {/* Today's prompts — HERO */}
      <div>
        <SectionLabel theme={theme}>
          <span>Today's prompts</span>
          <span style={{ fontWeight: 500, color: theme.inkMuted, textTransform: 'none', letterSpacing: 0 }}>
            {missingThisMonth.length + noRecentSurvey.length} open
          </span>
        </SectionLabel>
        <Card theme={theme} padding={0}>
          {missingThisMonth.length === 0 && noRecentSurvey.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: theme.inkMuted, fontSize: 14 }}>
              <Icon name="check" size={28} color={STATUS.green} />
              <div style={{ marginTop: 6 }}>You're caught up. Nice work.</div>
            </div>
          )}
          {missingThisMonth.slice(0, 4).map((c, i) => (
            <PromptRow
              key={c.id}
              theme={theme}
              icon="cal"
              tone="warning"
              title={`Log April for ${c.name}`}
              detail="Monthly metrics due"
              onClick={() => navigate('log-metrics', { clientId: c.id })}
              isLast={i === Math.min(missingThisMonth.length, 4) - 1 && noRecentSurvey.length === 0}
            />
          ))}
          {missingThisMonth.length > 4 && (
            <PromptRow
              key="more-metrics"
              theme={theme}
              icon="chev-r"
              tone="info"
              title={`+ ${missingThisMonth.length - 4} more clients missing data`}
              detail="View all"
              onClick={() => navigate('book', { filter: 'needs-data' })}
              isLast={noRecentSurvey.length === 0}
            />
          )}
          {noRecentSurvey.slice(0, 2).map((c, i) => (
            <PromptRow
              key={'s-' + c.id}
              theme={theme}
              icon="star"
              tone="info"
              title={`Collect a survey from ${c.name}`}
              detail={`No response in 6+ months`}
              onClick={() => navigate('log-survey', { clientId: c.id })}
              isLast={i === Math.min(noRecentSurvey.length, 2) - 1}
            />
          ))}
        </Card>
      </div>

      {/* Recent activity */}
      <div>
        <SectionLabel theme={theme}>Recent activity</SectionLabel>
        <Card theme={theme} padding={0}>
          {recentActivity.length === 0 && (
            <div style={{ padding: 16, color: theme.inkMuted, fontSize: 13 }}>Nothing logged yet.</div>
          )}
          {recentActivity.map((a, i) => {
            const c = state.clients.find(cl => cl.id === a.clientId);
            return (
              <ActivityRow
                key={i}
                theme={theme}
                title={`${a.label} · ${c?.name || 'Unknown'}`}
                date={a.kind === 'metric' ? CABT_fmtMonth(a.date) : CABT_fmtDate(a.date)}
                kind={a.kind}
                isLast={i === recentActivity.length - 1}
              />
            );
          })}
        </Card>
      </div>
    </div>
  );
}

function SectionLabel({ theme, children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: theme.inkMuted,
      letterSpacing: 0.6, textTransform: 'uppercase',
      padding: '0 4px 8px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    }}>{children}</div>
  );
}

function PromptRow({ theme, icon, tone, title, detail, onClick, isLast }) {
  const toneColors = {
    warning: STATUS.yellow,
    info:    theme.accent,
    success: STATUS.green,
  };
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', border: 'none', background: 'transparent',
        borderBottom: isLast ? 'none' : `1px solid ${theme.rule}`,
        width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
        minHeight: 56,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: toneColors[tone] + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={icon} size={16} color={toneColors[tone]} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: theme.ink, lineHeight: 1.3, letterSpacing: -0.1 }}>{title}</div>
        <div style={{ fontSize: 12, color: theme.inkMuted, marginTop: 2 }}>{detail}</div>
      </div>
      <Icon name="chev-r" size={16} color={theme.inkMuted} />
    </button>
  );
}

function ActivityRow({ theme, title, date, kind, isLast }) {
  const iconMap = { metric: 'chart', event: 'tag', survey: 'star' };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: isLast ? 'none' : `1px solid ${theme.rule}`,
    }}>
      <Icon name={iconMap[kind]} size={16} color={theme.inkMuted} />
      <div style={{ flex: 1, fontSize: 14, color: theme.ink }}>{title}</div>
      <div style={{ fontSize: 12, color: theme.inkMuted, fontVariantNumeric: 'tabular-nums' }}>{date}</div>
    </div>
  );
}

// ── My Book ─────────────────────────────────────────────────────────────────
function CABook({ state, ca, theme, navigate, initialFilter }) {
  const [filter, setFilter] = React.useState(initialFilter || 'all');
  const myClients = state.clients.filter(c => c.assignedCA === ca.id && !c.cancelDate);
  const currentMonth = CABT_currentMonthIso();

  const enriched = myClients.map(c => {
    const sub = CABT_clientSubScores(c, state.monthlyMetrics, state.surveys, state.config);
    const lastMetric = state.monthlyMetrics
      .filter(m => m.clientId === c.id)
      .sort((a, b) => b.month.localeCompare(a.month))[0];
    const needsData = !state.monthlyMetrics.some(m => m.clientId === c.id && m.month === currentMonth);
    return { client: c, sub, lastMetric, needsData, status: CABT_scoreToStatus(sub.composite) };
  });

  let filtered = enriched;
  if (filter === 'green' || filter === 'yellow' || filter === 'red') {
    filtered = enriched.filter(e => e.status === filter);
  } else if (filter === 'needs-data') {
    filtered = enriched.filter(e => e.needsData);
  }

  // Sort: red > yellow > gray > green
  const sortKey = { red: 0, yellow: 1, gray: 2, green: 3 };
  filtered.sort((a, b) => sortKey[a.status] - sortKey[b.status]);

  const filters = [
    { value: 'all',         label: 'All',        count: enriched.length },
    { value: 'red',         label: 'At risk',    count: enriched.filter(e => e.status === 'red').length },
    { value: 'yellow',      label: 'Watch',      count: enriched.filter(e => e.status === 'yellow').length },
    { value: 'green',       label: 'On track',   count: enriched.filter(e => e.status === 'green').length },
    { value: 'needs-data',  label: 'Needs data', count: enriched.filter(e => e.needsData).length },
  ];

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: theme.bg + 'EE', backdropFilter: 'blur(8px)',
        padding: '8px 16px 12px',
        borderBottom: `1px solid ${theme.rule}`,
      }}>
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', margin: '0 -16px', padding: '0 16px',
        }}>
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '8px 14px', height: 36, fontSize: 13, fontWeight: 600,
                background: filter === f.value ? theme.ink : theme.surface,
                color: filter === f.value ? theme.accentInk : theme.ink,
                border: `1px solid ${filter === f.value ? theme.ink : theme.rule}`,
                borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              {f.label} <span style={{ opacity: 0.65, marginLeft: 4 }}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: '4px 16px' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: theme.inkMuted }}>
            <Icon name="check" size={36} />
            <div style={{ marginTop: 8, fontSize: 14 }}>No clients match this filter.</div>
          </div>
        )}
        {filtered.map((e, i) => (
          <ClientRow
            key={e.client.id}
            client={e.client}
            sub={e.sub}
            lastMetric={e.lastMetric}
            needsData={e.needsData}
            status={e.status}
            theme={theme}
            onClick={() => navigate('client-detail', { clientId: e.client.id })}
            isLast={i === filtered.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function ClientRow({ client, sub, lastMetric, needsData, status, theme, onClick, isLast }) {
  const score = sub.composite;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 4px', width: '100%',
        background: 'transparent', border: 'none', textAlign: 'left',
        borderBottom: isLast ? 'none' : `1px solid ${theme.rule}`,
        cursor: 'pointer', fontFamily: 'inherit', minHeight: 64,
      }}
    >
      <div style={{
        width: 6, alignSelf: 'stretch', background: STATUS[status],
        borderRadius: 3, flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 600, color: theme.ink,
          letterSpacing: -0.15, lineHeight: 1.25,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{client.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 12, color: theme.inkMuted }}>
          {needsData ? (
            <span style={{ color: STATUS.yellow, fontWeight: 600 }}>⚠ No data this month</span>
          ) : (
            <span>Last: {lastMetric ? CABT_fmtMonth(lastMetric.month) : '—'}</span>
          )}
          <span>·</span>
          <span>{CABT_fmtMoney(client.monthlyRetainer)}/mo</span>
        </div>
      </div>
      <div style={{
        textAlign: 'right', flexShrink: 0,
        fontSize: 18, fontWeight: 700, color: STATUS[status],
        fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3,
      }}>
        {score != null ? (score * 100).toFixed(0) : '—'}
      </div>
      <Icon name="chev-r" size={16} color={theme.inkMuted} />
    </button>
  );
}

Object.assign(window, { CAHome, CABook, ClientRow, SectionLabel });
