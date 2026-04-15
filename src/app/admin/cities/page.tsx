'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Pencil, Trash2, Search, MapPin, ExternalLink, X, Save, Loader2 } from 'lucide-react';

interface CityEntry {
  name: string;
  slug: string;
  state: string;
  region: string;
}

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<CityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingCity, setEditingCity] = useState<CityEntry | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formState, setFormState] = useState('');
  const [formRegion, setFormRegion] = useState('');

  const fetchCities = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cities');
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setCities(data.cities);
    } catch {
      setError('Fehler beim Laden der Städte.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCities(); }, [fetchCities]);

  const slugify = (name: string) =>
    name.toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const openAddForm = () => {
    setEditingCity(null);
    setIsAdding(true);
    setFormName('');
    setFormSlug('');
    setFormState('');
    setFormRegion('');
    setError('');
  };

  const openEditForm = (city: CityEntry) => {
    setIsAdding(false);
    setEditingCity(city);
    setFormName(city.name);
    setFormSlug(city.slug);
    setFormState(city.state);
    setFormRegion(city.region);
    setError('');
  };

  const closeForm = () => {
    setEditingCity(null);
    setIsAdding(false);
    setError('');
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    // Auto-generate slug for new cities
    if (isAdding) setFormSlug(slugify(val));
  };

  // Track last saved slug for live link
  const [lastSavedSlug, setLastSavedSlug] = useState('');

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (isAdding) {
        const res = await fetch('/api/admin/cities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName, slug: formSlug, state: formState, region: formRegion }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        setLastSavedSlug(formSlug);
        setSuccess(`"${formName}" hinzugefügt — Seite ist in wenigen Sekunden live.`);
      } else if (editingCity) {
        const res = await fetch('/api/admin/cities', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalSlug: editingCity.slug,
            name: formName,
            slug: formSlug,
            state: formState,
            region: formRegion,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        setLastSavedSlug(formSlug);
        setSuccess(`"${formName}" aktualisiert — Änderungen werden in Kürze sichtbar.`);
      }

      closeForm();
      await fetchCities();
    } catch {
      setError('Netzwerkfehler.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slug: string, name: string) => {
    if (!confirm(`Stadt "${name}" wirklich löschen?`)) return;

    try {
      const res = await fetch(`/api/admin/cities?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setSuccess(`"${name}" gelöscht.`);
      await fetchCities();
    } catch {
      setError('Fehler beim Löschen.');
    }
  };

  const filtered = cities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.includes(search.toLowerCase()) ||
    c.state.toLowerCase().includes(search.toLowerCase()) ||
    c.region.toLowerCase().includes(search.toLowerCase())
  );

  const showForm = isAdding || editingCity;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Städte verwalten</h1>
              <p className="text-sm text-gray-500">{cities.length} Städte insgesamt</p>
            </div>
          </div>
          <button onClick={openAddForm} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> Neue Stadt
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center justify-between">
            <span>
              {success}
              {lastSavedSlug && (
                <a href={`/kfz-zulassung-in-deiner-stadt/${lastSavedSlug}/`} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 font-medium text-green-800 underline hover:text-green-900">
                  Seite ansehen <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </span>
            <button onClick={() => { setSuccess(''); setLastSavedSlug(''); }}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {isAdding ? 'Neue Stadt hinzufügen' : `Stadt bearbeiten: ${editingCity?.name}`}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={formName} onChange={e => handleNameChange(e.target.value)} placeholder="z.B. Frankfurt am Main" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                <input type="text" value={formSlug} onChange={e => setFormSlug(e.target.value)} placeholder="z.B. frankfurt" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bundesland *</label>
                <input type="text" value={formState} onChange={e => setFormState(e.target.value)} placeholder="z.B. Hessen" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <input type="text" value={formRegion} onChange={e => setFormRegion(e.target.value)} placeholder="z.B. Rhein-Main" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving || !formName || !formSlug || !formState} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isAdding ? 'Hinzufügen' : 'Speichern'}
              </button>
              <button onClick={closeForm} className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm">
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-4 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Suche nach Name, Slug, Bundesland oder Region..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
        </div>

        {/* Cities Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Laden...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Slug</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Bundesland</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Region</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(city => (
                    <tr key={city.slug} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="font-medium text-gray-900">{city.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{city.slug}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{city.state}</td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{city.region}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <a href={`/kfz-zulassung-in-deiner-stadt/${city.slug}/`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors" title="Vorschau">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button onClick={() => openEditForm(city)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Bearbeiten">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(city.slug, city.name)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Löschen">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                {search ? `Keine Städte gefunden für "${search}".` : 'Keine Städte vorhanden.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
