import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as config from '../VehicleConfig.js';

// Guard the edit-a-number workflow: every actual scalar has a local explanation.
const lines=fs.readFileSync(new URL('../VehicleConfig.js',import.meta.url),'utf8').split('\n');
let documented=0;
for(let i=0;i<lines.length;i++){
 if(!/^\s*\w+:\s*(?:-?\d|true|false|")/.test(lines[i]))continue;
 const preceding=lines.slice(i-6,i).join('\n');
 for(const label of ['Controls:','Modes:','Units / actual limits:','Increase/decrease:','Examples:','Suggested start:'])assert(preceding.includes(label),`${lines[i].trim()} lacks ${label}`);
 documented++;
}
function count(obj){return Object.values(obj).reduce((sum,value)=>sum+(typeof value==='object'?count(value):1),0);}
assert.equal(documented,count(config),'every exported scalar is documented above its property');
assert(config.hillSettings.fullEffectGrade>config.hillSettings.flatGrade);
console.log(`PASS: all ${documented} config scalars have local mode/limits/effect/examples/range documentation.`);
