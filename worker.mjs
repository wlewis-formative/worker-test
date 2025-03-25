import { ComputeEngine } from '@cortex-js/compute-engine';

const ce = new ComputeEngine();

export default function (source) {
  return ce.parse(source).evaluate().toLatex();
}
