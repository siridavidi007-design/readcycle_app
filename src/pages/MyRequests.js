import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function MyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchRequests = async () => {
      try {
        const q = query(collection(db, "requests"), where("requestedBy", "==", user.uid));
        const snap = await getDocs(q);
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => (b?.timestamp?.seconds ?? 0) - (a?.timestamp?.seconds ?? 0));
        setRequests(rows);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [user]);

  if (!user) return <h2>Please log in to see your requests.</h2>;
  if (loading) return <p>Loading requests...</p>;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1>📩 My Requests</h1>
      {requests.length === 0 ? (
        <p>No requests yet.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>Book</th>
              <th>Status</th>
              <th>Requested At</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.bookTitle}</td>
                <td>{r.status || "pending"}</td>
                <td>
                  {r.timestamp?.seconds
                    ? new Date(r.timestamp.seconds * 1000).toLocaleString()
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
