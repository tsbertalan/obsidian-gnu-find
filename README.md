## Obsidian GNU Find

Farm out markdown search to GNU Find on Linux. I dunno, maybe it will work on mac? Or Windows with like MinGW?

TODO: 
- [ ] Implement separate `Command`s for title-only and full-text search.
- [ ] Actually use that input box in the `SuggestModal` for incremental search (but probably only for title-only search for now).
- [ ] Probably [use `locate` instead](https://serverfault.com/questions/1006135/can-you-cache-the-find-command), and end up changing all these dumb name strings.

### Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.
