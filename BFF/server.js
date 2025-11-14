import express, { json } from "express";
import { randomBytes, createHash } from "crypto";
import axios from "axios";
import cookieParser from "cookie-parser";
import { stringify } from "qs";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cookieParser());
app.use(json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const REDIRECT_URI = process.env.REDIRECT_URI;
const SN_INTANCE = process.env.SN_INTANCE;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;


if (!SN_INTANCE || !CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error("ERROR: Missing required environment variables!");
  console.error("Required: SN_INTANCE, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI");
  console.error("Current values:", {
    SN_INTANCE: SN_INTANCE ? "✓ Set" : "✗ Missing",
    CLIENT_ID: CLIENT_ID ? "✓ Set" : "✗ Missing",
    CLIENT_SECRET: CLIENT_SECRET ? "✓ Set" : "✗ Missing",
    REDIRECT_URI: REDIRECT_URI ? "✓ Set" : "✗ Missing"
  });
}

const authEndpoint = `${SN_INTANCE}/oauth_auth.do`;
const tokenEndpoint = `${SN_INTANCE}/oauth_token.do`;


const tokenStore = new Map();

function base64url(buf) {
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

app.get("/auth/login", (req, res) => {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  const state = base64url(randomBytes(16));
  const sessionId = base64url(randomBytes(24));

  tokenStore.set(sessionId, {
    code_verifier: verifier,
    state: state,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  res.cookie("sid", sessionId, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: Date.now() + 15 * 60 * 1000,
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: state,
  });

  res.redirect(`${authEndpoint}?${params.toString()}`);
});

app.get("/auth/callback", async (req, res) => {
  const { code, state } = req.query;
  const sid = req.cookies.sid;
  const session = tokenStore.get(sid);

  if (!session) return res.status(400).send("Bad session");
  if (session.state !== state) return res.status(400).send("State Mismatch");

  const data = {
    grant_type: "authorization_code",
    code: code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: session.code_verifier,
    client_secret: CLIENT_SECRET,
  };

  const resp = await axios.post(tokenEndpoint, stringify(data), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  tokenStore.set(sid, { ...session, ...resp.data, obtained_at: Date.now() });
  res.redirect("http://localhost:5173/");
});

app.get("/auth/status", (req, res) => {
  const sid = req.cookies.sid;
  const session = tokenStore.get(sid);
  if (!session || !session.access_token)
    return res.json({ authenticated: false });
  return res.json({ authenticated: true });
});

app.get("/auth/logout", (req, res) => {
  const sid = req.cookies.sid;
  if (sid) {
    tokenStore.delete(sid);
    res.clearCookie("sid", { path: "/" });
  }
  res.json({ ok: true });
});

app.get("/api/incidents", async (req, res) => {
  const sid = req.cookies.sid;
  const session = tokenStore.get(sid);

  if (!session || !session.access_token) {
    console.error("401 Error: No session or access token. Session exists:", !!session, "Has token:", !!session?.access_token);
    return res.status(401).send("Not authenticated");
  }

  try {
    const r = await axios.get(
      `${SN_INTANCE}/api/now/table/incident?sysparm_fields=number%2Cpriority%2Cimpact%2Curgency%2Cstate%2Cshort_description%2Csys_id`,
      {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }
    );
    return res.json(r.data);
  } catch (e) {
    console.error("API Error:", {
      status: e.response?.status,
      message: e.response?.data || e.message,
      url: `${SN_INTANCE}/api/now/table/incident`
    });
    if (e.response?.status === 401 && session.refresh_token) {
      const data = {
        grant_type: "refresh_token",
        refresh_token: session.refresh_token,
        client_id: CLIENT_ID,
      };

      try {
        const refresh = await axios.post(tokenEndpoint, stringify(data), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        tokenStore.set(sid, { ...session, ...refresh.data });

        const retry = await axios.get(
          `${SN_INTANCE}/api/now/table/incident?sysparm_fields=number%2Cpriority%2Cimpact%2Curgency%2Cstate%2Cshort_description%2Csys_id`,
          {
            headers: { Authorization: `Bearer ${refresh.data.access_token}` },
          }
        );
        return res.json(retry.data);
      } catch (refreshError) {
        return res.status(401).send("Session Expired");
      }
    }
    
    return res.status(e.response?.status || 500).send("Upstream error");
  }
});
app.get("/api/incidents/:sys_id", async (req, res) => {
  const { sys_id } = req.params;
  const sid = req.cookies.sid;
  const session = tokenStore.get(sid);

  if (!session || !session.access_token) {
    console.error("401 Error: No session or access token.");
    return res.status(401).send("Not authenticated");
  }

  // Build SNOW query
  const url = `${SN_INTANCE}/api/now/table/incident` +
    `?sysparm_fields=number,assignment_group,state,impact,work_notes_list,priority,assigned_to,urgency,short_description,description` +
    `&sysparm_limit=1` +
    `&sysparm_query=sys_id=${sys_id}`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    return res.json({ result: response.data.result[0] || null });

  } catch (e) {
    console.error("API Error (single incident):", {
      status: e.response?.status,
      message: e.response?.data || e.message,
      url,
    });

    // 🔁 Handle Token Refresh if needed
    if (e.response?.status === 401 && session.refresh_token) {
      const data = {
        grant_type: "refresh_token",
        refresh_token: session.refresh_token,
        client_id: CLIENT_ID,
      };

      try {
        const refresh = await axios.post(tokenEndpoint, stringify(data), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        tokenStore.set(sid, { ...session, ...refresh.data });

        const retry = await axios.get(url, {
          headers: { Authorization: `Bearer ${refresh.data.access_token}` },
        });

        return res.json({ result: retry.data.result[0] || null });

      } catch (refreshError) {
        return res.status(401).send("Session Expired");
      }
    }

    return res.status(e.response?.status || 500).send("Upstream error");
  }
});

app.delete("/api/incidents/:sys_id", async (req, res) => {
  const sid = req.cookies.sid;
  const session = tokenStore.get(sid);

  if (!session || !session.access_token) {
    return res.status(401).send("Not authenticated");
  }

  const { sys_id } = req.params;

  try {
    await axios.delete(
      `${SN_INTANCE}/api/now/table/incident/${sys_id}`,
      {
        headers: { Authorization: `Bearer ${session.access_token}` }
      }
    );

    return res.status(200).json({ message: "Incident deleted successfully" });

  } catch (e) {

    // If token expired, try refresh
    if (e.response?.status === 401 && session.refresh_token) {
      try {
        const data = {
          grant_type: "refresh_token",
          refresh_token: session.refresh_token,
          client_id: CLIENT_ID,
        };

        const refresh = await axios.post(tokenEndpoint, stringify(data), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });

        tokenStore.set(sid, { ...session, ...refresh.data });

        
        await axios.delete(
          `${SN_INTANCE}/api/now/table/incident/${sys_id}`,
          {
            headers: { Authorization: `Bearer ${refresh.data.access_token}` }
          }
        );

        return res.status(200).json({ message: "Incident deleted successfully" });

      } catch (refreshError) {
        return res.status(401).send("Session Expired");
      }
    }

    return res.status(e.response?.status || 500).send("Upstream error");
  }
});




//   const session = tokenStore.get(sid);

//   if (!session || !session.access_token) {
//     return res.status(401).send("Not authenticated");
//   }
//   const { severity, status, incId,priority} = req.body;

//   try {
//     const r = await axios.post(
//       `${SN_INTANCE}/api/now/table/incident?sysparm_fields=${incId}%2C${state}%2C${urgency}%2C`,
      
//       {
//         headers: {
//           Authorization: `Bearer ${session.access_token}`,
//           "Content-Type": "application/json"
//         }
//       }
//     );

//     return res.status(201).send({
//       message: "Incident created successfully",
//       result: r.data.result
//     });

//   } catch (e) {

//     // Same refresh token handling as your DELETE
//     if (e.response?.status === 401 && session.refresh_token) {
//       try {
//         const body = {
//           grant_type: "refresh_token",
//           refresh_token: session.refresh_token,
//           client_id: CLIENT_ID,
//         };

//         const refresh = await axios.post(tokenEndpoint, stringify(body), {
//           headers: { "Content-Type": "application/x-www-form-urlencoded" },
//         });

//         tokenStore.set(sid, { ...session, ...refresh.data });

//         // Retry POST request after refresh
//         const r2 = await axios.post(
//           `${SN_INTANCE}/api/now/table/incident?sysparm_fields=${incId}%2C${state}%2C${urgency}%2C`,
          
//           {
//             headers: {
//               Authorization: `Bearer ${refresh.data.access_token}`,
//               "Content-Type": "application/json"
//             }
//           }
//         );

//         return res.status(201).send({
//           message: "Incident created successfully",
//           result: r2.data.result
//         });

//       } catch (refreshError) {
//         return res.status(401).send("Session Expired");
//       }
//     }

//     return res.status(e.response?.status || 500).send("Upstream error");
//   }
// });
app.post("/api/incidents", async (req, res) => {
  const sid = req.cookies.sid;
  const session = tokenStore.get(sid);
  if (!session || !session.access_token) {
    return res.status(401).send("Not authenticated");
  }
 
  const { impact, urgency, short_description, status } = req.body;
  
  // Map status to state for ServiceNow API
  const payload = {
    impact,
    urgency,
    short_description,
    state: status  // ServiceNow uses 'state' not 'status'
  };
 
  try {
    const r = await axios.post(
      `${SN_INTANCE}/api/now/table/incident`,
      payload,
      { 
        headers: { 
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        } 
      }
    );
 
    return res.json({
      message: "Incident created successfully",
      result: r.data.result,
    });
  } catch (e) {
    // Handle token refresh on 401 error
    if (e.response?.status === 401 && session.refresh_token) {
      try {
        const data = {
          grant_type: "refresh_token",
          refresh_token: session.refresh_token,
          client_id: CLIENT_ID,
        };

        const refresh = await axios.post(tokenEndpoint, stringify(data), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        tokenStore.set(sid, { ...session, ...refresh.data });

        // Retry POST request with new token
        const r2 = await axios.post(
          `${SN_INTANCE}/api/now/table/incident`,
          payload,
          { 
            headers: { 
              Authorization: `Bearer ${refresh.data.access_token}`,
              "Content-Type": "application/json"
            } 
          }
        );

        return res.json({
          message: "Incident created successfully",
          result: r2.data.result,
        });
      } catch (refreshError) {
        return res.status(401).send("Session Expired");
      }
    }

    console.error("Insert failed:", e.response?.data || e.message);
    return res
      .status(e.response?.status || 500)
      .send(e.response?.data?.error?.message || "Failed to insert incident");
  }
});
 

app.put("/api/incidents/:sys_id", async (req, res) => {
  const sid = req.cookies.sid;
  const session = tokenStore.get(sid);
  if (!session || !session.access_token) {
    return res.status(401).send("Not authenticated");
  }
 
  const { sys_id } = req.params;
  const { impact, urgency, short_description, status } = req.body;
  
  // Map status to state for ServiceNow API
  const payload = {
    impact,
    urgency,
    short_description,
    state: status  // ServiceNow uses 'state' not 'status'
  };
 
  try {
    const r = await axios.patch(
      `${SN_INTANCE}/api/now/table/incident/${sys_id}`,
      payload,
      { 
        headers: { 
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        } 
      }
    );
 
    return res.json({
      message: "Incident updated successfully",
      result: r.data.result,
    });
  } catch (e) {
    // Handle token refresh on 401 error
    if (e.response?.status === 401 && session.refresh_token) {
      try {
        const data = {
          grant_type: "refresh_token",
          refresh_token: session.refresh_token,
          client_id: CLIENT_ID,
        };

        const refresh = await axios.post(tokenEndpoint, stringify(data), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        tokenStore.set(sid, { ...session, ...refresh.data });

        // Retry PATCH request with new token
        const r2 = await axios.patch(
          `${SN_INTANCE}/api/now/table/incident/${sys_id}`,
          payload,
          { 
            headers: { 
              Authorization: `Bearer ${refresh.data.access_token}`,
              "Content-Type": "application/json"
            } 
          }
        );

        return res.json({
          message: "Incident updated successfully",
          result: r2.data.result,
        });
      } catch (refreshError) {
        return res.status(401).send("Session Expired");
      }
    }

    console.error("Update failed:", e.response?.data || e.message);
    return res
      .status(e.response?.status || 500)
      .send(e.response?.data?.error?.message || "Failed to update incident");
  }
});

// https://dev353572.service-now.com/api/now/table/incident/88d938150f01b210ccff40d530d1b29e?sysparm_query_no_domain=INC0015598

app.listen(3001, () => console.log("BFF on 3001"));
