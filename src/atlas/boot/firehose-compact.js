// @ts-check

import sentiment from 'wink-sentiment';

import { firehose } from 'bski';

/**
 * @typedef {{
 *  did: string,
 *  postCount: number,
 *  repliesTo: { [did: string]: { count: number, sentiment: number } },
 *  likesTo: { [did: string]: number }
 * }} AccountStats
 */

export async function* streamAccounts() {

  /**
   * @type {Map<string, AccountStats>}
   */
  const accounts = new Map();

  for await (const chunk of firehose()) {
    for (const msg of chunk) {
      if (msg.action !== 'create') continue;

      let account = accounts.get(msg.repo);
      if (!account) {
        account = {
          did: msg.repo,
          postCount: 0,
          repliesTo: {},
          likesTo: {}
        };

        accounts.set(msg.repo, account);
      }

      if (msg.$type === 'app.bsky.feed.post') {
        /** @type {{ score: number, normalizedScore: number }} */
        const snt = sentiment(msg.text);

        const replyRef = breakFeedURIPostOnly(msg.reply?.parent.uri);
        if (replyRef) {
          let replyEntry = account.repliesTo[replyRef.did];
          if (replyEntry) {
            replyEntry.count++;
            replyEntry.sentiment += snt.normalizedScore;
          } else {
            replyEntry = {
              count: 1,
              sentiment: snt.normalizedScore
            };
            account.repliesTo[replyRef.did] = replyEntry;
          }
        }

      } else if (msg.$type === 'app.bsky.feed.like') {
        const likeRef = breakFeedURIPostOnly(msg.subject.uri);
        if (!likeRef) continue;
        account.likesTo[likeRef.did] = (account.likesTo[likeRef.did] || 0) + 1;
      }
    }

    yield accounts;
  }
}

const _breakFeedUri_Regex = /^at\:\/\/([a-z0-9\:]+)\/app.bsky.feed.post\/?(.*)?$/;

/**
* @param {string | null | undefined} uri
*/
export function breakFeedURIPostOnly(uri) {
  if (!uri) return;
  const match = _breakFeedUri_Regex.exec(uri);
  if (!match) return;
  return { did: match[1], postID: match[2] };
}
