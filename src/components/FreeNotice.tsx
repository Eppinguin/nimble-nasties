import { FREE_NOTICE_LEAD, FREE_NOTICE_REST, NIMBLE_URL } from '../lib/license.ts';

/** The license's free-tool notice, word for word; see lib/license.ts. */
export const FreeNotice = ({ strong }: { strong?: boolean }) => (
  <>
    {strong ? <strong>{FREE_NOTICE_LEAD}</strong> : FREE_NOTICE_LEAD} {FREE_NOTICE_REST}{' '}
    <a href={NIMBLE_URL} target="_blank" rel="noreferrer">
      nimbleRPG.com
    </a>
    .
  </>
);
