import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function ManageDonations() {
  const { user, role, chapterLocation, loading } = useAuth();
  const [donations, setDonations] = useState([]);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [meetDate, setMeetDate] = useState("");
  const [meetTime, setMeetTime] = useState("");
  const [locationType, setLocationType] = useState("in-school");
  const [busyId, setBusyId] = useState(null);

  // fetch donations in real-time
  useEffect(() => {
    if (loading || role !== "chapterLeader" || !chapterLocation) return;

    const q = query(
      collection(db, "donations"),
      where("chapterLocation", "==", chapterLocation)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort(
        (a, b) => (b?.timestamp?.seconds ?? 0) - (a?.timestamp?.seconds ?? 0)
      );
      setDonations(rows);
    });

    return () => unsubscribe();
  }, [role, chapterLocation, loading]);

  const openApprovalModal = (donation) => {
    setSelectedDonation(donation);
    setShowModal(true);
  };

  const confirmApproval = async () => {
    if (!selectedDonation) return;
    try {
      setBusyId(selectedDonation.id);
      const ref = doc(db, "donations", selectedDonation.id);
      await updateDoc(ref, {
        status: "approved",
        meetingDate: meetDate,
        meetingTime: meetTime,
        meetingLocationType: locationType,
      });
      setShowModal(false);
    } catch (e) {
      console.error("Approval failed:", e);
    } finally {
      setBusyId(null);
    }
  };

  const rejectDonation = async (id) => {
    try {
      setBusyId(id);
      const ref = doc(db, "donations", id);
      await updateDoc(ref, { status: "rejected" });
    } catch (e) {
      console.error("Rejection failed:", e);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <h2>Loading...</h2>;
  if (role !== "chapterLeader") return <h2>Access denied.</h2>;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1>📦 Manage Donations</h1>

      {donations.length === 0 ? (
        <p>No donation requests yet.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>Book</th>
              <th>Author</th>
              <th>Condition</th>
              <th>Description</th>
              <th>Donor</th>
              <th>Status</th>
              <th>Requested At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.id}>
                <td>{d.bookTitle}</td>
                <td>{d.author}</td>
                <td>{d.condition}</td>
                <td>{d.description}</td>
                <td>{d.donatedByName} ({d.donatedByEmail})</td>
                <td>{d.status || "pending"}</td>
                <td>
                  {d.timestamp?.seconds
                    ? new Date(d.timestamp.seconds * 1000).toLocaleString()
                    : "-"}
                </td>
                <td>
                  {d.status === "pending" ? (
                    <>
                      <button onClick={() => openApprovalModal(d)} disabled={busyId === d.id}>
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => rejectDonation(d.id)}
                        disabled={busyId === d.id}
                        style={{ marginLeft: 8 }}
                      >
                        ❌ Reject
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
      )}

      {/* Modal for meeting details */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 8,
              width: 400,
            }}
          >
            <h3>Set Meeting Details</h3>
            <label>Date:</label>
            <input type="date" value={meetDate} onChange={(e) => setMeetDate(e.target.value)} />
            <br />
            <label>Time:</label>
            <input type="time" value={meetTime} onChange={(e) => setMeetTime(e.target.value)} />
            <br />
            <label>Location:</label>
            <select value={locationType} onChange={(e) => setLocationType(e.target.value)}>
              <option value="in-school">In School</option>
              <option value="outside-school">Outside School</option>
            </select>
            <br />
            <br />
            <button onClick={confirmApproval}>Confirm</button>
            <button onClick={() => setShowModal(false)} style={{ marginLeft: 10 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
