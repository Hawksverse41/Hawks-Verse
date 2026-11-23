const C = window.HAWKS_CONFIG || {};
let db = null;
let t = null;

const $ = id => document.getElementById(id);

async function boot() {
  if (!C.supabaseUrl || !C.supabasePublishableKey) {
    if ($("dbStatus")) {
      $("dbStatus").textContent = "Database configuration missing.";
    }
    return;
  }

  try {
    db = supabase.createClient(
      C.supabaseUrl,
      C.supabasePublishableKey
    );

    let tournamentQuery = db
      .from("tournaments")
      .select("*")
      .eq("is_published", true);

    /*
      Registration pages:
      - Only load their selected tournament type

      Homepage:
      - ONGOING tournament gets priority
      - If no ONGOING, use UPCOMING
      - If neither exists, use latest published tournament
    */

    if (window.HAWKS_REGISTRATION_TYPE) {
      tournamentQuery = tournamentQuery.eq(
        "tournament_type",
        window.HAWKS_REGISTRATION_TYPE
      );
    }

    const r = await tournamentQuery.order("created_at", {
      ascending: false
    });

    if (r.error) {
      throw r.error;
    }

    if (window.HAWKS_REGISTRATION_TYPE) {
      // Registration page:
      // latest tournament of selected type
      t = r.data?.[0];
    } else {
      // Homepage:
      // ONGOING first, then UPCOMING, then latest published
      const tournaments = r.data || [];

      const ongoingTournament = tournaments.find(
        tournament =>
          String(tournament.status || "").toUpperCase() === "ONGOING"
      );

      const upcomingTournament = tournaments.find(
        tournament =>
          String(tournament.status || "").toUpperCase() === "UPCOMING"
      );

      t =
        ongoingTournament ||
        upcomingTournament ||
        tournaments[0];
    }

    if (!t) {
      throw new Error("Tournament unavailable");
    }

    const registerUrl =
      String(t.tournament_type || "").toLowerCase() === "solo"
        ? "register-solo.html"
        : "register.html";

    const registerLinks = document.querySelectorAll(
      'a[href="register.html"], a[href="#register"], a.round-arrow'
    );

    registerLinks.forEach(link => {
      link.href = registerUrl;
      link.target = "_blank";
      link.rel = "noopener";

      // Homepage:
      // ONGOING = registration button visible
      // UPCOMING = registration button hidden
      if (!window.HAWKS_REGISTRATION_TYPE) {
        const status = String(t.status || "").toUpperCase();

        if (status === "UPCOMING") {
          link.style.display = "none";
        } else {
          link.style.display = "";
        }
      }
    });

    const poster =
      t.poster_url || "assets/weekly-wars-s2.png";

    if ($("heroPoster")) {
      $("heroPoster").src = poster;
    }

    if ($("tournamentPoster")) {
      $("tournamentPoster").src = poster;
    }

    if ($("heroName")) {
      $("heroName").textContent = t.name;
    }

    if ($("tournamentName")) {
      $("tournamentName").textContent = t.name;
    }

    if ($("formTitle")) {
      $("formTitle").textContent = t.name;
    }

    if ($("heroPrize")) {
      $("heroPrize").textContent =
        `₹${Number(t.prize_pool || 0).toLocaleString("en-IN")} PRIZE POOL`;
    }

    if ($("prizeFact")) {
      $("prizeFact").textContent =
        `₹${Number(t.prize_pool || 0).toLocaleString("en-IN")}`;
    }

    if ($("heroStatus")) {
      $("heroStatus").textContent =
        String(t.status || "UPCOMING").toUpperCase();
    }

    if ($("tid")) {
      $("tid").value = t.id;
    }

    // Load homepage social links managed from admin panel.
    try {
      const socialResult = await db
        .from("site_settings")
        .select("instagram_url,youtube_url,discord_url")
        .eq("id", 1)
        .maybeSingle();

      if (!socialResult.error && socialResult.data) {
        applySocialLink(
          "socialInstagram",
          socialResult.data.instagram_url
        );

        applySocialLink(
          "socialYoutube",
          socialResult.data.youtube_url
        );

        applySocialLink(
          "socialDiscord",
          socialResult.data.discord_url
        );
      }
    } catch (socialError) {
      console.warn(
        "HAWKS VERSE social links:",
        socialError
      );
    }

    if ($("dbStatus")) {
      $("dbStatus").textContent =
        "✓ Database connected — registration ready.";

      $("dbStatus").className = "ok";
    }
  } catch (e) {
    console.error("HAWKS VERSE:", e);

    if ($("dbStatus")) {
      $("dbStatus").textContent =
        "Database connection failed. Please try again.";

      $("dbStatus").className = "error";
    }
  }
}


// ===============================
// SOCIAL LINKS
// ===============================

