package configstore

import (
	"errors"
	"os"
	"path/filepath"

	odooclawconfig "github.com/nicolasramos/odooclaw/pkg/config"
)

const (
	configDirName  = ".odooclaw"
	configFileName = "config.json"
)

func ConfigPath() (string, error) {
	dir, err := ConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, configFileName), nil
}

func ConfigDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, configDirName), nil
}

func Load() (*odooclawconfig.Config, error) {
	path, err := ConfigPath()
	if err != nil {
		return nil, err
	}
	return odooclawconfig.LoadConfig(path)
}

func Save(cfg *odooclawconfig.Config) error {
	if cfg == nil {
		return errors.New("config is nil")
	}
	path, err := ConfigPath()
	if err != nil {
		return err
	}
	return odooclawconfig.SaveConfig(path, cfg)
}
