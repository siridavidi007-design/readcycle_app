const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

/**
 * When a request is marked approved, set a dueDate (e.g., 14 days later)
 */
exports.onRequestApprovedSetDueDate = functions.firestore
  .document("requests/{requestId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== "approved" && after.status === "approved") {
      const now = admin.firestore.Timestamp.now();
      const dueMs = 14 * 24 * 60 * 60 * 1000; // 14 days
      const dueDate = admin.firestore.Timestamp.fromDate(new Date(Date.now() + dueMs));

      await change.after.ref.update({
        approvedAt: now,
        dueDate,
      });

      // Notify user
      await db.collection("notifications").add({
        userId: after.requestedBy,
        title: "Request approved",
        message: `Your request for "${after.bookTitle}" was approved. Due on ${new Date(dueDate.toMillis()).toLocaleDateString()}.`,
        link: `/my-requests`,
        read: false,
        createdAt: now,
      });
    }

    return null;
  });

/**
 * Daily job: create notifications for due tomorrow / overdue
 * Schedule: every day at 9am (change timezone as needed)
 */
exports.dailyDueReminders = functions.pubsub
  .schedule("every day 09:00")
  .timeZone("America/New_York")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Fetch approved requests with a dueDate
    const snap = await db.collection("requests").where("status", "==", "approved").get();

    const batch = db.batch();
    for (const docSnap of snap.docs) {
      const r = docSnap.data();
      if (!r.dueDate) continue;

      const dueMs = r.dueDate.toMillis();
      const diff = dueMs - Date.now();

      // Due tomorrow (between 24h and 48h away)
      if (diff <= 2 * oneDay && diff >= oneDay) {
        const nRef = db.collection("notifications").doc();
        batch.set(nRef, {
          userId: r.requestedBy,
          title: "Due tomorrow",
          message: `“${r.bookTitle}” is due tomorrow.`,
          link: "/my-requests",
          read: false,
          createdAt: now,
        });
      }

      // Overdue (past due)
      if (diff < 0) {
        const nRef = db.collection("notifications").doc();
        batch.set(nRef, {
          userId: r.requestedBy,
          title: "Overdue",
          message: `“${r.bookTitle}” is overdue. Please return it.`,
          link: "/my-requests",
          read: false,
          createdAt: now,
        });
      }
    }
    await batch.commit();
    return null;
  });

