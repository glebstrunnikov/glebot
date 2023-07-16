include .env
DCF = docker-compose.yaml

.PHONY: npm-i
npm-i:
	@docker compose --file=$(DCF) run --rm bot /bin/sh -c "npm i --save-dev"
