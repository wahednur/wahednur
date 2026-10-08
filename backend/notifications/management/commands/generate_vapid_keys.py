import base64

from cryptography.hazmat.primitives import serialization
from django.core.management.base import BaseCommand
from py_vapid import Vapid


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


class Command(BaseCommand):
    help = "Print a new VAPID key pair for web push. Run once; keep the private key secret."

    def handle(self, *args, **options):
        vapid = Vapid()
        vapid.generate_keys()
        public = vapid.public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
        private = vapid.private_key.private_numbers().private_value.to_bytes(32, "big")
        self.stdout.write(f"VAPID_PUBLIC_KEY={_b64(public)}")
        self.stdout.write(f"VAPID_PRIVATE_KEY={_b64(private)}")
        self.stdout.write("Put both in the API's environment (Dokploy), then redeploy. Never commit the private key.")
