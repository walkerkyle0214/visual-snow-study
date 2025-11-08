# Scripts Directory

This directory contains utility scripts for the Visual Snow Study project.

## Scripts

### `migrate_data.py`
**Purpose**: Migrate data from JSON files to database  
**Usage**: `python scripts/migrate_data.py`  
**When to use**: One-time migration when setting up database

### `generate_noisy_image.py`
**Purpose**: Generate visual snow effect on study images  
**Usage**: `python scripts/generate_noisy_image.py`  
**Output**: Creates noisy version of the study image

## Running Scripts

From the project root directory:
```bash
# Migrate existing data to database
python scripts/migrate_data.py

# Generate noisy images
python scripts/generate_noisy_image.py
```