import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

let ExpoClass = null;
let expo = null;

async function getExpo() {
  if (!ExpoClass) {
    const mod = await import("expo-server-sdk");
    ExpoClass = mod.Expo;
  }

  if (!expo) {
    expo = new ExpoClass({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
    });
  }

  return { Expo: ExpoClass, expo };
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Expo push notification server is running",
  });
});

app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

app.post("/send-push", async (req, res) => {
  try {
    const { Expo, expo } = await getExpo();
    const { to, title, body, data } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: "Missing Expo push token",
      });
    }

    if (!Expo.isExpoPushToken(to)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Expo push token",
      });
    }

    const messages = [
      {
        to,
        sound: "default",
        title: title || "New notification",
        body: body || "",
        data: data || {},
        priority: "high",
      },
    ];

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    return res.json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.error("Send push error:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

app.post("/send-many-push", async (req, res) => {
  try {
    const { Expo, expo } = await getExpo();
    const { notifications } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({
        success: false,
        error: "notifications must be a non-empty array",
      });
    }

    const messages = notifications
      .filter((item) => item?.to && Expo.isExpoPushToken(item.to))
      .map((item) => ({
        to: item.to,
        sound: "default",
        title: item.title || "New notification",
        body: item.body || "",
        data: item.data || {},
        priority: "high",
      }));

    if (messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid Expo push tokens found",
      });
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    return res.json({
      success: true,
      count: messages.length,
      tickets,
    });
  } catch (error) {
    console.error("Send many push error:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});

export default app;