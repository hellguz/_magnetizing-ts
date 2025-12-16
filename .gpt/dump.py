#!/usr/bin/env python3
"""
Script to dump all relevant source files into a single text file for LLM context.
Run from repository root: python .gpt/dump.py
"""

import os
from pathlib import Path

# Directories to exclude
EXCLUDED_DIRS = {
    'node_modules',
    '.git',
    '.github',
    '.vscode',
    '.idea',
    'dist',
    'build',
    'coverage',
    '.nyc_output',
    'storybook-static',
    '.storybook-out',
    '.cache',
    'tmp',
    'temp',
    'logs',
    '__pycache__',
    '.pytest_cache',
    'bin',
    'obj',
    '.vs',
}

# File extensions to include
INCLUDED_EXTENSIONS = {
    # TypeScript/JavaScript
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    # Python
    '.py',
    # C#
    '.cs', '.csproj',
    # Config files
    '.json', '.yaml', '.yml', '.toml',
    # Web
    '.html', '.css', '.scss', '.sass',
    # Markdown
    '.md',
    # Config files for tools
    '.gitignore', '.npmrc', '.yarnrc',
    # Vite/Vitest
    '.config.ts', '.config.js',
}

# Additional files to include by name
INCLUDED_FILES = {
    'package.json',
    'tsconfig.json',
    'vitest.config.ts',
    'vite.config.ts',
    '.gitignore',
    'README.md',
}

def should_include_file(file_path: Path) -> bool:
    """Determine if a file should be included in the dump."""
    # Check if file name is in the explicitly included files
    if file_path.name in INCLUDED_FILES:
        return True

    # Check if extension is in the included extensions
    if file_path.suffix in INCLUDED_EXTENSIONS:
        return True

    # Check for config files without extension
    if any(pattern in file_path.name for pattern in ['.config.', 'config.']):
        return True

    return False

def should_exclude_dir(dir_path: Path) -> bool:
    """Check if directory should be excluded."""
    # Check each part of the path
    for part in dir_path.parts:
        if part in EXCLUDED_DIRS:
            return True
    return False

def collect_files(root_dir: Path) -> list[Path]:
    """Recursively collect all relevant files."""
    files = []

    for item in root_dir.rglob('*'):
        if item.is_file():
            # Get relative path from root
            try:
                rel_path = item.relative_to(root_dir)
            except ValueError:
                continue

            # Skip if in excluded directory
            if should_exclude_dir(rel_path.parent):
                continue

            # Skip if not an included file type
            if not should_include_file(item):
                continue

            files.append(rel_path)

    # Sort files for consistent output
    files.sort()
    return files

def create_dump(root_dir: Path, output_file: Path):
    """Create the dump file."""
    files = collect_files(root_dir)

    print(f"Found {len(files)} files to process")

    with open(output_file, 'w', encoding='utf-8') as out:
        for rel_path in files:
            full_path = root_dir / rel_path

            # Write file path header with forward slashes for consistency
            path_str = str(rel_path).replace('\\', '/')
            out.write(f"<{path_str}>\n\n")

            # Try to read and write file contents
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    contents = f.read()
                    out.write(contents)

                    # Ensure there's a newline at the end
                    if not contents.endswith('\n'):
                        out.write('\n')

            except UnicodeDecodeError:
                # Skip binary files
                out.write("[Binary file - skipped]\n")
            except Exception as e:
                out.write(f"[Error reading file: {e}]\n")

            out.write('\n')
            print(f"Processed: {path_str}")

    print(f"\nDump created successfully: {output_file}")
    print(f"Total files processed: {len(files)}")

def main():
    # Get repository root (parent of .gpt folder)
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent
    output_file = script_dir / 'dump.txt'

    print(f"Repository root: {repo_root}")
    print(f"Output file: {output_file}")
    print("Collecting files...\n")

    create_dump(repo_root, output_file)

if __name__ == '__main__':
    main()
