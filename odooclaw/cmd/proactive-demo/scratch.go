package main

import (
	"os"
	"path/filepath"
)

// scratchDB returns the path of a throwaway SQLite file for the demo. It uses
// the system temp dir so repeated runs start clean, which is what makes the
// cooldown demonstration meaningful.
func scratchDB() string {
	return filepath.Join(os.TempDir(), "odooclaw-proactive-demo.db")
}
