import { firehose } from 'bski';

tryRun();

async function tryRun() {
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