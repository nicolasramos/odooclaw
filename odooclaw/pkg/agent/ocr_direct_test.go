package agent

import "testing"

func TestFindInvoiceAttachment(t *testing.T) {
	cases := []struct {
		name     string
		msg      string
		wantID   int
		wantOK   bool
	}{
		{
			name:   "plain marker",
			msg:    "<p>Adjunto la factura</p>\n🧾 [Factura/Documento: factura_demo_odoo.pdf (ID: 876)]",
			wantID: 876,
			wantOK: true,
		},
		{
			name:   "marker with spaces in name",
			msg:    "🧾 [Factura/Documento: factura EN 2026.pdf (ID: 42)]",
			wantID: 42,
			wantOK: true,
		},
		{
			name:   "no marker",
			msg:    "Busca el cliente Acme",
			wantID: 0,
			wantOK: false,
		},
		{
			name:   "marker without id",
			msg:    "🧾 [Factura/Documento: algo.pdf]",
			wantID: 0,
			wantOK: false,
		},
		{
			name:   "marker with image",
			msg:    "Mira esto\n🧾 [Factura/Documento: recibo.jpg (ID: 7)]",
			wantID: 7,
			wantOK: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			id, ok := findInvoiceAttachment(tc.msg)
			if ok != tc.wantOK {
				t.Fatalf("findInvoiceAttachment(%q) ok = %v, want %v", tc.msg, ok, tc.wantOK)
			}
			if ok && id != tc.wantID {
				t.Fatalf("findInvoiceAttachment(%q) id = %d, want %d", tc.msg, id, tc.wantID)
			}
		})
	}
}

func TestFormatOCRResult(t *testing.T) {
	// Success payload with move_id + partner_id + linked
	out := formatOCRResult(876, `{"success": true, "move_id": 26, "partner_id": 45, "attachment_linked": true, "invoice_data": {}}`)
	if out == "" {
		t.Fatal("empty output for success payload")
	}
	if !contains(out, "/odoo/account.move/26") {
		t.Errorf("missing move link in: %s", out)
	}
	if !contains(out, "/odoo/contacts/45") {
		t.Errorf("missing partner link in: %s", out)
	}

	// Error payload
	errOut := formatOCRResult(876, `{"success": false, "isError": true, "content": "Vision extraction failed"}`)
	if !contains(errOut, "Vision extraction failed") {
		t.Errorf("missing error message in: %s", errOut)
	}

	// Raw non-JSON
	rawOut := formatOCRResult(876, "some plain text")
	if !contains(rawOut, "some plain text") {
		t.Errorf("missing raw text in: %s", rawOut)
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (func() bool {
		for i := 0; i+len(sub) <= len(s); i++ {
			if s[i:i+len(sub)] == sub {
				return true
			}
		}
		return false
	})()
}
