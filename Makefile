SHELL := /bin/sh

.PHONY: up down build logs psql migrate dump restore seed export deploy publish

up:
	docker compose up -d --build

down:
	docker compose down

build:
	docker compose build app

logs:
	docker compose logs -f --tail=100

psql:
	docker compose exec db psql -U learner -d learner

migrate:
	docker compose exec -T db psql -U learner -d learner < db/schema.sql

seed:
	npm run seed

export:
	npm run export

dump:
	docker compose exec -T db pg_dump -U learner learner > backups/learner-$(shell date +%F).sql

restore:
	docker compose exec -T db psql -U learner -d learner < $(F)

deploy:
	git pull --ff-only
	docker compose up -d --build app

publish:
	ops/publish.sh "make publish"
