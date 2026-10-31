'use strict';

// whatsapp-web.js 1.34.7 breaks on the WhatsApp Web updates of July and
// September 2026. Upstream fixed both on main, but no release carries them yet:
// - media sends fail with "Data passed to getter must include an id property"
//   (wwebjs/whatsapp-web.js#201922, fix #201923);
// - message ids moved from `_serialized` to `$1`, so downloadMedia() asks for
//   an undefined id and incoming photos cannot be read (fix #201832).
// This script applies the same small changes to node_modules. It is idempotent
// and runs on `npm install` (postinstall) and before every bot start.

const fs = require('fs');
const path = require('path');

const LIB_DIR = path.join(__dirname, '..', 'node_modules', 'whatsapp-web.js', 'src');
const MARKER = '/* vodel-patch */';

const NORMALIZED_ID_EDIT = {
  find: '        this.id = data.id;\n',
  replace: `        this.id = data.id && data.id._serialized == null && data.id.$1 != null ? Object.assign({}, data.id, { _serialized: data.id.$1 }) : data.id; ${MARKER}\n`
};

const PATCHES = [
  {
    file: path.join('util', 'Injected', 'Utils.js'),
    edits: [
      {
        // Drop the MediaData private id before the outgoing Msg is created.
        find: '            ...extraOptions,\n        };\n',
        replace: `            ...extraOptions,\n        };\n        ${MARKER} if (message.__x_id) delete message.__x_id;\n`
      },
      {
        find: '.Msg.get(newMsgKey._serialized);',
        replace: `.Msg.get(newMsgKey._serialized || newMsgKey.$1); ${MARKER}`
      },
      {
        find: "return window.require('WAWebCollections').Msg.get(msg.id._serialized);",
        replace: `return window.require('WAWebCollections').Msg.get(msg.id._serialized || msg.id.$1); ${MARKER}`
      }
    ]
  },
  {
    file: path.join('structures', 'Message.js'),
    edits: [NORMALIZED_ID_EDIT]
  },
  {
    file: path.join('structures', 'Chat.js'),
    edits: [NORMALIZED_ID_EDIT]
  },
  {
    file: path.join('structures', 'Contact.js'),
    edits: [NORMALIZED_ID_EDIT]
  }
];

function applyPatches({ libDir = LIB_DIR } = {}) {
  const results = [];
  for (const patch of PATCHES) {
    const filePath = path.join(libDir, patch.file);
    if (!fs.existsSync(filePath)) {
      results.push({ file: patch.file, status: 'missing' });
      continue;
    }
    let source = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const edit of patch.edits) {
      if (source.includes(edit.replace)) continue;
      if (!source.includes(edit.find)) {
        results.push({ file: patch.file, status: 'anchor-not-found', anchor: edit.find.trim().slice(0, 60) });
        continue;
      }
      source = source.replace(edit.find, edit.replace);
      changed = true;
    }
    if (changed) fs.writeFileSync(filePath, source);
    results.push({ file: patch.file, status: changed ? 'patched' : 'ok' });
  }
  return results;
}

module.exports = { applyPatches, MARKER };

if (require.main === module) {
  const results = applyPatches();
  for (const result of results) {
    console.log(`[WWEBJS PATCH] ${result.file}: ${result.status}${result.anchor ? ` (${result.anchor})` : ''}`);
  }
  if (results.some(result => result.status !== 'ok' && result.status !== 'patched')) {
    process.exitCode = 1;
  }
}
