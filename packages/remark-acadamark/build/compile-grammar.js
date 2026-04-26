/**
 * Compile grammar/acadamark.peggy → src/generated/parser.js
 *
 * Run: node build/compile-grammar.js
 * Also runs automatically via the `pretest` npm script.
 *
 * The compiled parser.js is committed to git so downstream users don't need
 * peggy at runtime. CI verifies grammar and compiled parser are in sync.
 */

import peggy from 'peggy'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const grammarPath = join(root, 'grammar', 'acadamark.peggy')
const outputPath = join(root, 'src', 'generated', 'parser.js')

const grammar = readFileSync(grammarPath, 'utf8')

const source = peggy.generate(grammar, {
  format: 'es',
  output: 'source',
  // Include source map for readable errors pointing at grammar lines
  grammarSource: 'grammar/acadamark.peggy',
})

writeFileSync(outputPath, source, 'utf8')
console.log(`Grammar compiled: grammar/acadamark.peggy → src/generated/parser.js`)
