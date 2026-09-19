const { createClient } = window.supabase;
const db = createClient(HAWKS_CONFIG.supabaseUrl, HAWKS_CONFIG.supabasePublishableKey);

let currentTournament = null;

const $ = (s) => document.querySelector(s);
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

async function loadTournament() {
  const state = $("#dbState");
  try {
    const { data, error } = await db.from("tournaments")
      .select("id,name,season,prize_pool,status,max_squads,is_published")
      .eq("slug","weekly-wars-s2")
      .eq("is_published",true)
      .single();
    if (error) throw error;
    currentTournament = data;
    $("#dbState").textContent = "● Database connected";
    $("#dbState").style.color = "#58c987";
    $("#heroStatus").textContent = data.status === "ongoing" ? "ONGOING" : data.status.toUpperCase();
    $("#tournamentStatus").textContent = "● " + (data.status === "ongoing" ? "TOURNAMENT ONGOING" : data.status.toUpperCase());
    $("#heroName").textContent = data.name;
    $("#heroPrize").textContent = `${money(data.prize_pool)} PRIZE POOL`;
    $("#tournamentName").textContent = data.name;
    $("#formTitle").textContent = data.name;
    $("#prizeFact").textContent = money(data.prize_pool);
  } catch (e) {
    state.textContent = "Database connection error";
    state.style.color = "#ff7777";
    console.error(e);
  }
}

$("#regForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorBox = $("#formError");
  errorBox.hidden = true;
  if (!currentTournament) { errorBox.textContent = "Tournament could not be loaded."; errorBox.hidden = false; return; }

  const f = new FormData(e.currentTarget);
  const btn = $("#submitBtn");
  btn.disabled = true; btn.textContent = "SUBMITTING…";

  try {
    const args = {
      p_tournament_id: currentTournament.id,
      p_team_name: f.get("team_name"),
      p_team_logo_url: "",
      p_igl_name: f.get("igl_name"),
      p_igl_uid: f.get("igl_uid"),
      p_igl_mobile: f.get("igl_mobile"),
      p_player2_name: f.get("player2_name"),
      p_player2_uid: f.get("player2_uid"),
      p_player3_name: f.get("player3_name"),
      p_player3_uid: f.get("player3_uid"),
      p_player4_name: f.get("player4_name"),
      p_player4_uid: f.get("player4_uid")
    };
    const { data, error } = await db.rpc("create_registration", args);
    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || "Registration failed");
    $("#regId").textContent = data.registration_id;
    $("#successText").textContent = `${data.team_name} • ${data.tournament_name}`;
    $("#regForm").hidden = true;
    $("#success").hidden = false;
    $("#success").scrollIntoView({behavior:"smooth",block:"center"});
  } catch (err) {
    errorBox.textContent = err.message || "Registration failed. Please try again.";
    errorBox.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "SUBMIT REGISTRATION";
  }
});

$("#statusForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const result = $("#statusResult");
  result.hidden = false;
  result.textContent = "Checking…";
  try {
    const { data, error } = await db.rpc("check_registration", { p_registration_id: $("#statusId").value });
    if (error) throw error;
    if (!data?.success) { result.textContent = data?.message || "Registration not found."; return; }
    result.innerHTML = `<strong>${data.registration_id}</strong><br>${data.tournament_name}<br>Team: ${data.team_name}<br>Status: <strong>${data.status}</strong>`;
  } catch (err) {
    result.textContent = err.message || "Could not check status.";
  }
});

$("#saveBtn").addEventListener("click", () => {
  const id = $("#regId").textContent;
  const blob = new Blob([`HAWKS VERSE\n${currentTournament?.name || "Tournament"}\n\nRegistration Successful\nRegistration ID: ${id}\n\nKeep this ID safe.`], {type:"text/plain"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `${id}-confirmation.txt`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

loadTournament();
