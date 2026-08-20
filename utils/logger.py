"""Utility for retrieving named loggers throughout the application."""

import logging
from config.logging_config import setup_logging
from config.settings import settings

# Initialize logging configuration once on module load
setup_logging(log_level=settings.log_level)

def get_logger(name: str) -> logging.Logger:
    """Returns a configured named logger instance."""
    return logging.getLogger(name)
