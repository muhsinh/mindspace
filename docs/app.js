// Zero-dependency, mildly cursed JS. But it works.

function parseJsonl(text) {
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return { raw_line: line };
      }
    });
}

// ---------- PETRI ----------

let petriRecords = [];

function buildPetriFilters(records) {
  const tagsSelect = document.getElementById("petriTagFilter");
  const riskSelect = document.getElementById("petriRiskFilter");

  tagsSelect.innerHTML = "";
  riskSelect.innerHTML = '<option value="">(any)</option>';

  const tagSet = new Set();
  const riskSet = new Set();

  records.forEach(r => {
    (r.tags || []).forEach(t => tagSet.add(t));
    const judge = safeParseJson(r.judge_raw);
    if (judge.sycophancy_risk) riskSet.add(judge.sycophancy_risk);
  });

  [...tagSet].sort().forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    tagsSelect.appendChild(opt);
  });

  [...riskSet].sort().forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    riskSelect.appendChild(opt);
  });

  document.getElementById("petriCount").textContent =
    `Loaded ${records.length} transcripts`;
}

function safeParseJson(s) {
  if (typeof s !== "string") return {};
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

function pillClass(risk) {
  if (!risk) return "pill";
  const v = risk.toLowerCase();
  if (v.includes("high")) return "pill pill-high";
  if (v.includes("medium")) return "pill pill-medium";
  return "pill pill-low";
}

function renderPetriTable() {
  const tbody = document.querySelector("#petriTable tbody");
  tbody.innerHTML = "";

  const tagFilter = Array.from(
    document.getElementById("petriTagFilter").selectedOptions
  ).map(o => o.value);
  const riskFilter = document.getElementById("petriRiskFilter").value;
  const search = document.getElementById("petriSearch").value.toLowerCase();

  const filtered = petriRecords.filter(r => {
    const judge = safeParseJson(r.judge_raw);
    const risk = judge.sycophancy_risk || "";

    if (tagFilter.length) {
      const tags = r.tags || [];
      if (!tags.some(t => tagFilter.includes(t))) return false;
    }
    if (riskFilter && risk !== riskFilter) return false;

    if (search) {
      const blob = [
        r.user || "",
        r.target || "",
        r.auditor || "",
        (judge.notes || "")
      ].join(" ").toLowerCase();
      if (!blob.includes(search)) return false;
    }
    return true;
  });

  filtered.forEach(r => {
    const judge = safeParseJson(r.judge_raw);
    const tr = document.createElement("tr");

    const tdId = document.createElement("td");
    tdId.textContent = r.id || "";
    tr.appendChild(tdId);

    const tdTags = document.createElement("td");
    (r.tags || []).forEach(t => {
      const span = document.createElement("span");
      span.className = "badge";
      span.textContent = t;
      tdTags.appendChild(span);
    });
    tr.appendChild(tdTags);

    const tdRisk = document.createElement("td");
    const spanRisk = document.createElement("span");
    spanRisk.className = pillClass(judge.sycophancy_risk);
    spanRisk.textContent = judge.sycophancy_risk || "";
    tdRisk.appendChild(spanRisk);
    tr.appendChild(tdRisk);

    const tdSupport = document.createElement("td");
    tdSupport.textContent = judge.support_quality || "";
    tr.appendChild(tdSupport);

    const tdUser = document.createElement("td");
    tdUser.textContent = r.user || "";
    tr.appendChild(tdUser);

    const tdTarget = document.createElement("td");
    tdTarget.textContent = r.target || "";
    tr.appendChild(tdTarget);

    const tdAud = document.createElement("td");
    tdAud.textContent = r.auditor || "";
    tr.appendChild(tdAud);

    const tdNotes = document.createElement("td");
    tdNotes.textContent = judge.notes || "";
    tr.appendChild(tdNotes);

    tbody.appendChild(tr);
  });
}

// ---------- Mindspace ----------

let mindspaceRecords = [];

function buildMindspaceFilters(records) {
  const tagSelect = document.getElementById("msTagFilter");
  const jSelect = document.getElementById("msJudgeRiskFilter");
  const rSelect = document.getElementById("msRefRiskFilter");
  const detailSelect = document.getElementById("msDetailSelect");

  tagSelect.innerHTML = "";
  jSelect.innerHTML = '<option value="">(any)</option>';
  rSelect.innerHTML = '<option value="">(any)</option>';
  detailSelect.innerHTML = '<option value="">(select conversation)</option>';

  const tagSet = new Set();
  const jSet = new Set();
  const rSet = new Set();

  records.forEach(rec => {
    (rec.tags || []).forEach(t => tagSet.add(t));
    const judge = safeParseJson(rec.judge_raw);
    const ref = safeParseJson(rec.referee_raw);
    if (judge.sycophancy_risk) jSet.add(judge.sycophancy_risk);
    if (ref.overall_sycophancy_risk) rSet.add(ref.overall_sycophancy_risk);
  });

  [...tagSet].sort().forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    tagSelect.appendChild(opt);
  });

  [...jSet].sort().forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    jSelect.appendChild(opt);
  });

  [...rSet].sort().forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    rSelect.appendChild(opt);
  });

  records.forEach(rec => {
    const opt = document.createElement("option");
    opt.value = rec.id;
    opt.textContent = rec.id;
    detailSelect.appendChild(opt);
  });

  document.getElementById("mindspaceCount").textContent =
    `Loaded ${records.length} records`;
}

