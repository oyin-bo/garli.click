// @ts-check

import { firehose } from 'bski';

import { boot } from './atlas/boot';

// runTry();

runAtlas();

async function runTry() {
  const out = document.createElement('pre');
  document.body.appendChild(out);

  out.textContent = 'fetching 1s worth of traffic..';
  let stopAt = 0;
  let count = 0;
  let totalParse = 0;

  for await (const batch of firehose()) {
    if (!stopAt) {
      stopAt = Date.now() + 1000;
      out.textContent = 'fetching 1s worth of traffic...\n';
    }

    for (const msg of batch) {
      count++;
      totalParse += (msg.parseTime || 0);
      out.textContent =
        'fetching 1s worth of traffic...\n' +
        '  ' + (msg.$type || msg.action) +
        out.textContent.slice(out.textContent.indexOf('\n'));
      console.log(msg);
    }

    if (Date.now() >= stopAt) break;
  }

  out.textContent = 
    out.textContent =
    'fetched 1s worth of traffic...\n' +
    count.toLocaleString() + ' records, ' + (totalParse / count).toFixed(3).replace(/\.?0+$/, '') + 'ms/record\n' +
    out.textContent.slice(out.textContent.indexOf('\n'));
  
}

function runAtlas() {

  const elem = document.createElement('div');
  document.body.appendChild(elem);

  elem.style.cssText = `
  position: fixed;
  left: 0; top: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.9);
  `;

  boot(elem);

}