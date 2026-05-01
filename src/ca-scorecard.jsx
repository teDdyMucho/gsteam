// ca-scorecard.jsx — My Scorecard with 3 viz options

function CAScorecard({ state, ca, theme, viz = 'rings' }) {
  const score = CABT_caScorecard(ca, state);
  const status = CABT_scoreToStatus(score.composite);

  return (
    <div style={{ padding: '8px 16px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Hero numbers */}
      <Card theme={theme} padding={20}>
        <div style={{ fontSize: 11, color: theme.inkMuted, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>Q2 2026 · Projected payout</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
          <div style={{ fontFamily: theme.serif, fontSize: 44, fontWeight: 600, color: theme.ink, letterSpacing: -1, lineHeight: 1 }}>
            {CABT_fmtMoney(score.finalPayout)}
          </div>
          <div style={{ fontSize: 14, color: theme.inkMuted }}>of {CABT_fmtMoney(score.maxPayout)} max</div>
        </div>
        <div style={{ marginTop: 12, height: 8, background: theme.rule, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            width: `${(score.finalPayout / score.maxPayout * 100)}%`,
            height: '100%', background: STATUS[status],
            transition: 'width .5s',
          }}/>
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusPill status={status} size="lg" />
          <span style={{ fontSize: 13, color: theme.inkSoft }}>Composite {(score.composite*100).toFixed(0)}/100</span>
        </div>
      </Card>

      {/* Book Data Completeness — explicit per brief */}
      <Card theme={theme}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.ink }}>Book data completeness</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: score.bookCompleteness < 0.8 ? STATUS.yellow : STATUS.green }}>
            {CABT_fmtPct(score.bookCompleteness)}
          </div>
        </div>
        <div style={{ height: 6, background: theme.rule, borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ width: `${score.bookCompleteness*100}%`, height: '100%', background: score.bookCompleteness < 0.8 ? STATUS.yellow : STATUS.green }}/>
        </div>
        <div style={{ fontSize: 12, color: theme.inkMuted, lineHeight: 1.4 }}>
          If this is below 100%, your <strong style={{ color: theme.ink }}>Performance bonus is reduced proportionally.</strong>
        </div>
      </Card>

      {/* Visualization */}
      {viz === 'rings'   && <RingsViz   score={score} theme={theme} />}
      {viz === 'bars'    && <BarsViz    score={score} theme={theme} />}
      {viz === 'compose' && <ComposeViz score={score} theme={theme} />}

      {/* Bucket breakdown — always shown below */}
      <BucketBreakdown score={score} state={state} theme={theme} />

      {/* Debug panel — diagnoses why bookCompleteness / composite look off.
          Shows raw qStart/qEnd, expected vs filled, and sample month values
          so we can spot date-format mismatches or wrong quarter windows. */}
      <ScorecardDebug score={score} ca={ca} state={state} theme={theme} />
    </div>
  );
}

