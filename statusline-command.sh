#!/bin/bash

# Read the JSON input
input=$(cat)

# Extract relevant information from the input
model_display=$(echo "$input" | jq -r '.model.display_name')
current_dir=$(echo "$input" | jq -r '.workspace.current_dir')
project_dir=$(echo "$input" | jq -r '.workspace.project_dir')
output_style=$(echo "$input" | jq -r '.output_style.name')

# Get system information
username=$(whoami)
hostname=$(hostname -s 2>/dev/null || hostname)
current_pwd=$(pwd)

# Get MSYSTEM (commonly used in MSYS2/MinGW environments)
msystem=${MSYSTEM:-"MINGW64"}

# Get git branch information (similar to __git_ps1)
git_branch=""
if git rev-parse --git-dir >/dev/null 2>&1; then
    git_branch=$(git branch --show-current 2>/dev/null || echo "detached")
fi

# Build the status line matching your PS1 format
# Green (32m): username@hostname
printf "\033[32m%s@%s" "$username" "$hostname"

# Magenta (35m): MSYSTEM
printf " \033[35m%s" "$msystem"

# Yellow (33m): current working directory
printf " \033[33m%s" "$current_pwd"

# Cyan (36m): git branch info
if [ -n "$git_branch" ]; then
    printf " \033[36m(%s)" "$git_branch"
fi

# Reset colors
printf "\033[0m"