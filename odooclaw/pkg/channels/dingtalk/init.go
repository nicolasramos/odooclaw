package dingtalk

import (
	"github.com/nicolasramos/odooclaw/pkg/bus"
	"github.com/nicolasramos/odooclaw/pkg/channels"
	"github.com/nicolasramos/odooclaw/pkg/config"
)

func init() {
	channels.RegisterFactory("dingtalk", func(cfg *config.Config, b *bus.MessageBus) (channels.Channel, error) {
		return NewDingTalkChannel(cfg.Channels.DingTalk, b)
	})
}
