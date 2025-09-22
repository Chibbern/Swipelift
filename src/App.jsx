import React, { useEffect, useMemo, useState } from "react";
import { useSwipeable } from "react-swipeable";

// ---------- localStorage helpers ----------
function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- seed data ----------
const sampleExercises = [
  { id: "deadlift", name: "Deadlift", muscle: "Posterior chain", history: [] },
  { id: "squat", name: "Back Squat", muscle: "Quads/Glutes", history: [] },
  { id: "bench", name: "Bench Press", muscle: "Chest/Triceps", history: [] },
];

// ---------- main app ----------
export default function App() {
  const [exercises, setExercises] = useState(() =>
    loadLS("swipelift.exercises", sampleExercises)
  );
  const [deck, setDeck] = useState(() =>
    loadLS(
      "swipelift.deck",
      sampleExercises.map((e) => e.id)
    )
  );
  const [menuOpen, setMenuOpen] = useState(false);

  // modal state (opens on right-swipe)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalExercise, setModalExercise] = useState(null);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [notes, setNotes] = useState("");

  // simple drag visuals for the top card
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => saveLS("swipelift.exercises", exercises), [exercises]);
  useEffect(() => saveLS("swipelift.deck", deck), [deck]);

  const currentId = deck[0];
  const current = exercises.find((e) => e.id === currentId) || null;

  const lastSet = useMemo(() => {
    if (!current) return null;
    const h = current.history;
    return h.length ? h[h.length - 1] : null;
  }, [current]);

  // ----- swipe handlers -----
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (!current) return;
      // skip → reinsert after 4
      const rest = deck.slice(1);
      const offset = Math.min(4, rest.length);
      const newDeck = [...rest];
      newDeck.splice(offset, 0, current.id);
      setDeck(newDeck);
      setDragX(0);
      setIsDragging(false);
    },
    onSwipedRight: () => {
      if (!current) return;
      // open modal, DO NOT finalize until Save/Cancel
      setModalExercise(current);
      setModalOpen(true);
      // snap back (swipe is "paused")
      setDragX(0);
      setIsDragging(false);
    },
    onSwiping: (e) => {
      setIsDragging(true);
      setDragX(e.deltaX);
    },
    onSwiped: () => {
      setIsDragging(false);
      setDragX(0);
    },
    trackMouse: true, // allow mouse dragging on desktop
  });

  function saveLog() {
    if (!modalExercise) return;
    const entry = {
      date: new Date().toISOString(),
      weight: weight ? Number(weight) : undefined,
      reps: reps ? Number(reps) : undefined,
      notes: notes || undefined,
    };
    const updated = exercises.map((e) =>
      e.id === modalExercise.id ? { ...e, history: [...e.history, entry] } : e
    );
    setExercises(updated);

    // send card to the back after logging
    setDeck((d) => [...d.slice(1), modalExercise.id]);

    // reset modal state
    closeModal(true);
  }

  function closeModal(snapBackOnly = false) {
    // If cancel: snap card back to the front (do not move it)
    if (!snapBackOnly && modalExercise) {
      setDeck((d) => [modalExercise.id, ...d.slice(1)]);
    }
    setModalOpen(false);
    setModalExercise(null);
    setWeight("");
    setReps("");
    setRpe("");
    setNotes("");
  }

  function addExercise(name, muscle) {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (exercises.some((e) => e.id === id)) return;
    const ex = { id, name, muscle, history: [] };
    setExercises((arr) => [...arr, ex]);
    setDeck((d) => [...d, id]);
  }

  function removeExercise(id) {
    setExercises((arr) => arr.filter((e) => e.id !== id));
    setDeck((d) => d.filter((x) => x !== id));
  }

  return (
    <div style={{ fontFamily: "system-ui, Arial, sans-serif", height: "100vh", overflow: "hidden", background: "#111", color: "#fff" }}>
      {/* Hamburger */}
      <button
        onClick={() => setMenuOpen((o) => !o)}
        style={{
  position: "absolute",
  top: 12,
  left: 12,
  zIndex: 20,
  width: 40,
  height: 40,
  borderRadius: 8,
  border: "1px solid #333",
  background: "#1c1c1c",
  color: "#fff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
}}
        aria-label="Menu"
      >
        ☰
      </button>

      {/* Side drawer */}
      {menuOpen && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 280,
            height: "100%",
            background: "#1b1b1b",
            borderRight: "1px solid #333",
            zIndex: 15,
            padding: "16px",
            overflowY: "auto",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Your exercises</h3>
          <ul style={{ paddingLeft: 18 }}>
            {exercises.map((e) => (
              <li key={e.id} style={{ marginBottom: 6 }}>
                {e.name}{" "}
                <button
                  onClick={() => removeExercise(e.id)}
                  style={{ marginLeft: 8, padding: "2px 6px", cursor: "pointer" }}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
          <AddExerciseForm onAdd={addExercise} />
        </div>
      )}

      {/* Card area */}
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 16px" }}>
        {current ? (
          <div
            {...handlers}
            style={{
              width: "88vw",
              maxWidth: 420,
              height: "72vh",
              maxHeight: 700,
              background: "#181818",
              border: "1px solid #2a2a2a",
              borderRadius: 24,
              boxShadow: isDragging
                ? "0 12px 28px rgba(0,0,0,0.45)"
                : "0 6px 16px rgba(0,0,0,0.35)",
              transform: `translateX(${dragX}px) rotate(${dragX / 30}deg)`,
              transition: isDragging ? "none" : "transform 160ms ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: 24,
            }}
          >
            <h1 style={{ fontSize: 34, margin: 0 }}>{current.name}</h1>
            <div style={{ opacity: 0.7, marginTop: 4 }}>{current.muscle}</div>

            <div style={{ marginTop: 24, fontSize: 16 }}>
              <strong>Previous:</strong>{" "}
              {lastSet ? (
                <div style={{ marginTop: 6 }}>
                 {lastSet.weight ?? "—"} kg × {lastSet.reps ?? "—"} reps
                  <div style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>
                    {new Date(lastSet.date).toLocaleString()}
                  </div>
                  {lastSet.notes && (
                    <div style={{ opacity: 0.75, fontStyle: "italic", marginTop: 6 }}>
                      “{lastSet.notes}”
                    </div>
                  )}
                </div>
              ) : (
                "No history yet"
              )}
            </div>

            <div style={{ position: "absolute", bottom: 18, opacity: 0.6, fontSize: 13 }}>
              Swipe left = skip • right = complete
            </div>
          </div>
        ) : (
          <div>No exercises in deck</div>
        )}
      </div>

      {/* Logging Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#101010",
              color: "#fff",
              border: "1px solid #2a2a2a",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>
              Log {modalExercise?.name}
            </h3>

            <Input label="Weight (kg)" value={weight} onChange={setWeight} />
            <Input label="Reps" value={reps} onChange={setReps} />
            <Input label="Notes" value={notes} onChange={setNotes} />

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => {
                  // cancel → snap back (do not move card)
                  // keep card at front
                  setDeck((d) => [modalExercise.id, ...d.slice(1)]);
                  closeModal(false);
                }}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#262626",
                  color: "#fff",
                  border: "1px solid #3a3a3a",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveLog}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#e6e6e6",
                  color: "#111",
                  border: "1px solid #3a3a3a",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- small components ----------
function Input({ label, value, onChange }) {
  return (
    <label style={{ display: "block", marginTop: 10 }}>
      <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #3a3a3a",
          background: "#181818",
          color: "#fff",
          outline: "none",
        }}
      />
    </label>
  );
}

function AddExerciseForm({ onAdd }) {
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState("");

  return (
    <div style={{ marginTop: 12 }}>
      <input
        placeholder="Exercise name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: "100%", marginBottom: 6 }}
      />
      <input
        placeholder="Muscle (optional)"
        value={muscle}
        onChange={(e) => setMuscle(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <button
        onClick={() => {
          if (!name.trim()) return;
          onAdd(name.trim(), muscle.trim() || undefined);
          setName("");
          setMuscle("");
        }}
        style={{ padding: "6px 10px", cursor: "pointer" }}
      >
        Add
      </button>
    </div>
  );
}
