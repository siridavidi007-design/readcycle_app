import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [chapterLocation, setChapterLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // 🔹 Updated collection name from "users" → "user"
          const userDocRef = doc(db, "user", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setRole(data.role || null);
            setChapterLocation(data.chapterLocation || null);
          } else {
            console.warn("User document not found in Firestore");
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
        }
      } else {
        setRole(null);
        setChapterLocation(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, chapterLocation, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

