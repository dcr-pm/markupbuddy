"use client";

import { useState, useEffect, useCallback, startTransition, useRef } from "react";
import type { AudienceList, Contact } from "@/types/campaign";
import {
  Plus,
  Trash2,
  Upload,
  Users,
  ChevronRight,
  ChevronLeft,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function AudiencesPage() {
  const [lists, setLists] = useState<AudienceList[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [activeList, setActiveList] = useState<AudienceList | null>(null);

  // New list form
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");

  // New contact form
  const [newContact, setNewContact] = useState({ email: "", firstName: "", lastName: "" });

  // CSV import
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLists = useCallback(async () => {
    const res = await fetch("/api/audiences");
    if (res.ok) {
      const data = await res.json();
      startTransition(() => setLists(Array.isArray(data) ? data : []));
    }
    startTransition(() => setLoading(false));
  }, []);

  const fetchContacts = useCallback(async (listId: string) => {
    setLoadingContacts(true);
    const res = await fetch(`/api/contacts?listId=${listId}`);
    if (res.ok) {
      const data = await res.json();
      startTransition(() => setContacts(Array.isArray(data) ? data : []));
    }
    setLoadingContacts(false);
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  useEffect(() => {
    if (activeList) {
      fetchContacts(activeList.id);
    }
  }, [activeList, fetchContacts]);

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast.error("List name is required");
      return;
    }
    const res = await fetch("/api/audiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName.trim(), description: newListDesc.trim() || null }),
    });
    if (res.ok) {
      toast.success("Audience list created");
      setNewListName("");
      setNewListDesc("");
      fetchLists();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create list");
    }
  };

  const handleDeleteList = async (id: string) => {
    const res = await fetch(`/api/audiences?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("List deleted");
      if (activeList?.id === id) {
        setActiveList(null);
        setContacts([]);
      }
      fetchLists();
    }
  };

  const handleAddContact = async () => {
    if (!newContact.email.trim() || !activeList) {
      toast.error("Email is required");
      return;
    }
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newContact.email.trim(),
        firstName: newContact.firstName.trim() || null,
        lastName: newContact.lastName.trim() || null,
        listId: activeList.id,
      }),
    });
    if (res.ok) {
      toast.success("Contact added");
      setNewContact({ email: "", firstName: "", lastName: "" });
      fetchContacts(activeList.id);
      fetchLists(); // refresh count
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to add contact");
    }
  };

  const handleDeleteContact = async (id: string) => {
    const res = await fetch(`/api/contacts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Contact removed");
      if (activeList) {
        fetchContacts(activeList.id);
        fetchLists();
      }
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeList) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        setImporting(false);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const emailIdx = headers.findIndex((h) => h === "email" || h === "e-mail" || h === "email_address");
      if (emailIdx === -1) {
        toast.error("CSV must have an 'email' column");
        setImporting(false);
        return;
      }

      const firstNameIdx = headers.findIndex((h) => h === "first_name" || h === "firstname" || h === "first name");
      const lastNameIdx = headers.findIndex((h) => h === "last_name" || h === "lastname" || h === "last name");

      const contacts = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim());
        return {
          email: cols[emailIdx] || "",
          first_name: firstNameIdx >= 0 ? cols[firstNameIdx] || "" : "",
          last_name: lastNameIdx >= 0 ? cols[lastNameIdx] || "" : "",
        };
      }).filter((c) => c.email.includes("@"));

      if (contacts.length === 0) {
        toast.error("No valid email addresses found in CSV");
        setImporting(false);
        return;
      }

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts, listId: activeList.id }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Imported ${data.imported} contacts`);
        fetchContacts(activeList.id);
        fetchLists();
      } else {
        const data = await res.json();
        toast.error(data.error || "Import failed");
      }
    } catch {
      toast.error("Failed to parse CSV file");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // List detail view
  if (activeList) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              setActiveList(null);
              setContacts([]);
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition mb-4"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to lists
          </button>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{activeList.name}</h1>
              {activeList.description && (
                <p className="text-sm text-muted-foreground mt-1">{activeList.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvImport}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-muted transition disabled:opacity-50"
              >
                {importing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                {importing ? "Importing..." : "Import CSV"}
              </button>
            </div>
          </div>

          {/* Add contact form */}
          <div className="bg-muted rounded-xl p-4 mb-6 border border-border">
            <h3 className="text-sm font-medium mb-3">Add Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="email"
                placeholder="Email *"
                value={newContact.email}
                onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="First name"
                value={newContact.firstName}
                onChange={(e) => setNewContact((p) => ({ ...p, firstName: e.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Last name"
                value={newContact.lastName}
                onChange={(e) => setNewContact((p) => ({ ...p, lastName: e.target.value }))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={handleAddContact}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* CSV format hint */}
          <div className="flex items-start gap-2 mb-4 px-1">
            <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              CSV format: <code className="bg-muted px-1 rounded">email,first_name,last_name</code> — header row required, email column is mandatory.
            </p>
          </div>

          {/* Contacts table */}
          {loadingContacts ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading contacts...
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No contacts yet. Add one above or import a CSV.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">First Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{c.email}</td>
                      <td className="py-3 px-4 text-muted-foreground">{c.first_name || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{c.last_name || "—"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            c.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : c.status === "unsubscribed"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-red-500/10 text-red-600"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteContact(c.id)}
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

  // Lists view
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Audiences</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your audience lists and contacts for email campaigns.
          </p>
        </div>

        {/* Create list form */}
        <div className="bg-muted rounded-xl p-4 mb-6 border border-border">
          <h3 className="text-sm font-medium mb-3">Create Audience List</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="List name *"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newListDesc}
              onChange={(e) => setNewListDesc(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={handleCreateList}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>

        {/* Lists */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading lists...
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No audience lists yet. Create one above to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lists.map((list) => (
              <div
                key={list.id}
                className="flex items-center justify-between bg-background rounded-xl p-4 border border-border hover:border-primary/20 transition group cursor-pointer"
                onClick={() => setActiveList(list)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{list.name}</p>
                    {list.description && (
                      <p className="text-xs text-muted-foreground">{list.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {list.contact_count} contact{list.contact_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteList(list.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
