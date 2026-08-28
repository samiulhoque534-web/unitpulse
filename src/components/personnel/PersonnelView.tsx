import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { Personnel, RankType, TradeType, ManpowerStatus } from '../../types';
import { RANKS, TRADES, MANPOWER_STATUSES, UNIT_NAME } from '../../utils/constants';
import { RankBadge, StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { PersonnelFormModal } from './PersonnelFormModal';
import { PersonnelDossierModal } from './PersonnelDossierModal';
import { BulkImportModal } from './BulkImportModal';
import {
  Users,
  Search,
  Plus,
  Upload,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
  FileText,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

export const PersonnelView: React.FC = () => {
  const { canModify, user } = useAuth();
  const { success, error } = useToast();

  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRank, setSelectedRank] = useState('');
  const [selectedTrade, setSelectedTrade] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showDeactivated, setShowDeactivated] = useState(false);

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [selectedSoldier, setSelectedSoldier] = useState<Personnel | null>(null);
  const [dossierSoldierId, setDossierSoldierId] = useState<string>('');

  // Delete Confirmation Modal State
  const [soldierToDelete, setSoldierToDelete] = useState<Personnel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPersonnel = async () => {
    setIsLoading(true);
    try {
      const res = await api.getPersonnel({
        search,
        rank: selectedRank,
        trade: selectedTrade,
        status: selectedStatus,
        isActive: showDeactivated ? 'false' : 'true',
      });
      setPersonnel(res.personnel);
    } catch (e: any) {
      console.error('Failed to load personnel:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonnel();
  }, [search, selectedRank, selectedTrade, selectedStatus, showDeactivated]);

  const handleOpenDeleteModal = (p: Personnel, e: React.MouseEvent) => {
    e.stopPropagation();
    setSoldierToDelete(p);
  };

  const handleConfirmDelete = async () => {
    if (!soldierToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.deletePersonnel(soldierToDelete.id);
      success(
        'Personnel Deleted',
        res.message || `Safely deleted ${soldierToDelete.rank} ${soldierToDelete.name} (${soldierToDelete.armyNumber}).`
      );
      setSoldierToDelete(null);
      fetchPersonnel();
    } catch (err: any) {
      error('Deletion Failed', err.message || 'Failed to delete personnel.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestore = async (p: Personnel, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Restore ${p.rank} ${p.name} (${p.armyNumber}) back to active unit roster?`)) {
      return;
    }
    try {
      await api.restorePersonnel(p.id);
      success('Soldier Restored', `Restored ${p.name} to active roster.`);
      fetchPersonnel();
    } catch (err: any) {
      error('Restore Failed', err.message);
    }
  };

  const handleQuickStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.updatePersonnelStatus(id, { currentStatus: newStatus });
      success('Status Updated', `Updated manpower status to ${newStatus}`);
      fetchPersonnel();
    } catch (err: any) {
      error('Status Update Failed', err.message);
    }
  };

  const isCO = user?.appointment === 'CO';

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
            <Users className="w-6 h-6 text-army-400" />
            Master Personnel Database
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Unit: <strong>{UNIT_NAME}</strong> • Total Enrolled: <strong className="text-white font-mono">{personnel.length} Soldiers</strong>
            {isCO && <span className="ml-2 text-amber-400 font-mono font-bold">(CO Strictly Read-Only)</span>}
          </p>
        </div>

        {/* Operational Controls: Visible only to 2IC, Duty Officer, Duty Munshi */}
        {canModify() && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3.5 py-2 rounded-xl bg-tactical-900 hover:bg-tactical-800 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Import / Export</span>
            </button>

            <button
              onClick={() => {
                setSelectedSoldier(null);
                setShowFormModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-army-600 hover:bg-army-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Enroll Soldier</span>
            </button>
          </div>
        )}
      </div>

      {/* Search & Multi-Filter Bar */}
      <div className="p-4 rounded-2xl bg-tactical-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Army No, Rank, Name, Trade, Appt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white placeholder-slate-500"
          />
        </div>

        {/* Rank Filter */}
        <div>
          <select
            value={selectedRank}
            onChange={(e) => setSelectedRank(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-slate-300 font-semibold"
          >
            <option value="">All Ranks</option>
            {RANKS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Trade Filter */}
        <div>
          <select
            value={selectedTrade}
            onChange={(e) => setSelectedTrade(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-slate-300 font-semibold"
          >
            <option value="">All Trades</option>
            {TRADES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-slate-300 font-semibold"
          >
            <option value="">All Statuses</option>
            {MANPOWER_STATUSES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active vs Deactivated Tab Toggle */}
      <div className="flex items-center space-x-2 text-xs">
        <button
          onClick={() => setShowDeactivated(false)}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
            !showDeactivated
              ? 'bg-army-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white bg-tactical-900 border border-slate-800'
          }`}
        >
          Active Personnel Pool
        </button>
        <button
          onClick={() => setShowDeactivated(true)}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
            showDeactivated
              ? 'bg-army-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white bg-tactical-900 border border-slate-800'
          }`}
        >
          Deactivated / Deleted History
        </button>
      </div>

      {/* Master Personnel Table */}
      <div className="rounded-2xl bg-tactical-900 border border-slate-800 overflow-hidden shadow-tactical">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-tactical-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3.5">Army Number</th>
                <th className="p-3.5">Rank & Name</th>
                <th className="p-3.5">Trade</th>
                <th className="p-3.5">Appointment</th>
                <th className="p-3.5">Manpower Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-army-400 mb-2" />
                    <span>Loading personnel records...</span>
                  </td>
                </tr>
              ) : personnel.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    No personnel found matching criteria.
                  </td>
                </tr>
              ) : (
                personnel.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-tactical-800/40 cursor-pointer"
                    onClick={() => {
                      setDossierSoldierId(p.id);
                      setShowDossierModal(true);
                    }}
                  >
                    {/* Army No */}
                    <td className="p-3.5 font-mono font-bold text-amber-300">
                      {p.armyNumber}
                    </td>

                    {/* Rank & Name */}
                    <td className="p-3.5">
                      <div className="flex items-center space-x-1.5">
                        <RankBadge rank={p.rank} />
                        <strong className="text-white">{p.name}</strong>
                      </div>
                    </td>

                    {/* Trade */}
                    <td className="p-3.5 font-mono font-bold text-army-400">
                      {p.trade}
                    </td>

                    {/* Appointment */}
                    <td className="p-3.5 text-slate-300">
                      {p.appointment}
                    </td>

                    {/* Status */}
                    <td
                      className="p-3.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canModify() ? (
                        <select
                          value={p.currentStatus}
                          onChange={(e) => handleQuickStatusChange(p.id, e.target.value)}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold font-mono bg-tactical-950 border border-slate-700 text-white cursor-pointer"
                        >
                          {MANPOWER_STATUSES.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge status={p.currentStatus} />
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="p-3.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Open Dossier */}
                        <button
                          onClick={() => {
                            setDossierSoldierId(p.id);
                            setShowDossierModal(true);
                          }}
                          className="p-1.5 rounded-lg bg-tactical-800 hover:bg-slate-700 text-slate-300"
                          title="View 360 Dossier"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                        </button>

                        {/* Operational Actions (Edit & Delete): Visible only to 2IC, Duty Officer, Duty Munshi */}
                        {canModify() && (
                          <>
                            {/* Edit Option (Army Number, Rank, Name, Trade, Appt) */}
                            <button
                              onClick={() => {
                                setSelectedSoldier(p);
                                setShowFormModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-tactical-800 hover:bg-slate-700 text-slate-300"
                              title="Edit Soldier (Army No, Rank, Name, Trade, Appt)"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                            </button>

                            {/* Delete / Safe Delete */}
                            {p.isActive ? (
                              <button
                                onClick={(e) => handleOpenDeleteModal(p, e)}
                                className="p-1.5 rounded-lg bg-tactical-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Delete Personnel"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => handleRestore(p, e)}
                                className="p-1.5 rounded-lg bg-tactical-800 hover:bg-emerald-950 text-slate-400 hover:text-emerald-300 transition-colors"
                                title="Restore to Active Pool"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {soldierToDelete && (
        <Modal
          isOpen={Boolean(soldierToDelete)}
          onClose={() => setSoldierToDelete(null)}
          title="Delete Personnel Confirmation"
          subtitle="Are you sure you want to delete this personnel?"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-4 rounded-xl bg-tactical-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Army Number:</span>
                <span className="font-mono font-bold text-amber-300 text-sm">{soldierToDelete.armyNumber}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Rank:</span>
                <span className="font-bold text-white"><RankBadge rank={soldierToDelete.rank} /></span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Name:</span>
                <span className="font-bold text-white text-sm">{soldierToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Trade / Appointment:</span>
                <span className="font-mono text-slate-300">{soldierToDelete.trade} • {soldierToDelete.appointment}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-start space-x-2 text-[11px] text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong>Safe Deletion Protection:</strong> The personnel will be removed from the active manpower pool, duty rosters, and PT/Games schedules. Historical operational logs and past reports will be safely preserved.
              </span>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSoldierToDelete(null)}
                className="px-4 py-2 rounded-xl bg-tactical-800 text-slate-300 font-bold hover:bg-tactical-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50 flex items-center space-x-1.5 shadow-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Personnel'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <PersonnelFormModal
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSuccess={fetchPersonnel}
          personnel={selectedSoldier}
        />
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <BulkImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={fetchPersonnel}
        />
      )}

      {/* Dossier Modal */}
      {showDossierModal && (
        <PersonnelDossierModal
          isOpen={showDossierModal}
          onClose={() => setShowDossierModal(false)}
          personnelId={dossierSoldierId}
        />
      )}
    </div>
  );
};
