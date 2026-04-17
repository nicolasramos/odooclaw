package odoo

import (
	"github.com/nicolasramos/odooclaw/pkg/bus"
	"github.com/nicolasramos/odooclaw/pkg/channels"
	"github.com/nicolasramos/odooclaw/pkg/config"
)

func init() {
	channels.RegisterFactory("odoo", func(cfg *config.Config, b *bus.MessageBus) (channels.Channel, error) {
		return NewOdooChannel(cfg.Channels.Odoo, b)
	})
}
