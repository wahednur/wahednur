from billing.serializers import exact


def subscription_out(s):
    return exact(
        {
            "id": s.id,
            "title": s.title,
            "client_email": s.client.email,
            "project": s.project_id,
            "unit_price": s.unit_price,
            "currency": s.currency,
            "cycle": s.cycle,
            "status": s.status,
            "start_date": s.start_date,
            "next_billing_date": s.next_billing_date if s.status == "active" else None,
            "invoices": [str(c.invoice_id) for c in s.charges.all()],
        }
    )
