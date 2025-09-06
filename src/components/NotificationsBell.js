import React, { useEffect, useState, useRef } from "react";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function NotificationsBell() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const unreadCount = notes.filter(n => !n.read).length;

  const markAllRead = async () => {
    await Promise.all(
      notes.filter(n => !n.read).map(n => updateDoc(doc(db, "notifications", n.id), { read: true }))
    );
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ position: "relative" }}>
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -6, right: -6, background: "red",
            color: "white", borderRadius: 12, padding: "0 6px", fontSize: 12
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "120%", width: 360,
          background: "white", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 1000
        }}>
          <div style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
            <strong>Notifications</strong>
            <button onClick={markAllRead} style={{ fontSize: 12 }}>Mark all read</button>
          </div>
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            {notes.length === 0 ? (
              <p style={{ padding: 12, color: "#666" }}>No notifications yet.</p>
            ) : notes.map(n => (
              <div key={n.id} style={{ padding: 12, borderBottom: "1px solid #f2f2f2", background: n.read ? "#fff" : "#f8fbff" }}>
                <div style={{ fontWeight: 600 }}>{n.title}</div>
                <div style={{ fontSize: 14, color: "#555" }}>{n.message}</div>
                {n.link && (
                  <div style={{ marginTop: 6 }}>
                    <Link to={n.link} onClick={() => setOpen(false)} style={{ fontSize: 13 }}>Open</Link>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                  {n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleString() : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
