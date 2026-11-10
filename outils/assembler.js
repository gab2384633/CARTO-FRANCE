#!/usr/bin/env node
// Assemble la carte complète : code (carte.html) + données de la veille (radicaux.json).
// Usage : node outils/assembler.js carte.html radicaux.json sortie.html
'use strict';
const fs = require('fs');
const [carte, donnees, out] = process.argv.slice(2);
if (!carte || !donnees || !out) { console.error('Usage : node outils/assembler.js carte.html radicaux.json sortie.html'); process.exit(1); }
const h = fs.readFileSync(carte, 'utf8');
const d = JSON.parse(fs.readFileSync(donnees, 'utf8'));
if (!Array.isArray(d.groupes) || !Array.isArray(d.evenements)) { console.error('radicaux.json invalide'); process.exit(2); }
const i = h.indexOf('\nconst RAD_BASE = '), j = i < 0 ? -1 : h.indexOf('\n', i + 1);
if (i < 0 || j < 0) { console.error('emplacement RAD_BASE introuvable dans carte.html'); process.exit(2); }
const js = JSON.stringify({ maj: d.maj, groupes: d.groupes, evenements: d.evenements }).replace(/<\//g, '<\\/');
fs.writeFileSync(out, h.slice(0, i + 1) + 'const RAD_BASE = ' + js + ';' + h.slice(j));
console.log('OK', out, d.maj, d.groupes.length + ' groupes', d.evenements.length + ' événements');
