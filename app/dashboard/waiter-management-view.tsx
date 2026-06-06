"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToasts } from "./toast-provider";

interface WaiterUser {
  id: string;
  name: string;
  email: string;
  role: string;
  pin: string;
  isActive: boolean;
  restaurantId: string;
  createdAt: string;
}

interface Session {
  id: string;
  waiterId: string;
  deviceId: string;
  pin: string;
  deviceName: string | null;
  deviceOS: string | null;
  ipAddress: string | null;
  isActive: boolean;
  lastSyncAt: string;
  createdAt: string;
  destroyedAt: string | null;
  waiter: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
}

export function WaiterManagementView() {
  const { addToast } = useToasts();
  const queryClient = useQueryClient();
  const [showCreateWaiter, setShowCreateWaiter] = useState(false);
  const [showResetPin, setShowResetPin] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");
  const [showEditName, setShowEditName] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"waiters" | "sessions">("waiters");

  const { data: waiters, isLoading: waitersLoading } = useQuery({
    queryKey: ["users", "waiters"],
    queryFn: async () => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch("/api/users?role=WAITER", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return (Array.isArray(data) ? data : data.users || []) as WaiterUser[];
    },
    refetchInterval: 5000,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["sessions", "active"],
    queryFn: async () => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch("/api/sessions?all=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return (data.sessions || []) as Session[];
    },
    refetchInterval: 5000,
  });

  const createWaiter = useMutation({
    mutationFn: async (waiter: { name: string; email?: string }) => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...waiter, role: "WAITER" }),
      });
      if (!res.ok) {
        const err = await res.json();
        const details = Array.isArray(err.details) ? `: ${err.details.join(", ")}` : "";
        throw new Error(`${err.error || "Failed to create waiter"}${details}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowCreateWaiter(false);
      addToast("Waiter created with auto-generated PIN", "success");
    },
    onError: (err: Error) => addToast(err.message, "error"),
  });

  const updateWaiterStatus = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update waiter");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      addToast("Waiter status updated", "success");
    },
    onError: () => addToast("Failed to update waiter", "error"),
  });

  const updateWaiterName = useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name: string }) => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update waiter name");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowEditName(null);
      setEditingName("");
      addToast("Waiter name updated successfully", "success");
    },
    onError: (err: Error) => addToast(err.message, "error"),
  });

  const deleteWaiter = useMutation({
    mutationFn: async (userId: string) => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete waiter");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowDeleteConfirm(null);
      addToast("Waiter deleted successfully", "success");
    },
    onError: (err: Error) => addToast(err.message, "error"),
  });

  const resetPin = useMutation({
    mutationFn: async ({ userId, pin }: { userId: string; pin?: string }) => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch(`/api/users/${userId}/pin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reset PIN");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setShowResetPin(null);
      setNewPin("");
      addToast("PIN reset successfully", "success");
    },
    onError: (err: Error) => addToast(err.message, "error"),
  });

  const terminateSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to terminate session");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      addToast("Session terminated. Device will be auto-logged out.", "success");
    },
    onError: () => addToast("Failed to terminate session", "error"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-600">{waiters?.length || 0} waiter accounts</p>
        <div className="flex items-center gap-3">
          <div className="panel flex p-1">
            <button
              onClick={() => setActiveTab("waiters")}
              className={`tab-button ${
                activeTab === "waiters" ? "bg-gray-950 text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              Waiters
            </button>
            <button
              onClick={() => setActiveTab("sessions")}
              className={`tab-button ${
                activeTab === "sessions" ? "bg-gray-950 text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              Active Sessions
            </button>
          </div>
          {activeTab === "waiters" && (
            <button
              onClick={() => setShowCreateWaiter(true)}
              className="primary-button"
            >
              Create Waiter
            </button>
          )}
        </div>
      </div>

      {activeTab === "waiters" && (
        <div className="panel overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">All Waiters</h3>
            {waitersLoading ? (
              <p className="text-gray-500">Loading waiters...</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">PIN</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Mobile Device</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {waiters?.map((waiter) => {
                    const activeSession = sessions?.find(s => s.waiterId === waiter.id && s.isActive);
                    return (
                      <tr key={waiter.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <code className="text-xs text-gray-500">{waiter.id.slice(0, 8)}</code>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium">{waiter.name}</p>
                          {!waiter.email.endsWith("@pos.local") && (
                            <p className="text-sm text-gray-500">{waiter.email}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">{waiter.pin}</code>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {activeSession ? (
                            <div>
                              <p className="font-medium text-gray-900">
                                {activeSession.deviceName || activeSession.deviceId.slice(0, 12)}
                              </p>
                              <p className="text-xs text-gray-500">{activeSession.deviceOS || "Unknown OS"}</p>
                            </div>
                          ) : (
                            "No active mobile"
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`status-pill ${
                              waiter.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                            }`}>
                              {waiter.isActive ? "Active" : "Inactive"}
                            </span>
                            {activeSession && (
                              <span className="text-xs text-blue-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                                Online
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                setShowEditName(waiter.id);
                                setEditingName(waiter.name);
                              }}
                              className="secondary-button py-1.5"
                            >
                              Edit Name
                            </button>
                            <button
                              onClick={() => {
                                setShowResetPin(waiter.id);
                                setNewPin("");
                              }}
                              className="secondary-button py-1.5 text-amber-700 hover:bg-amber-50"
                            >
                              Reset PIN
                            </button>
                            <button
                              onClick={() =>
                                updateWaiterStatus.mutate({
                                  userId: waiter.id,
                                  isActive: !waiter.isActive,
                                })
                              }
                              className={`secondary-button py-1.5 ${
                                waiter.isActive
                                  ? "text-red-700 hover:bg-red-50"
                                  : "text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              {waiter.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm({ id: waiter.id, name: waiter.name })}
                              className="secondary-button py-1.5 text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
            {(!waiters || waiters.length === 0) && !waitersLoading && (
              <p className="text-gray-500 text-center py-8">No waiters found</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "sessions" && (
        <div className="panel overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Active Mobile Sessions
              {sessions && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({sessions.filter(s => s.isActive).length} online)
                </span>
              )}
            </h3>
            {sessionsLoading ? (
              <p className="text-gray-500">Loading sessions...</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Waiter</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">PIN</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">OS</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Last Sync</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions?.map((session) => (
                    <tr key={session.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium">{session.waiter?.name || "Unknown"}</p>
                        <p className="text-sm text-gray-500">{session.waiter?.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">{session.pin}</code>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {session.deviceName || session.deviceId.slice(0, 12) + "..."}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{session.deviceOS || "Unknown"}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {session.lastSyncAt
                          ? new Date(session.lastSyncAt).toLocaleString()
                          : "Never"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`status-pill ${
                          session.isActive && !session.destroyedAt
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {session.isActive && !session.destroyedAt ? "Active" : "Terminated"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {session.isActive && !session.destroyedAt && (
                          <button
                            onClick={() => terminateSession.mutate(session.id)}
                            className="secondary-button py-1.5 text-red-700 hover:bg-red-50"
                          >
                            Force Logout
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
            {(!sessions || sessions.length === 0) && !sessionsLoading && (
              <p className="text-gray-500 text-center py-8">No active sessions</p>
            )}
          </div>
        </div>
      )}

      {showCreateWaiter && (
        <CreateWaiterModal
          onClose={() => setShowCreateWaiter(false)}
          onSubmit={(data) => createWaiter.mutate(data)}
        />
      )}

      {showEditName && (
        <EditWaiterNameModal
          name={editingName}
          onNameChange={setEditingName}
          onClose={() => {
            setShowEditName(null);
            setEditingName("");
          }}
          onSubmit={() => updateWaiterName.mutate({ userId: showEditName, name: editingName })}
          isLoading={updateWaiterName.isPending}
        />
      )}

      {showDeleteConfirm && (
        <DeleteWaiterConfirmModal
          waiterName={showDeleteConfirm.name}
          onClose={() => setShowDeleteConfirm(null)}
          onConfirm={() => deleteWaiter.mutate(showDeleteConfirm.id)}
          isLoading={deleteWaiter.isPending}
        />
      )}

      {showResetPin && (
        <ResetPinModal
          pin={newPin}
          onPinChange={setNewPin}
          onClose={() => {
            setShowResetPin(null);
            setNewPin("");
          }}
          onSubmit={() => resetPin.mutate({ userId: showResetPin!, pin: newPin })}
          onAutoGenerate={() => resetPin.mutate({ userId: showResetPin! })}
        />
      )}
    </div>
  );
}

function CreateWaiterModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: { name: string; email?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name: name.trim(), email: email.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Create Waiter</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            &times;
          </button>
        </div>
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
          A unique 4-digit PIN will be auto-generated for this waiter. Share it securely.
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 outline-none transition focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 outline-none transition focus:border-blue-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="secondary-button flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button flex-1"
            >
              Create Waiter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPinModal({
  pin,
  onPinChange,
  onClose,
  onSubmit,
  onAutoGenerate,
}: {
  pin: string;
  onPinChange: (pin: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onAutoGenerate: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Reset PIN</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            &times;
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter a unique 4-digit PIN or let the system generate one.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New PIN (4 digits)</label>
            <input
              type="text"
              inputMode="numeric"
              value={pin}
              onChange={(e) => onPinChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 outline-none transition focus:border-blue-500"
              maxLength={4}
              pattern="\d{0,4}"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="secondary-button flex-1"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={pin.length !== 4}
              className="primary-button flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
            >
              Save PIN
            </button>
            <button
              onClick={onAutoGenerate}
              className="primary-button flex-1"
            >
              Random PIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditWaiterNameModal({
  name,
  onNameChange,
  onClose,
  onSubmit,
  isLoading,
}: {
  name: string;
  onNameChange: (name: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Edit Waiter Name</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            &times;
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Waiter Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 outline-none transition focus:border-blue-500"
              placeholder="Enter waiter name"
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="secondary-button flex-1 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!name.trim() || isLoading}
              className="primary-button flex-1 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Name"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteWaiterConfirmModal({
  waiterName,
  onClose,
  onConfirm,
  isLoading,
}: {
  waiterName: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-red-600">Delete Waiter</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>
        <div className="space-y-4">
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            Are you sure you want to delete <strong>{waiterName}</strong>? This action cannot be undone. All sessions and data associated with this waiter will be permanently deleted.
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? "Deleting..." : "Delete Waiter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
