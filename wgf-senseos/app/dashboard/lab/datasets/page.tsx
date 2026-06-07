'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

interface DatasetMetadata {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  sizeBytes: number;
  filePath: string;
  createdAt: number;
  updatedAt: number;
  status: 'ready' | 'processing';
  fileType: 'csv' | 'json';
}

export default function LabDatasetsPage() {
  const { senseUser } = useAuth();
  const organizationId = senseUser?.organizationId || 'org_demo';
  const userId = senseUser?.uid || 'user_demo';

  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [replayDatasetId, setReplayDatasetId] = useState<string | null>(null);

  // Fetch datasets list from Firestore
  useEffect(() => {
    if (!db || !organizationId) return;

    const q = query(collection(db, 'datasets'), where('organizationId', '==', organizationId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: DatasetMetadata[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as DatasetMetadata);
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      setDatasets(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading datasets:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organizationId]);

  // Handle Drag Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Upload file to Firebase Storage
  const uploadFile = (file: File) => {
    if (!storage || !db || !organizationId || !userId) return;

    // Check size limit (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert("Ficheiro excede o limite de 50MB.");
      return;
    }

    // Check extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'json') {
      alert("Apenas ficheiros CSV e JSON são suportados nas regras do Storage.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const storagePath = `datasets/${organizationId}/${userId}/${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(Math.round(progress));
      },
      (error) => {
        console.error("Upload failed:", error);
        alert(`Erro de upload: ${error.message}. Verifica se tens as permissões corretas.`);
        setUploading(false);
      },
      async () => {
        // Success
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        const datasetId = `dataset_${Math.random().toString(36).substring(2, 9)}`;

        const metadata: DatasetMetadata = {
          id: datasetId,
          organizationId,
          userId,
          name: file.name,
          sizeBytes: file.size,
          filePath: storagePath,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: 'ready',
          fileType: ext as 'csv' | 'json',
        };

        try {
          await setDoc(doc(db, 'datasets', datasetId), metadata);
        } catch (err) {
          console.error("Error writing metadata to Firestore:", err);
        }

        setUploading(false);
        setDragActive(false);
      }
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  // Delete Dataset
  const handleDelete = async (dataset: DatasetMetadata) => {
    if (!db || !storage) return;
    if (!confirm(`Remover o dataset ${dataset.name}?`)) return;

    try {
      // 1. Delete from storage
      const storageRef = ref(storage, dataset.filePath);
      await deleteObject(storageRef);

      // 2. Delete from Firestore
      await deleteDoc(doc(db, 'datasets', dataset.id));
    } catch (err) {
      console.error("Error deleting dataset:", err);
      // Fallback: delete from Firestore if file not found in storage
      await deleteDoc(doc(db, 'datasets', dataset.id));
    }
  };

  // Replay Simulation from Dataset
  const handleReplay = (datasetId: string) => {
    setReplayDatasetId(datasetId);
    // Simulates sending events to /api/uwsc/ingest route
    setTimeout(() => {
      setReplayDatasetId(null);
      alert("Simulação de replay do dataset executada no ingest pipeline!");
    }, 3000);
  };

  return (
    <div style={{ flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>🔬 Dataset Lab</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Upload, armazenamento e replay de datasets de CSI brutos para análise de laboratório</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Left Side: Datasets Grid / List */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700 }}>🗃️ Datasets Guardados</h2>
          </div>

          {loading ? (
            <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" style={{ width: 24, height: 24 }} />
            </div>
          ) : datasets.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhum dataset carregado neste laboratório.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Formato</th>
                  <th>Tamanho</th>
                  <th>Enviado Em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</td>
                    <td>
                      <span className={`badge ${d.fileType === 'csv' ? 'badge-cyan' : 'badge-violet'}`}>
                        {d.fileType.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {(d.sizeBytes / 1024 / 1024).toFixed(2)} MB
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {new Date(d.createdAt).toLocaleDateString('pt-PT')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          disabled={replayDatasetId !== null}
                          onClick={() => handleReplay(d.id)}
                          className="btn-primary"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                        >
                          {replayDatasetId === d.id ? '▶ Replaying...' : '▶ Replay'}
                        </button>
                        <button
                          onClick={() => handleDelete(d)}
                          className="btn-danger"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right Side: Upload Zone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              padding: 28,
              borderRadius: 12,
              background: dragActive ? 'rgba(0,212,255,0.06)' : 'rgba(255,255,255,0.02)',
              border: dragActive ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-card)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 12,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <span style={{ fontSize: 36 }}>📂</span>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Arraste o seu Dataset aqui</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Suporta apenas ficheiros <strong>.csv</strong> ou <strong>.json</strong>.<br />
              Tamanho máximo: 50MB.
            </div>
            <label className="btn-secondary" style={{ padding: '8px 16px', fontSize: 12, cursor: 'pointer', marginTop: 8 }}>
              Escolher Ficheiro
              <input type="file" onChange={handleFileChange} accept=".csv,.json" style={{ display: 'none' }} />
            </label>
          </div>

          {uploading && (
            <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span>A carregar para o Storage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.2s ease' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
