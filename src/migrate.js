import { db } from './firebase';
import { collection, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';

export async function migrateLocalStorageToFirestore() {
  if (localStorage.getItem('firestoreMigrated')) return;

  try {
    const callLogs = JSON.parse(localStorage.getItem('callLogs') || '[]');
    const aiObjections = JSON.parse(localStorage.getItem('aiObjections') || '[]');
    const scriptTree = JSON.parse(localStorage.getItem('scriptTree') || 'null');
    const versions = JSON.parse(localStorage.getItem('scriptVersions') || '[]');

    let migrated = 0;

    if (callLogs.length > 0) {
      const existing = await getDoc(doc(db, 'config', '_migrationCheck'));
      for (const log of callLogs) {
        if (!log.timestamp) continue;
        await addDoc(collection(db, 'callLogs'), log);
        migrated++;
      }
    }

    if (aiObjections.length > 0) {
      for (const obj of aiObjections) {
        if (!obj.timestamp) continue;
        await addDoc(collection(db, 'aiObjections'), obj);
        migrated++;
      }
    }

    if (scriptTree && Object.keys(scriptTree).length > 0) {
      const ref = doc(db, 'config', 'scriptTree');
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, { value: scriptTree });
        migrated++;
      }
    }

    if (versions.length > 0) {
      for (const v of versions) {
        if (!v.timestamp || !v.tree) continue;
        await addDoc(collection(db, 'versions'), {
          tree: v.tree,
          timestamp: v.timestamp,
          label: v.label || '',
        });
        migrated++;
      }
    }

    localStorage.setItem('firestoreMigrated', 'true');
    if (migrated > 0) {
      console.log(`Migrated ${migrated} items from localStorage to Firestore`);
    }
  } catch (err) {
    console.error('Migration error:', err);
  }
}