function renderMindspaceTable() {
  const tbody = document.querySelector("#msTable tbody");
  tbody.innerHTML = "";

  const tags = Array.from(
    document.getElementById("msTagFilter").selectedOptions
  ).map(o => o.value);
  const judgeFilter = document.getElementById("msJudgeRiskFilter").value;
  const refFilter = document.getElementById("msRefRiskFilter").value;
  const search = document.getElementById("msSearch").value.toLowerCase();

  const filtered = mindspaceRecords.filter(rec => {
    const judge = safeParseJson(rec.judge_raw);
    const ref = safeParseJson(rec.referee_raw);

    if (tags.length) {
      const recTags = rec.tags || [];
      if (!recTags.some(t => tags.includes(t))) return false;
    }
    if (judgeFilter && judge.sycophancy_risk !== judgeFilter) return false;
    if (refFilter && ref.overall_sycophancy_risk !== refFilter) return false;

    if (search) {
      const blob = [
        rec.user || "",
        rec.target || "",
        rec.auditor || "",
        rec.debater_a || "",
        rec.debater_b || "",
        (ref.recommended_change || ""),
        (ref.key_behaviors || "").join ? ref.key_behaviors.join(" ") : ""
      ]
        .join(" ")
        .toLowerCase();
      if (!blob.includes(search)) return false;
    }
    return true;
  });

  filtered.forEach(rec => {
    const judge = safeParseJson(rec.judge_raw);
    const ref = safeParseJson(rec.referee_raw);

    const tr = document.createElement("tr");

    const tdId = document.createElement("td");
    tdId.textContent = rec.id || "";
    tr.appendChild(tdId);

    const tdTags = document.createElement("td");
    (rec.tags || []).forEach(t => {
      const span = document.createElement("span");
      span.className = "badge";
      span.textContent = t;
      tdTags.appendChild(span);
    });
    tr.appendChild(tdTags);

    const tdJR = document.createElement("td");
    const spanJR = document.createElement("span");
    spanJR.className = pillClass(judge.sycophancy_risk);
    spanJR.textContent = judge.sycophancy_risk || "";
    tdJR.appendChild(spanJR);
    tr.appendChild(tdJR);

    const tdRR = document.createElement("td");
    const spanRR = document.createElement("span");
    spanRR.className = pillClass(ref.overall_sycophancy_risk);
    spanRR.textContent = ref.overall_sycophancy_risk || "";
    tdRR.appendChild(spanRR);
    tr.appendChild(tdRR);

    const tdUser = document.createElement("td");
    tdUser.textContent = rec.user || "";
    tr.appendChild(tdUser);

    const tdTarget = document.createElement("td");
    tdTarget.textContent = rec.target || "";
    tr.appendChild(tdTarget);

    const tdBeh = document.createElement("td");
    (ref.key_behaviors || []).forEach(b => {
      const p = document.createElement("div");
      p.textContent = "• " + b;
      tdBeh.appendChild(p);
    });
    tr.appendChild(tdBeh);

    tbody.appendChild(tr);
  });
}

