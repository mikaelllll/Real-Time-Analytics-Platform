from sqlalchemy import DateTime, Float, Integer, String, func
from sqlalchemy.ext.asyncio import AsyncAttrs, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import get_settings


class Base(AsyncAttrs, DeclarativeBase):
    pass


class CollectionRun(Base):
    __tablename__ = "collection_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    collected_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    aircraft_count: Mapped[int] = mapped_column(Integer)
    airborne_count: Mapped[int] = mapped_column(Integer)
    country_count: Mapped[int] = mapped_column(Integer)
    provider_latency_ms: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(32), default="healthy")


settings = get_settings()
engine = create_async_engine(settings.database_url, pool_pre_ping=True)
Session = async_sessionmaker(engine, expire_on_commit=False)


async def initialise_database() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
