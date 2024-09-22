#!/bin/bash
docker compose -f docker-compose.yml stop -t 5
docker compose -f docker-compose.yml down