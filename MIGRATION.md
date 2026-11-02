# Full TypeScript replacement

The active branch is `migration/full-typescript` in both sibling repositories. React renders every page. A TypeScript Express server handles accounts, project APIs, provider calls and a durable SQLite job queue. Existing typed editing contracts, agent plans and Remotion compositions are reused. The application has no PHP, Blade, Laravel, Inertia or Composer runtime.

The old `migration/react-typescript` branch is a hybrid rollback checkpoint, not the completed replacement. Do not select it for new feature development. See `README.md` for setup and `FULL_TYPESCRIPT_MIGRATION.md` for the validation record.
