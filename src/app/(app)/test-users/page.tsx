"use client";

import { useState, useEffect, useCallback } from "react";
import type { TestUser } from "@/types/test-user";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export default function TestUsersPage() {
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    client: "",
    tier: "",
    custom_fields: "",
  });

  const fetchTestUsers = useCallback(async () => {
    const res = await fetch("/api/test-users");
    if (res.ok) {
      const data = await res.json();
      setTestUsers(data.testUsers);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTestUsers();
  }, [fetchTestUsers]);

  const addTestUser = async () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Name and email are required");
      return;
    }

    let customFields = {};
    if (newUser.custom_fields) {
      try {
        customFields = JSON.parse(newUser.custom_fields);
      } catch {
        toast.error("Custom fields must be valid JSON");
        return;
      }
    }

    const res = await fetch("/api/test-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newUser.name,
        email: newUser.email,
        client: newUser.client || null,
        tier: newUser.tier || null,
        custom_fields: customFields,
      }),
    });

    if (res.ok) {
      toast.success("Test user added");
      setNewUser({ name: "", email: "", client: "", tier: "", custom_fields: "" });
      fetchTestUsers();
    }
  };

  const deleteTestUser = async (id: string) => {
    await fetch(`/api/test-users?id=${id}`, { method: "DELETE" });
    toast.success("Test user removed");
    fetchTestUsers();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Test Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your test send recipients. Send proofs with personalized
            dynamic content per user.
          </p>
        </div>

        {/* Add new user form */}
        <div className="bg-muted rounded-xl p-4 mb-6 border border-border">
          <h3 className="text-sm font-medium mb-3">Add Test User</h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="Name"
              value={newUser.name}
              onChange={(e) =>
                setNewUser((prev) => ({ ...prev, name: e.target.value }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) =>
                setNewUser((prev) => ({ ...prev, email: e.target.value }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Client (e.g., Gmail)"
              value={newUser.client}
              onChange={(e) =>
                setNewUser((prev) => ({ ...prev, client: e.target.value }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Tier (e.g., VIP)"
              value={newUser.tier}
              onChange={(e) =>
                setNewUser((prev) => ({ ...prev, tier: e.target.value }))
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={addTestUser}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          <div className="mt-3">
            <input
              type="text"
              placeholder='Custom fields as JSON: {"cart_items": "3", "city": "NYC"}'
              value={newUser.custom_fields}
              onChange={(e) =>
                setNewUser((prev) => ({
                  ...prev,
                  custom_fields: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : testUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No test users yet. Add one above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Client
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Tier
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Custom Fields
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {testUsers.map((tu) => (
                  <tr
                    key={tu.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-3 px-4 font-medium">{tu.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {tu.email}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {tu.client || "—"}
                    </td>
                    <td className="py-3 px-4">
                      {tu.tier ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-accent text-foreground">
                          {tu.tier}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                      {Object.keys(tu.custom_fields).length > 0
                        ? JSON.stringify(tu.custom_fields)
                        : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteTestUser(tu.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
