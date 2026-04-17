package main

import (
	"fmt"
	"os"

	"github.com/nicolasramos/odooclaw/cmd/odooclaw-launcher-tui/internal/ui"
)

func main() {
	if err := ui.Run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
