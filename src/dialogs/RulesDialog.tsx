import { Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { ArrowRight, ExternalLink } from 'lucide-preact';
import { RULES_URL, encounterStats } from '../lib/rules.ts';
import { DEFAULT_RULES, RULESETS, RULESET_ORDER, rulesFor } from '../lib/rulesets.ts';
import type { RulesetId } from '../lib/rulesets.ts';
import { RULES_RELEASES } from '../lib/changelog.ts';
import { ATTRIBUTION } from '../lib/license.ts';
import { useApp } from '../app/context.ts';
import { DICE_RULES, HP_COMMANDS, MINION_DICE, RULES_TABS, TABLE_LEGENDARY, TABLE_MINIONS, TUNING } from '../app/reference.ts';
import type { RulesTab } from '../app/reference.ts';
import { FreeNotice } from '../components/FreeNotice.tsx';

/** The rules dialog: the encounter's printing, then Building (difficulty, monsters,
 *  minions, tuning), At the table (armor, HP field, dice, minions, legendaries) and
 *  What changed between printings. */
export function RulesDialog({ stats, onRules, onDone }: { stats: ReturnType<typeof encounterStats>; onRules: (id: RulesetId) => void; onDone: () => void }) {
  const { encounter, patchEncounter, notify } = useApp();
  const [rulesTab, setRulesTab] = useState<RulesTab>('build');
  function setOverkill(on: boolean) {
    const label = `Overkill ${on ? 'on' : 'off'}`;
    notify(label, { undo: patchEncounter(label, (enc) => ({ ...enc, overkill: on || undefined })) });
  }
  return (
    <div class="rules-copy">
      <section class="printing-plate" aria-labelledby="printing-heading">
        <h3 id="printing-heading">Rules for {encounter.name}</h3>
        <div class="printing-options" role="radiogroup" aria-labelledby="printing-heading">
          {RULESET_ORDER.map((id) => {
            const option = RULESETS[id];
            return (
              <label class={`printing-option ${encounter.rules === id ? 'on' : ''}`} key={id}>
                <input type="radio" name="printing" checked={encounter.rules === id} onChange={() => onRules(id)} />
                <span>
                  <strong>
                    {option.name}
                    {id === DEFAULT_RULES && <i class="printing-newest">Newest</i>}
                  </strong>
                  <small>{option.armorSummary}</small>
                </span>
              </label>
            );
          })}
        </div>
      </section>
      <div
        class="rules-tabs"
        role="tablist"
        aria-label="Rules dialog"
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          const at = RULES_TABS.findIndex(([id]) => id === rulesTab);
          const next = RULES_TABS[(at + (event.key === 'ArrowRight' ? 1 : RULES_TABS.length - 1)) % RULES_TABS.length][0];
          setRulesTab(next);
          document.getElementById(`rules-tab-${next}`)?.focus();
        }}
      >
        {RULES_TABS.map(([id, label]) => (
          <button key={id} role="tab" id={`rules-tab-${id}`} tabIndex={rulesTab === id ? 0 : -1} aria-selected={rulesTab === id} aria-controls="rules-panel" onClick={() => setRulesTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div id="rules-panel" role="tabpanel" aria-labelledby={`rules-tab-${rulesTab}`}>
        {rulesTab === 'build' ? (
          (() => {
            const heroes = encounter.heroes.length;
            const level = Math.round(encounter.heroes.reduce((sum, h) => sum + h.level, 0) / Math.max(1, heroes));
            return (
              <>
                <h3>Difficulty</h3>
                <p class="ref-lead">
                  Budget for {heroes} {heroes === 1 ? 'hero' : 'heroes'}: <strong>{stats.budget} levels</strong>, their total level. Add up standard monster levels against it; minions and legendary monsters don't count.
                </p>
                <ul class="tier-list">
                  {rulesFor(encounter).tiers.map((tier) => (
                    <li key={tier.label} data-difficulty={tier.tone} class={stats.difficulty.label === tier.label ? 'is-here' : ''}>
                      <span class="tier-name">
                        <i class="difficulty-dot" aria-hidden="true" />
                        {tier.label}
                      </span>
                      <span class="tier-levels">
                        {tier.levels(stats.budget)}
                        <small> levels</small>
                      </span>
                      <span class="tier-detail">
                        {tier.expect} · {tier.often}
                        {stats.difficulty.label === tier.label && <b class="tier-here">This encounter: {Number(stats.spent.toFixed(2))}</b>}
                      </span>
                    </li>
                  ))}
                </ul>
                <h3>Monsters</h3>
                <dl class="ref-list">
                  <dt>Per hero</dt>
                  <dd>
                    1–4 standard monsters: {heroes}–{heroes * 4} for this party
                  </dd>
                  <dt>Solo boss</dt>
                  <dd>Use a legendary monster; a lone standard one goes down too fast</dd>
                  <dt>Armor mix</dt>
                  <dd>About 60% unarmored, 30% Medium, 10% Heavy</dd>
                  <dt>Per session</dt>
                  <dd>2–5 fights is typical; skip fights that don't fit the story</dd>
                </dl>
                <h3>Minions</h3>
                <dl class="ref-list">
                  <dt>{heroes}</dt>
                  <dd>1 per hero: slightly harder, many more tactical options</dd>
                  <dt>
                    {heroes * 2}–{heroes * 3}
                  </dt>
                  <dd>2–3 per hero: noticeably harder</dd>
                  <dt>{heroes * 4}</dt>
                  <dd>4 per hero: much more challenging</dd>
                </dl>
                <p class="ref-hint">Start with an easier fight and bring minions in waves to dial it in.</p>
                <div class="minion-dice" role="table" aria-label="Minion damage die by party level">
                  <div role="row">
                    {MINION_DICE.map((row) => (
                      <span role="cell" key={row.die} class={level >= row.from && level <= row.to ? 'is-here' : ''}>
                        <b>{row.die}</b>
                        <small>
                          Lv {row.from}–{row.to}
                        </small>
                      </span>
                    ))}
                  </div>
                </div>
                <p class="ref-hint">Minion damage die by party level{heroes ? `; this party is level ${level}` : ''}.</p>
                <h3>Fine tuning</h3>
                <div class="tuning">
                  <section>
                    <h4>Harder</h4>
                    <ul>
                      {TUNING.harder.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h4>Easier</h4>
                    <ul>
                      {TUNING.easier.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </section>
                </div>
                <a class="ref-source" href={RULES_URL} target="_blank" rel="noreferrer">
                  Encounter rules on Nimble Nexus <ExternalLink size={14} aria-hidden="true" />
                </a>
              </>
            );
          })()
        ) : rulesTab === 'table' ? (
          <>
            <h3>Monster armor</h3>
            <dl class="ref-list">
              {rulesFor(encounter).armorReference.map(([term, meaning]) => (
                <Fragment key={term}>
                  <dt>{term}</dt>
                  <dd>{meaning}</dd>
                </Fragment>
              ))}
            </dl>
            <h3>HP field</h3>
            <dl class="ref-list ref-codes">
              {HP_COMMANDS.filter(([term]) => rulesFor(encounter).splitsDice || term !== 'd18+5').map(([term, meaning]) => (
                <Fragment key={term}>
                  <dt>
                    <kbd>{term}</kbd>
                  </dt>
                  <dd>{meaning}</dd>
                </Fragment>
              ))}
            </dl>
            <p class="ref-hint">
              Prefixes combine, e.g. <kbd>!v18</kbd> for a vulnerable crit.
            </p>
            <h3>Dice</h3>
            <dl class="ref-list">
              {DICE_RULES.map(([term, meaning]) => (
                <Fragment key={term}>
                  <dt>{term}</dt>
                  <dd>{meaning}</dd>
                </Fragment>
              ))}
            </dl>
            <h3>Minions</h3>
            <label class="rule-switch">
              <input type="checkbox" role="switch" checked={!!encounter.overkill} onChange={(e) => setOverkill(e.currentTarget.checked)} />
              <span>
                <strong>Overkill damage</strong>
                <small>Optional GMG rule. A pack's Hit field takes damage: each minion soaks its die size, the excess fells the next one in the same pack. 20 damage downs two d10 minions or five d4s.</small>
              </span>
            </label>
            <dl class="ref-list">
              {TABLE_MINIONS.map(([term, meaning]) => (
                <Fragment key={term}>
                  <dt>{term}</dt>
                  <dd>{meaning}</dd>
                </Fragment>
              ))}
            </dl>
            <h3>Legendary monsters</h3>
            <dl class="ref-list">
              {TABLE_LEGENDARY.map(([term, meaning]) => (
                <Fragment key={term}>
                  <dt>{term}</dt>
                  <dd>{meaning}</dd>
                </Fragment>
              ))}
            </dl>
          </>
        ) : (
          <ol class="changelog">
            {RULES_RELEASES.map((release) => (
              <li key={release.key} class={`release ${release.rules ? (release.rules === encounter.rules ? 'is-current' : 'is-available') : 'is-coming'}`}>
                <h3>{release.name}</h3>
                <p class="release-meta">
                  <span>{release.when}</span>
                  <span class="release-status">{!release.rules ? 'Playtest · not in the app yet' : release.rules === encounter.rules ? 'This encounter' : release.rules === DEFAULT_RULES ? 'Newest in the app' : 'In the app'}</span>
                </p>
                <p class="release-summary">{release.summary}</p>
                {release.sections.map((section) => (
                  <section class="release-section" key={section.title}>
                    <h4>{section.title}</h4>
                    <ul>
                      {section.changes.map((change) => (
                        <li key={change.what}>
                          <span class="change-what">{change.what}</span>
                          <span class="change-delta">
                            {change.from && (
                              <>
                                <s aria-label={`was ${change.from}`}>{change.from}</s>
                                <ArrowRight size={13} aria-hidden="true" />
                              </>
                            )}
                            <strong>{change.to}</strong>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
                {release.source && (
                  <a class="release-source" href={release.source} target="_blank" rel="noreferrer">
                    Nimble's changelog <ExternalLink size={13} aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
      <p class="license">
        {ATTRIBUTION} <FreeNotice />
      </p>
      <div class="modal-bottom">
        <button class="solid" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
