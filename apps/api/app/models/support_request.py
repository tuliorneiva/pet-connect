from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SupportRequest(Base):
    __tablename__ = "support_request"

    id: Mapped[int] = mapped_column(primary_key=True)
    animal_id: Mapped[int] = mapped_column(ForeignKey("animal.id"))
    org_id: Mapped[int] = mapped_column(ForeignKey("organization.id"))
    type: Mapped[str] = mapped_column(String(20))  # adoção / lar_temporário / apadrinhamento
    requester_name: Mapped[str] = mapped_column(String(160))
    requester_email: Mapped[str] = mapped_column(String(255))
    requester_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="nova")  # nova/em_análise/aprovada/recusada/concluída
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