function applySocialLink(elementId, value) {
  const element = document.getElementById(elementId);

  if (!element) return;

  const url = String(value || "").trim();

  if (!url) {
    element.style.display = "none";
    element.removeAttribute("href");
    return;
  }

  if (!isAllowedSocialUrl(url)) {
    element.style.display = "none";
    element.removeAttribute("href");
    return;
  }

  element.href = url;
  element.target = "_blank";
  element.rel = "noopener";
  element.style.display = "flex";
}


function isAllowedSocialUrl(value) {
  try {
    const parsed = new URL(value);

    if (parsed.protocol !== "https:") {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    return (
      host === "instagram.com" ||
      host.endsWith(".instagram.com") ||
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtu.be" ||
      host === "discord.com" ||
      host.endsWith(".discord.com") ||
      host === "discord.gg"
    );
  } catch (_) {
    return false;
  }
}


// ===============================
// REGISTRATION
// ===============================

const registrationForm = $("reg");

if (registrationForm) {
  registrationForm.onsubmit = async e => {
    e.preventDefault();

    if (!db || !t) {
      alert("Database is not connected yet.");
      return;
    }

    const p = {
      p_tournament_id: t.id,
      p_team_name: $("team").value.trim(),
      p_team_logo_url: "",
      p_igl_name: $("igl").value.trim(),
      p_igl_uid: $("uid1").value.trim(),
      p_igl_mobile: $("mobile").value.trim(),
      p_igl_email: $("email").value.trim(),
      p_player2_name: $("p2").value.trim(),
      p_player2_uid: $("uid2").value.trim(),
      p_player3_name: $("p3").value.trim(),
      p_player3_uid: $("uid3").value.trim(),
      p_player4_name: $("p4").value.trim(),
      p_player4_uid: $("uid4").value.trim()
    };

    // Open synchronously from the submit gesture to avoid popup blockers.
    // This confirmation flow is intentionally Squad-only.
    const isSquadRegistration =
      String(window.HAWKS_REGISTRATION_TYPE || "").toLowerCase() === "squad";

    const confirmationTab = isSquadRegistration
      ? window.open("registration-confirmation.html", "_blank")
      : null;

    let confirmationReady = false;
    let confirmationPayload = null;
const sendConfirmation = event => {
    if (
        confirmationTab &&
        event.origin === window.location.origin &&
        event.source === confirmationTab &&
        event.data?.type === "HAWKS_CONFIRMATION_READY"
    ) {
        confirmationReady = true;

        if (confirmationPayload) {
            confirmationTab.postMessage(
                {
                    type: "HAWKS_CONFIRMATION_DATA",
                    payload: confirmationPayload
                },
                window.location.origin
            );
        }

        window.removeEventListener("message", sendConfirmation);
    }
};

   if (confirmationTab) {
      window.addEventListener("message", sendConfirmation);
    }

    const r = await db.rpc(
      "create_registration",
      p
    );

    if (r.error) {
      if (confirmationTab && !confirmationTab.closed) {
        confirmationTab.close();
      }

      window.removeEventListener("message", sendConfirmation);
      alert(r.error.message);
      return;
    }

    const id = Array.isArray(r.data)
      ? r.data[0]?.registration_id
      : r.data?.registration_id ?? r.data;

    if (!id) {
      if (confirmationTab && !confirmationTab.closed) {
        confirmationTab.close();
      }

      window.removeEventListener("message", sendConfirmation);

      alert(
        "Registration created, but Registration ID could not be read."
      );

      return;
    }

    confirmationPayload = {
      registrationId: String(id),
      iglMobile: p.p_igl_mobile,
      tournamentName: String(t.name || "HAWKS VERSE Tournament"),
      teamName: p.p_team_name,
      iglName: p.p_igl_name,
      iglUid: p.p_igl_uid,
      players: [
        { name: p.p_igl_name, uid: p.p_igl_uid, role: "IGL" },
        { name: p.p_player2_name, uid: p.p_player2_uid, role: "PLAYER 2" },
        { name: p.p_player3_name, uid: p.p_player3_uid, role: "PLAYER 3" },
        { name: p.p_player4_name, uid: p.p_player4_uid, role: "PLAYER 4" }
      ].filter(player => player.name || player.uid)
    };

    if (confirmationTab && !confirmationTab.closed) {
      // The confirmation page announces readiness; if it loaded first,
      // it will receive this message immediately on its next READY ping.
      if (confirmationReady) {
        confirmationTab.postMessage(
          { type: "HAWKS_CONFIRMATION_DATA", payload: confirmationPayload },
          window.location.origin
        );
      }

      if ($("result")) {
        $("result").textContent =
          "✓ Registration successful. Your confirmation has opened in a new tab.";
      }
    } else if ($("result")) {
      $("result").innerHTML =
        "<b>REGISTRATION SUCCESSFUL</b><br>" +
        "Registration ID: <strong>" +
        escapeHtml(id) +
        "</strong><br>" +
        "Your browser blocked the confirmation tab. Please allow pop-ups and register again only if this registration was not created.";
    }

    registrationForm.reset();
  };
}
// ===============================
// REGISTRATION STATUS CHECK
// ===============================

const checkForm = $("check");

if (checkForm) {
  checkForm.onsubmit = async e => {
    e.preventDefault();

    if (!db) {
      alert("Database is not connected yet.");
      return;
    }

    const registrationId =
      $("rid").value.trim();

    const checkMobile =
      $("checkMobile").value.trim();

    if (!registrationId || !checkMobile) {
      return;
    }

    if ($("checkResult")) {
      $("checkResult").innerHTML =
        "Verifying registration...";
    }

    const r = await db.rpc(
      "check_registration_secure",
      {
        p_registration_id: registrationId,
        p_igl_mobile: checkMobile
      }
    );

    if (r.error) {
      console.error(
        "Check registration:",
        r.error
      );

      if ($("checkResult")) {
        $("checkResult").textContent =
          "Registration not found.";
      }

      return;
    }

    const x =
      Array.isArray(r.data)
        ? r.data[0]
        : r.data;

    if (!x) {
      if ($("checkResult")) {
        $("checkResult").textContent =
          "Registration ID or IGL Mobile Number is incorrect.";
      }

      return;
    }

    const status =
      String(x.status || "")
        .replaceAll("_", " ")
        .replace(/\b\w/g, c =>
          c.toUpperCase()
        );

    let groupHtml = "";

    if (x.group_name) {
      groupHtml = `
        <div class="registration-group">
          <div class="group-label">
            YOUR ASSIGNED GROUP
          </div>

          <div class="group-name">
            ${escapeHtml(x.group_name)}
          </div>

          ${
            x.group_number
              ? `<div class="group-number">
                  GROUP ${escapeHtml(
                    String(x.group_number)
                  )}
                </div>`
              : ""
          }

          ${
            x.group_instructions
              ? `<p class="group-instructions">
                  ${escapeHtml(
                    x.group_instructions
                  )}
                </p>`
              : ""
          }

          ${
            x.whatsapp_link
              ? `
                <a
                  class="btn primary"
                  href="${safeUrl(
                    x.whatsapp_link
                  )}"
                  target="_blank"
                  rel="noopener"
                >
                  JOIN YOUR WHATSAPP GROUP →
                </a>
              `
              : `
                <div class="group-pending">
                  WhatsApp group link will be added by HAWKS VERSE.
                </div>
              `
          }
        </div>
      `;
    } else {
      groupHtml = `
        <div class="registration-group pending">
          <div class="group-label">
            GROUP ASSIGNMENT
          </div>

          <div class="group-pending">
            Your group has not been published yet.
            Please check again later.
          </div>
        </div>
      `;
    }

    if ($("checkResult")) {
      $("checkResult").innerHTML =
        "Team: <b>" +
        escapeHtml(x.team_name || "") +
        "</b><br>" +
        "Status: <b>" +
        escapeHtml(status) +
        "</b><br>" +
        "Registration ID: <b>" +
        escapeHtml(
          x.registration_id || registrationId
        ) +
        "</b>" +
        groupHtml;
    }
  };
}


