"""Acesso ao bucket de fotos, atrás de uma interface pequena.

O fornecedor de hoje é o Supabase Storage pela API S3, mas nada fora deste módulo
sabe disso: trocar para R2 ou S3 é trocar variáveis de ambiente.
"""
import uuid
from typing import Protocol

import boto3
from botocore.client import Config

from app.core.config import settings

EXTENSION_BY_CONTENT_TYPE = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

# Limite do bucket. O navegador já reduz a imagem antes de enviar; esta validação
# é rede de segurança, não o caminho normal.
MAX_PHOTO_BYTES = 1_048_576

# Capa + 3. O layout da página do animal é desenhado para exatamente isso.
MAX_PHOTOS_PER_ANIMAL = 4


def build_storage_key(content_type: str) -> str:
    """Nome do objeto no bucket, sempre gerado aqui.

    O nome enviado pelo cliente nunca é usado: é vetor de path traversal e não
    acrescenta nada, já que a foto é identificada pela linha no banco.
    """
    return f"animals/{uuid.uuid4()}.{EXTENSION_BY_CONTENT_TYPE[content_type]}"


def resolve_photo_url(storage_key: str, is_external: bool) -> str:
    """URL pública da foto.

    Fotos com ``is_external`` já guardam a URL inteira em ``storage_key`` — é como o
    seed sobrevive sem internet e como as ``photo_url`` legadas foram migradas.
    """
    if is_external:
        return storage_key
    return f"{settings.storage_public_url.rstrip('/')}/{storage_key}"


class Storage(Protocol):
    def save(self, data: bytes, content_type: str) -> str: ...
    def delete(self, key: str) -> None: ...
    def url(self, key: str) -> str: ...


class S3Storage:
    def __init__(
        self,
        bucket: str,
        endpoint: str,
        region: str,
        access_key: str,
        secret_key: str,
        public_url: str,
    ) -> None:
        self._bucket = bucket
        self._public_url = public_url
        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            # O Supabase só aceita path-style; sem isto o boto3 tenta bucket.endpoint
            # e a conexão falha.
            config=Config(s3={"addressing_style": "path"}),
        )

    def save(self, data: bytes, content_type: str) -> str:
        key = build_storage_key(content_type)
        self._client.put_object(
            Bucket=self._bucket, Key=key, Body=data, ContentType=content_type
        )
        return key

    def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=key)

    def url(self, key: str) -> str:
        # Usa o valor recebido no construtor, não o global: quem constrói a instância
        # com outro bucket precisa que a URL acompanhe.
        return f"{self._public_url.rstrip('/')}/{key}"


def get_storage() -> Storage:
    """Dependência do FastAPI. Os testes sobrescrevem isto — nenhum teste toca a rede."""
    return S3Storage(
        bucket=settings.storage_bucket,
        endpoint=settings.storage_endpoint,
        region=settings.storage_region,
        access_key=settings.storage_access_key,
        secret_key=settings.storage_secret_key,
        public_url=settings.storage_public_url,
    )
