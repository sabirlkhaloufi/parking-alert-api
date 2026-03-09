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
      from: `"Parking Alert " <khalloufisabir7@gmail.com>`,
      to: email,
      subject: "Verification Code",
      html: `
<div style="background:#f5f7fb; padding:40px 0; font-family:Arial, Helvetica, sans-serif;">
  
  <table width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">

        <table width="600" style="background:white; border-radius:12px; overflow:hidden; box-shadow:0 6px 25px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:#2563eb; padding:30px; text-align:center;">
              <img src="https://parking-alert-api.vercel.app/parking-alert-logo.png" alt="ParkingAlert" style="height:55px; margin-bottom:10px;">
              <h2 style="color:white; margin:0;">ParkingAlert</h2>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:40px; text-align:center;">

              <h2 style="margin-top:0; color:#1e293b;">
                Code de vérification
              </h2>

              <p style="color:#64748b; font-size:15px; line-height:1.6;">
                Utilisez le code ci-dessous pour vérifier votre adresse email
                et continuer à utiliser l'application ParkingAlert.
              </p>

              <!-- OTP -->
              <div style="margin:30px 0;">

                ${code.split("").map(n => `
                  <span style="
                    display:inline-block;
                    width:45px;
                    height:55px;
                    line-height:55px;
                    margin:5px;
                    font-size:24px;
                    font-weight:bold;
                    background:#f1f5f9;
                    border-radius:8px;
                    color:#2563eb;
                    text-align:center;
                    border:1px solid #e2e8f0;
                  ">
                    ${n}
                  </span>
                `).join("")}

              </div>

              <p style="font-size:14px; color:#64748b;">
                Ce code est valable pendant <strong>5 minutes</strong>.
              </p>

              <p style="font-size:13px; color:#94a3b8; margin-top:25px;">
                Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8fafc; padding:20px; text-align:center; font-size:13px; color:#94a3b8;">
              ParkingAlert – Simplifiez la communication entre conducteurs
              <br><br>
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