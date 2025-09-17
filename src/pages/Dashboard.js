// src/pages/Dashboard.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./cute-styles.css";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  onSnapshot,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { rejectRequest } from "../utils/inventory";
import Inventory from "../components/Invent";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user, role, chapterLocation, loading } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [donations, setDonations] = useState([]);
  const [events, setEvents] = useState([]);
  const [returnReminders, setReturnReminders] = useState([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [meetDate, setMeetDate] = useState("");
  const [meetTime, setMeetTime] = useState("");
  const [locationType, setLocationType] = useState("in-school");
  const [returnDate, setReturnDate] = useState("");

  // ========================= FIRESTORE FETCHES =========================

  // Requests
  useEffect(() => {
    if (loading) return;
    let q;
    if (role === "chapterLeader" && chapterLocation) {
      q = query(collection(db, "requests"), where("chapterLocation", "==", chapterLocation));
    } else if (role === "student" && user?.uid) {
      q = query(collection(db, "requests"), where("requestedBy", "==", user.uid));
    }
    if (!q) return;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (b?.timestamp?.seconds ?? 0) - (a?.timestamp?.seconds ?? 0));
        setRequests(rows);
        setLoadingRequests(false);
      },
      (error) => {
        console.error(error);
        setErrorMsg("Failed to load requests.");
        setLoadingRequests(false);
      }
    );

    return () => unsubscribe();
  }, [role, chapterLocation, user, loading]);

  // Donations
  useEffect(() => {
    if (loading || !user) return;
    let q;
    if (role === "student" && user?.email) {
      q = query(collection(db, "donations"), where("donatedByEmail", "==", user.email));
    } else if (role === "chapterLeader" && chapterLocation) {
      q = query(collection(db, "donations"), where("chapterLocation", "==", chapterLocation));
    }
    if (!q) return;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (b?.timestamp?.seconds ?? 0) - (a?.timestamp?.seconds ?? 0));
        setDonations(rows);
      },
      (error) => {
        console.error(error);
        setErrorMsg("Failed to load donations.");
      }
    );

    return () => unsubscribe();
  }, [role, chapterLocation, user, loading]);

  // Events
  useEffect(() => {
    if (loading || !chapterLocation) return;
    const q = query(collection(db, "events"), where("chapterLocation", "==", chapterLocation));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (b?.timestamp?.seconds ?? 0) - (a?.timestamp?.seconds ?? 0));
      setEvents(rows);
    });

    return () => unsubscribe();
  }, [chapterLocation, loading]);

  // ========================= STUDENT FEATURES =========================

  // Return reminders
  useEffect(() => {
    if (role !== "student") return;

    const today = new Date();
    const reminders = [];

    requests
      .filter((r) => r.status === "approved" && r.returnDate)
      .forEach((r) => {
        const due = new Date(r.returnDate);
        const daysDiff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 10 && daysDiff >= -30) {
          let urgency = "normal";
          let message = "";

          if (daysDiff > 0) {
            message = `📚 "${r.bookTitle}" due in ${daysDiff} day${daysDiff > 1 ? "s" : ""}`;
            if (daysDiff <= 5) urgency = "warning";
            if (daysDiff <= 1) urgency = "urgent";
          } else if (daysDiff === 0) {
            message = `📚 "${r.bookTitle}" is due TODAY!`;
            urgency = "urgent";
          } else {
            message = `⚠️ "${r.bookTitle}" is ${Math.abs(daysDiff)} day(s) overdue!`;
            urgency = "overdue";
          }

          reminders.push({ id: r.id, message, urgency, returnDate: r.returnDate });
        }
      });

    setReturnReminders(reminders);
  }, [requests, role]);

  // ========================= LEADER FEATURES =========================

  // Open approval modal
  const openApprovalModal = (req) => {
    setSelectedRequest(req);
    const defaultReturnDate = new Date();
    defaultReturnDate.setDate(defaultReturnDate.getDate() + 30);
    setReturnDate(defaultReturnDate.toISOString().split("T")[0]);
    setShowModal(true);
  };

  // Approve request/donation
  const confirmApproval = async () => {
    if (!selectedRequest || !returnDate) return;
    try {
      setBusyId(selectedRequest.id);

      const collectionName = selectedRequest.donorName ? "donations" : "requests";
      const ref = doc(db, collectionName, selectedRequest.id);

      await updateDoc(ref, {
        status: "approved",
        meetingDate: meetDate,
        meetingTime: meetTime,
        meetingLocationType: locationType,
        returnDate: returnDate,
      });

      if (collectionName === "donations") {
        await addDoc(collection(db, "books"), {
          title: selectedRequest.bookTitle,
          author: selectedRequest.author,
          isbn: selectedRequest.isbn || "",
          condition: selectedRequest.condition,
          description: selectedRequest.description || "",
          unusedTests: selectedRequest.unusedTests || "",
          publishingCompany: selectedRequest.publishingCompany || "",
          donorName: selectedRequest.donorName || "",
          donorPhone: selectedRequest.donorPhone || "",
          chapterLocation: selectedRequest.chapterLocation,
          donatedBy: selectedRequest.donatedByEmail,
          status: "available",
          returnDate: returnDate,
          timestamp: new Date(),
        });
      } else {
        if (selectedRequest.bookId) {
          const bookRef = doc(db, "books", selectedRequest.bookId);
          await updateDoc(bookRef, {
            status: "borrowed",
            currentBorrower: selectedRequest.requestedBy,
            borrowedDate: new Date(),
            returnDate: returnDate,
          });
        }
      }

      setShowModal(false);
    } catch (e) {
      console.error("Approval error:", e);
      setErrorMsg("Approval failed.");
    } finally {
      setBusyId(null);
    }
  };

  // Reject request
  const handleReject = async (id) => {
    try {
      setBusyId(id);
      await rejectRequest(db, id);
    } catch (e) {
      console.error(e);
      setErrorMsg("Rejection failed.");
    } finally {
      setBusyId(null);
    }
  };

  // Clear old items
  const clearOldItems = async () => {
    try {
      const now = new Date();
      for (const r of requests) {
        const ref = doc(db, "requests", r.id);
        if (
          role === "student" &&
          (r.status === "approved" || r.status === "returned") &&
          r.meetingDate &&
          new Date(`${r.meetingDate}T${r.meetingTime}`) < now
        ) {
          await deleteDoc(ref);
        }
        if (
          role === "chapterLeader" &&
          (r.status === "approved" || r.status === "rejected" || r.status === "returned")
        ) {
          await deleteDoc(ref);
        }
      }
    } catch (e) {
      console.error("Failed to clear items:", e);
      setErrorMsg("Failed to clear old items.");
    }
  };

  // ========================= RENDER =========================

  if (loading) return <h2>Loading...</h2>;
  if (!user) return <h2>Please log in to view your dashboard.</h2>;

  // STUDENT DASHBOARD
  if (role === "student") {
    return (
      <div className="container">
        <h1>Student Dashboard</h1>
        <p><strong>Chapter Location:</strong> {chapterLocation || "Not specified"}</p>

        {/* Tools */}
        <div className="card">
          <h2>Student Tools</h2>
          <ul>
            <li><Link to="/books">Browse Books</Link></li>
            <li><Link to="/my-requests">My Requests</Link></li>
            <li><Link to="/donate">Donate a Book</Link></li>
          </ul>
        </div>

        {/* Return Reminders */}
        {returnReminders.length > 0 && (
          <div className="card">
            <h2>📚 Book Return Reminders</h2>
            <ul>
              {returnReminders.map((r) => (
                <li key={r.id}>
                  {r.message}
                  <br />
                  <small>Due: {new Date(r.returnDate).toLocaleDateString()}</small>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notifications */}
        <div className="card">
          <h2>Notifications</h2>
          <button onClick={clearOldItems}>Clear Old Notifications</button>
          {requests.filter((r) => r.status === "approved").length === 0 ? (
            <p>No pickup notifications.</p>
          ) : (
            <ul>
              {requests.filter((r) => r.status === "approved").map((r) => (
                <li key={r.id}>
                  <strong>{r.bookTitle}</strong> ready for pickup!
                  <br />
                  {r.meetingDate} at {r.meetingTime} ({r.meetingLocationType})
                  {r.returnDate && <><br />Return by: {new Date(r.returnDate).toLocaleDateString()}</>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* My Donations */}
        <div className="card">
          <h2>My Donations</h2>
          {donations.length === 0 ? <p>No donations yet.</p> : (
            <ul>
              {donations.map((d) => (
                <li key={d.id}>
                  <strong>{d.bookTitle}</strong> — {d.status || "pending"}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Events */}
        <div className="card">
          <h2>Chapter Events</h2>
          {events.length === 0 ? <p>No upcoming events.</p> : (
            <ul>
              {events.map((e) => (
                <li key={e.id}>
                  <strong>{e.title}</strong><br />
                  {e.description}<br />
                  {e.date} — {e.location}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // LEADER DASHBOARD
  if (role === "chapterLeader") {
    return (
      <div className="container">
        <h1>Chapter Leader Dashboard</h1>
        <p><strong>Chapter Location:</strong> {chapterLocation || "Not specified"}</p>

        {/* Requests */}
        <div className="card">
          <h2>Chapter Requests</h2>
          <button onClick={clearOldItems}>Clear Resolved Requests</button>
          {loadingRequests ? <p>Loading...</p> : (
            <table className="table">
              <thead><tr><th>Book</th><th>Requester</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.bookTitle}</td>
                    <td>{r.requestedByName} ({r.requestedByEmail})</td>
                    <td>{r.status}</td>
                    <td>
                      {r.status === "pending" && (
                        <>
                          <button onClick={() => openApprovalModal(r)}>Approve</button>
                          <button onClick={() => handleReject(r.id)}>Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Donations */}
        <div className="card">
          <h2>Donation Requests</h2>
          {donations.length === 0 ? <p>No donation requests yet.</p> : (
            <table className="table">
              <thead><tr><th>Book</th><th>Donor</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.id}>
                    <td>{d.bookTitle}</td>
                    <td>{d.donorName} ({d.donatedByEmail})</td>
                    <td>{d.status}</td>
                    <td>
                      {d.status === "pending" && (
                        <>
                          <button onClick={() => openApprovalModal(d)}>Approve</button>
                          <button onClick={() => handleReject(d.id)}>Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Inventory */}
        <div className="card">
          <h2>Chapter Inventory</h2>
          <Inventory chapterLocation={chapterLocation} />
          <ul>
            <li><Link to="/edit-catalog">Edit Book Catalog</Link></li>
            <li><Link to="/create-event">Create Event</Link></li>
          </ul>
        </div>

        {/* Events */}
        <div className="card">
          <h2>Chapter Events</h2>
          {events.length === 0 ? <p>No upcoming events.</p> : (
            <ul>
              {events.map((e) => (
                <li key={e.id}>
                  <strong>{e.title}</strong><br />
                  {e.description}<br />
                  {e.date} — {e.location}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal">
            <div className="modal-content">
              <h3>Set Meeting & Return</h3>
              <input type="date" value={meetDate} onChange={(e) => setMeetDate(e.target.value)} />
              <input type="time" value={meetTime} onChange={(e) => setMeetTime(e.target.value)} />
              <select value={locationType} onChange={(e) => setLocationType(e.target.value)}>
                <option value="in-school">In School</option>
                <option value="outside-school">Outside School</option>
              </select>
              <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              <button onClick={confirmApproval}>Confirm</button>
              <button onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }
}

