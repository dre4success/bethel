// Atlas configuration for Bethel database

env "local" {
  src = "file://schema.sql"
  dev = "docker://postgres/16/dev?search_path=public"

  migration {
    dir = "file://migrations"
  }
}

env "docker" {
  src = "file://schema.sql"
  url = "postgres://postgres:postgres@localhost:5432/bethel?sslmode=disable"

  migration {
    dir = "file://migrations"
  }
}
