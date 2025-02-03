// @ts-check

import { firehose } from 'bski';

/**
 * @typedef {{
 *  profile: import('../../package').CompactProfile,
 *  color: number,
 *  weight: number,
 *  x: number,
 *  y: number,
 *  relevant: import('../../package').CompactPost[]
 * }} ProfileBubble
 */

/**
 * 
 * @param {import('../../app').DBAccess} db
 */
export async function firehoseToBubbles(db) {
  // TODO: collect records, generate bubbles for accounts, recalculate positions, labels and flashing

  /** @type {ProfileBubble[]} */
  const bubbles = [];
  /** @type {Map<string, ProfileBubble>} */
  const bubbleByShortDID = new Map();

  for await (const chunk of firehose()) {
    for (const post of chunk) {
      const existingBubble = bubbleByShortDID.get(post.shortDID);
      if (existingBubble) {
        // TODO: update bubble
      } else {
        // TODO: create bubble
      }
    }

    for (const profile of chunk.profiles) {
      const existingBubble = bubbleByShortDID.get(profile.shortDID);
      if (existingBubble) {
        // TODO: update bubble
      } else {
        // TODO: create bubble
      }
    }
  }

}
