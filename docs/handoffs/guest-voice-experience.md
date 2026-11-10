# Guest voice experience

- Owner: Codex
- Branch: feat/guest-voice-experience
- Base: d5689cdea209ecc6bbe1b42ab538081d0ba62579

The user supplied the welcome topics and count, option icons, result choice chips, city tendency display, screen transitions and projected voice label. Browser review found that the label's flex declaration overrode its hidden state. A scoped CSS rule restores hiding.

Root and survey builds passed on Windows. The focused Chrome check at 1024×900 verified the real Guest flow with a memory database and both CSS visibility states of the label. Projection and fade are covered by the supplied unit test. The wake lock depends on browser support and permission, including secure-context requirements. No physical iPad or actual display was tested.
