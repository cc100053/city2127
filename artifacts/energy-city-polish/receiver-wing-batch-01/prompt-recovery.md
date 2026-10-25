# Prompt provenance correction — 2026-10-25

During pass1 worker preflight, target-prompt.txt was found to contain literal `undefined`. Owner recovered the exact prompt from this chat's actual built-in imagegen tool invocation. Original file is preserved as target-prompt-preparation-error.txt and remains in preparation commit/bundle. Target SHA02bbde10 is unchanged; no regeneration. Original preparation SHA256SUMS remains historical; the refreshed manifest includes the corrected prompt and original erroneous file.
