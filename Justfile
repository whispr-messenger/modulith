default:
    just --list

up ENV:
    #!/bin/bash
    if [ "{{ENV}}" = "dev" ]; then
        docker compose -f docker/dev/compose.yml up -d --build
    elif [ "{{ENV}}" = "prod" ]; then
        docker compose -f docker/prod/compose.yml up --detach --build
    elif [ "{{ENV}}" = "doc" ]; then
        docker compose -f docker/doc/compose.yml up --detach
    else
        echo "{{ENV}}: Accepted values are 'dev', 'prod' or 'doc'." >&2
    fi

down ENV:
    #!/bin/bash
    if [ "{{ENV}}" = "dev" ]; then
        docker compose -f docker/dev/compose.yml down --volumes
    elif [ "{{ENV}}" = "prod" ]; then
        docker compose -f docker/prod/compose.yml down --volumes
    elif [ "{{ENV}}" = "doc" ]; then
        docker compose -f docker/doc/compose.yml up --detach
    else
        echo "{{ENV}}: Accepted values are 'dev', 'prod' or 'doc'." >&2
    fi

logs ENV:
    #!/bin/bash
    if [ "{{ENV}}" = "dev" ]; then
        docker compose -f docker/{{ENV}}/compose.yml logs --follow
    elif [ "{{ENV}}" = "prod" ]; then
        docker compose -f docker/{{ENV}}/compose.yml logs --follow
    else
        echo "{{ENV}}: Accepted values are 'dev' or 'prod'." >&2
    fi


shell:
    docker compose -f docker/dev/compose.yml exec -it nestjs bash

test:
    docker compose -f docker/dev/compose.yml exec -it nestjs npm run test

test-e2e:
    #!/bin/bash
    echo "Starting E2E tests..."
    # Ensure Docker services are running
    docker compose -f docker/dev/compose.yml up -d postgres redis
    # Wait for services to be healthy
    echo "Waiting for services to be ready..."
    docker compose -f docker/dev/compose.yml exec postgres pg_isready -U dev_user -d development
    docker compose -f docker/dev/compose.yml exec redis redis-cli ping
    # Run E2E tests from host (not in container)
    echo "Running E2E tests..."
    npm run test:e2e
    # Cleanup Docker services
    echo "Cleaning up Docker services..."
    docker compose -f docker/dev/compose.yml down -v
    echo "E2E tests completed"