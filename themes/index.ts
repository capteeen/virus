/**
 * ONE-IMPORT SWAP.
 * Change the line below to `import theme from './culture'` and the whole app
 * becomes CULTURE: bacteria, petri dish, binary fission, quorum sensing.
 * Or set NEXT_PUBLIC_THEME=culture at build time.
 */
import virus from './virus';
import culture from './culture';
import type { Theme } from './types';

const registry: Record<string, Theme> = { virus, culture };

export const theme: Theme = registry[process.env.NEXT_PUBLIC_THEME ?? 'virus'] ?? virus;
export type { Theme } from './types';
export default theme;
