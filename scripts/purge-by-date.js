#!/usr/bin/env node

/* eslint-disable no-console */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as dotenv from 'dotenv';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';

dotenv.config({ path: '.env.local' });

function parseArgs(argv) {
  const args = new Map();

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;

    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args.set(key, next);
      i++;
    } else {
      args.set(key, 'true');
    }
  }

  return args;
}

function printUsageAndExit(code) {
  console.log(
    `\nUsage:\n  node scripts/purge-by-date.js --start <date> --end <date> [options]\n\nExamples (local time):\n  node scripts/purge-by-date.js --start 2025-12-08T00:00:00 --end 2025-12-12T12:00:00\n\nExamples (explicit offset):\n  node scripts/purge-by-date.js --start 2025-12-08T00:00:00-08:00 --end 2025-12-12T12:00:00-08:00\n\nOptions:\n  --execute                 Actually delete (default is dry-run)\n  --include-rtdb-sessions   Also purge Realtime Database /sessions entries (if present)\n  --include-queue-themes    Also purge Realtime Database /queue/themes entries (if present)\n  --report <path>           Write a JSON report (default: ./purge-report.json)\n\nAuth:\n  Uses application default credentials if available.\n  Or set FIREBASE_SERVICE_ACCOUNT_PATH to a service account JSON file path.\n`
  );
  process.exit(code);
}

