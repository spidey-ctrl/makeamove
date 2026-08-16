# LocalStorage as the only persistence layer

We store all app data in a single schema-versioned LocalStorage key and deliberately ship no backend. The app is single-user and per-browser; there is no cross-device, sync, or collaboration requirement. A backend would add auth, hosting, and latency without earning its keep, and migration to one later is a contained change (persistence is behind a thin save/load boundary). Known consequence: data loss is irreversible if browser storage is cleared — accepted for the MVP tier of the product.
Status: accepted