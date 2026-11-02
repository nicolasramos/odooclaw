import os
import logging

_LOG_LEVELS = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "WARN": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}


def get_logger(name: str) -> logging.Logger:
    """Returns a configured logger for the MCP components."""
    logger = logging.getLogger(f"odoo_mcp.{name}")
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        env_level = os.environ.get("LOG_LEVEL", "INFO").upper()
        logger.setLevel(_LOG_LEVELS.get(env_level, logging.INFO))
    return logger
