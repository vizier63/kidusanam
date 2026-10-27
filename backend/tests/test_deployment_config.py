from app.core.database import normalize_database_url
from app.main import parse_frontend_origins


def test_postgres_urls_select_psycopg_driver() -> None:
    assert normalize_database_url(
        "postgres://user:pass@host/db"
    ) == "postgresql+psycopg://user:pass@host/db"
    assert normalize_database_url(
        "postgresql://user:pass@host/db"
    ) == "postgresql+psycopg://user:pass@host/db"
    assert normalize_database_url(
        "sqlite:///./wellai.db"
    ) == "sqlite:///./wellai.db"


def test_frontend_origins_are_trimmed_for_cors() -> None:
    assert parse_frontend_origins(None) == ["http://localhost:5173"]
    assert parse_frontend_origins(
        " https://wellai.vercel.app/ , https://preview.vercel.app "
    ) == ["https://wellai.vercel.app", "https://preview.vercel.app"]
    assert parse_frontend_origins(" , ") == []
