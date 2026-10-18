
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/use-auth";


const initialLeads = [
  { id: 1, name: "Acme Technologies", stage: "New", value: 5000, need: "Automate sales reporting" },
  { id: 2, name: "Bright Solutions", stage: "Contacted", value: 8000, need: "Improve customer support" },
  { id: 3, name: "Nova Systems", stage: "Qualified", value: 12000, need: "AI-powered analytics" },
];

export default function Home() {
const [leads, setLeads] = useState<
  { id: number; name: string; stage: string; value: number; need: string }[]
>([]);

  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadValue, setNewLeadValue] = useState("");
  const [newLeadNeed, setNewLeadNeed] = useState("");
  const [showAddLead, setShowAddLead] = useState(false);

  const [editLeadName, setEditLeadName] = useState("");
  const [editLeadValue, setEditLeadValue] = useState("");
  const [editLeadNeed, setEditLeadNeed] = useState("");
  const [showEditLead, setShowEditLead] = useState(false);

  const [selectedId, setSelectedId] = useState(1);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("Dashboard");



  const { user, loading } = useAuth();
  const router = useRouter();

  const leadsLoadStarted = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

useEffect(() => {
  if (!user || leadsLoadStarted.current) return;
leadsLoadStarted.current = true;

const currentUser = user;
console.log("Logged-in user:", currentUser.uid);
console.log("Starting Firestore load...");

  async function loadLeads() {
    try {
      const leadsRef = collection(db, "users", currentUser.uid, "leads");
      const snapshot = await getDocs(leadsRef);

      console.log("Firestore leads found:", snapshot.size);

      if (snapshot.empty) {
        console.log("No leads found. Creating sample leads...");
        console.log("Sample leads to create:", initialLeads.length);
        await Promise.all(
          initialLeads.map((lead) =>
            setDoc(
              doc(db, "users", currentUser.uid, "leads", String(lead.id)),
              lead
            )
          )
        );

        console.log("Sample leads saved successfully!");
        setLeads(initialLeads);

      } else {
        const savedLeads = snapshot.docs.map((item) => ({
          ...item.data(),
          id: Number(item.id),
        })) as {
          id: number;
          name: string;
          stage: string;
          value: number;
          need: string;
        }[];

        setLeads(savedLeads);
      }
    } catch (error) {
  console.error("Could not load leads:", error);
  alert(
    error instanceof Error
      ? error.message
      : JSON.stringify(error)
  );
}
  }

  loadLeads();
}, [user]);


useEffect(() => {
  if (!user) return;

  let cancelled = false;

  async function loadConversation() {
    try {
      const conversationRef = doc(
        db,
        "users",
        user!.uid,
        "conversations",
        "main"
      );

      const snapshot = await getDoc(conversationRef);

      if (cancelled) return;

      if (snapshot.exists()) {
        const savedMessages = snapshot.data().messages;

        if (Array.isArray(savedMessages)) {
          setMessages(
            savedMessages.filter(
              (item): item is string => typeof item === "string"
            )
          );
        }
      }
    } catch (error) {
      console.error("Could not load conversation:", error);
    }
  }

  loadConversation();

  return () => {
    cancelled = true;
  };
}, [user]);


  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        Checking your session...
      </main>
    );
  }

  if (!user) {
    return null;
  }


  const selectedLead = leads.find((lead) => lead.id === selectedId);

  
async function updateStage(id: number, stage: string) {
  if (!user) return;

  try {
    await updateDoc(
      doc(db, "users", user.uid, "leads", String(id)),
      { stage }
    );

    setLeads((current) =>
      current.map((lead) =>
        lead.id === id ? { ...lead, stage } : lead
      )
    );
  } catch (error) {
    console.error("Could not update lead stage:", error);
    alert("Couldn't save the stage change. Please try again.");
  }
}


async function addLead() {
  if (!user || !newLeadName.trim() || !newLeadNeed.trim()) {
    alert("Please enter the company name and its need.");
    return;
  }

  const value = Number(newLeadValue);

  if (!newLeadValue.trim() || !Number.isFinite(value) || value < 0) {
    alert("Please enter a valid, non-negative deal value.");
    return;
  }

  const newId = Date.now();

  const newLead = {
    id: newId,
    name: newLeadName.trim(),
    stage: "New",
    value,
    need: newLeadNeed.trim(),
  };

  try {
    await setDoc(
      doc(db, "users", user.uid, "leads", String(newId)),
      newLead
    );

    setLeads((current) => [...current, newLead]);
    setSelectedId(newId);
    setNewLeadName("");
    setNewLeadValue("");
    setNewLeadNeed("");
    setShowAddLead(false);
  } catch (error) {
    console.error("Could not save new lead:", error);
    alert("Couldn't save the new lead. Please try again.");
  }
}


