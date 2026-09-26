package knowledge

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// KnowledgeCLI provides knowledge base commands for the odooclaw CLI.
type KnowledgeCLI struct {
	workspace string
}

// NewKnowledgeCLI creates a new knowledge CLI handler.
func NewKnowledgeCLI(workspace string) *KnowledgeCLI {
	return &KnowledgeCLI{workspace: workspace}
}

// Add handles `odooclaw knowledge add` - adds a knowledge entry.
func (cli *KnowledgeCLI) Add(title, content, category, tags, aliases, riskLevel string) error {
	if title == "" || content == "" {
		return fmt.Errorf("title and content are required")
	}

	if category == "" {
		category = "tool_usage"
	}
	if riskLevel == "" {
		riskLevel = "low"
	}

	kbDir := filepath.Join(cli.workspace, "knowledge")
	if err := os.MkdirAll(kbDir, 0o755); err != nil {
		return fmt.Errorf("failed to create knowledge directory: %w", err)
	}

	safeName := strings.ToLower(strings.ReplaceAll(title, " ", "-"))
	safeName = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		return '-'
	}, safeName)
	safeName = strings.TrimSuffix(safeName, "-")
	filename := safeName + ".md"
	filepath := filepath.Join(kbDir, filename)

	var sb strings.Builder
	sb.WriteString("---\n")
	sb.WriteString(fmt.Sprintf("title: %s\n", title))
	sb.WriteString(fmt.Sprintf("category: %s\n", category))
	if tags != "" {
		sb.WriteString(fmt.Sprintf("tags: %s\n", tags))
	}
	if aliases != "" {
		sb.WriteString(fmt.Sprintf("aliases: %s\n", aliases))
	}
	if riskLevel != "low" {
		sb.WriteString(fmt.Sprintf("risk_level: %s\n", riskLevel))
	}
	sb.WriteString("---\n\n")
	sb.WriteString(content)

	if err := os.WriteFile(filepath, []byte(sb.String()), 0o644); err != nil {
		return fmt.Errorf("failed to write knowledge file: %w", err)
	}

	fmt.Printf("Knowledge entry added: %s\n", title)
	return nil
}

// Index handles `odooclaw knowledge index` - indexes all .md files.
func (cli *KnowledgeCLI) Index() error {
	kb, err := NewKnowledgeBase(cli.workspace)
	if err != nil {
		return fmt.Errorf("failed to create knowledge base: %w", err)
	}
	defer kb.Close()

	count, err := kb.SyncKnowledge(cli.workspace)
	if err != nil {
		return fmt.Errorf("sync failed: %w", err)
	}

	fmt.Printf("Indexed %d knowledge files\n", count)
	return nil
}

// Search handles `odooclaw knowledge search` - searches the knowledge base.
func (cli *KnowledgeCLI) Search(query string, limit int) error {
	if limit <= 0 {
		limit = 5
	}

	kb, err := NewKnowledgeBase(cli.workspace)
	if err != nil {
		return fmt.Errorf("failed to create knowledge base: %w", err)
	}
	defer kb.Close()

	results, err := kb.Search(query, "", limit)
	if err != nil {
		return fmt.Errorf("search failed: %w", err)
	}

	if len(results) == 0 {
		fmt.Println("No results found")
		return nil
	}

	for i, entry := range results {
		fmt.Printf("\n%d. %s [%s]\n", i+1, entry.Title, entry.Category)
		for _, tag := range entry.Tags {
			fmt.Printf("   #%s\n", tag)
		}
		// Show first 200 chars of content
		content := entry.Content
		if len(content) > 200 {
			content = content[:200] + "..."
		}
		fmt.Printf("   %s\n", content)
	}

	return nil
}

// List handles `odooclaw knowledge list` - lists all knowledge entries.
func (cli *KnowledgeCLI) List() error {
	kb, err := NewKnowledgeBase(cli.workspace)
	if err != nil {
		return fmt.Errorf("failed to create knowledge base: %w", err)
	}
	defer kb.Close()

	results, err := kb.Search("", "", 1000)
	if err != nil {
		return fmt.Errorf("list failed: %w", err)
	}

	if len(results) == 0 {
		fmt.Println("No knowledge entries found")
		return nil
	}

	fmt.Printf("Knowledge base: %s\n", kb.DBPath())
	fmt.Printf("Total entries: %d\n\n", len(results))

	for i, entry := range results {
		fmt.Printf("%d. [%s] %s", i+1, entry.Category, entry.Title)
		if len(entry.Tags) > 0 {
			fmt.Printf(" (%s)", strings.Join(entry.Tags, ", "))
		}
		fmt.Println()
	}

	return nil
}
