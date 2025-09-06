import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { collection, getDocs, query, where, updateDoc, doc, arrayUnion } from "firebase/firestore";

export default function DonationOpportunities() {
  const { user, chapterLocation } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const q = query(collection(db, "donation_opportunities"), where("chapterLocation", "==", chapterLocation));
      const snap = await getDocs(q);
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (chapterLocation) load(); }, [chapterLocation]);

  const rsvp = async (id) => {
    if (!user) return alert("Please log in first.");
    await updateDoc(doc(db, "donation_opportunities", id), {
      volunteers: arrayUnion({ uid: user.uid, email: user.email })
    });
    alert("Thanks! We'll notify you with details.");
    await load();
  };

  if (loading) return <p>Loading opportunities...</p>;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1>Donation Opportunities</h1>
      {rows.length === 0 ? <p>No opportunities at the moment.</p> : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map(r => (
            <div key={r.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
              <h3>{r.title}</h3>
              <p>{r.description}</p>
              <p><strong>Deadline:</strong> {r.deadlineTs ? new Date(r.deadlineTs).toLocaleDateString() : "—"}</p>
              <p><strong>Needed Items:</strong> {r.neededItems || "—"}</p>
              <p><strong>Volunteers:</strong> {Array.isArray(r.volunteers) ? r.volunteers.length : 0}</p>
              <button onClick={() => rsvp(r.id)}>I can help</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
