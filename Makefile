build:
	node esbuild.config.mjs production

default: build
	cp main.js styles.css manifest.json ~/Dropbox/.obsidian/plugins/obsidian-gnu-find/