function ScorecardDebug({ score, ca, state, theme }) {
  const [open, setOpen] = React.useState(false);
  const d = score.debug || {};
  const cfg = (state && state.config) || {};
  const inferredQStartFromConfig = cfg.quarterStart || cfg.quarter_start || '(unset → fell back to current-quarter default)';
  const inferredQEndFromConfig   = cfg.quarterEnd   || cfg.quarter_end   || '(unset → fell back to qStart, monthsInQuarter=1)';
  const completenessPct = (score.bookCompleteness * 100).toFixed(2) + '%';

  const rows = [
    ['CA', ca && ca.id],
    ['Today', d.todayIso],
    ['Quarter window (used)', `${d.qStartIso}  →  ${d.qEndIso}`],
    ['Quarter window (config raw)', `${inferredQStartFromConfig}  →  ${inferredQEndFromConfig}`],
    ['Months in quarter', d.monthsInQuarter],
    ['Active clients for this CA', d.clientCount],
    ['Expected (clients × months)', d.expected],
    ['Filled (metrics in window)', d.filled],
    ['Completeness', `${d.filled}/${d.expected}  =  ${completenessPct}`],
    ['Total metrics for this CA (any month)', d.totalMyMetrics],
    ['Sample m.month — IN window', JSON.stringify(d.sampleMonthsInWindow || [])],
    ['Sample m.month — ALL for this CA', JSON.stringify(d.sampleMonthsAll || [])],
    ['Type of m.month', d.sampleMetricMonthType],
    ['First metric row keys', JSON.stringify(d.sampleMetricShape || [])],
    ['Config keys present', JSON.stringify(d.configKeys || [])],
    ['cfg.quarterStart (camelCase)', String(d.cfgQuarterStart)],
    ['cfg.quarterEnd (camelCase)', String(d.cfgQuarterEnd)],
    ['cfg.quarter_start (snake — should be undefined)', String(d.cfgQuarterStartSnake)],
    ['cfg.quarter_end (snake — should be undefined)', String(d.cfgQuarterEndSnake)],
  ];

  const flags = [];
  if (!cfg.quarterStart && !cfg.quarter_start) flags.push('quarterStart missing from config — using fallback.');
  if (!cfg.quarterEnd   && !cfg.quarter_end)   flags.push('quarterEnd missing from config — qEnd defaulted to qStart, so monthsInQuarter=1.');
  if (cfg.quarter_start || cfg.quarter_end)    flags.push('Snake_case quarter_* present on config — toUI() should have converted these. Check api.jsx.');
  if (d.totalMyMetrics > 0 && d.filled === 0)  flags.push('CA has metrics but NONE land in window — likely month-format / window-boundary mismatch.');
  if (d.expected > 0 && d.expected > d.clientCount * 4) flags.push('Expected > clients × 4 — quarter window probably extends beyond reasonable range.');
  if (d.sampleMonthsAll && d.sampleMonthsAll.some(m => typeof m === 'string' && m.length === 7)) {
    flags.push('At least one m.month is "YYYY-MM" (length 7). Lex compare against "YYYY-MM-DD" excludes it.');
  }

  return (
    <Card theme={theme} padding={0}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '12px 16px', background: 'transparent', border: 'none',
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: theme.inkMuted, flexShrink: 0 }}/>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: theme.ink, letterSpacing: -0.1 }}>
          Debug · scoring inputs
        </span>
        <span style={{ fontSize: 12, color: theme.inkMuted }}>{open ? 'hide' : 'show'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px', fontSize: 12, lineHeight: 1.5, color: theme.inkSoft }}>
          {flags.length > 0 && (
            <div style={{
              borderTop: `1px solid ${theme.rule}`, paddingTop: 10, marginBottom: 10,
            }}>
              <div style={{ fontWeight: 700, color: STATUS.red, marginBottom: 4 }}>Suspected issues</div>
              {flags.map((f, i) => (
                <div key={i} style={{ color: STATUS.red, fontSize: 12 }}>· {f}</div>
              ))}
            </div>
          )}
          <div style={{ borderTop: `1px solid ${theme.rule}` }}/>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: `1px solid ${theme.rule}` }}>
              <span style={{ flex: '0 0 42%', color: theme.inkMuted }}>{k}</span>
              <span style={{ flex: 1, fontFamily: 'ui-monospace, Menlo, monospace', color: theme.ink, wordBreak: 'break-all' }}>
                {v == null ? '—' : String(v)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function RingsViz({ score, theme }) {
  const buckets = [
    { key: 'performance', label: 'Performance', value: score.performance, hint: 'Revenue · Ad · Funnel' },
    { key: 'retention',   label: 'Retention',   value: score.retention,   hint: 'Attrition · Satisfaction' },
    { key: 'growth',      label: 'Growth',      value: score.growth,      hint: 'Trajectory · Events' },
  ];
  return (
    <Card theme={theme}>
      <SectionLabel theme={theme}>Buckets</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {buckets.map(b => {
          const s = CABT_scoreToStatus(b.value);
          return (
            <div key={b.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '8px 0' }}>
              <ScoreRing value={b.value} size={72} stroke={6} color={STATUS[s]} bg={theme.rule}
                label={<div style={{ fontSize: 17, fontWeight: 700, color: theme.ink, fontVariantNumeric: 'tabular-nums' }}>{(b.value*100).toFixed(0)}</div>}/>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.ink, textAlign: 'center' }}>{b.label}</div>
              <div style={{ fontSize: 10, color: theme.inkMuted, textAlign: 'center', lineHeight: 1.3 }}>{b.hint}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function BarsViz({ score, theme }) {
  const buckets = [
    { key: 'performance', label: 'Performance', value: score.performance },
    { key: 'retention',   label: 'Retention',   value: score.retention },
    { key: 'growth',      label: 'Growth',      value: score.growth },
  ];
  return (
    <Card theme={theme}>
      <SectionLabel theme={theme}>Buckets</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {buckets.map(b => {
          const s = CABT_scoreToStatus(b.value);
          return (
            <div key={b.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: theme.ink }}>{b.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: STATUS[s], fontVariantNumeric: 'tabular-nums' }}>{(b.value*100).toFixed(0)}</span>
              </div>
              <div style={{ position: 'relative', height: 14, background: theme.rule, borderRadius: 7, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: '60%', top: 0, bottom: 0, width: 1, background: theme.inkMuted, opacity: 0.3 }}/>
                <div style={{ position: 'absolute', left: '80%', top: 0, bottom: 0, width: 1, background: theme.inkMuted, opacity: 0.3 }}/>
                <div style={{ width: `${b.value*100}%`, height: '100%', background: STATUS[s], transition: 'width .4s' }}/>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ComposeViz({ score, theme }) {
  const status = CABT_scoreToStatus(score.composite);
  return (
    <Card theme={theme}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '8px 0' }}>
        <ScoreRing value={score.composite} size={120} stroke={10} color={STATUS[status]} bg={theme.rule}
          label={
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: theme.ink, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{(score.composite*100).toFixed(0)}</div>
              <div style={{ fontSize: 10, color: theme.inkMuted, letterSpacing: 0.5, marginTop: 2 }}>OF 100</div>
            </div>
          }
        />
        <div style={{ flex: 1, fontSize: 13, lineHeight: 1.6 }}>
          {[
            ['Performance', score.performance],
            ['Retention',   score.retention],
            ['Growth',      score.growth],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${theme.rule}` }}>
              <span style={{ color: theme.inkSoft }}>{k}</span>
              <span style={{ fontWeight: 700, color: STATUS[CABT_scoreToStatus(v)], fontVariantNumeric: 'tabular-nums' }}>{(v*100).toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function BucketBreakdown({ score, state, theme }) {
  const [expanded, setExpanded] = React.useState({ performance: true, retention: false, growth: false });
  // Aggregate sub-scores across CA's clients
  const subs = score.clients.map(c => c.sub).filter(s => s.composite != null);
  const avg = (key) => subs.length ? subs.reduce((s, sb) => s + (sb[key] || 0), 0) / subs.length : 0;
  const groups = [
    { key: 'performance', label: 'Performance', total: score.performance, items: [
      ['revenue',      'Revenue',         avg('revenue')],
      ['adEfficiency', 'Ad efficiency',   avg('adEfficiency')],
      ['funnel',       'Funnel',          avg('funnel')],
    ]},
    { key: 'retention', label: 'Retention', total: score.retention, items: [
      ['attrition',    'Attrition',       avg('attrition')],
      ['satisfaction', 'Satisfaction',    avg('satisfaction')],
    ]},
    { key: 'growth', label: 'Growth', total: score.growth, items: [
      ['growth',       'MRR trajectory',  avg('growth')],
    ]},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {groups.map(g => {
        const isOpen = expanded[g.key];
        const s = CABT_scoreToStatus(g.total);
        return (
          <Card key={g.key} theme={theme} padding={0}>
            <button onClick={() => setExpanded(e => ({ ...e, [g.key]: !e[g.key] }))}
              style={{
                width: '100%', padding: '14px 16px', background: 'transparent', border: 'none',
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: STATUS[s], flexShrink: 0 }}/>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: theme.ink, letterSpacing: -0.15 }}>{g.label}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: STATUS[s], fontVariantNumeric: 'tabular-nums' }}>{(g.total*100).toFixed(0)}</span>
              <Icon name={isOpen ? 'chev-u' : 'chev-d'} size={16} color={theme.inkMuted}/>
            </button>
            {isOpen && (
              <div style={{ padding: '0 16px 14px' }}>
                {g.items.map(([k, label, val]) => {
                  const ss = CABT_scoreToStatus(val);
                  return (
                    <div key={k} style={{ padding: '10px 0', borderTop: `1px solid ${theme.rule}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: theme.inkSoft }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: STATUS[ss], fontVariantNumeric: 'tabular-nums' }}>{(val*100).toFixed(0)}</span>
                      </div>
                      <div style={{ height: 4, background: theme.rule, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${val*100}%`, height: '100%', background: STATUS[ss] }}/>
                      </div>
                      {ss === 'red' && (
                        <button style={{
                          marginTop: 6, background: 'transparent', border: 'none', cursor: 'pointer',
                          color: STATUS.red, fontSize: 11, fontWeight: 600, padding: 0,
                          textDecoration: 'underline', fontFamily: 'inherit',
                        }}>Why is this red?</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

Object.assign(window, { CAScorecard, RingsViz, BarsViz, ComposeViz, BucketBreakdown, ScorecardDebug });
