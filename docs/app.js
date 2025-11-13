// ---- CONFIG ----
const GH_USER = "muhsinh";
const GH_REPO = "mindspace";
const ARTIFACT_PATH = "artifacts";

const artifactDropdown = document.getElementById("artifactDropdown");
const scenarioDropdown = document.getElementById("scenarioDropdown");
const timeline = document.getElementById("timeline");

// Fetch list of artifact JSONL files from GitHub
async function loadArtifactList() {
    const apiURL = `https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/${ARTIFACT_PATH}`;

    const res = await fetch(apiURL);
    const files = await res.json();

    const jsonlFiles = files.filter(f => f.name.endsWith(".jsonl"));

    artifactDropdown.innerHTML = "";

    jsonlFiles.sort((a, b) => new Date(extractTimestamp(b.name)) - new Date(extractTimestamp(a.name)));

    for (let f of jsonlFiles) {
        const ts = extractTimestamp(f.name);
        const human = ts ? new Date(ts).toLocaleString() : "Unknown time";
        const opt = document.createElement("option");
        opt.value = f.download_url;
        opt.textContent = `${f.name} — ${human}`;
        artifactDropdown.appendChild(opt);
    }
}

// Extract timestamp like _20251112_231425
function extractTimestamp(filename) {
    const match = filename.match(/_(\d{8})_(\d{6})/);
    if (!match) return null;
    const date = match[1];
    const time = match[2];
    return `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T${time.slice(0,2)}:${time.slice(2,4)}:${time.slice(4,6)}`;
}

// Load selected JSONL file
async function loadSelectedArtifact() {
    const url = artifactDropdown.value;
    const res = await fetch(url);
    const text = await res.text();

    const lines = text.trim().split("\n").map(l => JSON.parse(l));

    scenarioDropdown.innerHTML = "";
    lines.forEach((rec, idx) => {
        const opt = document.createElement("option");
        opt.value = idx;
        opt.textContent = `${rec.id} — ${rec.tags?.join(", ")}`;
        scenarioDropdown.appendChild(opt);
    });

    scenarioDropdown.dataset.records = JSON.stringify(lines);
}

// Render scenario
function renderScenario() {
    const idx = scenarioDropdown.value;
    const records = JSON.parse(scenarioDropdown.dataset.records);
    const rec = records[idx];

    timeline.innerHTML = "";

    const steps = [
        ["User Input", rec.user],
        ["Target Response", rec.target],
        ["Auditor Probe", rec.auditor],
        ["Judge Evaluation", rec.judge_raw, "risk"],
        ["Debater A", rec.debater_a],
        ["Debater B", rec.debater_b],
        ["Referee Summary", rec.referee_raw, "positive"]
    ];

    steps.forEach(([title, text, css]) => {
        if (!text) return;
        const item = document.createElement("div");
        item.classList.add("timeline-item");
        const block = document.createElement("div");
        block.classList.add("block");
        if (css) block.classList.add(css);
        block.innerHTML = `<h3>${title}</h3><pre>${text}</pre>`;
        item.appendChild(block);
        timeline.appendChild(item);
    });
}

// Event listeners
artifactDropdown.addEventListener("change", loadSelectedArtifact);
scenarioDropdown.addEventListener("change", renderScenario);

// init
loadArtifactList();
