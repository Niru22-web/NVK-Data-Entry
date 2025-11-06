import React, { useState, useEffect } from "react";
import "./app.css";

const USERS_URL   = "https://sheetdb.io/api/v1/g3j7bkgfvrz4q";
const CENTERS_URL = "https://sheetdb.io/api/v1/g3j7bkgfvrz4q";
const ENTRIES_URL = "https://sheetdb.io/api/v1/imirhe608ptj9";
const SHEET_LOG = "Data Entry Log"; // change if your tab name is different

function generateUID() {
  // Random 10-character string
  return Math.random().toString(36).substr(2, 10) + Date.now().toString().substr(-6);
}

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
          <th>UID</th>
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
          <tr key={entry.UID}>
            <td>{entry.UID}</td>
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

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginCenter, setLoginCenter] = useState("");
  const [mode, setMode] = useState("menu");
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentData, setStudentData] = useState({});
  const [fields, setFields] = useState({ field1: "", field2: "", field3: "", field4: "", field5: "" });
  const [entries, setEntries] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingFields, setEditingFields] = useState({ Field1: "", Field2: "", Field3: "", Field4: "", Field5: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const url = `${USERS_URL}/search?Username=${encodeURIComponent(loginUser)}&Password=${encodeURIComponent(loginPass)}&sheet=Users`;
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
        setLoginError("Multiple users found. Check for duplicate usernames.");
      } else {
        setLoginError("Invalid username or password.");
      }
    } catch (err) {
      setLoginError("Could not connect to login server or endpoint misconfiguration.");
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetch(CENTERS_URL)
        .then(res => res.json())
        .then(data => {
          const filtered = data.filter(row => row["Center Name"] === loginCenter);
          setStudents(filtered.map(row => row["Student Name"]));
        });
    }
  }, [isLoggedIn, loginCenter]);

  useEffect(() => {
    if (selectedStudent && loginCenter && isLoggedIn) {
      fetch(CENTERS_URL)
        .then(res => res.json())
        .then(data => {
          const studentRow = data.find(row =>
            row["Center Name"] === loginCenter && row["Student Name"] === selectedStudent
          );
          setStudentData(studentRow || {});
        });
    } else {
      setStudentData({});
    }
  }, [selectedStudent, loginCenter, isLoggedIn]);

  useEffect(() => {
    if ((mode === "view" || mode === "edit") && loginCenter && isLoggedIn) {
      fetch(`${ENTRIES_URL}?sheet=${encodeURIComponent(SHEET_LOG)}`)
        .then(res => res.json())
        .then(data => {
          const filtered = data
            .filter(e => e["Center Name"] === loginCenter)
            .reduce((acc, curr) => {
              const key = curr["Student Name"];
              acc[key] = !acc[key] || new Date(curr.Timestamp) > new Date(acc[key].Timestamp)
                ? curr
                : acc[key];
              return acc;
            }, {});
          setEntries(Object.values(filtered));
        })
        .catch(() => setEntries([]));
    } else if (mode === "view" || mode === "edit") {
      setEntries([]);
    }
  }, [loginCenter, mode, isLoggedIn]);

  const submitNewEntry = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const entry = {
      UID: generateUID(),
      Timestamp: new Date().toISOString(),
      "Center Name": loginCenter,
      "Student Name": selectedStudent,
      Field1: fields.field1,
      Field2: fields.field2,
      Field3: fields.field3,
      Field4: fields.field4,
      Field5: fields.field5,
    };
    try {
      const res = await fetch(`${ENTRIES_URL}?sheet=${encodeURIComponent(SHEET_LOG)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [entry] }),
      });
      if (res.ok) {
        setFields({ field1: "", field2: "", field3: "", field4: "", field5: "" });
        setSelectedStudent("");
        setStudentData({});
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

  const startEditEntry = (entry) => {
    setEditingEntry(entry);
    setEditingFields({
      Field1: entry.Field1 || "",
      Field2: entry.Field2 || "",
      Field3: entry.Field3 || "",
      Field4: entry.Field4 || "",
      Field5: entry.Field5 || ""
    });
    setSelectedStudent(entry["Student Name"]);
  };

  const saveEditedEntry = async () => {
    if (!editingEntry) return;
    setSubmitting(true);
    try {
      const updatedEntry = {
        UID: editingEntry.UID,
        Timestamp: new Date().toISOString(),
        "Center Name": loginCenter,
        "Student Name": selectedStudent,
        Field1: editingFields.Field1,
        Field2: editingFields.Field2,
        Field3: editingFields.Field3,
        Field4: editingFields.Field4,
        Field5: editingFields.Field5,
      };
      const addRes = await fetch(`${ENTRIES_URL}?sheet=${encodeURIComponent(SHEET_LOG)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [updatedEntry] }),
      });
      if (!addRes.ok) {
        alert("Failed to save entry.");
        setSubmitting(false);
        return;
      }
      alert("Entry updated successfully!");
      setEditingEntry(null);
    } catch (error) {
      alert("Error saving entry: " + error.message);
    }
    setSubmitting(false);
  };

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
            <button onClick={() => { setMode("enter"); setSelectedStudent(""); }} className="main-btn btn-animated">
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
        {mode === "enter" && <Card>
          <button onClick={() => setMode("menu")} className="back-btn">← Back to Menu</button>
          <h2 style={{ color: "#9D4BE6", marginBottom: 20 }}>Select Student</h2>
          <select className="select-box" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
            <option value="">--Select a student--</option>
            {students.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {selectedStudent && (
            <>
              <InfoBox
                center={loginCenter}
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
                <button type="submit" disabled={submitting} className="main-btn btn-animated">Submit Entry</button>
              </form>
            </>
          )}
        </Card>}

        {mode === "view" && <Card>
          <button onClick={() => setMode("menu")} className="back-btn">← Back to Menu</button>
          <h2 style={{ color: "#9D4BE6", marginBottom: 20 }}>View Data Entered</h2>
          <EntriesTable entries={entries} />
        </Card>}
        {mode === "edit" && <Card>
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
              <FormField id="edit-field1" label="Field 1" value={editingFields.Field1} onChange={e => setEditingFields(f => ({ ...f, Field1: e.target.value }))} />
              <FormField id="edit-field2" label="Field 2" value={editingFields.Field2} onChange={e => setEditingFields(f => ({ ...f, Field2: e.target.value }))} />
              <FormField id="edit-field3" label="Field 3" value={editingFields.Field3} onChange={e => setEditingFields(f => ({ ...f, Field3: e.target.value }))} />
              <FormField id="edit-field4" label="Field 4" value={editingFields.Field4} onChange={e => setEditingFields(f => ({ ...f, Field4: e.target.value }))} />
              <FormField id="edit-field5" label="Field 5" value={editingFields.Field5} onChange={e => setEditingFields(f => ({ ...f, Field5: e.target.value }))} />
              <button onClick={saveEditedEntry} disabled={submitting} className="main-btn btn-animated">Save Changes</button>
              <button onClick={() => setEditingEntry(null)} className="back-btn">Cancel</button>
            </>
          )}
        </Card>}
        {submitted && <div className="submitted-popup">✅ Entry Submitted!</div>}
      </div>
      <Footer />
    </>
  );
}
