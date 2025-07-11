'use client';

import React, { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { notify } from '@/lib/notifications';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useClubs } from '@/hooks/useClubs';
import { useAthleteAffiliations, useManageAffiliations, useTransferAthlete, type Athlete } from '@/hooks/useAthletes';

interface AffiliationManagerProps {
  athletes: Athlete[];
  onCancel: () => void;
  onSuccess: () => void;
  session: Session | null;
}

export default function AffiliationManager({ 
  athletes, 
  onCancel, 
  onSuccess, 
  session 
}: AffiliationManagerProps) {
  const [mode, setMode] = useState<'bulk' | 'transfer' | 'history'>('bulk');
  const [operation, setOperation] = useState<'add' | 'remove' | 'update'>('add');
  const [affiliationType, setAffiliationType] = useState<'organization' | 'club'>('organization');
  const [targetId, setTargetId] = useState('');
  const [membershipType, setMembershipType] = useState('MEMBER');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [isPrimary, setIsPrimary] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);

  // Transfer mode state
  const [transferData, setTransferData] = useState({
    athleteId: '',
    fromOrganizationId: '',
    toOrganizationId: '',
    membershipType: 'MEMBER' as 'MEMBER' | 'GUEST' | 'VISITING_ATHLETE',
    transferClubs: false,
  });

  // TanStack Query hooks
  const { data: organizationsData } = useOrganizations();
  const { data: clubsData } = useClubs();
  const { data: historyData, refetch: refetchHistory } = useAthleteAffiliations(
    selectedAthlete?.id || ''
  );
  const manageAffiliationsMutation = useManageAffiliations();
  const transferAthleteMutation = useTransferAthlete();

  const organizations = organizationsData?.organizations || [];
  const clubs = clubsData?.clubs || [];
  const history = historyData || { organizations: [], clubs: [] };
  const loading = manageAffiliationsMutation.isPending || transferAthleteMutation.isPending;

  useEffect(() => {
    if (mode === 'history' && selectedAthlete) {
      refetchHistory();
    }
  }, [mode, selectedAthlete, refetchHistory]);

  const handleBulkOperation = async () => {
    if (!targetId || athletes.length === 0) {
      notify.error('Please select athletes and a target organization/club');
      return;
    }

    try {
      await manageAffiliationsMutation.mutateAsync({
        athleteIds: athletes.map(a => a.id),
        operation,
        type: affiliationType,
        targetId,
        membershipType,
        status,
        ...(affiliationType === 'club' && { isPrimary }),
      });

      onSuccess();
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Bulk operation error:', error);
    }
  };

  const handleTransfer = async () => {
    if (!transferData.athleteId || !transferData.fromOrganizationId || !transferData.toOrganizationId) {
      notify.error('Please fill in all transfer details');
      return;
    }

    try {
      await transferAthleteMutation.mutateAsync(transferData);
      onSuccess();
    } catch (error) {
      // Error handling is done in the mutation hook
      console.error('Transfer error:', error);
    }
  };

  const organizationOptions = affiliationType === 'organization' 
    ? organizations.filter(org => org.id !== session?.user?.organizationId || session?.user?.role === 'SYSTEM_ADMIN')
    : organizations;

  const clubOptions = clubs.filter(club => {
    if (session?.user?.role === 'SYSTEM_ADMIN') return true;
    // Filter clubs by organization affiliation for org admins
    return true; // Simplified for now - could be enhanced to filter by org affiliation
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Affiliation Manager {athletes.length > 0 && `(${athletes.length} athletes)`}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mode Selection */}
          <div className="flex space-x-4 mt-4">
            <button
              onClick={() => setMode('bulk')}
              className={`px-4 py-2 rounded-lg font-medium ${
                mode === 'bulk' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Bulk Operations
            </button>
            <button
              onClick={() => setMode('transfer')}
              className={`px-4 py-2 rounded-lg font-medium ${
                mode === 'transfer' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Transfer Athletes
            </button>
            <button
              onClick={() => setMode('history')}
              className={`px-4 py-2 rounded-lg font-medium ${
                mode === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              View History
            </button>
          </div>
        </div>

        <div className="p-6">
          {mode === 'bulk' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operation
                  </label>
                  <select
                    value={operation}
                    onChange={(e) => setOperation(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="add">Add Affiliation</option>
                    <option value="remove">Remove Affiliation</option>
                    <option value="update">Update Affiliation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={affiliationType}
                    onChange={(e) => setAffiliationType(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="organization">Organization</option>
                    <option value="club">Club</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {affiliationType === 'organization' ? 'Organization' : 'Club'}
                </label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select {affiliationType}</option>
                  {(affiliationType === 'organization' ? organizationOptions : clubOptions).map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Membership Type
                  </label>
                  <select
                    value={membershipType}
                    onChange={(e) => setMembershipType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="GUEST">Guest</option>
                    <option value="VISITING_ATHLETE">Visiting Athlete</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              {affiliationType === 'club' && (
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isPrimary}
                      onChange={(e) => setIsPrimary(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Set as Primary Club
                    </span>
                  </label>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Athletes</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {athletes.map((athlete) => (
                    <div key={athlete.id} className="text-sm text-gray-600">
                      {athlete.firstName} {athlete.lastName}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkOperation}
                  disabled={loading || !targetId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : `${operation} Affiliation`}
                </button>
              </div>
            </div>
          )}

          {mode === 'transfer' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Athlete
                  </label>
                  <select
                    value={transferData.athleteId}
                    onChange={(e) => setTransferData({ ...transferData, athleteId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select athlete</option>
                    {athletes.map((athlete) => (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.firstName} {athlete.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Membership Type
                  </label>
                  <select
                    value={transferData.membershipType}
                    onChange={(e) => setTransferData({ 
                      ...transferData, 
                      membershipType: e.target.value as any 
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="GUEST">Guest</option>
                    <option value="VISITING_ATHLETE">Visiting Athlete</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Organization
                  </label>
                  <select
                    value={transferData.fromOrganizationId}
                    onChange={(e) => setTransferData({ 
                      ...transferData, 
                      fromOrganizationId: e.target.value 
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select source organization</option>
                    {organizations.map((org: any) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Organization
                  </label>
                  <select
                    value={transferData.toOrganizationId}
                    onChange={(e) => setTransferData({ 
                      ...transferData, 
                      toOrganizationId: e.target.value 
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select target organization</option>
                    {organizations.map((org: any) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={transferData.transferClubs}
                    onChange={(e) => setTransferData({ 
                      ...transferData, 
                      transferClubs: e.target.checked 
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Also transfer club affiliations
                  </span>
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={loading || !transferData.athleteId || !transferData.fromOrganizationId || !transferData.toOrganizationId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Transferring...' : 'Transfer Athlete'}
                </button>
              </div>
            </div>
          )}

          {mode === 'history' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Athlete
                </label>
                <select
                  value={selectedAthlete?.id || ''}
                  onChange={(e) => {
                    const athlete = athletes.find(a => a.id === e.target.value);
                    setSelectedAthlete(athlete || null);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an athlete</option>
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.firstName} {athlete.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAthlete && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Organization History
                    </h3>
                    {history.organizations?.length > 0 ? (
                      <div className="space-y-2">
                        {history.organizations.map((org: any, index: number) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {org.organization.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {org.membershipType} • {org.status}
                                </div>
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(org.joinedAt).toLocaleDateString()}
                                {org.leftAt && ` - ${new Date(org.leftAt).toLocaleDateString()}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">No organization history</div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Club History
                    </h3>
                    {history.clubs?.length > 0 ? (
                      <div className="space-y-2">
                        {history.clubs.map((club: any, index: number) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {club.club.name}
                                  {club.isPrimary && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {club.membershipType} • {club.status}
                                </div>
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(club.joinedAt).toLocaleDateString()}
                                {club.leftAt && ` - ${new Date(club.leftAt).toLocaleDateString()}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">No club history</div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 