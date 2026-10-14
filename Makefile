.PHONY: up down seed test lint eval smoke reset web clean

up:            ## FalkorDB + API
	docker compose up -d --build
down:
	docker compose down
seed:          ## regenerate the deterministic sample bundle
	python scripts/generate_seed.py
test:          ## unit + graph + contract tests
	cd backend && pytest -q
lint:
	cd backend && ruff check .
eval:          ## recall / false positives / calibration → eval/report.md
	cd backend && python ../eval/run_eval.py
smoke:         ## end-to-end smoke against a running API
	cd backend && python ../scripts/smoke.py
reset:         ## drop all dev_ graphs
	cd backend && python ../scripts/reset_graphs.py
web:
	cd frontend && pnpm dev
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
