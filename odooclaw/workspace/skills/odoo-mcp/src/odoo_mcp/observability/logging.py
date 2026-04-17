import logging

def get_logger(name: str) -> logging.Logger:
    """Returns a configured logger for the MCP components."""
    # Custom formatters or handlers could be attached here
    logger = logging.getLogger(f"odoo_mcp.{name}")
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger
