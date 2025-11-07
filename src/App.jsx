import React, { useState, useEffect } from "react";
import "./app.css";

const BASE_URL = "https://sheetdb.io/api/v1/g3j7bkgfvrz4q";
const USERS_SHEET = "Users";
const STUDENTS_SHEET = "Centers_Students";
const ENTRIES_SHEET = "Data Entry Log";

function generateUID() {
  return Math.random().toString(36).substr(2, 10) + Date.now().toString().substr(-6);
}

// ---- UI COMPONENTS ----

function Navbar() {
  return (
    <nav className="navbar">
      <img src="/logo.png" alt="Logo" className="logo" />
      <div className="nav-links">
        <a href="#">Home</a>
        <a href="#">About</a>
        <a href="#">Services</a>
      </div>
    </nav>
  );
}
function Footer() {
  return (
    <footer className="app-footer">
      © 2025 Your Company — All Rights Reserved
    </footer>
  );
}
function Card({ children }) {
  return <div className="card">{children}</div>;
}
function FormField({ label, value, onChange, id, ...rest }) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="field-label">{label}</label>
      <input
        id={id}
        value={value}
        onChange={onChange}
        className="field-input"
        {...rest}
      />
    </div>
  );
}

function InfoBox({ fields }) {
  return (
    <div className="info-box">
      <div><strong>Child Status:</strong> {fields.childStatus}</div>
      <div><strong>Family Status:</strong> {fields.familyStatus}</div>
      <div><strong>Billing Cycle:</strong> {fields.billingCycle}</div>
    </div>
  );
}

