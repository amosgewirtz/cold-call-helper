import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

export function useFirestoreDoc(collectionName, docId, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, collectionName, docId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setValue(snap.data().value);
      } else {
        setDoc(ref, { value: initialValue });
      }
      setLoading(false);
    });
    return unsub;
  }, [collectionName, docId]);

  const update = useCallback(async (newValue) => {
    const resolved = typeof newValue === 'function' ? newValue(value) : newValue;
    setValue(resolved);
    await setDoc(doc(db, collectionName, docId), { value: resolved });
  }, [collectionName, docId, value]);

  return [value, update, loading];
}

export function useFirestoreCollection(collectionName) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
      setItems(docs);
      setLoading(false);
    });
    return unsub;
  }, [collectionName]);

  const add = useCallback(async (item) => {
    await addDoc(collection(db, collectionName), item);
  }, [collectionName]);

  return [items, add, loading];
}

export function useFirestoreVersions(maxVersions = 50) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'versions'),
      orderBy('timestamp', 'desc'),
      limit(maxVersions)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
      setVersions(docs);
      setLoading(false);
    });
    return unsub;
  }, [maxVersions]);

  const addVersion = useCallback(async (tree, label) => {
    await addDoc(collection(db, 'versions'), {
      tree,
      timestamp: Date.now(),
      label: label || '',
    });

    const q = query(collection(db, 'versions'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    if (snap.docs.length > maxVersions) {
      const batch = writeBatch(db);
      snap.docs.slice(maxVersions).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }, [maxVersions]);

  const deleteVersion = useCallback(async (docId) => {
    await deleteDoc(doc(db, 'versions', docId));
  }, []);

  return [versions, addVersion, deleteVersion, loading];
}
