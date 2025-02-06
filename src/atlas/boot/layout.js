// @ts-check

/**
 * @typedef {import('./firehose-compact').AccountStats & {
 *  x?: number,
 *  y?: number,
 * }} AccountWithPosition
 */

export function layout() {

  return runLayout;

  /**
   * @param {Map<string, AccountWithPosition} accounts
   */
  function runLayout(accounts) {
    for (const [did, account] of accounts) {
      account.x = Math.random();
      account.y = Math.random();
    }
  }
}