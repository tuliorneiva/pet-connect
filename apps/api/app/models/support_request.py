import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SupportRequest(Base):
    __tablename__ = "support_request"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Solicitações são histórico de pessoas reais e sobrevivem à remoção do animal:
    # ON DELETE SET NULL preserva o registro com o nome do animal já desnormalizado.
    animal_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("animal.id", ondelete="SET NULL"), nullable=True
    )
    animal_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    org_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("organization.id"))
    type: Mapped[str] = mapped_column(String(20))  # adoção / lar_temporário / apadrinhamento
    requester_name: Mapped[str] = mapped_column(String(160))
    requester_email: Mapped[str] = mapped_column(String(255))
    requester_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="nova")  # nova/em_análise/aprovada/recusada/concluída
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
