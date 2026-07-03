import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('269526915.bcm', 'utf8'));
const procs = data.procedures?.procedure_dict || {};

for (const name of ['排序列表', 'sort', 'sortin', '空列表']) {
  const proc = Object.values(procs).find(p => p.name === name);
  if (!proc) { console.log('Not found:', name); continue; }
  console.log('===', name, '=== PARAMS:', proc.param);
  console.log(proc.blocksXML);
  console.log();
}

// Also check if split_options exists
console.log('=== split_options ===');
console.log(JSON.stringify(data.split_options, null, 2));
