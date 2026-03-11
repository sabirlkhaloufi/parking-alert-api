import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";


const app = express();

app.use(express.static("public"));
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




app.post("/send-code", async (req, res) => {

  const { email, code } = req.body;

  try {

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "khalloufisabir7@gmail.com",
        pass: "vhvmnzibhvwxozpb",
      }
    });

    await transporter.sendMail({
      from: `"Parking Alert " <contact@parkingalert.com>`,
      to: email,
      subject: "Verification Code",
      html: `
<div style="background:#f5f7fb; padding:40px 0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="600" style="max-width:90%; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1);">
          <!-- HEADER -->
          <tr>
            <td style="padding:50px 30px; text-align:center; background:#ffffff; border-bottom:3px solid #2563eb;">
              <img src="https://parking-alert-api.vercel.app/parking-alert-logo.png" alt="ParkingAlert" style="height:80px; margin-bottom:15px; display:block;">
              <h1 style="color:#2563eb; margin:0; font-size:28px; font-weight:600; letter-spacing:-0.5px;">ParkingAlert</h1>
              <p style="color:#64748b; margin:8px 0 0 0; font-size:14px; font-weight:400;">Votre assistant de stationnement</p>
            </td>
          </tr>
          <!-- CONTENT -->
          <tr>
            <td style="padding:40px; text-align:center;">
              <p style="font-size:16px; color:#1e293b; margin:0 0 20px 0; font-weight:500;">Code de vérification</p>
              <p style="color:#475569; font-size:15px; line-height:1.6; margin:0 0 30px 0;">
                Utilisez le code ci-dessous pour vérifier votre adresse email et continuer à utiliser l'application ParkingAlert.
              </p>
              <!-- OTP -->
              <div style="margin:0 auto 30px auto; display:flex; justify-content:center; flex-wrap:wrap;">
                ${code.split("").map(n => `
                  <span style="
                    display:inline-block;
                    width:40px;
                    height:50px;
                    line-height:50px;
                    margin:4px;
                    font-size:22px;
                    font-weight:600;
                    background:#f1f5f9;
                    border-radius:6px;
                    color:#2563eb;
                    text-align:center;
                    border:1px solid #e2e8f0;
                  ">
                    ${n}
                  </span>
                `).join("")}
              </div>
              <p style="font-size:14px; color:#64748b; margin:0;">Ce code est valable pendant <strong>5 minutes</strong>.</p>
              <p style="font-size:13px; color:#94a3b8; margin:25px 0 0 0;">Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.</p>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="background:#f8fafc; padding:20px; text-align:center; font-size:13px; color:#94a3b8;">
              ParkingAlert – Simplifiez la communication entre conducteurs<br>
              © 2026 ParkingAlert
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
      `
    });

    res.json({ success: true });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Email not sent" });
  }

});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server is running on port " + (process.env.PORT || 3000));
});


export default app;