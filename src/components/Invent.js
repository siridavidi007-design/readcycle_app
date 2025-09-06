import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Inventory({ chapterLocation }) {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    const fetchInventory = async () => {
      if (!chapterLocation) return;
      try {
        const q = query(
          collection(db, "books"),
          where("chapterLocation", "==", chapterLocation)
        );
        const querySnapshot = await getDocs(q);
        const bookList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBooks(bookList);
      } catch (error) {
        console.error("Error fetching inventory:", error);
      }
    };

    fetchInventory();
  }, [chapterLocation]);

  if (!books.length) {
    return <p>No books available in this chapter's inventory.</p>;
  }

  return (
    <div>
      <ul>
        {books.map((book) => (
          <li key={book.id}>
            <strong>{book.title}</strong> - {book.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
