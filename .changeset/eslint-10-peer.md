---
"@brain-bbqs/config": patch
"@brain-bbqs/ember-client": patch
---

`@brain-bbqs/config` now accepts ESLint 10 and `@eslint/js` 10 as peers alongside 9, so an app can
move to ESLint 10 without a peer-dependency conflict. `@brain-bbqs/ember-client` drops an unused
initial assignment in the CORS diagnosis that ESLint 10's `no-useless-assignment` rule flags; its
behaviour is unchanged.
