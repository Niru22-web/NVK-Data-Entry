import React, { useState, useEffect } from "react";

// COLORS and FONT
const COLORS = {
  yellow: "#FFEC00",
  blue: "#1991EB",
  pink: "#F96FB7",
  purple: "#9D4BE6",
  white: "#ffffff",
  border: "#E8EDEE",
  infoBg: "#f4f7fd"
};
const FONT = "'Quicksand', 'Nunito', 'Arial', sans-serif";

// SheetDB endpoints
const CENTERS_URL = "https://sheetdb.io/api/v1/g3j7bkgfvrz4q";
const ENTRIES_URL = "https://sheetdb.io/api/v1/imirhe608ptj9";

// Card layout
function Card({ children }) {
  return (
    <div className="card">
      {children}
    </div>
  );
}

function FormField({ label, value, onChange, id }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label htmlFor={id} className="field-label">{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        autoComplete="off"
        className="field-input"
        required
      />
    </div>
  );
}

function InfoBox({ center, student, agreementDate, birthDate }) {
  return (
    <div className="info-box">
      <div><strong>Center Name:</strong> {center}</div>
      <div><strong>Student Name:</strong> {student}</div>
      <div><strong>Agreement Date:</strong> {agreementDate}</div>
      <div><strong>Birth Date:</strong> {birthDate}</div>
    </div>
  );
}

