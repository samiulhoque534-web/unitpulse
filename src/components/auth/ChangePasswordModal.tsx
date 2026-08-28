import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Lock, Key } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { user, changePassword } = useAuth();
  const { success, error } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      error('Validation Error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 4) {
      error('Validation Error', 'Password must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      success('Password Changed', `Updated password for appointment ${user?.appointment}`);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      error('Password Change Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Appointment Security Key"
      subtitle={`Update authentication password for ${user?.displayName || user?.appointment}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-300 font-bold uppercase mb-1">Current Password *</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-bold uppercase mb-1">New Password *</label>
          <div className="relative">
            <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-bold uppercase mb-1">Confirm New Password *</label>
          <div className="relative">
            <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-tactical-950 border border-slate-700 text-white font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-tactical-800 text-slate-300 font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-army-600 hover:bg-army-500 text-white font-bold disabled:opacity-50"
          >
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
