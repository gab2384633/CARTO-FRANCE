#!/usr/bin/env node
// Chiffre la carte (HTML complet) en une page protégée par mot de passe.
// Usage : CARTE_MDP="phrase" node outils/chiffrer.js carte.html index.html
// AES-256-GCM, clé dérivée par PBKDF2-SHA256 (600 000 itérations) de la phrase normalisée.
// Le sel est fixe (outils/sel.txt) pour que « se souvenir de moi » survive aux mises à jour ;
// le vecteur d'initialisation est tiré au hasard à chaque chiffrement.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');

const [src, out] = process.argv.slice(2);
const mdp = process.env.CARTE_MDP;
if (!src || !out || !mdp) { console.error('Usage : CARTE_MDP="…" node outils/chiffrer.js carte.html index.html'); process.exit(1); }

// Même normalisation que dans la page : minuscules, sans accents, mots séparés par un espace
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).join(' ');
const ITER = 600000;
const sel = fs.readFileSync(path.join(__dirname, 'sel.txt'), 'utf8').trim();
const cle = crypto.pbkdf2Sync(norm(mdp), Buffer.from(sel, 'hex'), ITER, 32, 'sha256');
const iv = crypto.randomBytes(12);
const clair = zlib.gzipSync(fs.readFileSync(src));
const c = crypto.createCipheriv('aes-256-gcm', cle, iv);
const chiffre = Buffer.concat([c.update(clair), c.final(), c.getAuthTag()]);

const tpl = fs.readFileSync(path.join(__dirname, 'modele.html'), 'utf8');
const page = tpl
  .replace('/*SEL*/""', JSON.stringify(sel))
  .replace('/*ITER*/0', String(ITER))
  .replace('/*IV*/""', JSON.stringify(iv.toString('base64')))
  .replace('/*DONNEES*/""', JSON.stringify(chiffre.toString('base64')));

// Garde-fou : la page produite ne doit contenir aucun contenu lisible de la carte
const interdits = ['RAD_BASE', 'L.tileLayer', 'evenements', 'Alliance Police', 'leaflet.js'];
const fuite = interdits.filter(m => page.includes(m));
if (fuite.length) { console.error('ARRÊT : contenu en clair détecté (' + fuite.join(', ') + ')'); process.exit(2); }
fs.writeFileSync(out, page);
console.log('OK', out, (page.length / 1024 | 0) + ' Ko');
