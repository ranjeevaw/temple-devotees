
import { useEffect, useMemo, useState } from "react";
import {
  BookUser,
  Search,
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  X,
  LogOut,
} from "lucide-react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { db, auth } from "./firebase";
import "./App.css";

const emptyDevotee = {
  name: "",
  address: "",
  phone: "",
  email: "",
};

const devoteesCollection = collection(db, "templeDevotees");

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [devotees, setDevotees] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyDevotee);
  const [showForm, setShowForm] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
      },
      (err) => {
        setError(err.message);
        setAuthLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setDevotees([]);
      return;
    }

    let cancelled = false;

    async function loadDevotees() {
      setDataLoading(true);
      setError("");

      try {
        const devoteesQuery = query(
          devoteesCollection,
          orderBy("name")
        );
        const snapshot = await getDocs(devoteesQuery);

        if (!cancelled) {
          setDevotees(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }))
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(`Could not load devotees: ${err.message}`);
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadDevotees();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const filteredDevotees = useMemo(() => {
    const term = search.toLowerCase().trim();

    return devotees.filter((devotee) =>
      [devotee.name, devotee.address, devotee.phone, devotee.email]
        .some((value) =>
          String(value ?? "").toLowerCase().includes(term)
        )
    );
  }, [devotees, search]);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        loginEmail.trim(),
        loginPassword
      );
      setLoginPassword("");
    } catch (err) {
      setError(`Login failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setError("");
    setNotice("");

    try {
      await signOut(auth);
      setSearch("");
      setShowForm(false);
    } catch (err) {
      setError(`Could not sign out: ${err.message}`);
    }
  }

  function openAddForm() {
    setError("");
    setNotice("");
    setEditingId(null);
    setForm(emptyDevotee);
    setShowForm(true);
  }

  function openEditForm(devotee) {
    setError("");
    setNotice("");
    setEditingId(devotee.id);
    setForm({
      name: devotee.name ?? "",
      address: devotee.address ?? "",
      phone: devotee.phone ?? "",
      email: devotee.email ?? "",
    });
    setShowForm(true);
  }

  async function saveDevotee(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const record = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await updateDoc(doc(db, "templeDevotees", editingId), record);

        setDevotees((previous) =>
          previous.map((item) =>
            item.id === editingId ? { ...item, ...record } : item
          )
        );

        setNotice("Devotee updated successfully.");
      } else {
        const result = await addDoc(devoteesCollection, record);

        setDevotees((previous) =>
          [...previous, { id: result.id, ...record }].sort(
            (a, b) => a.name.localeCompare(b.name)
          )
        );

        setNotice("Devotee added successfully.");
      }

      setShowForm(false);
      setForm(emptyDevotee);
      setEditingId(null);
    } catch (err) {
      setError(`Could not save devotee: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteDevotee(devotee) {
    if (!window.confirm(`Delete ${devotee.name}?`)) return;

    setError("");
    setNotice("");

    try {
      await deleteDoc(doc(db, "templeDevotees", devotee.id));

      setDevotees((previous) =>
        previous.filter((item) => item.id !== devotee.id)
      );

      setNotice("Devotee deleted successfully.");
    } catch (err) {
      setError(`Could not delete devotee: ${err.message}`);
    }
  }

  if (authLoading) {
    return (
      <main className="app-shell">
        <div className="loading-screen">Checking administrator login...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-icon"><BookUser size={27} /></div>

<div>
  <h1>Temple Address Book</h1>
  <p>English Dhamma Organisation</p>
  <span className="admin-email">admin@edo.org</span>
</div>

          </div>
        </header>

        <section className="login-card">
          <div className="brand-icon"><BookUser size={27} /></div>
          <h2>Administrator login</h2>
          <p>Sign in to manage temple devotee contacts.</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleLogin}>
            <label>
              Email address
              <input
                type="email"
                required
                autoComplete="username"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="Administrator email"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Password"
              />
            </label>

            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><BookUser size={27} /></div>

<div>
  <h1>Temple Address Book</h1>
  <p>English Dhamma Organisation</p>
  <span className="admin-email">admin@edo.org</span>
</div>

        </div>

        <div className="user-menu">
          <span>{user.email}</span>
          <button className="secondary-button" onClick={handleLogout}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <section className="content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">COMMUNITY DIRECTORY</p>
            <h2>Devotees</h2>
            <p className="subtitle">
              Manage your temple community contact details.
            </p>
          </div>

          <button className="primary-button" onClick={openAddForm}>
            <Plus size={18} /> Add devotee
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {notice && <div className="success-message">{notice}</div>}

        <div className="stats-card">
          <div className="stats-icon"><BookUser size={23} /></div>
          <div>
            <p>Total devotees</p>
            <strong>{devotees.length}</strong>
          </div>
        </div>

        <section className="directory-card">
          <div className="directory-heading">
            <div>
              <h3>Contact directory</h3>
              <p>{filteredDevotees.length} contact(s)</p>
            </div>

            <label className="search-box">
              <Search size={18} />
              <input
                type="search"
                placeholder="Search name, phone, email..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>DEVOTEE</th>
                  <th>ADDRESS</th>
                  <th>CONTACT NUMBER</th>
                  <th>EMAIL ADDRESS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {filteredDevotees.map((devotee) => (
                  <tr key={devotee.id}>
                    <td className="name-cell">{devotee.name}</td>
                    <td><MapPin size={15} /> {devotee.address}</td>
                    <td>
                      <a href={`tel:${devotee.phone}`}>
                        <Phone size={15} /> {devotee.phone}
                      </a>
                    </td>
                    <td>
                      <a href={`mailto:${devotee.email}`}>
                        <Mail size={15} /> {devotee.email}
                      </a>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="icon-button"
                          aria-label={`Edit ${devotee.name}`}
                          onClick={() => openEditForm(devotee)}
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          className="icon-button delete-button"
                          aria-label={`Delete ${devotee.name}`}
                          onClick={() => deleteDevotee(devotee)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {dataLoading ? (
              <div className="empty-state">Loading devotees...</div>
            ) : filteredDevotees.length === 0 ? (
              <div className="empty-state">
                <BookUser size={40} />
                <h3>{search ? "No matching devotees" : "No devotees yet"}</h3>
                <p>
                  {search
                    ? "Try another search term."
                    : "Add your first devotee to get started."}
                </p>
                {!search && (
                  <button className="primary-button" onClick={openAddForm}>
                    <Plus size={18} /> Add first devotee
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </section>
      </section>

      {showForm && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-title"
          >
            <div className="modal-heading">
              <div>
                <h2 id="form-title">
                  {editingId !== null ? "Edit devotee" : "Add devotee"}
                </h2>
                <p>Enter the devotee's contact details.</p>
              </div>

              <button
                className="icon-button"
                aria-label="Close form"
                onClick={() => setShowForm(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveDevotee}>
              <label>
                Full name *
                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Enter full name"
                />
              </label>

              <label>
                Residential address *
                <textarea
                  required
                  rows={3}
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                  placeholder="Street, suburb, state and postcode"
                />
              </label>

              <label>
                Contact number *
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  placeholder="e.g. 04xx xxx xxx"
                />
              </label>

              <label>
                Email address *
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="name@example.com"
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? "Saving..." : "Save devotee"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

