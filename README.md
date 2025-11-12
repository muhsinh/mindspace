# Mindspace + Petri (Single-Model, Multi-Role)

This repo runs:
- A simple Petri-style loop with 3 roles (auditor, target, judge)
- A Mindspace debate layer that post-processes transcripts (2 debaters + 1 referee)
- All roles use one vLLM model via an OpenAI-compatible API.

## Config

See `config/base.yaml`:
- `model.base_url`: vLLM server URL
- `model.id`: model ID exposed by vLLM (`/v1/models`)
- Paths for scenarios, transcripts, and reasoning outputs

## Local Setup

```bash
cd mindspace
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

