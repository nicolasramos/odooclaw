package main

import (
	"os"
	"path/filepath"
)

// scratchDB returns the path of a throwaway SQLite file for this run.
//
// It is unique per run on purpose: the demo must be reproducible, and a store
// that survives between runs would make the second run silent for a reason that
// has nothing to do with what is being demonstrated. Durability across restarts
// has its own test (TestStoreDurabilityAcrossRestart), where it can be asserted
// rather than accidentally observed.
func scratchDB() string {
	f, err := os.CreateTemp("", "odooclaw-proactive-demo-*.db")
	if err != nil {
		// Fall back to a fixed name in the temp dir; a demo must not fail here.
		return filepath.Join(os.TempDir(), "odooclaw-proactive-demo.db")
	}
	path := f.Name()
	f.Close()
	// Start from an empty file so the schema is created fresh.
	os.Remove(path)
	return path
}
