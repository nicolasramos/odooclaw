package knowledge

import (
	"strings"

	"github.com/nicolasramos/odooclaw/pkg/tools"
)

// Indexer enriches a ToolRegistry with knowledge entries for every registered tool.
type Indexer struct {
	kb *KnowledgeBase
}

// NewIndexer creates an indexer backed by the given knowledge base.
func NewIndexer(kb *KnowledgeBase) *Indexer {
	return &Indexer{kb: kb}
}

// IndexAll indexes every tool in the registry with enriched metadata.
func (idx *Indexer) IndexAll(registry *tools.ToolRegistry) error {
	tools := registry.List()
	for _, name := range tools {
		if err := idx.indexTool(registry, name); err != nil {
			return err
		}
	}
	return nil
}

// indexTool enriches a single tool with aliases, risk level, dependencies, examples.
func (idx *Indexer) indexTool(registry *tools.ToolRegistry, name string) error {
	tool, ok := registry.Get(name)
	if !ok {
		return nil // skip unregistered tools
	}

	tk := idx.enrichTool(name, tool)
	return idx.kb.RegisterToolKnowledge(tk)
}

// enrichTool builds a ToolKnowledge struct from a registered tool.
func (idx *Indexer) enrichTool(name string, tool tools.Tool) ToolKnowledge {
	tk := ToolKnowledge{
		ToolName:  name,
		Metadata:  make(map[string]string),
	}

	desc := tool.Description()
	tk.Description = desc

	// Infer module from tool name patterns
	tk.Category, tk.Metadata["module"] = inferModule(name, desc)

	// Infer risk level
	tk.RiskLevel = inferRiskLevel(name, desc)

	// Generate aliases from tool name
	tk.Aliases = generateAliases(name)

	// Infer dependencies (tools this tool calls internally)
	tk.Dependencies = inferDependencies(name)

	// Generate usage examples
	tk.Examples = generateExamples(name, desc)

	// Add tags from description keywords
	tk.Tags = extractTags(name, desc)

	return tk
}

// inferModule guesses the Odoo module from tool name and description.
func inferModule(name, desc string) (Category, string) {
	nameLower := strings.ToLower(name)
	descLower := strings.ToLower(desc)

	// Check for Odoo module keywords in name or description
	moduleMap := map[string]string{
		"crm":       "crm",
		"lead":      "crm",
		"opportunity": "crm",
		"sale":      "sale",
		"order":     "sale",
		"quotation": "sale",
		"stock":     "stock",
		"inventor":  "stock",
		"warehouse": "stock",
		"picking":   "stock",
		"account":   "account",
		"invoic":    "account",
		"payment":   "account",
		"invoice":   "account",
		"hr":        "hr",
		"employee":  "hr",
		"attendance":"hr",
		"leave":     "hr",
		"purchase":  "purchase",
		"rfq":       "purchase",
		"product":   "product",
		"partner":   "res",
		"contact":   "res",
	}

	for keyword, module := range moduleMap {
		if strings.Contains(nameLower, keyword) || strings.Contains(descLower, keyword) {
			return CatToolUsage, module
		}
	}

	// Default: general tools
	return CatToolUsage, "general"
}

// inferRiskLevel classifies a tool's risk level.
func inferRiskLevel(name, desc string) RiskLevel {
	nameLower := strings.ToLower(name)
	descLower := strings.ToLower(desc)

	// Critical: financial/legal operations
	criticalKeywords := []string{"delete", "remove", "cancel", "void", "unlink", "post", "validate", "confirm"}
	for _, kw := range criticalKeywords {
		if strings.Contains(nameLower, kw) || strings.Contains(descLower, kw) {
			return RiskHigh
		}
	}

	// High: destructive or irreversible
	highKeywords := []string{"write", "edit", "append", "modify", "update"}
	for _, kw := range highKeywords {
		if strings.Contains(nameLower, kw) || strings.Contains(descLower, kw) {
			return RiskMedium
		}
	}

	// Medium: creates/modifies data
	mediumKeywords := []string{"create", "spawn", "execute", "run", "install"}
	for _, kw := range mediumKeywords {
		if strings.Contains(nameLower, kw) || strings.Contains(descLower, kw) {
			return RiskMedium
		}
	}

	// Low: read-only operations
	return RiskLow
}

