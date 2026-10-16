import { ExternalLink } from 'lucide-preact';
import { ATTRIBUTION, LICENSE_URL } from '../lib/license.ts';
import { OTHER_TOOLS } from '../app/reference.ts';
import { FreeNotice } from '../components/FreeNotice.tsx';

/** About: Powered by Nimble, the license, the source and the author's other tools. */
export function AboutDialog({ onDone }: { onDone: () => void }) {
  return (
    <div class="about-copy">
      <a class="powered-by" href="https://nimblerpg.com" target="_blank" rel="noreferrer" aria-label="Powered by Nimble — nimbleRPG.com">
        <img class="on-light" src="/powered-by-nimble-black.webp" alt="" width="300" height="97" decoding="async" />
        <img class="on-dark" src="/powered-by-nimble-white.webp" alt="" width="300" height="97" decoding="async" />
      </a>
      <p class="about-license">
        {ATTRIBUTION}{' '}
        <a href={LICENSE_URL} target="_blank" rel="noreferrer">
          Read the license <ExternalLink size={13} aria-hidden="true" />
        </a>
      </p>
      <p class="about-support">
        <FreeNotice />
      </p>
      <p class="about-source">
        <a href="https://github.com/Eppinguin/nimble-nasties" target="_blank" rel="noreferrer">
          Source on GitHub <ExternalLink size={13} aria-hidden="true" />
        </a>
      </p>
      <h3>More tools for the table</h3>
      <ul class="other-tools">
        {OTHER_TOOLS.map((tool) => (
          <li key={tool.href}>
            <a href={tool.href} target="_blank" rel="noreferrer">
              <strong>
                {tool.title} <ExternalLink size={13} aria-hidden="true" />
              </strong>
              <span>{tool.blurb}</span>
            </a>
          </li>
        ))}
      </ul>
      <div class="modal-bottom">
        <button class="solid" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
