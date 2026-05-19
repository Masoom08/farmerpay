// src/modules/pulse-farmer/components/WarehouseSelector.jsx
import React, { useState, useEffect } from 'react';

const API_BASE = '/api/v1';

function formatRupees(amount) {
  if (amount == null) return '—';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

export default function WarehouseSelector({ farmerId, commodity, language, onSelect, onBack }) {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ enwr: true, coldStorage: false });

  useEffect(() => {
    async function fetchWarehouses() {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        const params = new URLSearchParams({
          farmerId,
          enwr: filter.enwr,
          ...(filter.coldStorage ? { coldStorage: true } : {}),
          ...(commodity?.coldChainDependency === 'mandatory' ? { coldStorage: true } : {})
        });
        const res = await fetch(`${API_BASE}/dice/warehouses?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setWarehouses(data.data || []);
      } catch (err) {
        console.error('Failed to fetch warehouses:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchWarehouses();
  }, [farmerId, filter, commodity]);

  if (loading) {
    return <div style={styles.loading}>{language === 'hi' ? 'गोदाम खोज रहे हैं...' : 'Finding nearby warehouses...'}</div>;
  }

  return (
    <div>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← {language === 'hi' ? 'वापस' : 'Back'}</button>
        <h3 style={styles.title}>{language === 'hi' ? '🏪 गोदाम चुनें' : '🏪 Select Warehouse'}</h3>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <label style={styles.filterLabel}>
          <input
            type="checkbox"
            checked={filter.enwr}
            onChange={e => setFilter(f => ({ ...f, enwr: e.target.checked }))}
          />
          <span style={styles.filterText}>eNWR {language === 'hi' ? 'सक्षम' : 'Enabled'}</span>
        </label>
        <label style={styles.filterLabel}>
          <input
            type="checkbox"
            checked={filter.coldStorage}
            onChange={e => setFilter(f => ({ ...f, coldStorage: e.target.checked }))}
          />
          <span style={styles.filterText}>{language === 'hi' ? 'शीत भंडार' : 'Cold Storage'}</span>
        </label>
      </div>

      {/* Warehouse List */}
      {warehouses.length === 0 && (
        <div style={styles.noResults}>
          {language === 'hi' ? 'आपके पास कोई गोदाम उपलब्ध नहीं है।' : 'No warehouses found nearby.'}
        </div>
      )}

      {warehouses.map(wh => (
        <div
          key={wh.warehouseId}
          style={styles.warehouseCard}
          onClick={() => onSelect(wh)}
        >
          <div style={styles.whHeader}>
            <div>
              <div style={styles.whName}>{wh.name}</div>
              <div style={styles.whType}>{wh.type?.toUpperCase()} | {wh.distanceKm} km</div>
            </div>
            <div style={styles.whRate}>
              {formatRupees(wh.storageRate)}
              <span style={styles.whRateUnit}>/{language === 'hi' ? 'क्विंटल/दिन' : 'qtl/day'}</span>
            </div>
          </div>
          <div style={styles.whBadges}>
            {wh.enwr && <span style={styles.badge}>eNWR ✓</span>}
            {wh.coldStorage && <span style={styles.badgeCold}>❄️ {language === 'hi' ? 'शीत' : 'Cold'}</span>}
            {wh.gradingAvailable && <span style={styles.badge}>{language === 'hi' ? 'ग्रेडिंग' : 'Grading'} ✓</span>}
            {wh.capacityAvailable > 0 && (
              <span style={styles.badgeCapacity}>
                {wh.capacityAvailable} {language === 'hi' ? 'टन उपलब्ध' : 'tonnes available'}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { padding: '6px 12px', border: '1px solid #ccc', borderRadius: 8, backgroundColor: '#fff', fontSize: 13, cursor: 'pointer', color: '#333' },
  title: { fontSize: 16, fontWeight: 700, color: '#333', margin: 0 },
  filters: { display: 'flex', gap: 16, marginBottom: 16, padding: 12, backgroundColor: '#fff', borderRadius: 8 },
  filterLabel: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  filterText: { fontSize: 13, color: '#333' },
  warehouseCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer', border: '2px solid transparent', transition: 'border 0.2s' },
  whHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  whName: { fontSize: 14, fontWeight: 700, color: '#333' },
  whType: { fontSize: 11, color: '#999', marginTop: 2 },
  whRate: { fontSize: 16, fontWeight: 800, color: '#1b5e20', textAlign: 'right' },
  whRateUnit: { fontSize: 10, fontWeight: 400, color: '#666' },
  whBadges: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  badge: { fontSize: 10, padding: '2px 8px', borderRadius: 12, backgroundColor: '#e8f5e9', color: '#2e7d32', fontWeight: 600 },
  badgeCold: { fontSize: 10, padding: '2px 8px', borderRadius: 12, backgroundColor: '#e3f2fd', color: '#1565c0', fontWeight: 600 },
  badgeCapacity: { fontSize: 10, padding: '2px 8px', borderRadius: 12, backgroundColor: '#f5f5f5', color: '#666' },
  loading: { textAlign: 'center', padding: 40, color: '#666', fontSize: 14 },
  noResults: { textAlign: 'center', padding: 40, color: '#999', fontSize: 14 }
};