// generateAliases creates alias variations for a tool name.
func generateAliases(name string) []string {
	var aliases []string

	// Convert snake_case to readable phrases
	parts := strings.Split(name, "_")
	if len(parts) > 1 {
		var readable []string
		for _, p := range parts {
			if p != "mcp" { // skip MCP prefix
				readable = append(readable, p)
			}
		}
		if len(readable) > 1 {
			aliases = append(aliases, strings.Join(readable, " "))
		}
	}

	// Add common synonym patterns
	nameLower := strings.ToLower(name)
	if strings.Contains(nameLower, "search") || strings.Contains(nameLower, "find") {
		aliases = append(aliases, "buscar", "encontrar", "query")
	}
	if strings.Contains(nameLower, "read") || strings.Contains(nameLower, "file") {
		aliases = append(aliases, "leer", "abrir archivo")
	}
	if strings.Contains(nameLower, "write") || strings.Contains(nameLower, "edit") {
		aliases = append(aliases, "escribir", "modificar archivo")
	}

	return aliases
}

// inferDependencies guesses which tools a tool depends on.
func inferDependencies(name string) []string {
	var deps []string

	nameLower := strings.ToLower(name)

	// File tools depend on read_file
	if strings.Contains(nameLower, "edit") || strings.Contains(nameLower, "append") {
		deps = append(deps, "read_file")
	}

	// Spawn depends on subagent
	if strings.Contains(nameLower, "spawn") {
		deps = append(deps, "subagent")
	}

	// Memory tools depend on memory_search
	if strings.Contains(nameLower, "memory") {
		deps = append(deps, "memory_search")
	}

	return deps
}

// generateExamples creates usage examples for a tool.
func generateExamples(name, desc string) []string {
	var examples []string

	nameLower := strings.ToLower(name)

	switch {
	case strings.Contains(nameLower, "read_file"):
		examples = append(examples, "read_file(path=\"/path/to/file.txt\")")
	case strings.Contains(nameLower, "write_file"):
		examples = append(examples, "write_file(path=\"/path/to/file.txt\", content=\"hello\")")
	case strings.Contains(nameLower, "search_crm"):
		examples = append(examples, "search_crm_leads(query=\"acme\", type=\"lead\")")
	case strings.Contains(nameLower, "create_invoice"):
		examples = append(examples, "create_invoice(partner_id=42, amount=100.0)")
	case strings.Contains(nameLower, "exec"):
		examples = append(examples, "exec(command=\"ls -la\", working_dir=\"/tmp\")")
	case strings.Contains(nameLower, "spawn"):
		examples = append(examples, "spawn(agent=\"architect\", task=\"refactor module X\")")
	case strings.Contains(nameLower, "memory"):
		examples = append(examples, "memory_save(title=\"decision\", content=\"we chose option A\")")
	case strings.Contains(nameLower, "web_search"):
		examples = append(examples, "web_search(query=\"odoo best practices\", max_results=5)")
	default:
		examples = append(examples, name+"(param=\"value\")")
	}

	return examples
}

// extractTags extracts relevant tags from tool name and description.
func extractTags(name, desc string) []string {
	var tags []string

	nameLower := strings.ToLower(name)
	descLower := strings.ToLower(desc)

	// Add tool: tag for the tool itself
	tags = append(tags, "tool:"+name)

	// Domain tags from keywords
	domainKeywords := map[string]string{
		"crm":       "crm",
		"lead":      "crm",
		"sale":      "sale",
		"order":     "sale",
		"stock":     "stock",
		"inventor":  "stock",
		"account":   "account",
		"invoic":    "account",
		"hr":        "hr",
		"employee":  "hr",
		"purchase":  "purchase",
		"product":   "product",
		"partner":   "res",
		"file":      "filesystem",
		"shell":     "shell",
		"web":       "web",
		"memory":    "memory",
		"spawn":     "subagent",
		"mcp":       "mcp",
		"skill":     "skills",
		"cron":      "automation",
		"i2c":       "hardware",
		"spi":       "hardware",
	}

	for keyword, tag := range domainKeywords {
		if strings.Contains(nameLower, keyword) || strings.Contains(descLower, keyword) {
			tags = append(tags, tag)
		}
	}

	return tags
}
