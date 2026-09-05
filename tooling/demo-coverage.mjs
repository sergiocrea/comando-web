#!/usr/bin/env node
/* Mide cuántas frases del banco de comandos real entiende el modo local de la demo
   (docs/demo-data.json → intents). Uso:
     node tooling/demo-coverage.mjs [ruta/al/banco.jsonl] [frase extra] [frase extra]…
   Por defecto usa operador-variaciones.jsonl de comando-pro (53 intenciones × 5 estilos).
   Imprime las frases que NO se entienden: son las que hay que cubrir con palabras clave
   nuevas en docs/demo-data.json. */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const D = JSON.parse(readFileSync(join(here, '..', 'docs', 'demo-data.json'), 'utf8'));
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,;]/g, ' ').replace(/\s+/g, ' ').trim();
const has = (t, ...w) => w.some((x) => t.includes(x));
const intentOf = (t) => { for (const it of D.intents) { const reOk = it.re ? new RegExp(it.re).test(t) : true; const kwOk = it.kw ? it.kw.some((k) => t.includes(k)) : true; const needOk = it.needs ? it.needs.some((k) => t.includes(k)) : true; if (reOk && kwOk && needOk && (it.re || it.kw)) return it.id; } return 'unknown'; };
const isControl = (t) => /^(confirmar|confirmo|confirmado|confirma)( \d{6})?$/.test(t) || /^(ok|oka|dale|si|ya|listo|bueno|va)$/.test(t) || /^(cancela|cancelar|olvidalo|dejalo|mejor no|no)$/.test(t) || /^mas$/.test(t) || /^deshace/.test(t) || /^basta$/.test(t) || has(t, 'por que');
const [, , bankArg, ...extra] = process.argv;
const bank = bankArg && existsSync(bankArg) ? bankArg : join(here, '..', '..', 'comando-pro', 'docs', 'research', 'capabilities', 'banks', 'operador-variaciones.jsonl');
if (existsSync(bank)) {
  const rows = readFileSync(bank, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((o) => o.utterance);
  let ok = 0; const miss = [];
  for (const o of rows) { const t = norm(o.utterance); if (isControl(t) || intentOf(t) !== 'unknown') ok += 1; else miss.push((o.intent || o.id || '?') + ' | ' + o.utterance); }
  console.log(`banco: ${ok}/${rows.length} entendidas (${Math.round((ok / rows.length) * 100)} %)`);
  if (miss.length) console.log(miss.join('\n'));
} else console.log('sin banco (' + bank + '); solo frases extra');
const phrases = bankArg && !existsSync(bankArg) ? [bankArg, ...extra] : extra;
for (const e of phrases) console.log(intentOf(norm(e)).padEnd(20), '|', e);
