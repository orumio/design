# Propagating a release to every product

Run from the workspace root after tagging `vX.Y.Z` here. Each product keeps its own gates, branches and
deploy owners; follow the product's CLAUDE.md where it differs from this list.

1. **Which products.** Every `package.json` that depends on `@orumio/design`
   (`grep -rl '"@orumio/design"' */package.json */apps/*/package.json trade-counter/works/apps/*/package.json`),
   and product-video-engine's `vendor/` tarball.
2. **Bump.** In each product: `pnpm up @orumio/design` / `npm update @orumio/design` (the range
   `semver:^1.0.0` picks the new tag); product-video-engine: `npm pack` here, replace the tarball in
   `vendor/`, update its lock values per its ADR.
3. **Gate, per product.** `orumio-shape-check` (inside its `test`), then its own lint / typecheck /
   test / build, then the before / after computed-radius table on the screens it can reach locally
   (SHAPE.md §8a). Every change in the table must be explained by `CHANGELOG.md`.
4. **Deploy order.** hub first (`orumio-launch-kit`, `pnpm hub:deploy`), then each product. A product
   whose listing is in review is merged, not deployed, until the review ends — its screenshots must
   match what reviewers open.
5. `orumio-shape-check --outdated` in any product prints a WARN until it is on the newest v1 tag.

Rollback: set the product's dependency back to the previous tag (or revert its adoption commit) and
redeploy that product alone.