function EntriesTable({ entries, onEditClick }) {
  if (!entries.length) return <p>No entries found for this center.</p>;
  return (
    <table className="entries-table">
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Student Name</th>
          <th>Field 1</th>
          <th>Field 2</th>
          <th>Field 3</th>
          <th>Field 4</th>
          <th>Field 5</th>
          {onEditClick && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {entries.map(entry => (
          <tr key={entry.Timestamp}>
            <td>{new Date(entry.Timestamp).toLocaleString()}</td>
            <td>{entry["Student Name"]}</td>
            <td>{entry.Field1}</td>
            <td>{entry.Field2}</td>
            <td>{entry.Field3}</td>
            <td>{entry.Field4}</td>
            <td>{entry.Field5}</td>
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

function App() {
  const [mode, setMode] = useState("menu");
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentData, setStudentData] = useState({});
  const [fields, setFields] = useState({ field1: "", field2: "", field3: "", field4: "", field5: "" });
  const [entries, setEntries] = useState([]);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editingFields, setEditingFields] = useState({ Field1: "", Field2: "", Field3: "", Field4: "", Field5: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(CENTERS_URL)
      .then(res => res.json())
      .then(data => setCenters([...new Set(data.map(row => row["Center Name"]))]));
  }, []);

  useEffect(() => {
    if (mode === "enter" && selectedCenter) {
      fetch(CENTERS_URL)
        .then(res => res.json())
        .then(data => {
          const filtered = data.filter(row => row["Center Name"] === selectedCenter);
          setStudents(filtered.map(row => row["Student Name"]));
        });
    } else if (mode === "enter") {
      setStudents([]);
      setSelectedStudent("");
    }
  }, [selectedCenter, mode]);

  useEffect(() => {
    if (mode === "enter" && selectedStudent && selectedCenter) {
      fetch(CENTERS_URL)
        .then(res => res.json())
        .then(data => {
          const studentRow = data.find(
            row => row["Center Name"] === selectedCenter && row["Student Name"] === selectedStudent);
          setStudentData(studentRow || {});
        });
    } else if (mode === "enter") {
      setStudentData({});
    }
  }, [selectedStudent, selectedCenter, mode]);

  useEffect(() => {
    if ((mode === "view" || mode === "edit") && selectedCenter) {
      fetch(ENTRIES_URL)
        .then(res => res.json())
        .then(data => {
          const filteredEntries = data.filter(entry => entry["Center Name"] === selectedCenter);
          setEntries(filteredEntries);
        })
        .catch(() => setEntries([]));
    } else if (mode === "view" || mode === "edit") {
      setEntries([]);
    }
  }, [selectedCenter, mode]);

  // Submit new entry
  const submitNewEntry = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const entry = {
      Timestamp: new Date().toISOString(),
      "Center Name": selectedCenter,
      "Student Name": selectedStudent,
      Field1: fields.field1,
      Field2: fields.field2,
      Field3: fields.field3,
      Field4: fields.field4,
      Field5: fields.field5,
    };
    try {
      const res = await fetch(ENTRIES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [entry] }),
      });
      if (res.ok) {
        setFields({ field1: "", field2: "", field3: "", field4: "", field5: "" });
        setSelectedCenter("");
        setSelectedStudent("");
        setStudentData({});
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 2000);
      } else {
        alert("Could not submit to SheetDB.");
      }
    } catch {
      alert("Network error—please check your internet/SheetDB setup.");
    }
    setSubmitting(false);
  };

  // Begin editing entry
  const startEditEntry = (entry) => {
    setEditingEntryId(entry.Timestamp);
    setEditingFields({
      Field1: entry.Field1 || "",
      Field2: entry.Field2 || "",
      Field3: entry.Field3 || "",
      Field4: entry.Field4 || "",
      Field5: entry.Field5 || ""
    });
  };

  // Save edited entry (delete + add; update with SheetDB if possible)
  const saveEditedEntry = async () => {
    if (!editingEntryId) return;
    setSubmitting(true);
    try {
      // 1. Delete old entry by Timestamp (unique identifier)
      const deleteRes = await fetch(
        `${ENTRIES_URL}/search?Timestamp=${encodeURIComponent(editingEntryId)}`,
        { method: "DELETE" }
      );
      if (!deleteRes.ok) {
        alert("Failed to delete existing entry.");
        setSubmitting(false);
        return;
      }
      // 2. Add new updated entry
      const updatedEntry = {
        Timestamp: editingEntryId,
        "Center Name": selectedCenter,
        "Student Name": "", // TODO: Track the editing student if needed
        Field1: editingFields.Field1,
        Field2: editingFields.Field2,
        Field3: editingFields.Field3,
        Field4: editingFields.Field4,
        Field5: editingFields.Field5,
      };
      const addRes = await fetch(ENTRIES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [updatedEntry] }),
      });
      if (!addRes.ok) {
        alert("Failed to add updated entry.");
        setSubmitting(false);
        return;
      }
      alert("Entry updated successfully!");
      setEditingEntryId(null);
      // Reload entries for selected center
      const res = await fetch(ENTRIES_URL);
      const allEntries = await res.json();
      const filtered = allEntries.filter(e => e["Center Name"] === selectedCenter);
      setEntries(filtered);
    } catch (error) {
      alert("Error updating entry: " + error.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="app-main-container">
      <div className="app-header">
        <img src="/logo.png"
          alt="App Logo"
          className="logo"
          style={{ width: 180, borderRadius: 13, boxShadow: "0 2px 16px rgba(0,0,0,0.1)", marginBottom: 12 }} />
        <h1 style={{ color: COLORS.purple, fontWeight: 900, margin: 0 }}>Deva Data Entry App</h1>
        <p style={{ color: COLORS.blue, fontWeight: 600, marginTop: 6, fontSize: "1.1rem" }}>Corporate Student Information Portal</p>
      </div>

      {mode === "menu" && (
        <Card>
          <h2 style={{ color: COLORS.purple, marginBottom: 20 }}>Select an option</h2>
          <button onClick={() => { setMode("enter"); setSelectedCenter(""); setSelectedStudent(""); }} className="main-btn">Enter New Data</button>
          <button onClick={() => { setMode("view"); setSelectedCenter(""); }} className="main-btn">View Data Entered</button>
          <button onClick={() => { setMode("edit"); setSelectedCenter(""); }} className="main-btn">Edit Entries</button>
        </Card>
      )}

      {/* ENTER NEW DATA MODE */}
      {mode === "enter" && <>
        <Card>
          <button onClick={() => setMode("menu")} className="back-btn">← Back to Menu</button>
          <h2 style={{ color: COLORS.purple, marginBottom: 20 }}>Step 1: Select Center</h2>
          <select className="select-box" value={selectedCenter} onChange={e => setSelectedCenter(e.target.value)}>
            <option value="">--Select a center--</option>
            {centers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Card>
        {selectedCenter && <Card>
          <h2 style={{ color: COLORS.purple, marginBottom: 20 }}>Step 2: Select Student</h2>
          <select className="select-box" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
            <option value="">--Select a student--</option>
            {students.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Card>}
        {selectedStudent && <Card>
          <h2 style={{ color: COLORS.purple, marginBottom: 20 }}>Step 3: Enter Data</h2>
          <InfoBox
            center={selectedCenter}
            student={selectedStudent}
            agreementDate={studentData["Agreement Date"]}
            birthDate={studentData["Birth Date"]}
          />
          <form onSubmit={submitNewEntry}>
            <FormField id="field1" label="Field 1" value={fields.field1} onChange={e => setFields(s => ({ ...s, field1: e.target.value }))} />
            <FormField id="field2" label="Field 2" value={fields.field2} onChange={e => setFields(s => ({ ...s, field2: e.target.value }))} />
            <FormField id="field3" label="Field 3" value={fields.field3} onChange={e => setFields(s => ({ ...s, field3: e.target.value }))} />
            <FormField id="field4" label="Field 4" value={fields.field4} onChange={e => setFields(s => ({ ...s, field4: e.target.value }))} />
            <FormField id="field5" label="Field 5" value={fields.field5} onChange={e => setFields(s => ({ ...s, field5: e.target.value }))} />
            <button type="submit" disabled={submitting} className="main-btn">Submit Entry</button>
          </form>
        </Card>}
      </>}

      {/* VIEW DATA MODE */}
      {mode === "view" && <Card>
        <button onClick={() => setMode("menu")} className="back-btn">← Back to Menu</button>
        <h2 style={{ color: COLORS.purple, marginBottom: 20 }}>View Data Entered</h2>
        <select className="select-box" value={selectedCenter} onChange={e => setSelectedCenter(e.target.value)}>
          <option value="">--Select a center to view entries--</option>
          {centers.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {selectedCenter && <EntriesTable entries={entries} />}
      </Card>}

      {/* EDIT ENTRIES MODE */}
      {mode === "edit" && <>
        <Card>
          <button onClick={() => setMode("menu")} className="back-btn">← Back to Menu</button>
          <h2 style={{ color: COLORS.purple, marginBottom: 20 }}>Edit Entries</h2>
          <select className="select-box" value={selectedCenter} onChange={e => setSelectedCenter(e.target.value)}>
            <option value="">--Select a center to edit entries--</option>
            {centers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Card>
        {selectedCenter && !editingEntryId && (
          <Card>
            <EntriesTable
              entries={entries}
              onEditClick={startEditEntry} />
          </Card>
        )}
        {editingEntryId && (
          <Card>
            <h2 style={{ color: COLORS.purple, marginBottom: 20 }}>Editing Entry {editingEntryId}</h2>
            <FormField id="edit-field1" label="Field 1" value={editingFields.Field1} onChange={e => setEditingFields(f => ({ ...f, Field1: e.target.value }))} />
            <FormField id="edit-field2" label="Field 2" value={editingFields.Field2} onChange={e => setEditingFields(f => ({ ...f, Field2: e.target.value }))} />
            <FormField id="edit-field3" label="Field 3" value={editingFields.Field3} onChange={e => setEditingFields(f => ({ ...f, Field3: e.target.value }))} />
            <FormField id="edit-field4" label="Field 4" value={editingFields.Field4} onChange={e => setEditingFields(f => ({ ...f, Field4: e.target.value }))} />
            <FormField id="edit-field5" label="Field 5" value={editingFields.Field5} onChange={e => setEditingFields(f => ({ ...f, Field5: e.target.value }))} />
            <button onClick={saveEditedEntry} disabled={submitting} className="main-btn">Save Changes</button>
            <button onClick={() => setEditingEntryId(null)} className="back-btn">Cancel</button>
          </Card>
        )}
      </>}

      {/* Success popup */}
      {submitted && <div className="submitted-popup">✅ Entry Submitted!</div>}
    </div>
  );
}

export default App;
