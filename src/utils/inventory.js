import { doc, getDoc, updateDoc } from "firebase/firestore";

export const approveRequestAndAdjustInventory = async (db, requestId) => {
  const requestRef = doc(db, "requests", requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) throw new Error("Request not found");

  const requestData = requestSnap.data();

  // Adjust inventory example
  if (requestData.bookId) {
    const bookRef = doc(db, "books", requestData.bookId);
    const bookSnap = await getDoc(bookRef);
    if (bookSnap.exists()) {
      const bookData = bookSnap.data();
      const updatedTests =
        (bookData.numberOfUnusedTests || 0) > 0
          ? bookData.numberOfUnusedTests - 1
          : 0;
      await updateDoc(bookRef, { numberOfUnusedTests: updatedTests });
    }
  }

  await updateDoc(requestRef, { status: "approved" });
};

export const rejectRequest = async (db, requestId) => {
  const requestRef = doc(db, "requests", requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) throw new Error("Request not found");

  await updateDoc(requestRef, { status: "rejected" });
};



