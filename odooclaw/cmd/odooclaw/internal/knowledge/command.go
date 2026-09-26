package knowledge

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/nicolasramos/odooclaw/cmd/odooclaw/internal"
	agentpkg "github.com/nicolasramos/odooclaw/pkg/agent"
)

// NewKnowledgeCommand wires `odooclaw knowledge add|index|search|list`
// (NRA-3845). All subcommands operate on the persistent KB under the
// configured workspace: <workspace>/knowledge/kb.sqlite, with markdown
// sources in <workspace>/knowledge/*.md.
func NewKnowledgeCommand() *cobra.Command {
	var workspaceOverride string

	var store *agentpkg.KnowledgeStore
	resolve := func() (*agentpkg.KnowledgeStore, error) {
		if store != nil {
			return store, nil
		}
		ws := workspaceOverride
		if ws == "" {
			cfg, err := internal.LoadConfig()
			if err != nil {
				return nil, fmt.Errorf("error loading config: %w", err)
			}
			ws = cfg.WorkspacePath()
		}
		store = agentpkg.NewKnowledgeStore(ws)
		return store, nil
	}

	cmd := &cobra.Command{
		Use:   "knowledge",
		Short: "Manage the persistent knowledge base",
		Long: "Knowledge base (SQLite FTS5) stored under <workspace>/knowledge.\n" +
			"Markdown files dropped in that directory are indexed automatically;\n" +
			"these commands let you add, re-index, search and list entries by hand.",
	}

	addCmd := &cobra.Command{
		Use:   "add <title> <content>",
		Short: "Add a knowledge entry",
		Args:  cobra.ExactArgs(2),
		RunE: func(c *cobra.Command, args []string) error {
			ks, err := resolve()
			if err != nil {
				return err
			}
			category, _ := c.Flags().GetString("category")
			if category == "" {
				category = "workflow"
			}
			tags, _ := c.Flags().GetStringSlice("tags")
			if err := ks.AddKnowledge(args[0], args[1], category, tags); err != nil {
				return fmt.Errorf("failed to add knowledge: %w", err)
			}
			fmt.Printf("✓ Knowledge added: %s\n", args[0])
			return nil
		},
	}
	addCmd.Flags().String("category", "workflow", "Category: tool_usage, odoo_module, workflow, api_pattern, example, risk")
	addCmd.Flags().StringSlice("tags", nil, "Comma-separated tags, e.g. verifactu,account")

	indexCmd := &cobra.Command{
		Use:   "index",
		Short: "Re-index <workspace>/knowledge/*.md into the KB",
		RunE: func(_ *cobra.Command, _ []string) error {
			ks, err := resolve()
			if err != nil {
				return err
			}
			n, err := ks.Sync()
			if err != nil {
				return fmt.Errorf("index failed: %w", err)
			}
			fmt.Printf("✓ Indexed %d file(s) (total entries: %d)\n", n, ks.Count())
			return nil
		},
	}

	searchCmd := &cobra.Command{
		Use:   "search <query>",
		Short: "Search the knowledge base",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(c *cobra.Command, args []string) error {
			ks, err := resolve()
			if err != nil {
				return err
			}
			limit, _ := c.Flags().GetInt("limit")
			query := joinArgs(args)
			entries, err := ks.Search(query, limit)
			if err != nil {
				return fmt.Errorf("search failed: %w", err)
			}
			if len(entries) == 0 {
				fmt.Println("No results.")
				return nil
			}
			for i, e := range entries {
				fmt.Printf("%d. [%s] %s\n   %s\n", i+1, e.Category, e.Title, firstLine(e.Content))
			}
			return nil
		},
	}
	searchCmd.Flags().Int("limit", 5, "Maximum results")

	listCmd := &cobra.Command{
		Use:   "list",
		Short: "Show knowledge base status",
		RunE: func(_ *cobra.Command, _ []string) error {
			ks, err := resolve()
			if err != nil {
				return err
			}
			fmt.Printf("Knowledge base: %s\n", ks.DBPath())
			fmt.Printf("Entries: %d\n", ks.Count())
			return nil
		},
	}

	cmd.AddCommand(addCmd, indexCmd, searchCmd, listCmd)
	return cmd
}

func joinArgs(args []string) string {
	out := ""
	for i, a := range args {
		if i > 0 {
			out += " "
		}
		out += a
	}
	return out
}

func firstLine(s string) string {
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			return s[:i]
		}
	}
	if len(s) > 120 {
		return s[:120] + "…"
	}
	return s
}
