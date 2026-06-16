import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const PRIORITY_OPTIONS = [
  { value: "high", label: "High", color: "#f97316", bg: "rgba(249,115,22,0.15)" },
  { value: "medium", label: "Med", color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
  { value: "low", label: "Low", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
];

const emptyTask = () => ({ title: "", priority: "medium", due_date: "", recur_daily: false });

export default function BulkTaskAdder() {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBiz, setSelectedBiz] = useState(null);
  const [tasks, setTasks] = useState([emptyTask(), emptyTask(), emptyTask()]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fetchingBiz, setFetchingBiz] = useState(true);

  useEffect(() => {
    supabase
      .from("businesses")
      .select("*")
      .order("name")
      .then(({ data }) => {
        setBusinesses(data || []);
        if (data && data.length > 0) setSelectedBiz(data[0]);
        setFetchingBiz(false);
      });
  }, []);

  const updateTask = (i, field, value) => {
    setTasks((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  };

  const addRow = () => setTasks((prev) => [...prev, emptyTask()]);
  const removeRow = (i) => setTasks((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    const valid = tasks.filter((t) => t.title.trim());
    if (!valid.length) { setError("Add at least one task title."); return; }
    if (!selectedBiz) { setError("Select a business first."); return; }
    setError("");
    setLoading(true);

    const rows = valid.map((t) => ({
      business_id: selectedBiz.id,
      title: t.title.trim(),
      priority: t.priority,
      due_date: t.due_date || null,
      recur_daily: t.recur_daily,
      status: "pending",
    }));

    const { error: dbErr } = await supabase.from("tasks").insert(rows);
    setLoading(false);
    if (dbErr) { setError(dbErr.message); return; }
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setTasks([emptyTask(), emptyTask(), emptyTask()]);
    }, 2000);
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>ELATZ OS</p>
            <h1 style={styles.title}>Bulk Add Tasks</h1>
          </div>
          <span style={styles.badge}>{tasks.filter((t) => t.title.trim()).length} queued</span>
        </div>

        {/* Business selector */}
        <div style={styles.section}>
          <p style={styles.label}>Business</p>
          {fetchingBiz ? (
            <p style={styles.muted}>Loading...</p>
          ) : (
            <div style={styles.bizRow}>
              {businesses.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBiz(b)}
                  style={{
                    ...styles.bizChip,
                    background: selectedBiz?.id === b.id ? b.color + "33" : "rgba(255,255,255,0.04)",
                    borderColor: selectedBiz?.id === b.id ? b.color : "rgba(255,255,255,0.08)",
                    color: selectedBiz?.id === b.id ? b.color : "#9ca3af",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{b.emoji}</span> {b.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Due date shortcut */}
        <div style={styles.section}>
          <p style={styles.label}>Due Date (applies to all unless overridden per task)</p>
          <div style={styles.dateRow}>
            <button
              onClick={() => setTasks((p) => p.map((t) => ({ ...t, due_date: tomorrowStr })))}
              style={styles.dateBtn}
            >
              📅 Tomorrow
            </button>
            <button
              onClick={() => setTasks((p) => p.map((t) => ({ ...t, due_date: "" })))}
              style={{ ...styles.dateBtn, color: "#6b7280" }}
            >
              Clear dates
            </button>
          </div>
        </div>

        {/* Task rows */}
        <div style={styles.section}>
          <div style={styles.taskHeaderRow}>
            <p style={{ ...styles.label, margin: 0 }}>Tasks</p>
            <button onClick={addRow} style={styles.addRowBtn}>+ Add row</button>
          </div>

          <div style={styles.taskList}>
            {tasks.map((task, i) => (
              <div key={i} style={styles.taskRow}>
                {/* Number */}
                <span style={styles.rowNum}>{i + 1}</span>

                {/* Title input */}
                <input
                  value={task.title}
                  onChange={(e) => updateTask(i, "title", e.target.value)}
                  placeholder={`Task ${i + 1}...`}
                  style={styles.titleInput}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (i === tasks.length - 1) addRow();
                      else document.getElementById(`task-input-${i + 1}`)?.focus();
                    }
                  }}
                  id={`task-input-${i}`}
                />

                {/* Priority */}
                <div style={styles.priorityGroup}>
                  {PRIORITY_OPTIONS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => updateTask(i, "priority", p.value)}
                      style={{
                        ...styles.priorityBtn,
                        background: task.priority === p.value ? p.bg : "transparent",
                        color: task.priority === p.value ? p.color : "#4b5563",
                        borderColor: task.priority === p.value ? p.color + "66" : "transparent",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Recurring toggle */}
                <button
                  onClick={() => updateTask(i, "recur_daily", !task.recur_daily)}
                  title="Recurring daily"
                  style={{
                    ...styles.recurBtn,
                    background: task.recur_daily ? "rgba(167,139,250,0.15)" : "transparent",
                    color: task.recur_daily ? "#a78bfa" : "#374151",
                  }}
                >
                  🔁
                </button>

                {/* Remove */}
                {tasks.length > 1 && (
                  <button onClick={() => removeRow(i)} style={styles.removeBtn}>✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && <p style={styles.error}>{error}</p>}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || success}
          style={{
            ...styles.submitBtn,
            background: success
              ? "rgba(34,197,94,0.2)"
              : loading
              ? "rgba(99,102,241,0.3)"
              : "rgba(99,102,241,0.9)",
            color: success ? "#22c55e" : "#fff",
            borderColor: success ? "#22c55e" : "transparent",
          }}
        >
          {success ? "✓ Tasks Added!" : loading ? "Saving..." : `Save ${tasks.filter((t) => t.title.trim()).length || ""} Tasks to ${selectedBiz?.name || "..."}`}
        </button>

        <p style={styles.hint}>Press Enter in any task row to jump to the next ↵</p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    minHeight: "100vh",
    background: "#0d0d0f",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "24px 16px 48px",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 600,
    background: "#18181b",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.07)",
    padding: "24px 20px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  eyebrow: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 10,
    letterSpacing: "0.15em",
    color: "#6366f1",
    margin: "0 0 6px",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#f9fafb",
    margin: 0,
    letterSpacing: "-0.02em",
  },
  badge: {
    background: "rgba(99,102,241,0.15)",
    border: "1px solid rgba(99,102,241,0.3)",
    color: "#818cf8",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'Space Mono', monospace",
    whiteSpace: "nowrap",
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#4b5563",
    marginBottom: 10,
    fontFamily: "'Space Mono', monospace",
  },
  muted: { color: "#6b7280", fontSize: 14 },
  bizRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  bizChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    borderRadius: 8,
    border: "1px solid",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  dateRow: {
    display: "flex",
    gap: 8,
  },
  dateBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    color: "#d1d5db",
    padding: "7px 14px",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 500,
  },
  taskHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  addRowBtn: {
    background: "transparent",
    border: "none",
    color: "#6366f1",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    padding: "2px 0",
  },
  taskList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  taskRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: "8px 10px",
  },
  rowNum: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    color: "#374151",
    minWidth: 16,
    textAlign: "center",
  },
  titleInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#f3f4f6",
    fontSize: 14,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    padding: 0,
    minWidth: 0,
  },
  priorityGroup: {
    display: "flex",
    gap: 3,
  },
  priorityBtn: {
    border: "1px solid",
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 7px",
    cursor: "pointer",
    fontFamily: "'Space Mono', monospace",
    transition: "all 0.1s",
  },
  recurBtn: {
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    padding: "3px 6px",
    background: "transparent",
    transition: "all 0.15s",
  },
  removeBtn: {
    background: "transparent",
    border: "none",
    color: "#374151",
    fontSize: 13,
    cursor: "pointer",
    padding: "2px 4px",
    lineHeight: 1,
    transition: "color 0.1s",
  },
  error: {
    color: "#f87171",
    fontSize: 13,
    marginBottom: 12,
    padding: "8px 12px",
    background: "rgba(248,113,113,0.1)",
    borderRadius: 6,
    border: "1px solid rgba(248,113,113,0.2)",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    borderRadius: 10,
    border: "1px solid transparent",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s",
    letterSpacing: "-0.01em",
    marginBottom: 10,
  },
  hint: {
    textAlign: "center",
    fontSize: 11,
    color: "#374151",
    fontFamily: "'Space Mono', monospace",
    margin: 0,
  },
};