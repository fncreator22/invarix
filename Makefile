.PHONY: up down test lint eval clean

up:
	docker compose up -d falkordb

down:
	docker compose down

test:
	cd backend && pytest

lint:
	cd backend && ruff check .

eval:
	cd backend && python -m eval.run_eval

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
