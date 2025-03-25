import Piscina from 'piscina';
import { ComputeEngine } from '@cortex-js/compute-engine';

const ce = new ComputeEngine();

const piscina = new Piscina({
  filename: new URL('./worker.mjs', import.meta.url).href,
});

async function evaluateAsync(source, maxTimeMs) {
  const abort = new AbortController();
  const signal = abort.signal;
  const t = setTimeout(() => {
    abort.abort();
  }, maxTimeMs);
  const result = await piscina.run(source, { signal });
  clearTimeout(t);
  return result;
}

function toMs(hrtime) {
  return hrtime[0] * 1_000 + hrtime[1] / 1_000_000;
}

async function bench(title, source) {
  console.log(`Benchmarking: ${title}`);

  // Run an evaluation to "wake up" the worker pool so this doesn't skew our
  // results.
  await evaluateAsync('1', 1_000);

  const workerStart = process.hrtime();
  for (let i = 0; i < 1_000; i++) {
    await evaluateAsync(source, 1_000);
  }
  const workerEnd = process.hrtime(workerStart);

  const mainStart = process.hrtime();
  for (let i = 0; i < 1_000; i++) {
    ce.parse(source).evaluate().toLatex();
  }
  const mainEnd = process.hrtime(mainStart);

  console.log(`worker: ${toMs(workerEnd)}\nmain: ${toMs(mainEnd)}\n`);
}

async function main() {
  await bench('constant', '1');
  await bench('arithmetic', '3 + 4 * 20');
  await bench('more CPU intensive', '3 + 1000!');

  // Check that we can kill a long-running computation.
  try {
    await evaluateAsync('1 + 5000000!', 1_000);
  } catch {
    console.log('Killed long-running computation!\n');
  }

  // Check that we can still evaluate afterwards.
  // Compare to "arithmetic" above to see if we incur the warm-up cost again.
  await bench('after kill', '3 + 4 * 20', 1_000);
}

main();