function renderMindspaceDetail() {
  const container = document.getElementById("msDetail");
  container.innerHTML = "";
  const id = document.getElementById("msDetailSelect").value;
  if (!id) return;

  const rec = mindspaceRecords.find(r => r.id === id);
  if (!rec) return;

  const judge = safeParseJson(rec.judge_raw);
  const ref = safeParseJson(rec.referee_raw);

  const wrapper = document.createElement("div");

  wrapper.innerHTML = `
    <div class="split">
      <div>
        <div><strong>User</strong></div>
        <div class="detail-block">${rec.user || ""}</div>
      </div>
      <div>
        <div><strong>Target</strong></div>
        <div class="detail-block">${rec.target || ""}</div>
      </div>
    </div>

    <div style="margin-top:0.6rem;">
      <div><strong>Auditor</strong></div>
      <div class="detail-block">${rec.auditor || ""}</div>
    </div>

    <div class="split" style="margin-top:0.6rem;">
      <div>
        <div><strong>Judge</strong></div>
        <div class="detail-block">
          sycophancy_risk: ${judge.sycophancy_risk || ""}\n
          support_quality: ${judge.support_quality || ""}\n
          notes: ${judge.notes || ""}
        </div>
      </div>
      <div>
        <div><strong>Referee</strong></div>
        <div class="detail-block">
          overall_sycophancy_risk: ${ref.overall_sycophancy_risk || ""}\n
          key_behaviors:\n${(ref.key_behaviors || []).map(b => "  - " + b).join("\n")}\n
          recommended_change:\n${ref.recommended_change || ""}
        </div>
      </div>
    </div>

    <div class="split" style="margin-top:0.6rem;">
      <div>
        <div><strong>Debater A (risk-focused)</strong></div>
        <div class="detail-block">${rec.debater_a || ""}</div>
      </div>
      <div>
        <div><strong>Debater B (empathy-focused)</strong></div>
        <div class="detail-block">${rec.debater_b || ""}</div>
      </div>
    </div>
  `;

  container.appendChild(wrapper);
}

// ---------- Wiring ----------

document.getElementById("petriFile").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const rawRecords = parseJsonl(text);

  // PETRI format is already nice; ensure tags is list
  petriRecords = rawRecords.map(r => ({
    ...r,
    tags: r.tags || []
  }));

  document.getElementById("petriPanel").style.display = "block";
  buildPetriFilters(petriRecords);
  renderPetriTable();
});

["petriTagFilter", "petriRiskFilter", "petriSearch"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", renderPetriTable);
  if (el && el.tagName === "SELECT") el.addEventListener("change", renderPetriTable);
});

document.getElementById("mindspaceFile").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const rawRecords = parseJsonl(text);

  mindspaceRecords = rawRecords.map(r => ({
    ...r,
    tags: r.tags || []
  }));

  document.getElementById("mindspacePanel").style.display = "block";
  buildMindspaceFilters(mindspaceRecords);
  renderMindspaceTable();
  renderMindspaceDetail();
});

["msTagFilter", "msJudgeRiskFilter", "msRefRiskFilter", "msSearch"].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", () => {
    renderMindspaceTable();
    renderMindspaceDetail();
  });
  if (el.tagName === "SELECT") {
    el.addEventListener("change", () => {
      renderMindspaceTable();
      renderMindspaceDetail();
    });
  }
});

document.getElementById("msDetailSelect").addEventListener("change", renderMindspaceDetail);
