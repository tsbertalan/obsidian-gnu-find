default:
	node esbuild.config.mjs production

install: default
	cp main.js styles.css manifest.json ~/Dropbox/.obsidian/plugins/obsidian-gnu-find/