async function saveLeadEdits() {
  if (!user || !selectedLead) return;

  const name = editLeadName.trim();
  const need = editLeadNeed.trim();
  const value = Number(editLeadValue);

  if (!name || !need || !editLeadValue.trim() ||
      !Number.isFinite(value) || value < 0) {
    alert("Please enter a company name, a valid deal value, and its need.");
    return;
  }

  try {
    await updateDoc(
      doc(db, "users", user.uid, "leads", String(selectedLead.id)),
      { name, value, need }
    );

    setLeads((current) =>
      current.map((lead) =>
        lead.id === selectedLead.id
          ? { ...lead, name, value, need }
          : lead
      )
    );

    setShowEditLead(false);
  } catch (error) {
    console.error("Could not update lead:", error);
    alert("Couldn't save the lead edits. Please try again.");
  }
}




  

async function sendMessage() {
  if (!user || !message.trim()) return;

  const text = message.trim();
  const userMessages = [...messages, text];

  setMessage("");
  setMessages(userMessages);

  const conversationRef = doc(
    db,
    "users",
    user.uid,
    "conversations",
    "main"
  );

  try {
    // Save the user's message first.
    await setDoc(
      conversationRef,
      {
        messages: userMessages,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Ask our server-side Gemini endpoint for a reply.
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  message: text,
  lead: selectedLead
    ? {
        name: selectedLead.name,
        stage: selectedLead.stage,
        value: selectedLead.value,
        need: selectedLead.need,
      }
    : null,
}),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "The AI request failed.");
    }

    const updatedMessages = [
      ...userMessages,
      `Assistant: ${data.reply}`,
    ];

    // Save the conversation, including the assistant's reply.
    await setDoc(
      conversationRef,
      {
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    setMessages(updatedMessages);
  } catch (error) {
    console.error("Chat request failed:", error);
    alert(
      error instanceof Error
        ? error.message
        : "Couldn't get an AI response. Please try again."
    );
  }
}


  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 md:flex">
      <aside className="border-b border-slate-800 p-5 md:min-h-screen md:w-60 md:border-b-0 md:border-r">
        <h1 className="mb-8 text-2xl font-bold text-cyan-400">LeadPilot</h1>
        <nav className="flex flex-wrap gap-2 md:flex-col">
          {["Dashboard", "Leads", "AI Assistant", "Proposals"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-3 text-left ${
                activeTab === tab
                  ? "bg-cyan-400/15 text-cyan-300"
                  : "text-slate-400 hover:bg-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
        <p className="mt-10 text-xs text-slate-500">DEMO WORKSPACE</p>
      </aside>

      <section className="min-w-0 flex-1 p-5 md:p-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Sales workspace / {activeTab}</p>
            <h2 className="mt-1 text-3xl font-bold">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-3">
  <span className="hidden text-sm text-slate-400 sm:inline">
    {user.email}
  </span>

  <button
    onClick={async () => {
      await signOut(auth);
      router.replace("/login");
    }}
    className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
  >
    Log out
  </button>
</div>
        </header>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total leads", value: String(leads.length) },
            { label: "Qualified leads", value: String(leads.filter((lead) => lead.stage === "Qualified").length) },
            { label: "Potential pipeline", value: "$" + leads.reduce((sum, lead) => sum + lead.value, 0).toLocaleString("en-US") },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className="mt-2 text-2xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold">Lead pipeline</h3>
            <button
              onClick={() => setShowAddLead(!showAddLead)}
              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              + Add Lead
            </button>
          </div>

            
{showAddLead && (
  <div className="mb-4 space-y-3 rounded-lg border border-slate-700 bg-slate-950 p-4">
    <h4 className="font-semibold">Add a new lead</h4>

    <input
      value={newLeadName}
      onChange={(e) => setNewLeadName(e.target.value)}
      placeholder="Company name"
      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white"
    />

    <input
      type="number"
      min="0"
      value={newLeadValue}
      onChange={(e) => setNewLeadValue(e.target.value)}
      placeholder="Deal value ($)"
      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white"
    />

    <textarea
      value={newLeadNeed}
      onChange={(e) => setNewLeadNeed(e.target.value)}
      placeholder="What does this company need?"
      rows={3}
      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white"
    />

    <div className="flex gap-2">
      <button
        onClick={addLead}
        className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950"
      >
        Save Lead
      </button>

      <button
        onClick={() => setShowAddLead(false)}
        className="rounded-lg border border-slate-700 px-4 py-2"
      >
        Cancel
      </button>
    </div>
  </div>
)}

<div className="space-y-3">

              {leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedId(lead.id)}
                  className={`w-full rounded-lg border p-4 text-left ${
                    selectedId === lead.id
                      ? "border-cyan-400 bg-cyan-400/5"
                      : "border-slate-800 bg-slate-950 hover:border-slate-600"
                  }`}
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-semibold">{lead.name}</span>
                    <span className="text-cyan-300">${lead.value.toLocaleString("en-US")}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{lead.need}</p>
                  <span className="mt-3 inline-block rounded-full bg-slate-800 px-3 py-1 text-xs">
                    {lead.stage}
                  </span>
                </button>
              ))}
            </div>

            {selectedLead && (
              <div className="mt-5 border-t border-slate-800 pt-5">
                
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold">Selected customer</h4>
                  <button
                    onClick={() => {
                      if (!selectedLead) return;
                      setEditLeadName(selectedLead.name);
                      setEditLeadValue(String(selectedLead.value));
                      setEditLeadNeed(selectedLead.need);
                      setShowEditLead(true);
                    }}
                    className="rounded-lg border border-cyan-400 px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-400/10"
                  >
                    Edit Lead
                  </button>
                </div>

{showEditLead ? (
  <div className="mt-4 space-y-3">
    <input
      value={editLeadName}
      onChange={(e) => setEditLeadName(e.target.value)}
      placeholder="Company name"
      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
    />

    <input
      type="number"
      min="0"
      value={editLeadValue}
      onChange={(e) => setEditLeadValue(e.target.value)}
      placeholder="Deal value ($)"
      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
    />

    <textarea
      value={editLeadNeed}
      onChange={(e) => setEditLeadNeed(e.target.value)}
      placeholder="Company need"
      rows={3}
      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
    />

    <div className="flex gap-2">
      <button
        onClick={saveLeadEdits}
        className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950"
      >
        Save Changes
      </button>

      <button
        onClick={() => setShowEditLead(false)}
        className="rounded-lg border border-slate-700 px-4 py-2"
      >
        Cancel
      </button>
    </div>
  </div>
) : (
  <p className="mt-2 text-sm text-slate-400">{selectedLead.need}</p>
)}

                <label className="mt-4 block text-sm text-slate-300">Update lead stage</label>
                <select
                  value={selectedLead.stage}
                  onChange={(event) => updateStage(selectedLead.id, event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                >
                  <option>New</option>
                  <option>Contacted</option>
                  <option>Qualified</option>
                  <option>Proposal</option>
                  <option>Won</option>
                  <option>Lost</option>
                </select>
              </div>
            )}
          </section>

          <section className="flex min-h-96 flex-col rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-xl font-semibold">AI sales assistant</h3>
            <p className="mt-1 text-sm text-slate-400">
              Customer: {selectedLead?.name ?? "None selected"}
            </p>

            <div className="my-5 flex-1 space-y-3 rounded-lg bg-slate-950 p-4">
              <p className="text-sm text-slate-300">
                Assistant: Welcome! I can help prepare for a sales conversation.
                The live AI connection is not configured yet.
              </p>
              
{messages.map((item, index) => {
  const isAssistant = item.startsWith("Assistant:");

  return (
    <p
      key={index}
      className={`rounded-lg p-3 text-sm ${
        isAssistant
          ? "bg-slate-800 text-slate-200"
          : "bg-cyan-400/10 text-cyan-100"
      }`}
    >
      {isAssistant ? item : `You: ${item}`}
    </p>
  );
})}

            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write a message..."
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm"
              />
              <button className="rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950">
                Send
              </button>
            </form>

            <div className="mt-5 rounded-lg border border-slate-800 p-4">
              <h4 className="font-semibold">Proposal workspace</h4>
              <p className="mt-2 text-sm text-slate-400">
                Selected lead: {selectedLead?.name ?? "None"}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Illustrative deal value: ${selectedLead?.value.toLocaleString("en-US") ?? "0"}
              </p>
              <p className="mt-2 text-xs text-amber-300">
                Demo values only — verified product pricing and proposal generation are not connected.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
