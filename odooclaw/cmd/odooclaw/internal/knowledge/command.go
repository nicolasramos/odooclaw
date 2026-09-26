package knowledge

import (
	"github.com/nicolasramos/odooclaw/pkg/knowledge"
	"github.com/spf13/cobra"
)

func NewKnowledgeCommand(workspace string) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "knowledge",
		Short: "Manage the knowledge base",
	}

	// Add command
	var title, content, category, tags, aliases, riskLevel string
	addCmd := &cobra.Command{
		Use:   "add",
		Short: "Add a knowledge entry",
		RunE: func(cmd *cobra.Command, _ []string) error {
			cli := knowledge.NewKnowledgeCLI(workspace)
			return cli.Add(title, content, category, tags, aliases, riskLevel)
		},
	}
	addCmd.Flags().StringVarP(&title, "title", "t", "", "Title of the entry (required)")
	addCmd.Flags().StringVarP(&content, "content", "c", "", "Content of the entry (required)")
	addCmd.Flags().StringVar(&category, "category", "tool_usage", "Category: tool_usage, odoo_module, workflow")
	addCmd.Flags().StringVar(&tags, "tags", "", "Comma-separated tags")
	addCmd.Flags().StringVar(&aliases, "aliases", "", "Comma-separated aliases")
	addCmd.Flags().StringVar(&riskLevel, "risk-level", "low", "Risk level: low, medium, high, critical")
	addCmd.MarkFlagRequired("title")
	addCmd.MarkFlagRequired("content")
	cmd.AddCommand(addCmd)

	// Index command
	indexCmd := &cobra.Command{
		Use:   "index",
		Short: "Index all .md files in knowledge directory",
		RunE: func(_ *cobra.Command, _ []string) error {
			cli := knowledge.NewKnowledgeCLI(workspace)
			return cli.Index()
		},
	}
	cmd.AddCommand(indexCmd)

	// Search command
	var searchLimit int
	searchCmd := &cobra.Command{
		Use:   "search [query]",
		Short: "Search the knowledge base",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(_ *cobra.Command, args []string) error {
			cli := knowledge.NewKnowledgeCLI(workspace)
			if searchLimit <= 0 {
				searchLimit = 5
			}
			return cli.Search(args[0], searchLimit)
		},
	}
	searchCmd.Flags().IntVarP(&searchLimit, "limit", "l", 5, "Max results")
	cmd.AddCommand(searchCmd)

	// List command
	listCmd := &cobra.Command{
		Use:   "list",
		Short: "List all knowledge entries",
		RunE: func(_ *cobra.Command, _ []string) error {
			cli := knowledge.NewKnowledgeCLI(workspace)
			return cli.List()
		},
	}
	cmd.AddCommand(listCmd)

	return cmd
}

func knowledgeCmd(workspace string) error {
	cmd := NewKnowledgeCommand(workspace)
	return cmd.Execute()
}
