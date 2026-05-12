from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.3-70b-versatile", alias="GROQ_MODEL")

    pinecone_api_key: str = Field(default="", alias="PINECONE_API_KEY")
    pinecone_index: str = Field(default="rag-chatbot", alias="PINECONE_INDEX")
    pinecone_cloud: str = Field(default="aws", alias="PINECONE_CLOUD")
    pinecone_region: str = Field(default="us-east-1", alias="PINECONE_REGION")

    embed_model: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2", alias="EMBED_MODEL"
    )
    embed_dim: int = 384

    rerank_model: str = Field(
        default="cross-encoder/ms-marco-MiniLM-L-6-v2", alias="RERANK_MODEL"
    )

    chunk_size: int = Field(default=800, alias="CHUNK_SIZE")  # soft ceiling, in chars
    chunk_overlap: int = Field(default=120, alias="CHUNK_OVERLAP")  # in chars
    top_k: int = Field(default=10, alias="TOP_K")  # retrieve broader, then rerank
    top_k_rerank: int = Field(default=3, alias="TOP_K_RERANK")
    min_rerank_score: float = Field(default=0.1, alias="MIN_RERANK_SCORE")

    conversation_window: int = Field(default=6, alias="CONVERSATION_WINDOW")

    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173", alias="CORS_ORIGINS"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
