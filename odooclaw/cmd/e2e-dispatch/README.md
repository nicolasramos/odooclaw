# e2e-dispatch — cross-repo contract probe

Drives the signal payloads a **live Odoo 18 database** ships (dumped from
`mail.odooclaw.area` rows, not from the XML source) through the real engine over
the real HTTP handler, and reports any signal that resolves to no playbook.

A unit test asserts the table it was written with; this takes the Odoo side as
**input**, so it fails when Odoo changes and the engine does not — the drift that
otherwise shows up only as the assistant going quiet in production.

```sh
# on the Odoo side
/opt/odoo-venv/bin/python3 dump_areas.py <db> > areas.json
# here
go run ./cmd/e2e-dispatch areas.json
```

Exit 0 = every shipped signal resolves; 1 = at least one goes silent.
