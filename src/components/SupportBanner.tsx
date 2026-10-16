import { ExternalLink, HeartHandshake, X } from 'lucide-preact';
import { ATTRIBUTION } from '../lib/license.ts';
import { FreeNotice } from './FreeNotice.tsx';

/** The license's free-tool notice, dismissible; it stays under About afterwards. */
export function SupportBanner({ onClose }: { onClose: () => void }) {
  return (
    <aside class="support-banner" aria-label="About Nimble Nasties">
      <HeartHandshake size={20} aria-hidden="true" />
      <p>
        <FreeNotice strong />
        <small>{ATTRIBUTION}</small>
      </p>
      <a class="support-cta" href="https://nimblerpg.com" target="_blank" rel="noreferrer">
        Support Nimble <ExternalLink size={14} />
      </a>
      <button class="support-close" onClick={onClose} aria-label="Hide this notice" title="Hide (the license notice stays under About: the info button in the header)">
        <X size={18} />
      </button>
    </aside>
  );
}
