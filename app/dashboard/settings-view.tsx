"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck } from "lucide-react";
import { useToasts } from "./toast-provider";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export function SettingsView() {
  const { addToast } = useToasts();
  const queryClient = useQueryClient();
  const [showAddUser, setShowAddUser] = useState(false);
  const [showResetPin, setShowResetPin] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return (Array.isArray(data) ? data : data.users || []) as User[];
    },
  });

  const createUser = useMutation({
    mutationFn: async (user: { email: string; name: string; pin: string; role: string }) => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });
      if (!res.ok) {
        const err = await res.json();
        const details = Array.isArray(err.details) ? `: ${err.details.join(", ")}` : "";
        throw new Error(`${err.error || "Failed to create admin"}${details}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowAddUser(false);
      addToast("Admin created successfully", "success");
    },
    onError: (err: Error) => addToast(err.message, "error"),
  });

  const updateUserStatus = useMutation({
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
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      addToast("User updated", "success");
    },
    onError: (err: Error) => addToast(err.message, "error"),
  });

  const resetPin = useMutation({
    mutationFn: async ({ userId, pin }: { userId: string; pin: string }) => {
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
      setShowResetPin(null);
      setNewPin("");
      addToast("PIN reset successfully", "success");
    },
    onError: (err: Error) => addToast(err.message, "error"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="icon-tile">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-950">{users?.length || 0} admin users</p>
            <p className="text-sm text-gray-500">Manage dashboard access and PIN security.</p>
          </div>
        </div>
        <button onClick={() => setShowAddUser(true)} className="primary-button">
          <Plus className="h-4 w-4" />
          Add Admin
        </button>
      </div>

      <div className="panel overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-base font-bold text-gray-950">Users</h3>
        </div>
        {isLoading ? (
          <p className="p-6 text-sm font-medium text-gray-500">Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((user: User) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-950">{user.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="status-pill bg-blue-100 text-blue-700">{formatRole(user.role)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`status-pill ${user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowResetPin(user.id)}
                          className="secondary-button py-1.5"
                        >
                          Reset PIN
                        </button>
                        <button
                          onClick={() =>
                            updateUserStatus.mutate({
                              userId: user.id,
                              isActive: !user.isActive,
                            })
                          }
                          className={`secondary-button py-1.5 ${
                            user.isActive
                              ? "text-red-700 hover:bg-red-50"
                              : "text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!users || users.length === 0) && (
              <p className="p-8 text-center text-sm font-medium text-gray-500">No users found</p>
            )}
          </div>
        )}
      </div>

      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onSubmit={(user) => createUser.mutate(user)}
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
          onSubmit={() => resetPin.mutate({ userId: showResetPin, pin: newPin })}
        />
      )}
    </div>
  );
}

function AddUserModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (user: { email: string; name: string; pin: string; role: string }) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("COUNTER");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email: email.trim(), name: name.trim(), pin, role });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-950">Add Admin</h3>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 outline-none transition focus:border-blue-500"
              required
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 outline-none transition focus:border-blue-500"
              required
            />
          </Field>
          <Field label="PIN (4 digits)">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 outline-none transition focus:border-blue-500"
              maxLength={4}
              pattern="\d{4}"
              required
            />
          </Field>
          <Field label="Role">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 outline-none transition focus:border-blue-500"
            >
              <option value="COUNTER">Counter</option>
              <option value="MANAGER">Manager</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="secondary-button flex-1">
              Cancel
            </button>
            <button type="submit" className="primary-button flex-1">
              Create Admin
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
}: {
  pin: string;
  onPinChange: (pin: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-950">Reset PIN</h3>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>
        <div className="space-y-4">
          <Field label="New PIN (4 digits)">
            <input
              type="password"
              value={pin}
              onChange={(e) => onPinChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 outline-none transition focus:border-blue-500"
              maxLength={4}
              pattern="\d{4}"
              required
            />
          </Field>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="secondary-button flex-1">
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={pin.length !== 4}
              className="primary-button flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
            >
              Reset PIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function formatRole(role: string) {
  return role.replace("_", " ");
}
