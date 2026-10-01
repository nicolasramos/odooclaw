package knowledge

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestPersistence_ReopenKeepsIngestedMarkdown is the network that prevents the
// KB from silently regressing to :memory:. It exercises the full live path:
// create a persistent KB on disk → ingest a .md from the knowledge dir →
// close → open a NEW instance against the same file → Search with a natural
// language query must still find the entry.
func TestPersistence_ReopenKeepsIngestedMarkdown(t *testing.T) {
	tmp := t.TempDir()
	kbDir := filepath.Join(tmp, "knowledge")
	require.NoError(t, os.MkdirAll(kbDir, 0o755))

	mdPath := filepath.Join(kbDir, "verifactu.md")
	require.NoError(t, os.WriteFile(mdPath, []byte(
		"# Configurar VeriFactu en Odoo\n\n"+
			"Para configurar el VeriFactu en Odoo hay que activar el módulo español "+
			"de facturación electrónica, registrar el certificado digital y ejecutar "+
			"la sincronización del régimen VeriFactu desde Contabilidad.\n"), 0o644))

	dbPath := filepath.Join(kbDir, "kb.sqlite")

	// First instance: index the directory.
	kb1, err := NewKnowledgeBaseAt(dbPath)
	require.NoError(t, err)
	added, err := kb1.SyncDirectory(kbDir)
	require.NoError(t, err)
	assert.Equal(t, 1, added)
	require.NoError(t, kb1.Close())

	// The sqlite file must exist on disk (not :memory:).
	info, err := os.Stat(dbPath)
	require.NoError(t, err)
	assert.Greater(t, info.Size(), int64(0))

	// Second instance: fresh handle, same file. The entry must survive.
	kb2, err := NewKnowledgeBaseAt(dbPath)
	require.NoError(t, err)
	defer kb2.Close()

	assert.Equal(t, 1, kb2.Count())

	// Natural-language query — the exact failure mode reported in NRA-3845:
	// raw-query MATCH returned 0 rows for conversational Spanish.
	results, err := kb2.Search("cómo configuro el VeriFactu en Odoo", "", 5)
	require.NoError(t, err)
	require.NotEmpty(t, results, "persisted entry must be retrievable after reopen with a natural query")
	assert.Contains(t, results[0].Title, "VeriFactu")
}

// TestSyncDirectory_NFCNormalization: NAS/macOS deliver filenames and content
// in NFD. Indexed content must be NFC-normalized so queries normalize the
// same way and match.
func TestSyncDirectory_NFCNormalization(t *testing.T) {
	tmp := t.TempDir()
	kbDir := filepath.Join(tmp, "knowledge")
	require.NoError(t, os.MkdirAll(kbDir, 0o755))

	// "facturación" written in NFD (a + combining acute U+0301).
	nfd := "configuraci\u00f3n de la facturaci\u00f3n electr\u00f3nica" // already composed? force decomposed below
	nfdDecomposed := "configuracion\u0301 de la facturacion\u0301 electroni\u0301ca"
	require.NotEqual(t, nfd, nfdDecomposed)
	require.NoError(t, os.WriteFile(filepath.Join(kbDir, "nfd.md"), []byte("# "+nfdDecomposed+"\n\ntexto de prueba\n"), 0o644))

	kb, err := NewKnowledgeBaseAt(filepath.Join(tmp, "kb.sqlite"))
	require.NoError(t, err)
	defer kb.Close()

	_, err = kb.SyncDirectory(kbDir)
	require.NoError(t, err)

	// Query with the NFC (composed) form must match the NFD-stored file.
	results, err := kb.Search("facturación electrónica", "", 5)
	require.NoError(t, err)
	require.NotEmpty(t, results, "NFD content must be findable with an NFC query")
}

// TestSyncDirectory_ResyncUpdatesAndDeletesFiles verifies incremental sync:
// modified files are re-indexed, removed files disappear from the KB.
func TestSyncDirectory_ResyncUpdatesAndDeletesFiles(t *testing.T) {
	tmp := t.TempDir()
	kbDir := filepath.Join(tmp, "knowledge")
	require.NoError(t, os.MkdirAll(kbDir, 0o755))

	a := filepath.Join(kbDir, "a.md")
	b := filepath.Join(kbDir, "b.md")
	require.NoError(t, os.WriteFile(a, []byte("# Alpha\n\nalpha zebra content\n"), 0o644))
	require.NoError(t, os.WriteFile(b, []byte("# Beta\n\nbeta yak content\n"), 0o644))

	kb, err := NewKnowledgeBaseAt(filepath.Join(tmp, "kb.sqlite"))
	require.NoError(t, err)
	defer kb.Close()

	added, err := kb.SyncDirectory(kbDir)
	require.NoError(t, err)
	assert.Equal(t, 2, added)
	assert.Equal(t, 2, kb.Count())

	// Modify a.md
	require.NoError(t, os.WriteFile(a, []byte("# Alpha v2\n\nalpha updated walrus content\n"), 0o644))
	// Remove b.md
	require.NoError(t, os.Remove(b))

	added, err = kb.SyncDirectory(kbDir)
	require.NoError(t, err)
	assert.Equal(t, 1, added, "only the modified file should be (re)ingested")
	assert.Equal(t, 1, kb.Count(), "deleted file must leave the KB")

	res, err := kb.Search("walrus", "", 5)
	require.NoError(t, err)
	assert.NotEmpty(t, res)

	res, err = kb.Search("yak", "", 5)
	require.NoError(t, err)
	assert.Empty(t, res, "removed file must not be findable")
}

// TestSearch_NaturalLanguageOrMatching locks the NRA-3845 fix: a conversational
// multi-word query must match via OR-tokenization instead of the old raw MATCH
// (implicit AND over the whole sentence, which returned 0 rows).
func TestSearch_NaturalLanguageOrMatching(t *testing.T) {
	kb, err := NewKnowledgeBase()
	require.NoError(t, err)
	defer kb.Close()

	require.NoError(t, kb.Add(KnowledgeEntry{
		Category: CatOdooModule,
		Title:    "VeriFactu configuration",
		Content:  "Steps to activate the VeriFactu electronic invoicing regime in Odoo accounting.",
		Tags:     []string{"verifactu", "facturacion"},
	}))

	// The old code passed this raw sentence to MATCH and got nothing.
	results, err := kb.Search("cómo configuro el VeriFactu en Odoo", "", 5)
	require.NoError(t, err)
	assert.NotEmpty(t, results)

	// Stopword-only queries must not crash and must not match everything.
	results, err = kb.Search("de la", "", 5)
	require.NoError(t, err)
	assert.Empty(t, results)
}
