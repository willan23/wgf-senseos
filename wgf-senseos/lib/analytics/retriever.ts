/**
 * WGF SenseOS — Analytics RAG Retriever
 * Retrieves relevant context from Firestore for the RAG pipeline.
 */

import { db } from '@/lib/firebase';
import { 
  collection as firestoreCollection, 
  query as firestoreQuery, 
  where, 
  orderBy, 
  limit, 
  getDocs 
} from 'firebase/firestore';

export interface RetrievedContext {
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    timestamp: number;
    sensorId: string;
    siteId: string;
  }>;
  detections: Array<{
    id: string;
    type: string;
    confidence: number;
    count: number;
    timestamp: number;
    sensorId: string;
    siteId: string;
  }>;
  sites: Array<{
    id: string;
    name: string;
    sensors: number;
  }>;
  stats: {
    totalAlerts: number;
    totalDetections: number;
    uniqueSensors: number;
    dateRange: { start: number; end: number };
  };
}

function extractQueryTerms(query: string): string[] {
  const stopWords = new Set([
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
    'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na',
    'nos', 'nas', 'por', 'para', 'com', 'sem', 'sob',
    'que', 'qual', 'quais', 'quantos', 'quantas',
    'como', 'onde', 'quando', 'porque', 'porquê',
    'the', 'a', 'an', 'is', 'are', 'was', 'were',
    'how', 'what', 'where', 'when', 'why', 'who',
    'which', 'do', 'does', 'did', 'have', 'has',
    'can', 'could', 'will', 'would', 'shall', 'should',
    'may', 'might', 'must', 'need',
  ]);

  return query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[\s,.!?;:]+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

function matchesQuery(text: string, terms: string[]): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase();
  return terms.some(term => normalized.includes(term));
}

export async function retrieveContext(
  query: string,
  orgId: string,
): Promise<RetrievedContext> {
  const terms = extractQueryTerms(query);
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const dateRange = query.toLowerCase().includes('hoje') || query.toLowerCase().includes('today')
    ? { start: dayAgo, end: now }
    : { start: weekAgo, end: now };

  const alerts: RetrievedContext['alerts'] = [];
  const detections: RetrievedContext['detections'] = [];
  const sites: RetrievedContext['sites'] = [];

  try {
    const alertsRef = firestoreCollection(db, 'organizations', orgId, 'alerts');
    const alertsQ = firestoreQuery(
      alertsRef,
      where('timestamp', '>=', dateRange.start),
      where('timestamp', '<=', dateRange.end),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const alertsSnap = await getDocs(alertsQ);

    alertsSnap.docs.forEach(doc => {
      const data = doc.data() as Record<string, any>;
      if (matchesQuery(data.message || '', terms) ||
          matchesQuery(data.type || '', terms)) {
        alerts.push({
          id: doc.id,
          type: data.type || 'unknown',
          severity: data.severity || 'info',
          message: data.message || '',
          timestamp: data.timestamp || 0,
          sensorId: data.sensorId || '',
          siteId: data.siteId || '',
        });
      }
    });
  } catch (e) {
    console.warn('[retriever] Failed to fetch alerts:', e);
  }

  try {
    const detectionsRef = firestoreCollection(db, 'organizations', orgId, 'detections');
    const detectionsQ = firestoreQuery(
      detectionsRef,
      where('timestamp', '>=', dateRange.start),
      where('timestamp', '<=', dateRange.end),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    const detectionsSnap = await getDocs(detectionsQ);

    detectionsSnap.docs.forEach(doc => {
      const data = doc.data() as Record<string, any>;
      if (matchesQuery(data.type || '', terms) ||
          terms.length === 0) {
        detections.push({
          id: doc.id,
          type: data.type || 'unknown',
          confidence: data.confidence || 0,
          count: data.count || 0,
          timestamp: data.timestamp || 0,
          sensorId: data.sensorId || '',
          siteId: data.siteId || '',
        });
      }
    });
  } catch (e) {
    console.warn('[retriever] Failed to fetch detections:', e);
  }

  try {
    const sitesRef = firestoreCollection(db, 'organizations', orgId, 'sites');
    const sitesQ = firestoreQuery(sitesRef, limit(10));
    const sitesSnap = await getDocs(sitesQ);

    sitesSnap.docs.forEach(doc => {
      const data = doc.data() as Record<string, any>;
      sites.push({
        id: doc.id,
        name: data.name || 'Unknown Site',
        sensors: data.sensorCount || 0,
      });
    });
  } catch (e) {
    console.warn('[retriever] Failed to fetch sites:', e);
  }

  return {
    alerts,
    detections,
    sites,
    stats: {
      totalAlerts: alerts.length,
      totalDetections: detections.length,
      uniqueSensors: new Set([...alerts.map(a => a.sensorId), ...detections.map(d => d.sensorId)]).size,
      dateRange,
    },
  };
}
