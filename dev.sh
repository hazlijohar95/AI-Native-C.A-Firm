#!/usr/bin/env bash

# Simple helper to serve this static site on http://localhost:3000
cd "$(dirname "$0")"
python3 -m http.server 3000

