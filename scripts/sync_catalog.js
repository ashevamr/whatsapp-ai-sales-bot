const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const publishDir = path.join(__dirname, '..', 'catalog-site');

fs.copyFileSync(path.join(publicDir, 'catalog.css'), path.join(publishDir, 'catalog.css'));
fs.copyFileSync(path.join(publicDir, 'catalog.js'), path.join(publishDir, 'catalog.js'));

const html = fs.readFileSync(path.join(publicDir, 'catalog.html'), 'utf8');
const publishHtml = html.replace('href="./catalog.html"', 'href="./index.html"');
fs.writeFileSync(path.join(publishDir, 'index.html'), publishHtml);

console.log('Successfully synced catalog-site bundle from public.');