// ===============================
// SAFE HTML HELPERS
// ===============================

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function safeUrl(value) {
  const url = String(value ?? "").trim();

  try {
    const parsed = new URL(url);

    if (
      parsed.protocol === "https:" &&
      parsed.hostname === "chat.whatsapp.com"
    ) {
      return parsed.href;
    }

    if (
      parsed.protocol === "https:" &&
      parsed.hostname === "whatsapp.com"
    ) {
      return parsed.href;
    }
  } catch (_) {}

  return "#";
}
// =========================================================
// PARTICIPANT EDIT REGISTRATION
// Verification: Registration ID + IGL Mobile
// =========================================================

const editVerifyForm =
  document.getElementById("editVerify");

const editForm =
  document.getElementById("editForm");

if (editVerifyForm) {
  editVerifyForm.addEventListener(
    "submit",
    async function (e) {
      e.preventDefault();

      const rid =
        document.getElementById(
          "editRid"
        ).value.trim();

      const mobile =
        document.getElementById(
          "editMobile"
        ).value.trim();

      const message =
        document.getElementById(
          "editMessage"
        );

      if (!rid || !mobile) {
        message.textContent =
          "Please enter Registration ID and IGL Mobile Number.";

        return;
      }

      message.textContent =
        "Verifying registration...";

      const { data, error } =
        await db.rpc(
          "get_registration_for_edit",
          {
            p_registration_id: rid,
            p_igl_mobile: mobile
          }
        );

      if (error) {
        console.error(error);

        message.textContent =
          "Verification failed. Please try again.";

        return;
      }

      const r =
        Array.isArray(data)
          ? data[0]
          : data;

      if (!r) {
        message.textContent =
          "Registration ID or IGL Mobile Number is incorrect.";

        return;
      }

      document.getElementById(
        "editOriginalRid"
      ).value = r.registration_id;

      document.getElementById(
        "editOriginalMobile"
      ).value = mobile;

      document.getElementById(
        "editTeam"
      ).value = r.team_name || "";

      document.getElementById(
        "editIgl"
      ).value = r.igl_name || "";

      document.getElementById(
        "editIglUid"
      ).value = r.igl_uid || "";

      document.getElementById(
        "editNewMobile"
      ).value = r.igl_mobile || "";

      const editEmail =
        document.getElementById(
          "editIglEmail"
        );

      if (editEmail) {
        editEmail.value =
          r.igl_email || "";

        editEmail.readOnly = true;

        editEmail.title =
          "Email is kept as the registered contact address.";
      }

      document.getElementById(
        "editP2"
      ).value = r.player2_name || "";

      document.getElementById(
        "editUid2"
      ).value = r.player2_uid || "";

      document.getElementById(
        "editP3"
      ).value = r.player3_name || "";

      document.getElementById(
        "editUid3"
      ).value = r.player3_uid || "";

      document.getElementById(
        "editP4"
      ).value = r.player4_name || "";

      document.getElementById(
        "editUid4"
      ).value = r.player4_uid || "";

      document.getElementById(
        "editCurrentStatus"
      ).innerHTML =
        "Current Status: <b>" +
        (r.status || "") +
        "</b>";

      message.textContent =
        "✓ Verification successful. You can edit your details below.";

      editForm.style.display =
        "block";
    }
  );
}


