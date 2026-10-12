// Valida docs/asyncapi.yaml. Falha só com erro (severity 0); avisos são impressos.
// uso: npm i --no-save @asyncapi/parser@3.4.0 && node scripts/validar-asyncapi.mjs
import { readFileSync } from 'node:fs';
import { Parser } from '@asyncapi/parser';

const file = process.argv[2] ?? 'docs/asyncapi.yaml';
const { document, diagnostics } = await new Parser().parse(readFileSync(file, 'utf8'));
for (const d of diagnostics) console.log(`${['ERRO', 'aviso', 'info', 'dica'][d.severity]}  ${d.path.join('.')}  ${d.message}`);
const errors = diagnostics.filter((d) => d.severity === 0);
if (!document || errors.length) {
  console.error(`✖ ${file}: ${errors.length} erro(s)`);
  process.exit(1);
}
console.log(`✔ ${file} válido — ${document.channels().length} canais, ${document.operations().length} operações`);
