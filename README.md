## Supabase Core

This package provides lightweight services to supabase to make it easier to work with databases, tables and storage buckets.

### Features

- **Database Service**: Easy access to database tables and views.
- **Data Service**: Perform CRUD operations, fuzzy search, pagination, filtering and more on a specific table or view.
- **Storage Service**: Access to storage buckets and files, with support for file uploads, downloads, deletions, and more.
- **Embedding Service**: Generate and manage embeddings for file content stored in Supabase Storage, with support for custom embedding providers.

### Installation

Install the package, e.g. using bun:

```bash
bun install @freehour/supabase-core
```

### Migrations and Schemas

The package includes SQL files for setting up the necessary database schemas and extensions.
These files are copied post-installation to the `supabase/` directory of your project.
If you get a warning that the post-install script is blocked, you need to run the follwing command to trust the dependency:

```bash
bun pm trust @freehour/supabase-core
```

### Configuration

If you generate migrations from schemas, make sure to include the `supabase-core` db schema in your `schema_paths` in `supabase/config.toml`.

```toml
schema_paths = ["./schemas/supabase-core/*.sql", /* your app schema paths */]
```

### Building

If you chaged the database schema run the build script:

```bash
./scripts/build.sh
```

otherwise, you can just build the package:

```bash
bun run build
```

### Publishing

To publish a new version of the package, update the version in `package.json` and run:

```bash
bunx npm login
bun publish --access public
```



