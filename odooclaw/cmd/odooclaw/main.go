// OdooClaw - Ultra-lightweight personal AI agent
// Inspired by and based on nanobot: https://github.com/HKUDS/nanobot
// License: MIT
//
// Copyright (c) 2026 OdooClaw contributors

package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/nicolasramos/odooclaw/cmd/odooclaw/internal"
	"github.com/nicolasramos/odooclaw/cmd/odooclaw/internal/agent"
	"github.com/nicolasramos/odooclaw/cmd/odooclaw/internal/auth"
	"github.com/nicolasramos/odooclaw/cmd/odooclaw/internal/cron"
	"github.com/nicolasramos/odooclaw/cmd/odooclaw/internal/gateway"
	"github.com/nicolasramos/odooclaw/cmd/odooclaw/internal/migrate"
	"github.com/nicolasramos/odooclaw/cmd/odooclaw/internal/onboard"
	"github.com/nicolasramos/odooclaw/cmd/odooclaw/internal/skills"
	"github.com/nicolasramos/odooclaw/cmd/odooclaw/internal/status"
	"github.com/nicolasramos/odooclaw/cmd/odooclaw/internal/version"
)

func NewOdooclawCommand() *cobra.Command {
	short := fmt.Sprintf("%s odooclaw - Personal AI Assistant v%s\n\n", internal.Logo, internal.GetVersion())

	cmd := &cobra.Command{
		Use:     "odooclaw",
		Short:   short,
		Example: "odooclaw list",
	}

	cmd.AddCommand(
		onboard.NewOnboardCommand(),
		agent.NewAgentCommand(),
		auth.NewAuthCommand(),
		gateway.NewGatewayCommand(),
		status.NewStatusCommand(),
		cron.NewCronCommand(),
		migrate.NewMigrateCommand(),
		skills.NewSkillsCommand(),
		version.NewVersionCommand(),
	)

	return cmd
}

const (
	colorBlue = "\033[1;38;2;62;93;185m"
	colorRed  = "\033[1;38;2;213;70;70m"
	banner    = "\r\n" +
		colorBlue + " ██████╗ ██████╗  ██████╗  ██████╗  ██████╗██╗      █████╗ ██╗    ██╗\n" +
		colorBlue + "██╔═══██╗██╔══██╗██╔═══██╗██╔═══██╗██╔════╝██║     ██╔══██╗██║    ██║\n" +
		colorBlue + "██║   ██║██║  ██║██║   ██║██║   ██║██║     ██║     ███████║██║ █╗ ██║\n" +
		colorRed + "██║   ██║██║  ██║██║   ██║██║   ██║██║     ██║     ██╔══██║██║███╗██║\n" +
		colorRed + "╚██████╔╝██████╔╝╚██████╔╝╚██████╔╝╚██████╗███████╗██║  ██║╚███╔███╔╝\n" +
		colorRed + " ╚═════╝ ╚═════╝  ╚═════╝  ╚═════╝  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝\n" +
		"\033[0m\r\n"
)

func main() {
	fmt.Printf("%s", banner)
	cmd := NewOdooclawCommand()
	if err := cmd.Execute(); err != nil {
		os.Exit(1)
	}
}
