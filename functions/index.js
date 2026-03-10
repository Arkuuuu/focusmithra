/**
 * FocusMithra — Firebase Cloud Functions
 *
 * Sends FCM push notifications when:
 *  1. A new request is created           → notifies the assigned senior
 *  2. A request status changes           → notifies the original requester
 *  3. A request is reassigned            → notifies the new assignee
 *
 * SETUP:
 *  1. Install Firebase CLI:   npm install -g firebase-tools
 *  2. Login:                  firebase login
 *  3. Init functions:         firebase init functions (choose existing project: focusmithra-2794c)
 *  4. cd functions && npm install
 *  5. Deploy:                 firebase deploy --only functions
 */

const { onValueWritten } = require("firebase-functions/v2/database");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

/**
 * Safely encode a display name to the same key format used in the client.
 * Mirrors the client-side safeKey() function.
 */
const ENCODE_MAP = { ".": "·", "#": "＃", "$": "＄", "[": "［", "]": "］", "/": "／" };
function safeKey(name) {
  return String(name).replace(/[.#$[\]/]/g, (c) => ENCODE_MAP[c] || c);
}

/**
 * Look up all FCM tokens for a user account.
 * Supports both legacy single token (fcmToken) and per-device map (fcmTokens).
 */
async function getFcmTokens(userName) {
  if (!userName) return [];
  const key = safeKey(userName);
  const snap = await getDatabase().ref(`accounts/${key}`).get();
  if (!snap.exists()) return [];
  const acc = snap.val() || {};
  const tokens = new Set();
  if (acc.fcmToken && typeof acc.fcmToken === "string") tokens.add(acc.fcmToken);
  if (acc.fcmTokens && typeof acc.fcmTokens === "object") {
    Object.values(acc.fcmTokens).forEach((t) => {
      if (typeof t === "string" && t) tokens.add(t);
    });
  }
  return Array.from(tokens);
}

/**
 * Send a push notification to a specific user by their display name.
 */
async function sendPushToUser(userName, title, body, tag) {
  const tokens = await getFcmTokens(userName);
  if (!tokens.length) return; // user has no FCM token registered

  const message = {
    tokens,
    notification: { title, body },
    data: { tag: tag || "fm-notif" },
    android: {
      priority: "high",
      notification: {
        channelId: "focusmithra_alerts",
        sound: "default",
        priority: "high",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
    webpush: {
      headers: { Urgency: "high" },
      notification: {
        icon: "/icon-192.png",
        badge: "/icon-96.png",
        vibrate: [300, 100, 300, 100, 300],
        requireInteraction: true,
      },
    },
  };

  try {
    const result = await getMessaging().sendEachForMulticast(message);
    // Cleanup invalid/expired tokens from DB.
    if (result.failureCount > 0) {
      const key = safeKey(userName);
      const invalidTokens = new Set();
      result.responses.forEach((res, idx) => {
        if (res.success) return;
        const errCode = res.error && res.error.code ? res.error.code : "";
        if (
          errCode.includes("invalid-registration-token") ||
          errCode.includes("registration-token-not-registered")
        ) {
          invalidTokens.add(tokens[idx]);
        }
      });

      if (invalidTokens.size > 0) {
        const accSnap = await getDatabase().ref(`accounts/${key}`).get();
        if (accSnap.exists()) {
          const acc = accSnap.val() || {};
          const updates = {};
          if (typeof acc.fcmToken === "string" && invalidTokens.has(acc.fcmToken)) {
            updates.fcmToken = null;
          }
          if (acc.fcmTokens && typeof acc.fcmTokens === "object") {
            Object.entries(acc.fcmTokens).forEach(([devId, val]) => {
              if (typeof val === "string" && invalidTokens.has(val)) {
                updates[`fcmTokens/${devId}`] = null;
              }
            });
          }
          if (Object.keys(updates).length > 0) {
            await getDatabase().ref(`accounts/${key}`).update(updates);
          }
        }
      }
    }
  } catch (err) {
    console.warn(`FCM send failed for ${userName}:`, err.message);
  }
}

/**
 * Triggered whenever any request is created, updated, or deleted.
 * Compares before/after to determine what changed and who to notify.
 */
exports.onRequestChange = onValueWritten(
  { ref: "/requests/{reqId}", region: "asia-southeast1" },
  async (event) => {
    const before = event.data.before.val();
    const after = event.data.after.val();

    // Request deleted — no notification needed
    if (!after) return;

    // === NEW REQUEST CREATED ===
    if (!before && after) {
      const itemLabel =
        Array.isArray(after.items) && after.items.length
          ? after.items.join(", ")
          : after.item || "Stock Request";
      // Notify the assigned senior
      if (after.to && after.to !== after.by) {
        await sendPushToUser(
          after.to,
          "📦 New Stock Request",
          `"${itemLabel}" from ${after.by}`,
          `fm-new-${after.id}`
        );
      }
      return;
    }

    // === STATUS CHANGED ===
    if (before && after && before.status !== after.status) {
      const itemLabel =
        Array.isArray(after.items) && after.items.length
          ? after.items.join(", ")
          : after.item || "Stock Request";

      if (after.status === "accepted") {
        // Notify the worker who raised it
        await sendPushToUser(
          after.by,
          "👀 Request Accepted",
          `"${itemLabel}" accepted by ${after.acceptedBy || "senior"}`,
          `fm-accepted-${after.id}`
        );
      } else if (after.status === "completed") {
        // Notify the worker who raised it
        await sendPushToUser(
          after.by,
          "✅ Request Completed!",
          `"${itemLabel}" has been completed!`,
          `fm-completed-${after.id}`
        );
      }
      return;
    }

    // === REASSIGNED ===
    if (before && after && before.to !== after.to) {
      const itemLabel =
        Array.isArray(after.items) && after.items.length
          ? after.items.join(", ")
          : after.item || "Stock Request";
      // Notify the new assignee
      await sendPushToUser(
        after.to,
        "🔀 Request Reassigned to You",
        `"${itemLabel}" from ${after.by}`,
        `fm-reassign-${after.id}`
      );
    }
  }
);
