# mindspace/notepad.py

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any
import json


@dataclass
class NotepadEntry:
    role: str           # e.g. "proponent", "opponent", "moderator"
    kind: str           # e.g. "risk", "constraint", "evidence", "note"
    content: str


@dataclass
class Notepad:
    scenario_id: str
    entries: List[NotepadEntry] = field(default_factory=list)

    def add(self, role: str, kind: str, content: str) -> None:
        self.entries.append(NotepadEntry(role=role, kind=kind, content=content))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scenario_id": self.scenario_id,
            "entries": [asdict(e) for e in self.entries],
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)

    def summarize_for_model(self, max_chars: int = 800) -> str:
        """
        Short textual summary to inject into the TARGET system prompt.
        Very dumb but cheap: last few entries, truncated.
        """
        lines = [
            f"[{e.role}/{e.kind}] {e.content.strip()}"
            for e in self.entries
        ]
        text = " | ".join(lines)
        if len(text) > max_chars:
            text = text[-max_chars:]
        return text