function EntriesTable({ entries, onEditClick }) {
  if (!entries.length) return <p>No entries found for this center.</p>;
  return (
    <table className="entries-table">
      <thead>
        <tr>
          <th>UID</th>
          <th>Timestamp</th>
          <th>Student Name</th>
          <th>Adj Amount</th>
          <th>Note</th>
          <th>Pull Inst</th>
          <th>Category</th>
          <th>Start</th>
          <th>End</th>
          <th>Recurring</th>
          <th>Child Status</th>
          <th>Family Status</th>
          <th>Billing Cycle</th>
          {onEditClick && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {entries.map(entry => (
          <tr key={entry.UID}>
            <td>{entry.UID}</td>
            <td>{new Date(entry.Timestamp).toLocaleString()}</td>
            <td>{entry["Student Name"]}</td>
            <td>{entry["Adjustment Amount"]}</td>
            <td>{entry["Note/Description"]}</td>
            <td>{entry["Pulling Instruction"]}</td>
            <td>{entry["Pulling Category"]}</td>
            <td>{entry["Start Date"]}</td>
            <td>{entry["End Date"]}</td>
            <td>{entry["Recurring"]}</td>
            <td>{entry["Child Status"]}</td>
            <td>{entry["Family Status"]}</td>
            <td>{entry["Billing Cycle"]}</td>
            {onEditClick && (
              <td>
                <button onClick={() => onEditClick(entry)} className="edit-btn">
                  Edit
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---- MAIN APP ----

export default function App() {
  // Auth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginCenter, setLoginCenter] = useState("");

  // App workflow
  const [mode, setMode] = useState("menu");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");

  // All Form Fields!
  const emptyFields = {
    adjustmentAmount: "",
    note: "",
    pullingInstruction: "",
    pullingCategory: "",
    startDate: "",
    endDate: "",
    adjustmentRecurring: "",
    childStatus: "",
    familyStatus: "",
    billingCycle: "",
  };
  const [fields, setFields] = useState(emptyFields);
  const [entries, setEntries] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingFields, setEditingFields] = useState(emptyFields);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ---- LOGIN ----
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const url = `${BASE_URL}/search?Username=${encodeURIComponent(loginUser)}&Password=${encodeURIComponent(loginPass)}&sheet=${USERS_SHEET}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("SheetDB error");
      const users = await res.json();
      if (!Array.isArray(users)) {
        setLoginError("ERROR: SheetDB endpoint/sheet names/headers may be wrong.");
        return;
      }
      if (users.length === 1) {
        setIsLoggedIn(true);
        setLoginCenter(users[0]["Center Name"]);
      } else if (users.length > 1) {
        setLoginError("Multiple users found. Fix duplicate usernames.");
      } else {
        setLoginError("Invalid username or password.");
      }
    } catch (err) {
      setLoginError("Could not connect to login server or endpoint misconfiguration.");
    }
  };

  // ---- GET STUDENTS FOR CENTER ----
  useEffect(() => {
    if (isLoggedIn && loginCenter) {
      fetch(${BASE_URL}?sheet=${STUDENTS_SHEET})
        .then(res => res.json())
        .then(data => {
          const filtered = data.filter(row => row["Center Name"] === loginCenter);
          setStudents(filtered.map(row => row["Student Name"]));
        });
    }
  }, [isLoggedIn, loginCenter]);

  // ---- STUDENT SELECTED: PULL FIELDS FROM MASTER ----
  useEffect(() => {
    if (selectedStudent && loginCenter && isLoggedIn) {
      fetch(${BASE_URL}?sheet=${STUDENTS_SHEET})
        .then(res => res.json())
        .then(data => {
          const studentRow = data.find(
            row =>
              row["Center Name"] === loginCenter &&
              row["Student Name"] === selectedStudent
          );
          setFields(f => ({
            ...f,
            childStatus: studentRow?.["Child Status"] || "",
            familyStatus: studentRow?.["Family Status"] || "",
            billingCycle: studentRow?.["Billing Cycle"] || ""
          }));
        });
    } else {
      setFields(f => ({
        ...f,
        childStatus: "",
        familyStatus: "",
        billingCycle: ""
      }));
    }
  }, [selectedStudent, loginCenter, isLoggedIn]);

  // ---- VIEW/EDIT: LOAD ENTRIES ----
  useEffect(() => {
    if ((mode === "view" || mode === "edit") && loginCenter && isLoggedIn) {
      fetch(${BASE_URL}?sheet=${ENTRIES_SHEET})
        .then(res => res.json())
        .then(data => {
          const filtered = data
            .filter(e => e["Center Name"] === loginCenter && e.Username === loginUser)
            .reduce((acc, curr) => {
              const key = curr["Student Name"];
              acc[key] = !acc[key] || new Date(curr.Timestamp) > new Date(acc[key].Timestamp)
                ? curr : acc[key];
              return acc;
            }, {});
          setEntries(Object.values(filtered));
        })
        .catch(() => setEntries([]));
    } else if (mode === "view" || mode === "edit") {
      setEntries([]);
    }
  }, [loginCenter, mode, isLoggedIn, loginUser]);

  // ---- ADD NEW ENTRY ----
  const submitNewEntry = async (e) => {
    e.preventDefault();
    // Validations
    if (!fields.adjustmentAmount || isNaN(fields.adjustmentAmount)) {
      alert("Enter a valid adjustment amount.");
      return;
    }
    setSubmitting(true);
    const entry = {
      UID: generateUID(),
      Timestamp: new Date().toISOString(),
      "Center Name": loginCenter,
      Username: loginUser,
      "Student Name": selectedStudent,
      "Adjustment Amount": fields.adjustmentAmount,
      "Note/Description": fields.note,
      "Pulling Instruction": fields.pullingInstruction,
      "Pulling Category": fields.pullingCategory,
      "Start Date": fields.startDate,
      "End Date": fields.endDate,
      "Recurring": fields.adjustmentRecurring,
      "Child Status": fields.childStatus,
      "Family Status": fields.familyStatus,
      "Billing Cycle": fields.billingCycle,
    };
    try {
      const res = await fetch(${BASE_URL}?sheet=${ENTRIES_SHEET}, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [entry] }),
      });
      if (res.ok) {
        setFields(emptyFields);
        setSelectedStudent("");
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 2000);
      } else {
        alert("Could not submit to server.");
      }
    } catch {
      alert("Network error—please check your internet/SheetDB setup.");
    }
    setSubmitting(false);
  };

  // ---- EDIT AN ENTRY (Delete then Add) ----
  const startEditEntry = (entry) => {
    setEditingEntry(entry);
    setEditingFields({
      adjustmentAmount: entry["Adjustment Amount"] || "",
      note: entry["Note/Description"] || "",
      pullingInstruction: entry["Pulling Instruction"] || "",
      pullingCategory: entry["Pulling Category"] || "",
      startDate: entry["Start Date"] || "",
      endDate: entry["End Date"] || "",
      adjustmentRecurring: entry["Recurring"] || "",
      childStatus: entry["Child Status"] || "",
      familyStatus: entry["Family Status"] || "",
      billingCycle: entry["Billing Cycle"] || ""
    });
    setSelectedStudent(entry["Student Name"]);
  };

  const saveEditedEntry = async () => {
    if (!editingEntry) return;
    setSubmitting(true);
    try {
      // 1. Delete old entry by UID
      const deleteRes = await fetch(
        ${BASE_URL}/UID/${encodeURIComponent(editingEntry.UID)}?sheet=${ENTRIES_SHEET},
        { method: "DELETE" }
      );
      if (!deleteRes.ok) {
        alert("Failed to delete old entry.");
        setSubmitting(false);
        return;
      }
      // 2. Add new updated entry
      const updatedEntry = {
        UID: editingEntry.UID,
        Timestamp: new Date().toISOString(),
        "Center Name": loginCenter,
        Username: loginUser,
        "Student Name": selectedStudent,
        "Adjustment Amount": editingFields.adjustmentAmount,
        "Note/Description": editingFields.note,
        "Pulling Instruction": editingFields.pullingInstruction,
        "Pulling Category": editingFields.pullingCategory,
        "Start Date": editingFields.startDate,
        "End Date": editingFields.endDate,
        "Recurring": editingFields.adjustmentRecurring,
        "Child Status": editingFields.childStatus,
        "Family Status": editingFields.familyStatus,
        "Billing Cycle": editingFields.billingCycle,
      };
      const addRes = await fetch(${BASE_URL}?sheet=${ENTRIES_SHEET}, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [updatedEntry] }),
      });
      if (!addRes.ok) {
        alert("Failed to save entry.");
        setSubmitting(false);
        return;
      }
      setEditingEntry(null);
      // Reload
      const res = await fetch(${BASE_URL}?sheet=${ENTRIES_SHEET});
      const data = await res.json();
      const filtered = data
        .filter(e => e["Center Name"] === loginCenter && e.Username === loginUser)
        .reduce((acc, curr) => {
          const key = curr["Student Name"];
          acc[key] = !acc[key] || new Date(curr.Timestamp) > new Date(acc[key].Timestamp) ? curr : acc[key];
          return acc;
        }, {});
      setEntries(Object.values(filtered));
    } catch (error) {
      alert("Error saving entry: " + error.message);
    }
    setSubmitting(false);
  };

  // ===================
  // ==== UI RENDER ====
  // ===================

  if (!isLoggedIn) {
    return (
      <>
        <Navbar />
        <div className="login-container">
          <form className="login-form" onSubmit={handleLogin}>
            <img src="/logo.png" alt="Logo" className="logo" style={{ marginBottom: 8 }} />
            <h2>Center Login</h2>
            <input
              type="text"
              placeholder="Username"
              value={loginUser}
              onChange={e => setLoginUser(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              required
            />
            <button type="submit" className="main-btn">Login</button>
            {loginError && <p className="error" style={{ fontWeight: 700 }}>{loginError}</p>}
          </form>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="app-main-container">
        <div className="app-header">
          <img src="/logo.png" alt="App Logo" className="logo" />
          <h1 style={{ color: "#9D4BE6", fontWeight: 900, margin: 0 }}>Deva Data Entry App</h1>
          <p style={{ color: "#1991EB", fontWeight: 600, marginTop: 6, fontSize: "1.1rem" }}>
            Welcome, {loginUser} ({loginCenter})
          </p>
          <button className="back-btn" style={{ float: "right", background: "#eee" }}
            onClick={() => { setIsLoggedIn(false); setLoginUser(""); setLoginPass(""); }}>
            Logout
          </button>
        </div>
        {mode === "menu" && (
          <Card>
            <h2 style={{ color: "#9D4BE6", marginBottom: 20 }}>Select an option</h2>
            <button onClick={() => { setMode("enter"); setSelectedStudent(""); setFields(emptyFields); }} className="main-btn btn-animated">
              Enter New Data
            </button>
            <button onClick={() => { setMode("view"); }} className="main-btn btn-animated">
              View Data Entered
            </button>
            <button onClick={() => { setMode("edit"); }} className="main-btn btn-animated">
              Edit Entries
            </button>
          </Card>
        )}
        {mode === "enter" && (
          <Card>
            <button onClick={() => setMode("menu")} className="back-btn">← Back to Menu</button>
            <h2 style={{ color: "#9D4BE6", marginBottom: 20 }}>Select Student</h2>
            <select className="select-box" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
              <option value="">--Select a student--</option>
              {students.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {selectedStudent && (
              <>
                <InfoBox fields={fields} />
                <form onSubmit={submitNewEntry}>
                  <FormField
                    id="adj-amount" label="Adjustment Amount"
                    value={fields.adjustmentAmount}
                    onChange={e => setFields(f => ({ ...f, adjustmentAmount: e.target.value }))}
                    type="number"
                    step="0.01"
                    min="0"
                    required
                  />
                  <FormField
                    id="note"
                    label="Note/Description"
                    value={fields.note}
                    onChange={e => setFields(f => ({ ...f, note: e.target.value }))}
                  />
                  <FormField
                    id="pull-inst"
                    label="Pulling Instruction"
                    value={fields.pullingInstruction}
                    onChange={e => setFields(f => ({ ...f, pullingInstruction: e.target.value }))}
                  />
                  <div className="form-field">
                    <label htmlFor="pull-category" className="field-label">Pulling Category</label>
                    <select
                      id="pull-category"
                      className="field-input"
                      value={fields.pullingCategory}
                      onChange={e => setFields(f => ({ ...f, pullingCategory: e.target.value }))}
                      required>
                      <option value="">Select</option>
                      <option value="Pull">Pull</option>
                      <option value="Don't Pull">Don't Pull</option>
                      <option value="Deferred Pull">Deferred Pull</option>
                    </select>
                  </div>
                  <FormField
                    id="start-date"
                    label="Start Date"
                    type="date"
                    value={fields.startDate}
                    onChange={e => setFields(f => ({ ...f, startDate: e.target.value }))}
                    required
                  />
                  <FormField
                    id="end-date"
                    label="End Date"
                    type="date"
                    value={fields.endDate}
                    onChange={e => setFields(f => ({ ...f, endDate: e.target.value }))}
                    required
                  />
                  <div className="form-field">
                    <label htmlFor="adj-rec" className="field-label">Adjustment is Recurring</label>
                    <select
                      id="adj-rec"
                      className="field-input"
                      value={fields.adjustmentRecurring}
                      onChange={e => setFields(f => ({ ...f, adjustmentRecurring: e.target.value }))}
                      required>
                      <option value="">Select</option>
                      <option value="Monthly">Monthly</option>
                      <option value="One Time">One Time</option>
                    </select>
                  </div>
                  <button type="submit" disabled={submitting} className="main-btn btn-animated">Submit Entry</button>
                </form>
              </>
            )}
          </Card>
        )}
        {mode === "view" && (
          <Card>
            <button onClick={() => setMode("menu")} className="back-btn">← Back to Menu</button>
            <h2 style={{ color: "#9D4BE6", marginBottom: 20 }}>View Data Entered</h2>
            <EntriesTable entries={entries} />
          </Card>
        )}
        {mode === "edit" && (
          <Card>
            <button onClick={() => setMode("menu")} className="back-btn">← Back to Menu</button>
            <h2 style={{ color: "#9D4BE6", marginBottom: 20 }}>Edit Entries</h2>
            {!editingEntry ? (
              <EntriesTable
                entries={entries}
                onEditClick={startEditEntry}
              />
            ) : (
              <>
                <h4>Editing: {selectedStudent}</h4>
                <FormField
                  id="edit-amount"
                  label="Adjustment Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingFields.adjustmentAmount}
                  onChange={e => setEditingFields(f => ({ ...f, adjustmentAmount: e.target.value }))}
                  required
                />
                <FormField
                  id="edit-note"
                  label="Note/Description"
                  value={editingFields.note}
                  onChange={e => setEditingFields(f => ({ ...f, note: e.target.value }))}
                />
                <FormField
                  id="edit-instr"
                  label="Pulling Instruction"
                  value={editingFields.pullingInstruction}
                  onChange={e => setEditingFields(f => ({ ...f, pullingInstruction: e.target.value }))}
                />
                <div className="form-field">
                  <label htmlFor="edit-pullcat" className="field-label">Pulling Category</label>
                  <select
                    id="edit-pullcat"
                    className="field-input"
                    value={editingFields.pullingCategory}
                    onChange={e => setEditingFields(f => ({ ...f, pullingCategory: e.target.value }))}
                    required>
                    <option value="">Select</option>
                    <option value="Pull">Pull</option>
                    <option value="Don't Pull">Don't Pull</option>
                    <option value="Deferred Pull">Deferred Pull</option>
                  </select>
                </div>
                <FormField
                  id="edit-start"
                  label="Start Date"
                  type="date"
                  value={editingFields.startDate}
                  onChange={e => setEditingFields(f => ({ ...f, startDate: e.target.value }))}
                  required
                />
                <FormField
                  id="edit-end"
                  label="End Date"
                  type="date"
                  value={editingFields.endDate}
                  onChange={e => setEditingFields(f => ({ ...f, endDate: e.target.value }))}
                  required
                />
                <div className="form-field">
                  <label htmlFor="edit-rec" className="field-label">Adjustment is Recurring</label>
                  <select
                    id="edit-rec"
                    className="field-input"
                    value={editingFields.adjustmentRecurring}
                    onChange={e => setEditingFields(f => ({ ...f, adjustmentRecurring: e.target.value }))}
                    required>
                    <option value="">Select</option>
                    <option value="Monthly">Monthly</option>
                    <option value="One Time">One Time</option>
                  </select>
                </div>
                <button onClick={saveEditedEntry} disabled={submitting} className="main-btn btn-animated">Save Changes</button>
                <button onClick={() => setEditingEntry(null)} className="back-btn">Cancel</button>
              </>
            )}
          </Card>
        )}
        {submitted && (<div className="submitted-popup">✅ Entry Submitted!</div>)}
      </div>
      <Footer />
    </>
  );
}
