import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import './cute-styles.css';
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
  getDocs
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

  // Fetch requests live
  useEffect(() => {
    if (loading) return;

    let q;
    if (role === "chapterLeader" && chapterLocation) {
      q = query(
        collection(db, "requests"),
        where("chapterLocation", "==", chapterLocation)
      );
    } else if (role === "student" && user?.uid) {
      q = query(
        collection(db, "requests"),
        where("requestedBy", "==", user.uid)
      );
    }

    if (!q) return;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort(
          (a, b) => (b?.timestamp?.seconds ?? 0) - (a?.timestamp?.seconds ?? 0)
        );
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

  // Generate return date reminders for students
  useEffect(() => {
    if (role === "student") {
      const approvedRequests = requests.filter(r => r.status === "approved" && r.returnDate);
      const today = new Date();
      const reminders = [];

      approvedRequests.forEach(request => {
        const returnDate = new Date(request.returnDate);
        const daysDiff = Math.ceil((returnDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 10 && daysDiff >= -30) { // Show reminders from 10 days before to 30 days overdue
          let message = "";
          let urgency = "normal";
          
          if (daysDiff > 0) {
            message = `📚 "${request.bookTitle}" is due back in ${daysDiff} day${daysDiff > 1 ? 's' : ''}`;
            if (daysDiff <= 5) urgency = "warning";
            if (daysDiff <= 1) urgency = "urgent";
          } else if (daysDiff === 0) {
            message = `📚 "${request.bookTitle}" is due back TODAY!`;
            urgency = "urgent";
          } else {
            const daysOverdue = Math.abs(daysDiff);
            message = `⚠️ "${request.bookTitle}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue!`;
            urgency = "overdue";
          }
          
          reminders.push({
            id: request.id,
            message,
            urgency,
            bookTitle: request.bookTitle,
            returnDate: request.returnDate,
            daysDiff
          });
        }
      });

      setReturnReminders(reminders);
    }
  }, [requests, role]);

  // Fetch Donations
  useEffect(() => {
    if (loading || !user) return;

    let q;
    if (role === "student" && user?.email) {
      q = query(
        collection(db, "donations"),
        where("donatedByEmail", "==", user.email)
      );
    } else if (role === "chapterLeader" && chapterLocation) {
      q = query(
        collection(db, "donations"),
        where("chapterLocation", "==", chapterLocation)
      );
    }

    if (!q) return;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort(
          (a, b) => (b?.timestamp?.seconds ?? 0) - (a?.timestamp?.seconds ?? 0)
        );
        setDonations(rows);
      },
      (error) => {
        console.error(error);
        setErrorMsg("Failed to load donations.");
      }
    );

    return () => unsubscribe();
  }, [role, chapterLocation, user, loading]);

  // Fetch Events
  useEffect(() => {
    if (loading || !chapterLocation) return;

    const q = query(
      collection(db, "events"),
      where("chapterLocation", "==", chapterLocation)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (b?.timestamp?.seconds ?? 0) - (a?.timestamp?.seconds ?? 0));
      setEvents(rows);
    });

    return () => unsubscribe();
  }, [chapterLocation, loading]);

  // Open approval modal with return date
  const openApprovalModal = (req) => {
    setSelectedRequest(req);
    
    // Set default return date (30 days from now)
    const defaultReturnDate = new Date();
    defaultReturnDate.setDate(defaultReturnDate.getDate() + 30);
    setReturnDate(defaultReturnDate.toISOString().split('T')[0]);
    
    setShowModal(true);
  };

  // Mark book as returned
  const handleBookReturned = async (requestId, bookId) => {
    try {
      setBusyId(requestId);
      
      // Update request status to "returned"
      const requestRef = doc(db, "requests", requestId);
      await updateDoc(requestRef, {
        status: "returned",
        returnedDate: new Date()
      });

      // Add book back to inventory as available
      if (bookId) {
        const bookRef = doc(db, "books", bookId);
        await updateDoc(bookRef, {
          status: "available",
          currentBorrower: null,
          borrowedDate: null,
          returnDate: null
        });
      }

      setErrorMsg("");
    } catch (e) {
      console.error("Return error:", e);
      setErrorMsg("Failed to mark book as returned.");
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

      setRequests((prev) =>
        prev.filter((r) => {
          if (role === "student") {
            return !(
              (r.status === "approved" || r.status === "returned") &&
              r.meetingDate &&
              new Date(`${r.meetingDate}T${r.meetingTime}`) < new Date()
            );
          }
          if (role === "chapterLeader") {
            return r.status === "pending";
          }
          return true;
        })
      );
    } catch (e) {
      console.error("Failed to clear items:", e);
      setErrorMsg("Failed to clear old items.");
    }
  };

  // Confirm approval with return date
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
        // Update book status to "borrowed"
        if (selectedRequest.bookId) {
          const bookRef = doc(db, "books", selectedRequest.bookId);
          await updateDoc(bookRef, {
            status: "borrowed",
            currentBorrower: selectedRequest.requestedBy,
            borrowedDate: new Date(),
            returnDate: returnDate
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
      setErrorMsg("");
      await rejectRequest(db, id);
    } catch (e) {
      console.error(e);
      setErrorMsg("Rejection failed.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <h2>Loading...</h2>;
  if (!user) return <h2>Please log in to view your dashboard.</h2>;

  return (
    <div className="container">
      <h1>Dashboard</h1>
      <p><strong>Chapter Location:</strong> {chapterLocation || "Not specified"}</p>

      {/* Student Dashboard */}
      {role === "student" && (
        <>
          <div className="card">
            <h2>Student Tools</h2>
            <ul>
              <li><Link to="/books">Browse Books</Link></li>
              <li><Link to="/my-requests">My Requests</Link></li>
              <li><Link to="/donate">Donate a Book</Link></li>
            </ul>
          </div>

          {/* Return Date Reminders */}
          {returnReminders.length > 0 && (
            <div className="card">
              <h2>📚 Book Return Reminders</h2>
              <ul>
                {returnReminders.map((reminder) => (
                  <li 
                    key={reminder.id} 
                    style={{ 
                      marginBottom: 15,
                      padding: 10,
                      borderLeft: `4px solid ${
                        reminder.urgency === 'overdue' ? '#dc3545' :
                        reminder.urgency === 'urgent' ? '#fd7e14' :
                        reminder.urgency === 'warning' ? '#ffc107' : '#28a745'
                      }`,
                      backgroundColor: reminder.urgency === 'overdue' ? '#f8d7da' : 
                        reminder.urgency === 'urgent' ? '#fff3cd' : '#f8f9fa'
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{reminder.message}</div>
                    <small>Due: {new Date(reminder.returnDate).toLocaleDateString()}</small>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notifications */}
          <div className="card">
            <h2>Notifications</h2>
            <button className="btn btn-secondary" onClick={clearOldItems}>
              Clear Old Notifications
            </button>
            
            {/* Book Pickup Notifications */}
            {requests.filter((r) => r.status === "approved").length === 0 ? (
              <p>No pickup notifications.</p>
            ) : (
              <div style={{ marginTop: 20 }}>
                <h3>Books Ready for Pickup</h3>
                <ul>
                  {requests
                    .filter((r) => r.status === "approved")
                    .map((r) => (
                      <li key={r.id}>
                        <strong>{r.bookTitle}</strong> ready for pickup!
                        <br />
                        Meeting: {r.meetingDate} at {r.meetingTime}
                        <br />
                        Location: {r.meetingLocationType}
                        {r.returnDate && (
                          <>
                            <br />
                            <span style={{ color: '#ff6b6b' }}>
                              Return by: {new Date(r.returnDate).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>

          {/* My Donations */}
          <div className="card">
            <h2>My Donations</h2>
            {donations.length === 0 ? (
              <p>No donations yet.</p>
            ) : (
              <ul>
                {donations.map((d) => (
                  <li key={d.id} style={{ marginBottom: 12 }}>
                    <strong>{d.bookTitle}</strong> — {d.status || "pending"}
                    <br />
                    {d.status === "approved" && (
                      <>
                        Meet on <strong>{d.meetingDate || "(no date)"}</strong> at{" "}
                        <strong>{d.meetingTime || "(no time)"}</strong>
                        <br />
                        Location: <em>{d.meetingLocationType || "(no location)"}</em>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Chapter Events */}
          <div className="card">
            <h2>Chapter Events</h2>
            {events.length === 0 ? (
              <p>No upcoming events.</p>
            ) : (
              <ul>
                {events.map((e) => (
                  <li key={e.id} style={{ marginBottom: 12 }}>
                    <strong>{e.title}</strong>
                    <br />
                    {e.description}
                    <br />
                    Date: <strong>{e.date}</strong>
                    <br />
                    Location: <em>{e.location}</em>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Chapter Leader Dashboard */}
      {role === "chapterLeader" && (
        <>
          <div className="card">
            <h2>Chapter Requests</h2>
            <button className="btn btn-secondary" onClick={clearOldItems}>
              Clear Resolved Requests
            </button>
            {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
            {loadingRequests ? (
              <p>Loading requests...</p>
            ) : requests.length === 0 ? (
              <p>No requests for your chapter.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Book</th>
                      <th>Requester</th>
                      <th>Status</th>
                      <th>Return Date</th>
                      <th>Requested At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id}>
                        <td>{r.bookTitle}</td>
                        <td>{r.requestedByName} ({r.requestedByEmail})</td>
                        <td>
                          <span className={`status-${r.status || 'pending'}`}>
                            {r.status || "pending"}
                          </span>
                        </td>
                        <td>
                          {r.returnDate ? new Date(r.returnDate).toLocaleDateString() : "-"}
                        </td>
                        <td>{r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleDateString() : "-"}</td>
                        <td>
                          {r.status === "pending" ? (
                            <>
                              <button 
                                className="btn btn-primary" 
                                onClick={() => openApprovalModal(r)} 
                                disabled={busyId === r.id}
                                style={{ marginRight: 8 }}
                              >
                                Approve
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                onClick={() => handleReject(r.id)} 
                                disabled={busyId === r.id}
                              >
                                Reject
                              </button>
                            </>
                          ) : r.status === "approved" ? (
                            <button 
                              className="btn btn-primary"
                              onClick={() => handleBookReturned(r.id, r.bookId)} 
                              disabled={busyId === r.id}
                              style={{ backgroundColor: "#28a745", borderColor: "#28a745" }}
                            >
                              {busyId === r.id ? "Processing..." : "Mark Returned"}
                            </button>
                          ) : (
                            <em>—</em>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Donation Requests */}
          <div className="card">
            <h2>Donation Requests</h2>
            {donations.length === 0 ? (
              <p>No donation requests yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Book</th>
                      <th>Donor</th>
                      <th>Status</th>
                      <th>Return Date</th>
                      <th>Donated At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d) => (
                      <tr key={d.id}>
                        <td>{d.bookTitle}</td>
                        <td>{d.donorName} ({d.donatedByEmail})</td>
                        <td>
                          <span className={`status-${d.status || 'pending'}`}>
                            {d.status || "pending"}
                          </span>
                        </td>
                        <td>
                          {d.returnDate ? new Date(d.returnDate).toLocaleDateString() : "-"}
                        </td>
                        <td>{d.timestamp?.seconds ? new Date(d.timestamp.seconds * 1000).toLocaleDateString() : "-"}</td>
                        <td>
                          {d.status === "pending" ? (
                            <>
                              <button 
                                className="btn btn-primary" 
                                onClick={() => openApprovalModal(d)} 
                                disabled={busyId === d.id}
                                style={{ marginRight: 8 }}
                              >
                                Approve
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                onClick={() => handleReject(d.id)} 
                                disabled={busyId === d.id}
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <em>—</em>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Chapter Inventory */}
          <div className="card">
            <h2>Chapter Inventory</h2>
            <Inventory chapterLocation={chapterLocation} />
            <ul style={{ marginTop: 20 }}>
              <li><Link to="/edit-catalog">Edit Book Catalog</Link></li>
              <li><Link to="/create-event">Create Event</Link></li>
            </ul>
          </div>

          {/* Chapter Events */}
          <div className="card">
            <h2>Chapter Events</h2>
            {events.length === 0 ? (
              <p>No upcoming events.</p>
            ) : (
              <ul>
                {events.map((e) => (
                  <li key={e.id} style={{ marginBottom: 12 }}>
                    <strong>{e.title}</strong>
                    <br />
                    {e.description}
                    <br />
                    Date: <strong>{e.date}</strong>
                    <br />
                    Location: <em>{e.location}</em>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Enhanced Modal with Return Date */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Set Meeting & Return Details</h3>
            <div style={{ marginBottom: 15 }}>
              <label>Meeting Date:</label>
              <input
                type="date"
                value={meetDate}
                onChange={(e) => setMeetDate(e.target.value)}
                required
                style={{ width: "100%", marginTop: 5, padding: 8 }}
              />
            </div>
            <div style={{ marginBottom: 15 }}>
              <label>Meeting Time:</label>
              <input
                type="time"
                value={meetTime}
                onChange={(e) => setMeetTime(e.target.value)}
                required
                style={{ width: "100%", marginTop: 5, padding: 8 }}
              />
            </div>
            <div style={{ marginBottom: 15 }}>
              <label>Meeting Location:</label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
                required
                style={{ width: "100%", marginTop: 5, padding: 8 }}
              >
                <option value="in-school">In School</option>
                <option value="outside-school">Outside School</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label>Return Date (Required):</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
                style={{ width: "100%", marginTop: 5, padding: 8 }}
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                Students will receive return reminders automatically
              </small>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowModal(false)}
                style={{ marginRight: 10 }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={confirmApproval}
                disabled={!meetDate || !meetTime || !returnDate}
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
