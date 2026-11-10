# Local UI refinements

- Owner: Codex
- Status: DONE
- Branch: feat/local-ui-refinements
- Base commit: 24dbb457e8d9c9b7f7dabc21dc5b40f132cd41d9
- Verified implementation: a4a61337d56f4e83e1665a10012567a5956769e4
- Integration commit: 2fab24c1602ee1034aaf4ce246301f9dfdfa4e3e

The user supplied six local UI changes. Guest typography and progress indicators are larger. Admin separates reset controls, collapses technical details and formats staff timestamps in Japan time. City conceals the server status line while connected.

Root and survey builds and suites passed on Windows with the external file-URL test adapter. Desktop Chrome checked Guest typography and progress, the Admin reset area and diagnostics, and Japan-time formatting. The real City HUD and stylesheet passed a targeted browser check with simulated socket events. A live 3D disconnect check did not complete. No exhibition hardware was tested.

[Feature CI](https://github.com/cc100053/city2127/actions/runs/42764584375) passed. The integrated code tree matches the tested branch.
