"""
Sports platform API. Run from project root:
  cd backend && uvicorn main:app --reload --host 127.0.0.1 --port 8000
Then open http://127.0.0.1:8000/
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, model_validator

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"
DATA_DIR = BACKEND_DIR / "data"


def _load_json(name: str, fallback: dict) -> dict:
    path = DATA_DIR / name
    if not path.is_file():
        return fallback
    try:
        with path.open(encoding="utf-8") as f:
            loaded = json.load(f)
            return loaded if isinstance(loaded, dict) else fallback
    except json.JSONDecodeError:
        return fallback


_chatbot_cache: dict | None = None
_exercises_cache: dict | None = None


def _get_chatbot_data() -> dict:
    global _chatbot_cache
    if _chatbot_cache is None:
        _chatbot_cache = _load_json(
            "chatbot_rules.json",
            fallback={
                "default": {
                    "answer": "Данные чата временно недоступны. Проверьте файл chatbot_rules.json.",
                    "video": None,
                },
                "rules": [],
            },
        )
    return _chatbot_cache


def _get_exercises_data() -> dict:
    global _exercises_cache
    if _exercises_cache is None:
        _exercises_cache = _load_json("exercises.json", fallback={"items": []})
    return _exercises_cache


app = FastAPI(title="Sports Platform API", version="1.0.0")

# Optional: allows separate static hosting during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str = Field(default="", max_length=2000)
    exercise_id: str | None = None

    @model_validator(mode="after")
    def message_or_exercise(self) -> "ChatRequest":
        has_ex = bool(self.exercise_id and str(self.exercise_id).strip())
        has_msg = bool((self.message or "").strip())
        if not has_ex and not has_msg:
            raise ValueError("Нужны текст сообщения или выбор упражнения из списка.")
        return self


class ChatResponse(BaseModel):
    answer: str
    video: str | None = None
    exercise_title: str | None = None
    how_to: str | None = None
    avoid: str | None = None


@app.get("/sports")
def get_sports() -> dict:
    # TODO: replace file read with database or external sports feed when ready
    return _load_json("sports.json", fallback={"items": []})


@app.get("/news")
def get_news() -> dict:
    # TODO: connect real news API here — keep returning {"items": [...]} for frontend mapping
    return _load_json("news.json", fallback={"items": []})


@app.get("/training")
def get_training() -> dict:
    # TODO: replace with CMS or coaching API when ready
    return _load_json("training.json", fallback={"items": []})


@app.get("/chat/exercises")
def get_chat_exercises() -> dict:
    raw = _get_exercises_data().get("items") or []
    items = []
    for row in raw:
        if not isinstance(row, dict):
            continue
        eid = row.get("id")
        title = row.get("title")
        if isinstance(eid, str) and isinstance(title, str):
            items.append({"id": eid, "title": title})
    return {"items": items}


@app.post("/chat", response_model=ChatResponse)
def post_chat(body: ChatRequest) -> ChatResponse:
    if body.exercise_id and str(body.exercise_id).strip():
        eid = body.exercise_id.strip()
        for row in _get_exercises_data().get("items") or []:
            if not isinstance(row, dict):
                continue
            if row.get("id") == eid:
                return ChatResponse(
                    answer="",
                    video=row.get("video"),
                    exercise_title=row.get("title"),
                    how_to=row.get("how_to"),
                    avoid=row.get("avoid"),
                )
        return ChatResponse(answer="Такого упражнения нет в списке. Выберите другое.")

    data = _get_chatbot_data()
    default = data.get("default", {})
    default_answer = default.get("answer", "Не понял запрос.")
    default_video = default.get("video")

    text = body.message.lower().strip()
    for rule in data.get("rules", []):
        keywords = rule.get("keywords") or []
        if any(kw.lower() in text for kw in keywords):
            return ChatResponse(
                answer=rule.get("answer", default_answer),
                video=rule.get("video"),
            )
    return ChatResponse(answer=default_answer, video=default_video)


# API routes must be registered before the static mount
if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
else:
    @app.get("/")
    def _missing_frontend():
        raise HTTPException(
            status_code=500,
            detail=f"Frontend folder not found: {FRONTEND_DIR}",
        )