// =========================================================
// SAVE PARTICIPANT CHANGES
// =========================================================

if (editForm) {
  editForm.addEventListener(
    "submit",
    async function (e) {
      e.preventDefault();

      const result =
        document.getElementById(
          "editResult"
        );

      const rid =
        document.getElementById(
          "editOriginalRid"
        ).value.trim();

      const originalMobile =
        document.getElementById(
          "editOriginalMobile"
        ).value.trim();

      const team =
        document.getElementById(
          "editTeam"
        ).value.trim();

      const igl =
        document.getElementById(
          "editIgl"
        ).value.trim();

      const iglUid =
        document.getElementById(
          "editIglUid"
        ).value.trim();

      const newMobile =
        document.getElementById(
          "editNewMobile"
        ).value.trim();

      const p2 =
        document.getElementById(
          "editP2"
        ).value.trim();

      const uid2 =
        document.getElementById(
          "editUid2"
        ).value.trim();

      const p3 =
        document.getElementById(
          "editP3"
        ).value.trim();

      const uid3 =
        document.getElementById(
          "editUid3"
        ).value.trim();

      const p4 =
        document.getElementById(
          "editP4"
        ).value.trim();

      const uid4 =
        document.getElementById(
          "editUid4"
        ).value.trim();

      if (
        !rid ||
        !originalMobile ||
        !team ||
        !igl ||
        !iglUid ||
        !newMobile ||
        !p2 ||
        !uid2 ||
        !p3 ||
        !uid3 ||
        !p4 ||
        !uid4
      ) {
        result.textContent =
          "Please fill all fields.";

        return;
      }

      result.textContent =
        "Saving changes...";

      const { data, error } =
        await db.rpc(
          "update_registration_by_verification",
          {
            p_registration_id: rid,
            p_igl_mobile: originalMobile,
            p_team_name: team,
            p_igl_name: igl,
            p_igl_uid: iglUid,
            p_new_igl_mobile: newMobile,
            p_player2_name: p2,
            p_player2_uid: uid2,
            p_player3_name: p3,
            p_player3_uid: uid3,
            p_player4_name: p4,
            p_player4_uid: uid4
          }
        );

      if (error) {
        console.error(error);

        result.textContent =
          error.message ||
          "Unable to save changes. Please check your details.";

        return;
      }

      const updated =
        Array.isArray(data)
          ? data[0]
          : data;

      result.innerHTML =
        "<b>✓ Registration updated successfully.</b><br>" +
        "Registration ID: <b>" +
        rid +
        "</b><br>" +
        "Status remains: <b>" +
        (
          updated && updated.status
            ? updated.status
            : "unchanged"
        ) +
        "</b><br><br>" +
        "Your changes have been saved. HAWKS VERSE will review the updated details.";

      document.getElementById(
        "editCurrentStatus"
      ).innerHTML =
        "Current Status: <b>" +
        (
          updated && updated.status
            ? updated.status
            : ""
        ) +
        "</b>";
    }
  );
}


// ===============================
// START
// ===============================

boot();