function parseDateToMs(value, flagName) {
  if (!value) {
    throw new Error(`Missing required --${flagName}`);
  }

  // Allow epoch milliseconds.
  if (/^\d+$/.test(value)) {
    const ms = Number(value);
    if (!Number.isFinite(ms)) {
      throw new Error(`Invalid numeric timestamp for --${flagName}: ${value}`);
    }
    return ms;
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date for --${flagName}: ${value}`);
  }
  return d.getTime();
}

function resolveServiceAccountPath(rawPath) {
  if (!rawPath) return null;
  const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
  if (!fs.existsSync(resolved)) return null;
  return resolved;
}

function createAdminApp() {
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    throw new Error('NEXT_PUBLIC_FIREBASE_DATABASE_URL is missing (check .env.local)');
  }

  const configuredSvcPath = resolveServiceAccountPath(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

  // Common local paths in this repo (kept out of env to reduce friction).
  const fallbackSvcPath =
    resolveServiceAccountPath('./firebase-admin-key.json') ||
    resolveServiceAccountPath('./touchdesigner/firebase-admin-key.json');

  const svcPath = configuredSvcPath || fallbackSvcPath;

  if (svcPath) {
    const raw = fs.readFileSync(svcPath, 'utf8');
    const json = JSON.parse(raw);
    return initializeApp({
      credential: cert(json),
      databaseURL,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    databaseURL,
  });
}

async function listFirestoreSessionsToDelete(firestore, startMs, endMs) {
  const sessionsRef = firestore.collection('sessions');

  // Query by the field we actually write for filtering/sorting.
  // Note: createdAt is stored as a number (ms since epoch).
  const querySnap = await sessionsRef
    .where('createdAt', '>=', startMs)
    .where('createdAt', '<=', endMs)
    .orderBy('createdAt', 'asc')
    .get();

  const docs = querySnap.docs.map((d) => {
    const data = d.data();
    return {
      collection: 'sessions',
      docId: d.id,
      sessionId: data.sessionId,
      createdAt: data.createdAt,
      startTime: data.startTime,
      endTime: data.endTime,
      theme: data.theme,
    };
  });

  return docs;
}

async function listRtdbSessionsToDelete(db, startMs, endMs) {
  const snap = await db.ref('sessions').once('value');
  if (!snap.exists()) return [];

  const val = snap.val() || {};
  return Object.entries(val)
    .map(([key, data]) => {
      const endTime = data?.endTime;
      const createdAt = typeof endTime === 'number' ? endTime : data?.createdAt;
      return {
        path: `sessions/${key}`,
        key,
        startTime: data?.startTime,
        endTime: data?.endTime,
        createdAt,
      };
    })
    .filter((row) => typeof row.createdAt === 'number')
    .filter((row) => row.createdAt >= startMs && row.createdAt <= endMs)
    .sort((a, b) => a.createdAt - b.createdAt);
}

async function listRtdbQueueThemesToDelete(db, startMs, endMs) {
  const snap = await db.ref('queue/themes').once('value');
  if (!snap.exists()) return [];

  const val = snap.val() || {};
  return Object.entries(val)
    .map(([sessionId, data]) => {
      const submittedAt = data?.submittedAt;
      return {
        path: `queue/themes/${sessionId}`,
        sessionId,
        submittedAt,
        row1: data?.row1,
        row2: data?.row2,
        row3: data?.row3,
      };
    })
    .filter((row) => typeof row.submittedAt === 'number')
    .filter((row) => row.submittedAt >= startMs && row.submittedAt <= endMs)
    .sort((a, b) => a.submittedAt - b.submittedAt);
}

async function deleteFirestoreSessions(firestore, docs) {
  const bulkWriter = firestore.bulkWriter();
  let deleted = 0;

  for (const d of docs) {
    const ref = firestore.collection(d.collection).doc(d.docId);
    bulkWriter.delete(ref);
    deleted++;
  }

  await bulkWriter.close();
  return deleted;
}

async function deleteRtdbPaths(db, rows) {
  let deleted = 0;
  for (const row of rows) {
    await db.ref(row.path).remove();
    deleted++;
  }
  return deleted;
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.has('help') || args.has('h')) {
    printUsageAndExit(0);
  }

  const startMs = parseDateToMs(args.get('start'), 'start');
  const endMs = parseDateToMs(args.get('end'), 'end');

  if (endMs < startMs) {
    throw new Error(`Invalid range: end < start (${endMs} < ${startMs})`);
  }

  const execute = args.get('execute') === 'true';
  const includeRtdbSessions = args.get('include-rtdb-sessions') === 'true';
  const includeQueueThemes = args.get('include-queue-themes') === 'true';
  const reportPath = args.get('report') || './purge-report.json';

  console.log(`\nTime window:`);
  console.log(`  start: ${new Date(startMs).toString()} (${startMs})`);
  console.log(`  end:   ${new Date(endMs).toString()} (${endMs})`);
  console.log(`Mode: ${execute ? 'EXECUTE (will delete)' : 'DRY-RUN (no deletes)'}\n`);

  const app = createAdminApp();
  const firestore = getFirestore(app);
  const rtdb = getDatabase(app);

  const firestoreSessions = await listFirestoreSessionsToDelete(firestore, startMs, endMs);

  let rtdbSessions = [];
  if (includeRtdbSessions) {
    rtdbSessions = await listRtdbSessionsToDelete(rtdb, startMs, endMs);
  }

  let rtdbQueueThemes = [];
  if (includeQueueThemes) {
    rtdbQueueThemes = await listRtdbQueueThemesToDelete(rtdb, startMs, endMs);
  }

  const report = {
    window: { startMs, endMs },
    firestore: {
      sessions: firestoreSessions,
    },
    rtdb: {
      sessions: rtdbSessions,
      queueThemes: rtdbQueueThemes,
    },
    counts: {
      firestoreSessions: firestoreSessions.length,
      rtdbSessions: rtdbSessions.length,
      rtdbQueueThemes: rtdbQueueThemes.length,
    },
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('Will delete (summary):');
  console.log(`  Firestore: sessions docs: ${firestoreSessions.length}`);
  if (includeRtdbSessions) {
    console.log(`  RTDB: /sessions children: ${rtdbSessions.length}`);
  }
  if (includeQueueThemes) {
    console.log(`  RTDB: /queue/themes children: ${rtdbQueueThemes.length}`);
  }
  console.log(`\nWrote report: ${reportPath}\n`);

  // Print full item list to stdout (so you can copy/paste / review), but keep it readable.
  if (firestoreSessions.length) {
    console.log('Firestore sessions to delete:');
    for (const d of firestoreSessions) {
      console.log(`  sessions/${d.docId} createdAt=${d.createdAt} sessionId=${d.sessionId}`);
    }
    console.log('');
  }

  if (includeRtdbSessions && rtdbSessions.length) {
    console.log('Realtime Database sessions to delete:');
    for (const d of rtdbSessions) {
      console.log(`  ${d.path} createdAt=${d.createdAt} key=${d.key}`);
    }
    console.log('');
  }

  if (includeQueueThemes && rtdbQueueThemes.length) {
    console.log('Realtime Database queue themes to delete:');
    for (const d of rtdbQueueThemes) {
      console.log(`  ${d.path} submittedAt=${d.submittedAt}`);
    }
    console.log('');
  }

  if (!execute) {
    console.log('Dry-run complete. Re-run with --execute to delete the above entries.');
    await app.delete();
    return;
  }

  // Execute deletes
  console.log('\nDeleting...');

  const deletedFirestore = await deleteFirestoreSessions(firestore, firestoreSessions);

  let deletedRtdbSessions = 0;
  if (includeRtdbSessions) {
    deletedRtdbSessions = await deleteRtdbPaths(rtdb, rtdbSessions);
  }

  let deletedRtdbQueueThemes = 0;
  if (includeQueueThemes) {
    deletedRtdbQueueThemes = await deleteRtdbPaths(rtdb, rtdbQueueThemes);
  }

  console.log('\nDeleted:');
  console.log(`  Firestore sessions: ${deletedFirestore}`);
  if (includeRtdbSessions) {
    console.log(`  RTDB /sessions: ${deletedRtdbSessions}`);
  }
  if (includeQueueThemes) {
    console.log(`  RTDB /queue/themes: ${deletedRtdbQueueThemes}`);
  }

  await app.delete();
}

main().catch((err) => {
  console.error(`\n❌ Purge failed: ${err?.message || err}`);
  process.exitCode = 1;
});
